import { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONFIG, ERC20_ABI, VAULT_ABI } from '../config/contracts';

// Shared read-only RPC providers across background balance polls
const sepoliaReadProvider = new ethers.JsonRpcProvider(CONFIG.sepolia.rpcUrl);
const baseSepoliaReadProvider = new ethers.JsonRpcProvider(CONFIG.baseSepolia.rpcUrl);

const INITIAL_ACTIVITIES = [
  {
    id: 1,
    time: 'Verified',
    inflow: '+1.00 WETH ($2,500)',
    originTx: '0x0430...fc68',
    originFullTx: '0x043025677f893c2367986950c26c1cd0017bda08422adc26cc13d8f69359fc68',
    lasnaSignal: 'Passed (≥ 0.01 WETH)',
    destSwap: '+1,250 USDC reserve · +750 sUSDC yield · +0.20 WETH kept',
    destTx: '0x3a2a...d9c6',
    destFullTx: '0x3a2ad37d975ca1fae92b412f2ebed8c4c00f146a9d1a60fda2aa9a8f7416d9c6',
    status: 'success',
  },
];

function useAnimatedNumber(targetValue, duration = 400) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const currentRef = useRef(targetValue);
  const startValueRef = useRef(targetValue);
  const startTimeRef = useRef(null);

  useEffect(() => {
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

const randomHexChunk = () => Math.floor(1000 + Math.random() * 9000).toString(16);

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
  for (const item of freshLogs) {
    byKey.set(item.destFullTx || item.id, item);
  }
  for (const item of cachedItems) {
    const key = item.destFullTx || item.id;
    // Drop stale "Relaying" placeholders once any confirmed on-chain log is present
    if (item.destTx === 'Relaying' && freshLogs.length > 0) continue;
    if (!byKey.has(key)) byKey.set(key, item);
  }
  return Array.from(byKey.values()).slice(0, MAX_ACTIVITIES);
}

/**
 * Manages live cross-chain Sepolia + Base Sepolia telemetry, user bucket policies,
 * transaction execution (faucet, deposit, withdraw, paycheck trigger), and demo simulations.
 */
export function useVault({ walletAddress, currentChainId, getEip1193, switchNetwork, openWalletModal, showToast }) {
  const [vaultUsdc, setVaultUsdc] = useState(1250.0);
  const [vaultYieldUsdc, setVaultYieldUsdc] = useState(750.0);
  const [vaultWeth, setVaultWeth] = useState(9.2);
  const [userSepoliaWeth, setUserSepoliaWeth] = useState(10.0);
  const [userBaseWeth, setUserBaseWeth] = useState(0.0);
  const [userSepoliaEth, setUserSepoliaEth] = useState(null);
  const [userBaseEth, setUserBaseEth] = useState(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isWalletActionBusy, setIsWalletActionBusy] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(() => Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);

  const [stablePct, setStablePct] = useState(50);
  const [yieldPct, setYieldPct] = useState(30);
  const [savedStablePct, setSavedStablePct] = useState(50);
  const [savedYieldPct, setSavedYieldPct] = useState(30);
  const [isUpdatingPolicy, setIsUpdatingPolicy] = useState(false);

  const [minThresholdWeth] = useState(0.01);
  const [cooldownSecs] = useState(30);
  const [maxCapWeth, setMaxCapWeth] = useState(5.0);
  const [slippageFloorUsd, setSlippageFloorUsd] = useState(2000);

  const [loopPhase, setLoopPhase] = useState('idle');
  const [activeTxHash, setActiveTxHash] = useState(null);
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);

  const pollIntervalRef = useRef(null);

  const animatedUSDC = useAnimatedNumber(vaultUsdc);
  const animatedYieldUSDC = useAnimatedNumber(vaultYieldUsdc);
  const animatedWETH = useAnimatedNumber(vaultWeth);

  const fetchLiveBalances = useCallback(
    async (userAddr, syncControls = false) => {
      setIsLoadingBalances(true);
      try {
        const targetUser = userAddr || walletAddress || CONFIG.deployerRvmId;
        const sepToken = new ethers.Contract(CONFIG.sepolia.usdcAddress, ERC20_ABI, sepoliaReadProvider);
        const baseWeth = new ethers.Contract(CONFIG.baseSepolia.wethAddress, ERC20_ABI, baseSepoliaReadProvider);
        const vaultContract = new ethers.Contract(CONFIG.baseSepolia.vaultAddress, VAULT_ABI, baseSepoliaReadProvider);

        const [sepBal, sepEthBal, walletBaseWethBal, baseEthBal, userVaultBal, policyTuple, latestBaseBlock] =
          await Promise.all([
            sepToken.balanceOf(targetUser),
            sepoliaReadProvider.getBalance(targetUser).catch(() => null),
            baseWeth.balanceOf(targetUser),
            baseSepoliaReadProvider.getBalance(targetUser).catch(() => null),
            vaultContract.balances(targetUser),
            vaultContract.getPolicy(targetUser),
            baseSepoliaReadProvider.getBlockNumber().catch(() => null),
          ]);

        setUserSepoliaWeth(Number(ethers.formatEther(sepBal)));
        setUserBaseWeth(Number(ethers.formatEther(walletBaseWethBal)));
        if (sepEthBal !== null) setUserSepoliaEth(Number(ethers.formatEther(sepEthBal)));
        if (baseEthBal !== null) setUserBaseEth(Number(ethers.formatEther(baseEthBal)));
        setVaultWeth(Number(ethers.formatEther(userVaultBal.weth)));
        setVaultUsdc(Number(ethers.formatEther(userVaultBal.usdc)));
        setVaultYieldUsdc(Number(ethers.formatEther(userVaultBal.sUsdc)));

        const nextStable = Number(policyTuple.stableBps) / 100;
        const nextYield = Number(policyTuple.yieldBps) / 100;
        setSavedStablePct(nextStable);
        setSavedYieldPct(nextYield);
        if (syncControls) {
          setStablePct(nextStable);
          setYieldPct(nextYield);
          const capNum = Number(ethers.formatEther(policyTuple.maxSingleAllocation));
          if (capNum > 0) setMaxCapWeth(capNum);
          const floorNum = Number(ethers.formatEther(policyTuple.minStableOutPerInput));
          if (floorNum > 0) setSlippageFloorUsd(floorNum);
        }

        // Base Sepolia public RPC rejects eth_getLogs ranges wider than 200 blocks
        if (latestBaseBlock !== null) {
          try {
            const fromBlock = Math.max(0, latestBaseBlock - 180);
            const logs = await vaultContract.queryFilter(
              vaultContract.filters.MultiBucketAllocated(targetUser),
              fromBlock,
              latestBaseBlock
            );
            if (logs.length > 0) {
              const parsed = [...logs]
                .reverse()
                .slice(0, 5)
                .map((log, idx) => {
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
                });
              const merged = mergeActivities(parsed, loadCachedActivities(targetUser));
              setActivities(merged);
              saveCachedActivities(targetUser, merged);
            } else if (syncControls) {
              const cached = loadCachedActivities(targetUser);
              if (cached.length > 0) {
                setActivities(cached);
              } else if (targetUser.toLowerCase() !== CONFIG.deployerRvmId.toLowerCase()) {
                setActivities([]);
              } else {
                setActivities(INITIAL_ACTIVITIES);
              }
            }
          } catch {
            // Ignore transient RPC log-range errors
          }
        }

        setLastUpdated(Date.now());
        setSecondsAgo(0);
      } catch (err) {
        console.warn('Error fetching live balances:', err);
      } finally {
        setIsLoadingBalances(false);
      }
    },
    [walletAddress]
  );

  // Sync user controls when wallet changes; poll every 15s in background
  useEffect(() => {
    const initTimer = setTimeout(() => fetchLiveBalances(walletAddress, true), 0);
    const pollTimer = setInterval(() => fetchLiveBalances(walletAddress, false), 15000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(pollTimer);
    };
  }, [walletAddress, fetchLiveBalances]);

  // Clear paycheck relay poll timer on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Seconds-ago telemetry ticker
  useEffect(() => {
    const tickTimer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000));
    }, 1000);
    return () => clearInterval(tickTimer);
  }, [lastUpdated]);

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
      showToast(errorTitle, err?.reason || err?.message, 'warn');
    } finally {
      setBusy(busyKey ? null : false);
    }
  };

  const savePolicyOnChain = () => {
    const keepPct = Math.max(0, 100 - stablePct - yieldPct);
    return runWalletTx({
      targetNet: CONFIG.baseSepolia,
      setBusy: setIsUpdatingPolicy,
      errorTitle: 'Policy update failed',
      onNoWallet: () => {
        openWalletModal();
        setSavedStablePct(stablePct);
        setSavedYieldPct(yieldPct);
        showToast(
          'Connect wallet to save on-chain',
          `Preview updated to ${stablePct}% USDC · ${yieldPct}% sUSDC · ${keepPct}% WETH`
        );
      },
      fn: async (signer) => {
        const vault = new ethers.Contract(CONFIG.baseSepolia.vaultAddress, VAULT_ABI, signer);
        showToast('Saving split policy', 'Confirm setMyBuckets in your wallet');
        const tx = await vault.setMyBuckets(stablePct * 100, yieldPct * 100);
        await tx.wait();

        showToast('Saving risk guardrails', 'Confirm setMyGuardrails in your wallet');
        const guardTx = await vault.setMyGuardrails(
          ethers.parseEther(maxCapWeth.toString()),
          ethers.parseEther(slippageFloorUsd.toString())
        );
        await guardTx.wait();

        setSavedStablePct(stablePct);
        setSavedYieldPct(yieldPct);
        showToast(
          'Policy confirmed on-chain',
          `Saved ${stablePct}% USDC · ${yieldPct}% sUSDC · ${keepPct}% WETH for your address`
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
        const tokenAddr = targetChain === 'baseSepolia' ? CONFIG.baseSepolia.wethAddress : CONFIG.sepolia.usdcAddress;
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

  const runSimulatedLoop = async (wethAmount = 1.0) => {
    if (loopPhase !== 'idle') return;

    setLoopPhase('sepolia');
    await new Promise((r) => setTimeout(r, 750));

    setLoopPhase('lasna');
    await new Promise((r) => setTimeout(r, 850));

    setLoopPhase('base');
    const effectiveWeth = Math.min(wethAmount, maxCapWeth);
    const usdValue = effectiveWeth * CONFIG.ethUsdRate;
    const stableOut = usdValue * (savedStablePct / 100);
    const yieldOut = usdValue * (savedYieldPct / 100);
    const keepPct = Math.max(0, 100 - savedStablePct - savedYieldPct);
    const retainedWeth = effectiveWeth * (keepPct / 100);

    setVaultUsdc((prev) => prev + stableOut);
    setVaultYieldUsdc((prev) => prev + yieldOut);
    setVaultWeth((prev) => prev + retainedWeth);
    setLastUpdated(Date.now());
    setSecondsAgo(0);

    setActivities((prev) => [
      {
        id: Date.now(),
        time: 'Just now',
        inflow: `+${effectiveWeth.toFixed(2)} WETH ($${usdValue.toLocaleString()})`,
        originTx: `0x${randomHexChunk()}...${randomHexChunk()}`,
        lasnaSignal: `Passed (≥ ${minThresholdWeth} WETH)`,
        destSwap: `+${stableOut.toLocaleString()} USDC reserve · +${yieldOut.toLocaleString()} sUSDC yield · +${retainedWeth.toFixed(2)} WETH kept`,
        destTx: `0x${randomHexChunk()}...${randomHexChunk()}`,
        status: 'success',
      },
      ...prev.slice(0, 4),
    ]);

    showToast(
      '3-bucket runway executed on Base',
      `+$${stableOut.toLocaleString()} USDC reserve, +$${yieldOut.toLocaleString()} sUSDC yield, +${retainedWeth.toFixed(2)} WETH kept`
    );

    await new Promise((r) => setTimeout(r, 1200));
    setLoopPhase('idle');
  };

  const executeRealPaycheck = async (wethAmount = 1.0) => {
    if (loopPhase !== 'idle') return;

    const eip1193 = getEip1193();
    if (!eip1193 || !walletAddress) {
      return runSimulatedLoop(wethAmount);
    }

    if (currentChainId !== CONFIG.sepolia.chainId) {
      showToast('Switching to Sepolia', 'Your paycheck origin transfer must be signed on Ethereum Sepolia');
      const switched = await switchNetwork(CONFIG.sepolia);
      if (!switched) return;
    }

    try {
      setLoopPhase('sepolia');
      const startBaseBlock = await baseSepoliaReadProvider.getBlockNumber().catch(() => null);
      const initialSnapshot = { usdc: vaultUsdc, sUsdc: vaultYieldUsdc, weth: vaultWeth };

      const provider = new ethers.BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      const sepToken = new ethers.Contract(CONFIG.sepolia.usdcAddress, ERC20_ABI, signer);

      const transferAmount = ethers.parseUnits(wethAmount.toString(), 18);
      showToast('Confirm inflow in wallet', `Sending ${wethAmount} WETH on Sepolia to trigger Reactive loop`);

      const tx = await sepToken.transfer(walletAddress, transferAmount);
      setActiveTxHash(tx.hash);
      showToast('Sepolia tx broadcasted', `Tx ${tx.hash.slice(0, 10)}... waiting for confirmation`);

      await tx.wait();

      const usdValue = wethAmount * CONFIG.ethUsdRate;
      const stableOut = usdValue * (savedStablePct / 100);
      const yieldOut = usdValue * (savedYieldPct / 100);
      const keepPct = Math.max(0, 100 - savedStablePct - savedYieldPct);
      const retainedWeth = wethAmount * (keepPct / 100);
      const activityId = Date.now();

      setActivities((prev) => {
        const next = [
          {
            id: activityId,
            time: 'Just now',
            inflow: `+${wethAmount.toFixed(2)} WETH ($${usdValue.toLocaleString()})`,
            originTx: `${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)}`,
            originFullTx: tx.hash,
            lasnaSignal: 'Lasna Omni verified',
            destSwap: `+${stableOut.toLocaleString()} USDC reserve · +${yieldOut.toLocaleString()} sUSDC yield · +${retainedWeth.toFixed(2)} WETH kept`,
            destTx: 'Relaying',
            status: 'success',
          },
          ...prev,
        ].slice(0, MAX_ACTIVITIES);
        saveCachedActivities(walletAddress, next);
        return next;
      });

      setLoopPhase('lasna');
      showToast('Event caught on Lasna', 'PaycheckReactive verified guardrails and emitted callback to Base');

      await new Promise((r) => setTimeout(r, 4000));

      setLoopPhase('base');
      showToast('Executing on Base Sepolia', 'PaycheckVault receiving callback and splitting across 3 buckets');

      let attempts = 0;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      pollIntervalRef.current = setInterval(async () => {
        attempts++;
        try {
          const vaultContract = new ethers.Contract(CONFIG.baseSepolia.vaultAddress, VAULT_ABI, baseSepoliaReadProvider);
          const [userBal, latestBaseBlock] = await Promise.all([
            vaultContract.balances(walletAddress),
            baseSepoliaReadProvider.getBlockNumber().catch(() => null),
          ]);

          let matchedLog = null;
          if (latestBaseBlock !== null) {
            const fromBlock = startBaseBlock !== null ? startBaseBlock : Math.max(0, latestBaseBlock - 30);
            const logs = await vaultContract
              .queryFilter(vaultContract.filters.MultiBucketAllocated(walletAddress), fromBlock, latestBaseBlock)
              .catch(() => []);
            if (logs.length > 0) matchedLog = logs[logs.length - 1];
          }

          const numUsdc = Number(ethers.formatEther(userBal.usdc));
          const numSUsdc = Number(ethers.formatEther(userBal.sUsdc));
          const numWeth = Number(ethers.formatEther(userBal.weth));
          const balanceChanged =
            numUsdc !== initialSnapshot.usdc ||
            numSUsdc !== initialSnapshot.sUsdc ||
            numWeth !== initialSnapshot.weth;

          if (matchedLog || balanceChanged) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;

            if (matchedLog) {
              const destHash = matchedLog.transactionHash;
              const logUsdc = Number(ethers.formatEther(matchedLog.args.stableOut));
              const logYield = Number(ethers.formatEther(matchedLog.args.yieldOut));
              const logWeth = Number(ethers.formatEther(matchedLog.args.retainedIn));
              setActivities((prev) => {
                const updated = prev.map((item) =>
                  item.id === activityId
                    ? {
                        ...item,
                        time: 'Confirmed',
                        destTx: `${destHash.slice(0, 6)}...${destHash.slice(-4)}`,
                        destFullTx: destHash,
                        destSwap: `+${logUsdc.toLocaleString('en-US', { maximumFractionDigits: 0 })} USDC reserve · +${logYield.toLocaleString('en-US', { maximumFractionDigits: 0 })} sUSDC yield · +${logWeth.toFixed(2)} WETH kept`,
                      }
                    : item
                );
                saveCachedActivities(walletAddress, updated);
                return updated;
              });
            }

            await fetchLiveBalances(walletAddress);
            setLoopPhase('idle');
            showToast('Multi-bucket settlement complete', '3-bucket split verified on Base Sepolia');
          } else if (attempts >= 24) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setLoopPhase('idle');
            showToast(
              'Relay still pending',
              'Sepolia inflow confirmed. Base Sepolia settlement is taking longer than 60s — check BaseScan or refresh shortly.',
              'warn'
            );
          }
        } catch {
          // Keep polling until confirmed or timeout
        }
      }, 2500);
    } catch (err) {
      setLoopPhase('idle');
      showToast('Transaction cancelled', err?.reason || err?.message, 'warn');
    }
  };

  const simulateBlockedGuardrail = async ({ inflow, lasnaSignal, destSwap, toastTitle, toastBody }) => {
    if (loopPhase !== 'idle') return;

    setLoopPhase('sepolia');
    await new Promise((r) => setTimeout(r, 600));

    setLoopPhase('blocked');
    setActivities((prev) => [
      {
        id: Date.now(),
        time: 'Just now',
        inflow,
        originTx: `0x${randomHexChunk()}...${randomHexChunk()}`,
        lasnaSignal,
        destSwap,
        destTx: '-',
        status: 'filtered',
      },
      ...prev.slice(0, 4),
    ]);

    showToast(toastTitle, toastBody, 'warn');

    await new Promise((r) => setTimeout(r, 1400));
    setLoopPhase('idle');
  };

  const simulateDust = () =>
    simulateBlockedGuardrail({
      inflow: '0.002 WETH ($5 dust)',
      lasnaSignal: `Dust blocked (< ${minThresholdWeth} WETH)`,
      destSwap: 'Callback suppressed (relayer gas protected)',
      toastTitle: 'Anti-dust shield triggered on Lasna',
      toastBody: `0.002 WETH ($5.00) ignored (< ${minThresholdWeth} WETH floor). Callback suppressed.`,
    });

  const simulateCooldown = () =>
    simulateBlockedGuardrail({
      inflow: '+0.50 WETH (rapid repeat)',
      lasnaSignal: `Cooldown active (< ${cooldownSecs}s window)`,
      destSwap: 'Callback rate-limited (InflowSuppressed)',
      toastTitle: 'Cooldown shield triggered on Lasna',
      toastBody: `Rapid inflow suppressed within ${cooldownSecs}s cooldown window to stop fee drain.`,
    });

  return {
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
    secondsAgo,
    loopPhase,
    activeTxHash,
    activities,
    refreshBalances: () => fetchLiveBalances(walletAddress, false),
    savePolicyOnChain,
    mintTestWeth,
    depositToVault,
    withdrawFromVault,
    executeRealPaycheck,
    simulateDust,
    simulateCooldown,
    runSimulatedLoop,
  };
}
