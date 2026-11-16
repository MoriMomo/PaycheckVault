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

const HISTORY_KEY_PREFIX = 'paycheckvault_history_';
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
    // Drop stale "Relaying" placeholders once any confirmed on-chain log is present
    if (item.destTx === 'Relaying' && freshLogs.length > 0) continue;
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
    lasnaSignal: 'Lasna Omni verified',
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

        const nextStable = Number(policyTuple.stableBps) / 100;
        const nextYield = Number(policyTuple.yieldBps) / 100;
        const capNum = Number(ethers.formatEther(policyTuple.maxSingleAllocation));
        const floorNum = Number(ethers.formatEther(policyTuple.minStableOutPerInput));
        setSavedStablePct(nextStable);
        setSavedYieldPct(nextYield);
        if (capNum > 0) setSavedMaxCapWeth(capNum);
        if (floorNum > 0) setSavedSlippageFloorUsd(floorNum);
        if (syncControls) {
          setStablePct(nextStable);
          setYieldPct(nextYield);
          if (capNum > 0) setMaxCapWeth(capNum);
          if (floorNum > 0) setSlippageFloorUsd(floorNum);
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

        if (bucketsChanged || !guardrailsChanged) {
          showToast('Saving split policy', 'Confirm setMyBuckets in your wallet');
          const tx = await vault.setMyBuckets(Math.round(clampedStable * 100), Math.round(clampedYield * 100));
          await tx.wait();
          setSavedStablePct(clampedStable);
          setSavedYieldPct(clampedYield);
        }

        if (guardrailsChanged) {
          showToast('Saving risk guardrails', 'Confirm setMyGuardrails in your wallet');
          const guardTx = await vault.setMyGuardrails(
            ethers.parseEther(Number(maxCapWeth).toFixed(6)),
            ethers.parseEther(Number(slippageFloorUsd).toFixed(2))
          );
          await guardTx.wait();
          setSavedMaxCapWeth(maxCapWeth);
          setSavedSlippageFloorUsd(slippageFloorUsd);
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

  const executeRealPaycheck = async (wethAmount = 1.0) => {
    if (loopPhase !== 'idle') return;

    const eip1193 = getEip1193();
    if (!eip1193 || !walletAddress) {
      openWalletModal();
      showToast('Connect wallet first', 'Choose a wallet to send a Sepolia WETH transaction', 'warn');
      return;
    }

    const originWallet = walletAddress;
    const isDustTest = wethAmount < minThresholdWeth;
    if (!isDustTest && vaultWeth <= 0) {
      showToast(
        'Deposit Base WETH first',
        'Your Base Sepolia vault slice is 0 WETH. Mint & deposit Base WETH below so PaycheckVault has funds to split (or test 0.002 WETH dust).',
        'warn'
      );
      return;
    }

    if (currentChainId !== CONFIG.sepolia.chainId) {
      showToast('Switching to Sepolia', 'Your paycheck origin transfer must be signed on Ethereum Sepolia');
      const switched = await switchNetwork(CONFIG.sepolia);
      if (!switched) return;
    }

    try {
      setLoopPhase('sepolia');
      const [startBaseBlock, startLasnaBlock] = await Promise.all([
        baseSepoliaReadProvider.getBlockNumber().catch(() => null),
        lasnaReadProvider.getBlockNumber().catch(() => null),
      ]);
      const initialSnapshot = { usdc: vaultUsdc, sUsdc: vaultYieldUsdc, weth: vaultWeth };

      const provider = new ethers.BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      const sepToken = new ethers.Contract(
        CONFIG.sepolia.wethAddress || CONFIG.sepolia.usdcAddress,
        ERC20_ABI,
        signer
      );

      const transferAmount = ethers.parseUnits(wethAmount.toString(), 18);
      showToast('Confirm inflow in wallet', `Sending ${wethAmount} WETH on Sepolia to trigger Reactive loop`);

      const tx = await sepToken.transfer(originWallet, transferAmount);
      setActiveTxHash(tx.hash);
      showToast('Sepolia tx broadcasted', `Tx ${tx.hash.slice(0, 10)}... waiting for confirmation`);

      await tx.wait();

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
            status: isDustTest ? 'filtered' : 'pending',
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

          const [userBal, latestBaseBlock, latestLasnaBlock] = await Promise.all([
            vaultContract.balances(originWallet),
            baseSepoliaReadProvider.getBlockNumber().catch(() => null),
            lasnaReadProvider.getBlockNumber().catch(() => null),
          ]);

          let suppressedLog = null;
          let triggeredLog = null;
          if (latestLasnaBlock !== null) {
            const fromLasna = startLasnaBlock !== null ? startLasnaBlock : Math.max(0, latestLasnaBlock - 30);
            const [supLogs, trigLogs] = await Promise.all([
              reactiveContract
                .queryFilter(reactiveContract.filters.InflowSuppressed(originWallet), fromLasna, latestLasnaBlock)
                .catch(() => []),
              reactiveContract
                .queryFilter(reactiveContract.filters.PaycheckTriggered(originWallet), fromLasna, latestLasnaBlock)
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
          } else if (attempts === 2 && !isDustTest) {
            setLoopPhase('base');
          }

          let matchedLog = null;
          if (!isDustTest && latestBaseBlock !== null) {
            const fromBlock = startBaseBlock !== null ? startBaseBlock : Math.max(0, latestBaseBlock - 30);
            const logs = await vaultContract
              .queryFilter(vaultContract.filters.MultiBucketAllocated(originWallet), fromBlock, latestBaseBlock)
              .catch(() => []);
            if (logs.length > 0) matchedLog = logs[logs.length - 1];
          }

          const numUsdc = Number(ethers.formatEther(userBal.usdc));
          const numSUsdc = Number(ethers.formatEther(userBal.sUsdc));
          const numWeth = Number(ethers.formatEther(userBal.weth));
          const balanceChanged =
            !isDustTest &&
            (numUsdc !== initialSnapshot.usdc ||
              numSUsdc !== initialSnapshot.sUsdc ||
              numWeth !== initialSnapshot.weth);

          if (matchedLog || balanceChanged) {
            pollTimerRef.current = null;
            setActivities((prev) => {
              const updated = prev.map((item) => {
                if (item.id !== activityId) return item;
                if (matchedLog) {
                  const destHash = matchedLog.transactionHash;
                  const logUsdc = Number(ethers.formatEther(matchedLog.args.stableOut));
                  const logYield = Number(ethers.formatEther(matchedLog.args.yieldOut));
                  const logWeth = Number(ethers.formatEther(matchedLog.args.retainedIn));
                  return {
                    ...item,
                    time: 'Confirmed',
                    status: 'success',
                    lasnaFullTx: capturedLasnaTx || item.lasnaFullTx,
                    destTx: `${destHash.slice(0, 6)}...${destHash.slice(-4)}`,
                    destFullTx: destHash,
                    destSwap: `+${logUsdc.toLocaleString('en-US', { maximumFractionDigits: 0 })} USDC reserve · +${logYield.toLocaleString('en-US', { maximumFractionDigits: 0 })} sUSDC yield · +${logWeth.toFixed(2)} WETH kept`,
                  };
                }
                return {
                  ...item,
                  time: 'Confirmed',
                  status: 'success',
                  lasnaFullTx: capturedLasnaTx || item.lasnaFullTx,
                  destTx: 'Confirmed',
                };
              });
              saveCachedActivities(originWallet, updated);
              return updated;
            });

            await Promise.all([fetchProtocolTvl(), fetchLiveBalances(originWallet)]);
            setLoopPhase('idle');
            showToast('Multi-bucket settlement complete', '3-bucket split verified on Base Sepolia');
            return;
          }

          if (attempts >= maxAttempts) {
            pollTimerRef.current = null;
            if (isDustTest) {
              setLoopPhase('blocked');
              await fetchProtocolTvl();
              showToast(
                'Dust inflow confirmed on Sepolia',
                'Check ReactScan on Lasna for the InflowSuppressed firewall event',
                'warn'
              );
              setTimeout(() => setLoopPhase('idle'), 1500);
            } else {
              setLoopPhase('idle');
              showToast(
                'Relay still pending',
                'Sepolia inflow confirmed. Base Sepolia settlement is taking longer than 60s — check BaseScan or refresh shortly.',
                'warn'
              );
            }
            return;
          }
        } catch (pollErr) {
          console.warn('Relay poll error:', pollErr?.shortMessage || pollErr?.message || pollErr);
        }

        if (activeWalletRef.current === originWallet && attempts < maxAttempts) {
          pollTimerRef.current = setTimeout(pollStep, 2500);
        }
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
    executeRealPaycheck,
  };
}
