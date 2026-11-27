import { originPaycheckId } from '../config/paycheck';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONFIG, ERC20_ABI, VAULT_ABI, REACTIVE_ABI } from '../config/contracts';

// Shared read-only RPC providers across background balance polls
const sepoliaReadProvider = new ethers.JsonRpcProvider(CONFIG.sepolia.rpcUrl);
const lasnaReadProvider = new ethers.JsonRpcProvider(CONFIG.lasna.rpcUrl);
const baseSepoliaReadProvider = new ethers.JsonRpcProvider(CONFIG.baseSepolia.rpcUrl);

function useAnimatedNumber(targetValue, duration = 400) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const currentRef = useRef(targetValue);
  const startValueRef = useRef(targetValue);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (Math.abs(targetValue - currentRef.current) < 1e-6) return;
    startValueRef.current = currentRef.current;
    startTimeRef.current = null;
    let rafId;

    const step = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValueRef.current + (targetValue - startValueRef.current) * eased;
      currentRef.current = current;
      setDisplayValue(current);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [targetValue, duration]);

  return displayValue;
}

const HISTORY_KEY_PREFIX = `paycheckvault_history_v2_${CONFIG.baseSepolia.vaultAddress}_`;
const MAX_ACTIVITIES = 10;

function loadCachedActivities(addr) {
  if (!addr) return [];
  try {
    const raw = window.localStorage?.getItem(`${HISTORY_KEY_PREFIX}${addr.toLowerCase()}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCachedActivities(addr, items) {
  if (!addr) return;
  try {
    window.localStorage?.setItem(
      `${HISTORY_KEY_PREFIX}${addr.toLowerCase()}`,
      JSON.stringify(items.slice(0, MAX_ACTIVITIES))
    );
  } catch {
    // Ignore storage quota errors
  }
}

function mergeActivities(freshLogs, cachedItems) {
  const byKey = new Map();
  for (const item of cachedItems) {
    const key = item.destFullTx || item.lasnaFullTx || item.originFullTx || item.id;
    byKey.set(key, item);
  }
  const merged = [];
  const seen = new Set();
  for (const fresh of freshLogs) {
    const key = fresh.destFullTx || fresh.lasnaFullTx || fresh.originFullTx || fresh.id;
    const existing = byKey.get(key);
    merged.push(existing ? { ...existing, ...fresh } : fresh);
    seen.add(key);
  }
  for (const [key, item] of byKey.entries()) {
    if (!seen.has(key)) merged.push(item);
  }
  return merged.slice(0, MAX_ACTIVITIES);
}

function formatTxError(err, fallback = 'Transaction failed') {
  if (err?.code === 'ACTION_REJECTED' || err?.code === 4001) {
    return 'Transaction rejected in wallet';
  }
  return err?.shortMessage || err?.reason || err?.message || fallback;
}

function mapBaseAllocationLog(log, idx) {
  const processed = Number(ethers.formatEther(log.args.totalProcessed));
  const usdcOut = Number(ethers.formatEther(log.args.stableOut));
  const yieldOut = Number(ethers.formatEther(log.args.yieldOut));
  const keptWeth = Number(ethers.formatEther(log.args.retainedIn));
  const usdVal = processed * CONFIG.ethUsdRate;
  return {
    id: `${log.transactionHash}-${idx}`,
    time: 'On-chain',
    inflow: `+${processed.toFixed(2)} WETH ($${usdVal.toLocaleString('en-US', { maximumFractionDigits: 0 })})`,
    originTx: 'Sepolia Transfer',
    lasnaSignal: 'Base allocation observed',
    destSwap: `+${usdcOut.toLocaleString('en-US', { maximumFractionDigits: 0 })} USDC reserve · +${yieldOut.toLocaleString('en-US', { maximumFractionDigits: 0 })} sUSDC yield · +${keptWeth.toFixed(2)} WETH kept`,
    destTx: `${log.transactionHash.slice(0, 6)}...${log.transactionHash.slice(-4)}`,
    destFullTx: log.transactionHash,
    status: 'success',
  };
}

function mapLasnaSuppressedLog(log, idx) {
  const amount = Number(ethers.formatEther(log.args.amount));
  const usdVal = amount * CONFIG.ethUsdRate;
  return {
    id: `lasna-${log.transactionHash}-${idx}`,
    time: 'Lasna firewall',
    inflow: `+${amount.toFixed(amount < 0.01 ? 3 : 2)} WETH ($${usdVal.toLocaleString('en-US', { maximumFractionDigits: 0 })})`,
    originTx: 'Sepolia Transfer',
    lasnaSignal: log.args.reason || 'InflowSuppressed',
    lasnaFullTx: log.transactionHash,
    destSwap: 'Callback suppressed on Lasna (relayer gas saved)',
    destTx: '-',
    status: 'filtered',
  };
}

/**
 * Manages live cross-chain Sepolia + Base Sepolia telemetry, user bucket policies,
 * transaction execution (faucet, deposit, withdraw, paycheck trigger), and demo simulations.
 */
export function useVault({ walletAddress, currentChainId, getEip1193, switchNetwork, openWalletModal, showToast }) {
  const [vaultUsdc, setVaultUsdc] = useState(0);
  const [vaultYieldUsdc, setVaultYieldUsdc] = useState(0);
  const [vaultWeth, setVaultWeth] = useState(0);
  const [userSepoliaWeth, setUserSepoliaWeth] = useState(0);
  const [userBaseWeth, setUserBaseWeth] = useState(0);
  const [userSepoliaEth, setUserSepoliaEth] = useState(null);
  const [userBaseEth, setUserBaseEth] = useState(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isWalletActionBusy, setIsWalletActionBusy] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(() => Date.now());

  const [stablePct, setStablePct] = useState(50);
  const [yieldPct, setYieldPct] = useState(30);
  const [savedStablePct, setSavedStablePct] = useState(50);
  const [savedYieldPct, setSavedYieldPct] = useState(30);
  const [isUpdatingPolicy, setIsUpdatingPolicy] = useState(false);

  const [minThresholdWeth] = useState(0.01);
  const [cooldownSecs] = useState(30);
  const [maxCapWeth, setMaxCapWeth] = useState(5.0);
  const [slippageFloorUsd, setSlippageFloorUsd] = useState(2000);
  const [savedMaxCapWeth, setSavedMaxCapWeth] = useState(5.0);
  const [savedSlippageFloorUsd, setSavedSlippageFloorUsd] = useState(2000);

  const [loopPhase, setLoopPhase] = useState('idle');
  const [activeTxHash, setActiveTxHash] = useState(null);
  const [activities, setActivities] = useState([]);
  const [protocolTvl, setProtocolTvl] = useState({ usdc: 0, sUsdc: 0, weth: 0 });
  const [previewAddress, setPreviewAddress] = useState(null);
  const [reactiveStats, setReactiveStats] = useState({
    callbacks: 0,
    dustBlocked: 0,
    cooldownBlocked: 0,
    lasnaReactGas: null,
    baseVaultEthGas: null,
  });
  const [lastTriggeredTs, setLastTriggeredTs] = useState(0);
  const [isAutoSplitEnabled, setIsAutoSplitEnabled] = useState(false);
  const [pendingLasnaWeth, setPendingLasnaWeth] = useState(0);

  const pollTimerRef = useRef(null);
  const fetchSeqRef = useRef(0);
  const activeWalletRef = useRef(walletAddress);

  useEffect(() => {
    activeWalletRef.current = walletAddress;
  }, [walletAddress]);

  const animatedUSDC = useAnimatedNumber(vaultUsdc);
  const animatedYieldUSDC = useAnimatedNumber(vaultYieldUsdc);
  const animatedWETH = useAnimatedNumber(vaultWeth);

  const activePreviewAddress = walletAddress ? null : previewAddress;
  const isPreviewMode = Boolean(activePreviewAddress);

  // Public site telemetry: Base Sepolia TVL, Lasna firewall counters, and contract gas reserves
  const fetchProtocolTvl = useCallback(async () => {
    try {
      const vaultAddr = CONFIG.baseSepolia.vaultAddress;
      const reactiveAddr = CONFIG.lasna.reactiveAddress;
      const usdc = new ethers.Contract(CONFIG.baseSepolia.usdcAddress, ERC20_ABI, baseSepoliaReadProvider);
      const sUsdc = new ethers.Contract(CONFIG.baseSepolia.sUsdcAddress, ERC20_ABI, baseSepoliaReadProvider);
      const weth = new ethers.Contract(CONFIG.baseSepolia.wethAddress, ERC20_ABI, baseSepoliaReadProvider);
      const reactiveContract = new ethers.Contract(reactiveAddr, REACTIVE_ABI, lasnaReadProvider);

      const [usdcBal, sUsdcBal, wethBal, callbacks, dustBlocked, cooldownBlocked, lasnaGas, baseGas] =
        await Promise.all([
          usdc.balanceOf(vaultAddr),
          sUsdc.balanceOf(vaultAddr),
          weth.balanceOf(vaultAddr),
          reactiveContract.totalCallbacksEmitted().catch(() => null),
          reactiveContract.totalDustBlocked().catch(() => null),
          reactiveContract.totalCooldownBlocked().catch(() => null),
          lasnaReadProvider.getBalance(reactiveAddr).catch(() => null),
          baseSepoliaReadProvider.getBalance(vaultAddr).catch(() => null),
        ]);

      setProtocolTvl({
        usdc: Number(ethers.formatEther(usdcBal)),
        sUsdc: Number(ethers.formatEther(sUsdcBal)),
        weth: Number(ethers.formatEther(wethBal)),
      });
      setReactiveStats((prev) => ({
        callbacks: callbacks !== null ? Number(callbacks) : prev.callbacks,
        dustBlocked: dustBlocked !== null ? Number(dustBlocked) : prev.dustBlocked,
        cooldownBlocked: cooldownBlocked !== null ? Number(cooldownBlocked) : prev.cooldownBlocked,
        lasnaReactGas: lasnaGas !== null ? Number(ethers.formatEther(lasnaGas)) : prev.lasnaReactGas,
        baseVaultEthGas: baseGas !== null ? Number(ethers.formatEther(baseGas)) : prev.baseVaultEthGas,
      }));
    } catch (err) {
      console.warn('Error fetching protocol TVL:', err);
    }
  }, []);

  const fetchLiveBalances = useCallback(
    async (userAddr, syncControls = false) => {
      const reqId = ++fetchSeqRef.current;
      const targetUser = userAddr || walletAddress || activePreviewAddress;
      if (!targetUser) {
        setUserSepoliaWeth(0);
        setUserBaseWeth(0);
        setUserSepoliaEth(null);
        setUserBaseEth(null);
        setVaultWeth(0);
        setVaultUsdc(0);
        setVaultYieldUsdc(0);
        setSavedStablePct(50);
        setSavedYieldPct(30);
        setStablePct(50);
        setYieldPct(30);
        setSavedMaxCapWeth(5.0);
        setSavedSlippageFloorUsd(2000);
        setMaxCapWeth(5.0);
        setSlippageFloorUsd(2000);
        setLastTriggeredTs(0);
        setIsAutoSplitEnabled(false);
        setPendingLasnaWeth(0);
        setActivities([]);
        setActiveTxHash(null);
        setIsLoadingBalances(false);
        return;
      }

      setIsLoadingBalances(true);
      try {
        const sepToken = new ethers.Contract(CONFIG.sepolia.wethAddress || CONFIG.sepolia.usdcAddress, ERC20_ABI, sepoliaReadProvider);
        const baseWeth = new ethers.Contract(CONFIG.baseSepolia.wethAddress, ERC20_ABI, baseSepoliaReadProvider);
        const vaultContract = new ethers.Contract(CONFIG.baseSepolia.vaultAddress, VAULT_ABI, baseSepoliaReadProvider);
        const reactiveContract = new ethers.Contract(CONFIG.lasna.reactiveAddress, REACTIVE_ABI, lasnaReadProvider);

        const [
          sepBal,
          sepEthBal,
          walletBaseWethBal,
          baseEthBal,
          userVaultBal,
          policyTuple,
          latestBaseBlock,
          lastTrig,
          latestLasnaBlock,
          baseAllowance,
          pendingInflowRaw,
        ] = await Promise.all([
          sepToken.balanceOf(targetUser),
          sepoliaReadProvider.getBalance(targetUser).catch(() => null),
          baseWeth.balanceOf(targetUser),
          baseSepoliaReadProvider.getBalance(targetUser).catch(() => null),
          vaultContract.balances(targetUser),
          vaultContract.getPolicy(targetUser),
          baseSepoliaReadProvider.getBlockNumber().catch(() => null),
          reactiveContract.lastTriggeredAt(targetUser).catch(() => 0n),
          lasnaReadProvider.getBlockNumber().catch(() => null),
          baseWeth.allowance(targetUser, CONFIG.baseSepolia.vaultAddress).catch(() => 0n),
          reactiveContract.pendingInflow(targetUser).catch(() => 0n),
        ]);

        if (reqId !== fetchSeqRef.current) return;

        setUserSepoliaWeth(Number(ethers.formatEther(sepBal)));
        setUserBaseWeth(Number(ethers.formatEther(walletBaseWethBal)));
        if (sepEthBal !== null) setUserSepoliaEth(Number(ethers.formatEther(sepEthBal)));
        if (baseEthBal !== null) setUserBaseEth(Number(ethers.formatEther(baseEthBal)));
        setVaultWeth(Number(ethers.formatEther(userVaultBal.weth)));
        setVaultUsdc(Number(ethers.formatEther(userVaultBal.usdc)));
        setVaultYieldUsdc(Number(ethers.formatEther(userVaultBal.sUsdc)));
        setLastTriggeredTs(lastTrig ? Number(lastTrig) : 0);
        setIsAutoSplitEnabled(baseAllowance >= ethers.parseEther('1000'));
        setPendingLasnaWeth(Number(ethers.formatEther(pendingInflowRaw || 0n)));

        const nextStable = Number(policyTuple.stableBps) / 100;
        const nextYield = Number(policyTuple.yieldBps) / 100;
        const capNum = Number(ethers.formatEther(policyTuple.maxSingleAllocation));
        const floorNum = Number(ethers.formatEther(policyTuple.minStableOutPerInput));
        setSavedStablePct(nextStable);
        setSavedYieldPct(nextYield);
        setSavedMaxCapWeth(capNum);
        setSavedSlippageFloorUsd(floorNum);
        if (syncControls) {
          setStablePct(nextStable);
          setYieldPct(nextYield);
          setMaxCapWeth(capNum);
          setSlippageFloorUsd(floorNum);
        }

        const freshLogs = [];

        // Base Sepolia public RPC rejects eth_getLogs ranges wider than 200 blocks
        if (latestBaseBlock !== null) {
          try {
            const fromBlock = Math.max(0, latestBaseBlock - 180);
            const baseLogs = await vaultContract.queryFilter(
              vaultContract.filters.MultiBucketAllocated(targetUser),
              fromBlock,
              latestBaseBlock
            );
            [...baseLogs].reverse().slice(0, 5).forEach((log, idx) => freshLogs.push(mapBaseAllocationLog(log, idx)));
          } catch {
            // Ignore transient Base RPC log-range errors
          }
        }

        if (latestLasnaBlock !== null) {
          try {
            const fromLasna = Math.max(0, latestLasnaBlock - 180);
            const suppressedLogs = await reactiveContract.queryFilter(
              reactiveContract.filters.InflowSuppressed(targetUser),
              fromLasna,
              latestLasnaBlock
            );
            [...suppressedLogs]
              .reverse()
              .slice(0, 5)
              .forEach((log, idx) => freshLogs.push(mapLasnaSuppressedLog(log, idx)));
          } catch {
            // Ignore transient Lasna log query errors
          }
        }

        if (reqId !== fetchSeqRef.current) return;

        if (freshLogs.length > 0) {
          const merged = mergeActivities(freshLogs, loadCachedActivities(targetUser));
          setActivities(merged);
          saveCachedActivities(targetUser, merged);
        } else if (syncControls) {
          setActivities(loadCachedActivities(targetUser));
        }

        setLastUpdated(Date.now());
      } catch (err) {
        console.warn('Error fetching live balances:', err);
      } finally {
        if (reqId === fetchSeqRef.current) {
          setIsLoadingBalances(false);
        }
      }
    },
    [walletAddress, activePreviewAddress]
  );

  // Sync public TVL & user-scoped state; poll every 15s when tab is visible
  useEffect(() => {
    const activeTarget = walletAddress || activePreviewAddress;
    const initTimer = setTimeout(() => {
      fetchProtocolTvl();
      fetchLiveBalances(activeTarget, true);
    }, 0);
    const pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      fetchProtocolTvl();
      if (activeTarget) fetchLiveBalances(activeTarget, false);
    }, 15000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(pollTimer);
    };
  }, [walletAddress, activePreviewAddress, fetchProtocolTvl, fetchLiveBalances]);

  // Clear paycheck relay poll timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // Shared guard & signer wrapper for all state-changing wallet transactions
  const runWalletTx = async ({
    targetNet = CONFIG.baseSepolia,
    busyKey,
    onNoWallet,
    missingWalletMsg,
    errorTitle,
    setBusy = setIsWalletActionBusy,
    fn,
  }) => {
    const eip1193 = getEip1193();
    if (!eip1193 || !walletAddress) {
      if (onNoWallet) {
        onNoWallet();
      } else {
        openWalletModal();
        showToast('Connect wallet first', missingWalletMsg, 'warn');
      }
      return;
    }

    if (currentChainId !== targetNet.chainId) {
      showToast(`Switching to ${targetNet.chainName}`, `Approve switching to ${targetNet.chainName} to continue`, 'warn');
      const switched = await switchNetwork(targetNet);
      if (!switched) return;
    }

    setBusy(busyKey ?? true);
    try {
      const provider = new ethers.BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      await fn(signer, targetNet);
    } catch (err) {
      showToast(errorTitle, formatTxError(err), 'warn');
    } finally {
      setBusy(busyKey ? null : false);
    }
  };

  const savePolicyOnChain = () => {
    const clampedStable = Math.round(Number(stablePct));
    const clampedYield = Math.round(Number(yieldPct));
    if (clampedStable < 0 || clampedYield < 0 || clampedStable + clampedYield > 100) {
      showToast('Invalid allocation split', 'USDC + sUSDC percentages cannot exceed 100%', 'warn');
      return;
    }

    const keepPct = Math.max(0, 100 - clampedStable - clampedYield);
    return runWalletTx({
      targetNet: CONFIG.baseSepolia,
      setBusy: setIsUpdatingPolicy,
      errorTitle: 'Policy update failed',
      onNoWallet: () => {
        openWalletModal();
        showToast(
          'Connect wallet to save on-chain',
          `Connect your wallet to save ${clampedStable}% USDC · ${clampedYield}% sUSDC · ${keepPct}% WETH on Base Sepolia`,
          'warn'
        );
      },
      fn: async (signer) => {
        const vault = new ethers.Contract(CONFIG.baseSepolia.vaultAddress, VAULT_ABI, signer);
        const bucketsChanged = clampedStable !== savedStablePct || clampedYield !== savedYieldPct;
        const guardrailsChanged = maxCapWeth !== savedMaxCapWeth || slippageFloorUsd !== savedSlippageFloorUsd;

        const split = [clampedStable * 100, clampedYield * 100];
        const limits = [ethers.parseEther(String(maxCapWeth)), ethers.parseEther(String(slippageFloorUsd))];
        if (!bucketsChanged && !guardrailsChanged) return;
        try {
          let tx;
          if (bucketsChanged && guardrailsChanged) {
            try {
              await vault.setMyPolicy.staticCall(...split, ...limits);
            } catch (error) {
              if (error.code === 'CALL_EXCEPTION' && !error.data?.replace('0x', '')) {
                throw new Error('This vault requires separate saves. Change only the split or only the guardrails per save.');
              }
              throw error;
            }
            tx = await vault.setMyPolicy(...split, ...limits);
          } else if (bucketsChanged) {
            tx = await vault.setMyBuckets(...split);
          } else {
            tx = await vault.setMyGuardrails(...limits);
          }
          await tx.wait();
        } finally {
          await fetchLiveBalances(walletAddress);
        }

        showToast(
          'Policy confirmed on-chain',
          `Saved ${clampedStable}% USDC · ${clampedYield}% sUSDC · ${keepPct}% WETH for your address`
        );
      },
    });
  };

  const mintTestWeth = (targetChain = 'sepolia', amountWeth = 5) => {
    const net = targetChain === 'baseSepolia' ? CONFIG.baseSepolia : CONFIG.sepolia;
    return runWalletTx({
      targetNet: net,
      busyKey: `mint-${targetChain}`,
      missingWalletMsg: 'Choose MetaMask, Phantom, or another wallet to mint test WETH',
      errorTitle: 'Mint cancelled',
      fn: async (signer) => {
        const tokenAddr =
          targetChain === 'baseSepolia'
            ? CONFIG.baseSepolia.wethAddress
            : CONFIG.sepolia.wethAddress || CONFIG.sepolia.usdcAddress;
        const token = new ethers.Contract(tokenAddr, ERC20_ABI, signer);
        const tx = await token.mint(walletAddress, ethers.parseUnits(amountWeth.toString(), 18));
        showToast('Minting test WETH', `Confirmed tx ${tx.hash.slice(0, 10)}...`);
        await tx.wait();
        await fetchLiveBalances(walletAddress);
        showToast('Test WETH minted', `Added ${amountWeth} WETH on ${net.chainName}`);
      },
    });
  };

  const depositToVault = (amountWeth = 2.0) =>
    runWalletTx({
      targetNet: CONFIG.baseSepolia,
      busyKey: 'deposit',
      missingWalletMsg: 'Choose a wallet to deposit Base WETH into your vault slice',
      errorTitle: 'Deposit cancelled',
      fn: async (signer) => {
        const weth = new ethers.Contract(CONFIG.baseSepolia.wethAddress, ERC20_ABI, signer);
        const vault = new ethers.Contract(CONFIG.baseSepolia.vaultAddress, VAULT_ABI, signer);
        const amt = ethers.parseUnits(amountWeth.toString(), 18);

        const currentAllowance = await weth.allowance(walletAddress, CONFIG.baseSepolia.vaultAddress);
        if (currentAllowance < amt) {
          showToast('Approve Base WETH', 'Confirm token approval for PaycheckVault');
          const approveTx = await weth.approve(CONFIG.baseSepolia.vaultAddress, amt);
          await approveTx.wait();
        }

        showToast('Depositing WETH', `Depositing ${amountWeth} WETH into your Base Sepolia vault slice`);
        const tx = await vault.deposit(amt);
        await tx.wait();
        await fetchLiveBalances(walletAddress);
        showToast('Vault funded', `Deposited ${amountWeth} WETH into your vault slice`);
      },
    });

  const withdrawFromVault = (bucket) =>
    runWalletTx({
      targetNet: CONFIG.baseSepolia,
      busyKey: `withdraw-${bucket}`,
      missingWalletMsg: 'Choose a wallet to withdraw from your vault slice',
      errorTitle: 'Withdraw cancelled',
      fn: async (signer) => {
        const vault = new ethers.Contract(CONFIG.baseSepolia.vaultAddress, VAULT_ABI, signer);
        const userBal = await vault.balances(walletAddress);

        const bucketConfig =
          bucket === 'usdc'
            ? { tokenAddress: CONFIG.baseSepolia.usdcAddress, rawAmt: userBal.usdc, label: 'USDC' }
            : bucket === 'sUsdc'
            ? { tokenAddress: CONFIG.baseSepolia.sUsdcAddress, rawAmt: userBal.sUsdc, label: 'sUSDC' }
            : { tokenAddress: CONFIG.baseSepolia.wethAddress, rawAmt: userBal.weth, label: 'WETH' };

        if (bucketConfig.rawAmt <= 0n) {
          showToast('Nothing to withdraw', `Your ${bucketConfig.label} vault balance is 0`, 'warn');
          return;
        }

        showToast(`Withdrawing ${bucketConfig.label}`, 'Confirm withdrawal in your wallet');
        const tx = await vault.withdraw(bucketConfig.tokenAddress, bucketConfig.rawAmt);
        await tx.wait();
        await fetchLiveBalances(walletAddress);
        showToast(
          'Withdrawal complete',
          `Sent ${Number(ethers.formatEther(bucketConfig.rawAmt)).toFixed(2)} ${bucketConfig.label} to your wallet`
        );
      },
    });

  const enableAutoSplit = () =>
    runWalletTx({
      targetNet: CONFIG.baseSepolia,
      busyKey: 'enable-autosplit',
      missingWalletMsg: 'Choose a wallet to enable 1-click Base WETH auto-split',
      errorTitle: 'Approval cancelled',
      fn: async (signer) => {
        const weth = new ethers.Contract(CONFIG.baseSepolia.wethAddress, ERC20_ABI, signer);
        showToast('Enable Auto-Split', 'Confirm 1-time Base WETH approval for PaycheckVault');
        const tx = await weth.approve(CONFIG.baseSepolia.vaultAddress, ethers.MaxUint256);
        await tx.wait();
        await fetchLiveBalances(walletAddress);
        showToast('Auto-Split enabled', 'Incoming paychecks now auto-split from your Base wallet');
      },
    });

  const executeRealPaycheck = async (wethAmount = 1.0, sourceChain = 'sepolia') => {
    if (loopPhase !== 'idle') return;

    const eip1193 = getEip1193();
    if (!eip1193 || !walletAddress) {
      openWalletModal();
      showToast('Connect wallet first', 'Choose a wallet to send a WETH transaction', 'warn');
      return;
    }

    const originWallet = walletAddress;
    const isBaseOrigin = sourceChain === 'baseSepolia';
    const originNet = isBaseOrigin ? CONFIG.baseSepolia : CONFIG.sepolia;
    const originTokenAddr = isBaseOrigin
      ? CONFIG.baseSepolia.wethAddress
      : CONFIG.sepolia.wethAddress || CONFIG.sepolia.usdcAddress;
    const isDustTest = wethAmount < minThresholdWeth;
    if (!isDustTest && vaultWeth <= 0 && !isAutoSplitEnabled) {
      showToast(
        'Enable Auto-Split or deposit WETH',
        'Click "Enable Auto-Split" (1-time approval) or deposit Base WETH below so PaycheckVault can split your payout.',
        'warn'
      );
      return;
    }

    if (currentChainId !== originNet.chainId) {
      showToast(`Switching to ${originNet.chainName}`, `Your paycheck transfer must be signed on ${originNet.chainName}`);
      const switched = await switchNetwork(originNet);
      if (!switched) return;
    }

    try {
      setLoopPhase('sepolia');
      const [startBaseBlock, startLasnaBlock] = await Promise.all([
        baseSepoliaReadProvider.getBlockNumber().catch(() => null),
        lasnaReadProvider.getBlockNumber().catch(() => null),
      ]);


      const provider = new ethers.BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      const originToken = new ethers.Contract(originTokenAddr, ERC20_ABI, signer);

      const transferAmount = ethers.parseUnits(wethAmount.toString(), 18);
      showToast('Confirm inflow in wallet', `Sending ${wethAmount} WETH on ${originNet.chainName} to trigger Reactive loop`);

      const tx = await originToken.transfer(originWallet, transferAmount);
      setActiveTxHash(tx.hash);
      showToast(`${originNet.chainName} tx broadcasted`, `Tx ${tx.hash.slice(0, 10)}... waiting for confirmation`);

      const receipt = await tx.wait();
      const paycheckId = originPaycheckId(receipt, originNet.chainId, originTokenAddr, originWallet, transferAmount);

      const usdValue = wethAmount * CONFIG.ethUsdRate;
      const stableOut = usdValue * (savedStablePct / 100);
      const yieldOut = usdValue * (savedYieldPct / 100);
      const keepPct = Math.max(0, 100 - savedStablePct - savedYieldPct);
      const retainedWeth = wethAmount * (keepPct / 100);
      const activityId = Date.now();
      const decimals = wethAmount < 0.01 ? 3 : 2;

      setActivities((prev) => {
        const next = [
          {
            id: activityId,
            time: 'Relaying',
            inflow: `+${wethAmount.toFixed(decimals)} WETH ($${usdValue.toLocaleString()})`,
            originTx: `${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)}`,
            originFullTx: tx.hash,
            lasnaSignal: isDustTest ? `Checking (< ${minThresholdWeth} WETH)` : 'Checking Lasna Omni',
            destSwap: isDustTest
              ? 'Waiting for Lasna anti-dust verification'
              : `Est. +${stableOut.toLocaleString()} USDC reserve · +${yieldOut.toLocaleString()} sUSDC yield · +${retainedWeth.toFixed(2)} WETH kept`,
            destTx: 'Relaying',
            status: 'pending',
          },
          ...prev,
        ].slice(0, MAX_ACTIVITIES);
        saveCachedActivities(originWallet, next);
        return next;
      });

      setLoopPhase('lasna');
      showToast(
        'Checking Lasna guardrails',
        isDustTest
          ? `Watching Lasna for InflowSuppressed on ${wethAmount} WETH dust inflow`
          : 'PaycheckReactive checking dust floor & cooldown before relaying to Base'
      );

      let attempts = 0;
      let capturedLasnaTx = null;
      const maxAttempts = isDustTest ? 8 : 24;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);

      const pollStep = async () => {
        if (activeWalletRef.current !== originWallet) {
          pollTimerRef.current = null;
          return;
        }
        attempts++;
        try {
          const vaultContract = new ethers.Contract(CONFIG.baseSepolia.vaultAddress, VAULT_ABI, baseSepoliaReadProvider);
          const reactiveContract = new ethers.Contract(CONFIG.lasna.reactiveAddress, REACTIVE_ABI, lasnaReadProvider);

          const [latestBaseBlock, latestLasnaBlock] = await Promise.all([
            baseSepoliaReadProvider.getBlockNumber().catch(() => null),
            lasnaReadProvider.getBlockNumber().catch(() => null),
          ]);

          let suppressedLog = null;
          let triggeredLog = null;
          if (latestLasnaBlock !== null) {
            const fromLasna = startLasnaBlock !== null ? startLasnaBlock : Math.max(0, latestLasnaBlock - 30);
            const [supLogs, trigLogs] = await Promise.all([
              reactiveContract
                .queryFilter(reactiveContract.filters.PaycheckSuppressed(paycheckId, originWallet), fromLasna, latestLasnaBlock)
                .catch(() => []),
              reactiveContract
                .queryFilter(reactiveContract.filters.PaycheckAccepted(paycheckId, originWallet), fromLasna, latestLasnaBlock)
                .catch(() => []),
            ]);
            if (supLogs.length > 0) suppressedLog = supLogs[supLogs.length - 1];
            if (trigLogs.length > 0) triggeredLog = trigLogs[trigLogs.length - 1];
          }

          if (suppressedLog) {
            pollTimerRef.current = null;
            const lasnaHash = suppressedLog.transactionHash;
            const reason = suppressedLog.args.reason || 'InflowSuppressed';

            setActivities((prev) => {
              const updated = prev.map((item) =>
                item.id === activityId
                  ? {
                      ...item,
                      time: 'Suppressed',
                      lasnaSignal: reason,
                      lasnaFullTx: lasnaHash,
                      destSwap: 'Callback suppressed on Lasna (relayer gas saved)',
                      destTx: '-',
                      status: 'filtered',
                    }
                  : item
              );
              saveCachedActivities(originWallet, updated);
              return updated;
            });

            setLoopPhase('blocked');
            showToast('Suppressed on Lasna', `PaycheckReactive blocked callback (${reason})`, 'warn');
            await Promise.all([fetchProtocolTvl(), fetchLiveBalances(originWallet)]);
            setTimeout(() => setLoopPhase('idle'), 1800);
            return;
          }

          if (triggeredLog && !capturedLasnaTx) {
            capturedLasnaTx = triggeredLog.transactionHash;
            setLoopPhase('base');
            setActivities((prev) => {
              const updated = prev.map((item) =>
                item.id === activityId
                  ? { ...item, lasnaSignal: 'PaycheckTriggered', lasnaFullTx: capturedLasnaTx }
                  : item
              );
              saveCachedActivities(originWallet, updated);
              return updated;
            });
          }

          let matchedLog = null;
          if (latestBaseBlock !== null) {
            const fromBlock = startBaseBlock !== null ? startBaseBlock : Math.max(0, latestBaseBlock - 30);
            const logs = await vaultContract
              .queryFilter(vaultContract.filters.PaycheckSettled(paycheckId, originWallet), fromBlock, latestBaseBlock)
              .catch(() => []);
            if (logs.length > 0) matchedLog = logs[logs.length - 1];
          }

          if (matchedLog) {
            pollTimerRef.current = null;
            let destSwapText = 'Paycheck allocation confirmed on Base Sepolia';
            try {
              const settleReceipt = await baseSepoliaReadProvider.getTransactionReceipt(matchedLog.transactionHash);
              const parsedAlloc = settleReceipt?.logs
                ?.map((l) => { try { return vaultContract.interface.parseLog(l); } catch { return null; } })
                .find((e) => e?.name === 'MultiBucketAllocated');
              if (parsedAlloc) {
                const logUsdc = Number(ethers.formatEther(parsedAlloc.args.stableOut));
                const logYield = Number(ethers.formatEther(parsedAlloc.args.yieldOut));
                const logWeth = Number(ethers.formatEther(parsedAlloc.args.retainedIn));
                destSwapText = `+${logUsdc.toLocaleString('en-US', { maximumFractionDigits: 0 })} USDC reserve · +${logYield.toLocaleString('en-US', { maximumFractionDigits: 0 })} sUSDC yield · +${logWeth.toFixed(2)} WETH kept`;
              }
            } catch {
              // Fallback to generic confirmation text
            }
            setActivities(prev => {
              const updated = prev.map(item => item.id === activityId ? {
                ...item, time: 'Confirmed', status: 'success', lasnaFullTx: capturedLasnaTx,
                destTx: matchedLog.transactionHash.slice(0, 10), destFullTx: matchedLog.transactionHash,
                destSwap: destSwapText,
              } : item);
              saveCachedActivities(originWallet, updated);
              return updated;
            });

            await Promise.all([fetchProtocolTvl(), fetchLiveBalances(originWallet)]);
            setLoopPhase('idle');
            showToast('Multi-bucket settlement complete', '3-bucket split verified on Base Sepolia');
            return;
          }

        } catch (pollErr) {
          console.warn('Relay poll error:', pollErr?.shortMessage || pollErr?.message || pollErr);
        }

        if (activeWalletRef.current !== originWallet) return;
        if (attempts >= maxAttempts) {
          pollTimerRef.current = null;
          setLoopPhase('idle');
          setActivities(prev => {
            const updated = prev.map(item => item.id === activityId ? {
              ...item, time: 'Unverified', destTx: 'Unverified',
              destSwap: 'No matching settlement or suppression event observed',
            } : item);
            saveCachedActivities(originWallet, updated);
            return updated;
          });
          showToast('Outcome unverified', 'Sepolia transfer confirmed. No matching outcome observed for this paycheck.', 'warn');
          return;
        }
        pollTimerRef.current = setTimeout(pollStep, 2500);
      };

      pollTimerRef.current = setTimeout(pollStep, 2500);
    } catch (err) {
      setLoopPhase('idle');
      showToast('Transaction cancelled', formatTxError(err), 'warn');
    }
  };

  return {
    protocolTvl,
    reactiveStats,
    lastUpdated,
    lastTriggeredTs,
    isPreviewMode,
    previewAddress: activePreviewAddress,
    enableSamplePreview: () => setPreviewAddress(CONFIG.deployerRvmId),
    exitSamplePreview: () => setPreviewAddress(null),
    vaultUsdc,
    vaultYieldUsdc,
    vaultWeth,
    animatedUSDC,
    animatedYieldUSDC,
    animatedWETH,
    userSepoliaWeth,
    userBaseWeth,
    userSepoliaEth,
    userBaseEth,
    stablePct,
    setStablePct,
    yieldPct,
    setYieldPct,
    savedStablePct,
    savedYieldPct,
    minThresholdWeth,
    cooldownSecs,
    maxCapWeth,
    setMaxCapWeth,
    slippageFloorUsd,
    setSlippageFloorUsd,
    isUpdatingPolicy,
    isLoadingBalances,
    isWalletActionBusy,
    isAutoSplitEnabled,
    pendingLasnaWeth,
    loopPhase,
    activeTxHash,
    activities,
    refreshBalances: () => {
      fetchProtocolTvl();
      fetchLiveBalances(walletAddress || activePreviewAddress, false);
    },
    savePolicyOnChain,
    mintTestWeth,
    depositToVault,
    withdrawFromVault,
    enableAutoSplit,
    executeRealPaycheck,
  };
}
