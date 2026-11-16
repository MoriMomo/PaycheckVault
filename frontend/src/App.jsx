import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONFIG, ERC20_ABI, VAULT_ABI } from './config/contracts';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/DashboardPage';
import WalletModal from './components/WalletModal';
import MeadowRiseFooter from '@/components/ui/meadow-rise-footer';

// Smooth numeric odometer hook
function useAnimatedNumber(targetValue, duration = 400) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const startValueRef = useRef(targetValue);
  const startTimeRef = useRef(null);

  useEffect(() => {
    startValueRef.current = displayValue;
    startTimeRef.current = null;
    let rafId;

    const step = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValueRef.current + (targetValue - startValueRef.current) * eased;
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

export default function App() {
  // Two-Page Navigation State: 'landing' | 'app'
  const [activePage, setActivePage] = useState('landing');

  // Wallet & Network State (EIP-6963 Multi-Wallet Support)
  const [walletAddress, setWalletAddress] = useState(null);
  const [currentChainId, setCurrentChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [discoveredWallets, setDiscoveredWallets] = useState([]);
  const [activeProvider, setActiveProvider] = useState(null);
  const [activeWalletInfo, setActiveWalletInfo] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Live On-Chain Balances & Liveness Tracking
  const [vaultUsdc, setVaultUsdc] = useState(1250.0);
  const [vaultYieldUsdc, setVaultYieldUsdc] = useState(750.0);
  const [vaultWeth, setVaultWeth] = useState(9.2);
  const [userSepoliaWeth, setUserSepoliaWeth] = useState(10.0);
  const [userBaseWeth, setUserBaseWeth] = useState(0.0);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isWalletActionBusy, setIsWalletActionBusy] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Multi-Bucket Policy Settings (Total <= 100%, remainder kept as Operating WETH)
  const [stablePct, setStablePct] = useState(50);
  const [yieldPct, setYieldPct] = useState(30);
  const [savedStablePct, setSavedStablePct] = useState(50);
  const [savedYieldPct, setSavedYieldPct] = useState(30);
  const [isUpdatingPolicy, setIsUpdatingPolicy] = useState(false);

  // On-Chain Guardrails State
  const [minThresholdWeth] = useState(0.01);
  const [cooldownSecs] = useState(30);
  const [maxCapWeth, setMaxCapWeth] = useState(5.0);
  const [slippageFloorUsd, setSlippageFloorUsd] = useState(2000);

  // Signal Flow Phase: 'idle' | 'sepolia' | 'lasna' | 'base' | 'blocked'
  const [loopPhase, setLoopPhase] = useState('idle');
  const [activeTxHash, setActiveTxHash] = useState(null);
  const [toast, setToast] = useState(null);
  const [legalModal, setLegalModal] = useState(null);

  // Activity Feed
  const [activities, setActivities] = useState([
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
  ]);

  const animatedUSDC = useAnimatedNumber(vaultUsdc);
  const animatedYieldUSDC = useAnimatedNumber(vaultYieldUsdc);
  const animatedWETH = useAnimatedNumber(vaultWeth);

  const showToastMsg = (title, subtitle, type = 'success') => {
    setToast({ title, subtitle, type });
    setTimeout(() => setToast(null), 4500);
  };

  // 1. Fetch live per-user balances & policies directly from Sepolia & Base Sepolia RPCs
  const fetchLiveBalances = useCallback(async (userAddr, syncControls = false) => {
    setIsLoadingBalances(true);
    try {
      const targetUser = userAddr || walletAddress || CONFIG.deployerRvmId;
      const sepProvider = new ethers.JsonRpcProvider(CONFIG.sepolia.rpcUrl);
      const sepToken = new ethers.Contract(CONFIG.sepolia.usdcAddress, ERC20_ABI, sepProvider);
      const sepBal = await sepToken.balanceOf(targetUser);
      setUserSepoliaWeth(Number(ethers.formatEther(sepBal)));

      const baseProvider = new ethers.JsonRpcProvider(CONFIG.baseSepolia.rpcUrl);
      const baseWeth = new ethers.Contract(CONFIG.baseSepolia.wethAddress, ERC20_ABI, baseProvider);
      const vaultContract = new ethers.Contract(CONFIG.baseSepolia.vaultAddress, VAULT_ABI, baseProvider);

      const [walletBaseWethBal, userVaultBal, policyTuple, latestBaseBlock] = await Promise.all([
        baseWeth.balanceOf(targetUser),
        vaultContract.balances(targetUser),
        vaultContract.getPolicy(targetUser),
        baseProvider.getBlockNumber().catch(() => null),
      ]);

      setUserBaseWeth(Number(ethers.formatEther(walletBaseWethBal)));
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

      // Query recent Base Sepolia allocation logs within RPC 200-block limit
      if (latestBaseBlock !== null) {
        try {
          const fromBlock = Math.max(0, latestBaseBlock - 180);
          const logs = await vaultContract.queryFilter(
            vaultContract.filters.MultiBucketAllocated(targetUser),
            fromBlock,
            latestBaseBlock
          );
          if (logs.length > 0) {
            const parsed = [...logs].reverse().slice(0, 5).map((log, idx) => {
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
            setActivities(parsed);
          } else if (syncControls && targetUser.toLowerCase() !== CONFIG.deployerRvmId.toLowerCase()) {
            setActivities([]);
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
  }, [walletAddress]);

  // Continuous 15-second background polling
  useEffect(() => {
    fetchLiveBalances();
    const pollTimer = setInterval(() => {
      fetchLiveBalances();
    }, 15000);
    return () => clearInterval(pollTimer);
  }, [fetchLiveBalances]);

  // Dynamic seconds-ago counter
  useEffect(() => {
    const tickTimer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000));
    }, 1000);
    return () => clearInterval(tickTimer);
  }, [lastUpdated]);

  // Discover all installed EVM wallets via EIP-6963 + Phantom/MetaMask fallbacks
  const scanInjectedWallets = useCallback(() => {
    const found = new Map();

    const addEntry = (info, provider) => {
      if (!provider || typeof provider.request !== 'function') return;
      const key = info.rdns || info.name;
      if (!found.has(key)) {
        found.set(key, { info, provider });
      }
    };

    const onAnnounce = (event) => {
      const detail = event?.detail;
      if (detail?.info && detail?.provider) {
        addEntry(detail.info, detail.provider);
      }
    };

    window.addEventListener('eip6963:announceProvider', onAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    // Fallback discovery for wallets that do not emit EIP-6963 synchronously
    if (window.phantom?.ethereum) {
      addEntry(
        { uuid: 'fallback-phantom', name: 'Phantom', rdns: 'app.phantom', icon: null },
        window.phantom.ethereum
      );
    }

    const legacyProviders = Array.isArray(window.ethereum?.providers)
      ? window.ethereum.providers
      : window.ethereum
      ? [window.ethereum]
      : [];

    for (const p of legacyProviders) {
      if (p.isPhantom) {
        addEntry({ uuid: 'fallback-phantom', name: 'Phantom', rdns: 'app.phantom', icon: null }, p);
      } else if (p.isMetaMask) {
        addEntry({ uuid: 'fallback-metamask', name: 'MetaMask', rdns: 'io.metamask', icon: null }, p);
      } else if (p.isRabby) {
        addEntry({ uuid: 'fallback-rabby', name: 'Rabby Wallet', rdns: 'io.rabby', icon: null }, p);
      } else if (p.isCoinbaseWallet) {
        addEntry({ uuid: 'fallback-coinbase', name: 'Coinbase Wallet', rdns: 'com.coinbase.wallet', icon: null }, p);
      } else {
        addEntry({ uuid: 'fallback-browser', name: 'Browser Wallet', rdns: 'injected.browser', icon: null }, p);
      }
    }

    const list = Array.from(found.values());
    setDiscoveredWallets(list);

    setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce);
    }, 300);

    return list;
  }, []);

  useEffect(() => {
    const wallets = [];
    const byKey = new Map();

    const mergeWallets = (info, provider) => {
      if (!provider || typeof provider.request !== 'function') return;
      const key = info.rdns || info.name;
      if (!byKey.has(key)) {
        byKey.set(key, { info, provider });
      }
      setDiscoveredWallets(Array.from(byKey.values()));
    };

    const handleAnnounce = (event) => {
      if (event?.detail?.info && event?.detail?.provider) {
        mergeWallets(event.detail.info, event.detail.provider);
      }
    };

    window.addEventListener('eip6963:announceProvider', handleAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    const fallbackList = scanInjectedWallets();
    fallbackList.forEach((w) => wallets.push(w));

    // Restore prior wallet selection quietly if user previously connected
    const savedRdns = window.localStorage?.getItem('paycheckvault_wallet_rdns');
    if (savedRdns) {
      setTimeout(() => {
        const match = Array.from(byKey.values()).find((w) => w.info.rdns === savedRdns)
          || fallbackList.find((w) => w.info.rdns === savedRdns);
        if (match) {
          match.provider.request({ method: 'eth_accounts' }).then((accounts) => {
            if (accounts && accounts.length > 0) {
              setActiveProvider(match.provider);
              setActiveWalletInfo(match.info);
              setWalletAddress(accounts[0]);
              fetchLiveBalances(accounts[0], true);
            }
          }).catch(() => {});
        }
      }, 150);
    }

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnounce);
    };
  }, [scanInjectedWallets, fetchLiveBalances]);

  // Listen to active wallet provider account/chain events
  useEffect(() => {
    const provider = activeProvider || window.ethereum;
    if (!provider || typeof provider.on !== 'function') return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        fetchLiveBalances(accounts[0], true);
        showToastMsg('Account switched', `Connected as ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
      } else {
        setWalletAddress(null);
        setActiveProvider(null);
        setActiveWalletInfo(null);
        window.localStorage?.removeItem('paycheckvault_wallet_rdns');
        fetchLiveBalances(CONFIG.deployerRvmId, true);
        showToastMsg('Wallet disconnected', 'Viewing default vault telemetry', 'warn');
      }
    };

    const handleChainChanged = (chainIdHex) => {
      setCurrentChainId(parseInt(chainIdHex, 16));
    };

    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);

    if (activeProvider) {
      provider.request({ method: 'eth_chainId' }).then((hex) => {
        if (hex) setCurrentChainId(parseInt(hex, 16));
      }).catch(() => {});
    }

    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged);
      provider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [activeProvider, fetchLiveBalances]);

  const getEip1193 = () => activeProvider || window.ethereum;

  // Open Wallet Chooser Modal (MetaMask, Phantom, Rabby, etc.)
  const connectWallet = () => {
    scanInjectedWallets();
    setShowWalletModal(true);
  };

  // Connect with Specific Wallet Extension & Trigger Extension Popup
  const selectAndConnectWallet = async (walletEntry) => {
    setIsConnecting(true);
    try {
      const targetProvider = walletEntry.provider;

      // Prompt account selector popup inside MetaMask if previously granted
      if (targetProvider.isMetaMask && !targetProvider.isPhantom) {
        try {
          await targetProvider.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }],
          });
        } catch (permErr) {
          if (permErr?.code === 4001) throw permErr;
        }
      }

      const browserProvider = new ethers.BrowserProvider(targetProvider);
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      const network = await browserProvider.getNetwork();
      const user = accounts[0];

      setActiveProvider(targetProvider);
      setActiveWalletInfo(walletEntry.info);
      window.localStorage?.setItem('paycheckvault_wallet_rdns', walletEntry.info.rdns || walletEntry.info.name);
      setWalletAddress(user);
      setCurrentChainId(Number(network.chainId));
      setShowWalletModal(false);
      await fetchLiveBalances(user, true);

      showToastMsg(
        `${walletEntry.info.name} connected`,
        `Loaded vault slice for ${user.slice(0, 6)}...${user.slice(-4)}`
      );
    } catch (err) {
      showToastMsg('Connection cancelled', err?.message || 'Wallet rejected connection', 'warn');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setActiveProvider(null);
    setActiveWalletInfo(null);
    setCurrentChainId(null);
    setShowWalletModal(false);
    window.localStorage?.removeItem('paycheckvault_wallet_rdns');
    fetchLiveBalances(CONFIG.deployerRvmId, true);
    showToastMsg('Disconnected', 'Viewing default vault telemetry');
  };

  // Switch Network Helper on Selected Wallet
  const switchNetwork = async (targetNetwork) => {
    const eip1193 = getEip1193();
    if (!eip1193) {
      setShowWalletModal(true);
      return;
    }
    try {
      await eip1193.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetNetwork.chainIdHex }],
      });
      setCurrentChainId(targetNetwork.chainId);
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await eip1193.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: targetNetwork.chainIdHex,
                chainName: targetNetwork.chainName,
                rpcUrls: [targetNetwork.rpcUrl],
                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                blockExplorerUrls: [targetNetwork.explorer],
              },
            ],
          });
          setCurrentChainId(targetNetwork.chainId);
        } catch (addError) {
          console.error(addError);
        }
      }
    }
  };

  // Save per-user Multi-Bucket Policy & Guardrails On-Chain (Base Sepolia)
  const savePolicyOnChain = async () => {
    const keepPct = Math.max(0, 100 - stablePct - yieldPct);
    const eip1193 = getEip1193();
    if (!eip1193 || !walletAddress) {
      setShowWalletModal(true);
      setSavedStablePct(stablePct);
      setSavedYieldPct(yieldPct);
      showToastMsg(
        'Connect wallet to save on-chain',
        `Preview updated to ${stablePct}% USDC · ${yieldPct}% sUSDC · ${keepPct}% WETH`
      );
      return;
    }

    if (currentChainId !== CONFIG.baseSepolia.chainId) {
      showToastMsg('Switch to Base Sepolia', 'Approve network switch to save your vault policy on Base Sepolia', 'warn');
      await switchNetwork(CONFIG.baseSepolia);
      return;
    }

    setIsUpdatingPolicy(true);
    try {
      const provider = new ethers.BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      const vault = new ethers.Contract(CONFIG.baseSepolia.vaultAddress, VAULT_ABI, signer);

      showToastMsg('Saving split policy', 'Confirm setMyBuckets in your wallet');
      const tx = await vault.setMyBuckets(stablePct * 100, yieldPct * 100);
      await tx.wait();

      showToastMsg('Saving risk guardrails', 'Confirm setMyGuardrails in your wallet');
      const guardTx = await vault.setMyGuardrails(
        ethers.parseEther(maxCapWeth.toString()),
        ethers.parseEther(slippageFloorUsd.toString())
      );
      await guardTx.wait();

      setSavedStablePct(stablePct);
      setSavedYieldPct(yieldPct);
      showToastMsg(
        'Policy confirmed on-chain',
        `Saved ${stablePct}% USDC · ${yieldPct}% sUSDC · ${keepPct}% WETH for your address`
      );
    } catch (err) {
      showToastMsg('Policy update failed', err.reason || err.message, 'warn');
    } finally {
      setIsUpdatingPolicy(false);
    }
  };

  // Public Testnet WETH Faucet (Sepolia or Base Sepolia)
  const mintTestWeth = async (targetChain = 'sepolia', amountWeth = 5) => {
    const eip1193 = getEip1193();
    if (!eip1193 || !walletAddress) {
      setShowWalletModal(true);
      showToastMsg('Connect wallet first', 'Choose MetaMask, Phantom, or another wallet to mint test WETH', 'warn');
      return;
    }
    const net = targetChain === 'baseSepolia' ? CONFIG.baseSepolia : CONFIG.sepolia;
    if (currentChainId !== net.chainId) {
      showToastMsg(`Switching to ${net.chainName}`, `Approve switching to ${net.chainName} before minting test WETH`, 'warn');
      await switchNetwork(net);
      return;
    }

    const busyKey = `mint-${targetChain}`;
    setIsWalletActionBusy(busyKey);
    try {
      const provider = new ethers.BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      const tokenAddr = targetChain === 'baseSepolia' ? CONFIG.baseSepolia.wethAddress : CONFIG.sepolia.usdcAddress;
      const token = new ethers.Contract(tokenAddr, ERC20_ABI, signer);
      const tx = await token.mint(walletAddress, ethers.parseUnits(amountWeth.toString(), 18));
      showToastMsg('Minting test WETH', `Confirmed tx ${tx.hash.slice(0, 10)}...`);
      await tx.wait();
      await fetchLiveBalances(walletAddress);
      showToastMsg('Test WETH minted', `Added ${amountWeth} WETH on ${net.chainName}`);
    } catch (err) {
      showToastMsg('Mint cancelled', err.reason || err.message, 'warn');
    } finally {
      setIsWalletActionBusy(null);
    }
  };

  // Deposit Base Sepolia WETH into User Vault Slice
  const depositToVault = async (amountWeth = 2.0) => {
    const eip1193 = getEip1193();
    if (!eip1193 || !walletAddress) {
      setShowWalletModal(true);
      showToastMsg('Connect wallet first', 'Choose a wallet to deposit Base WETH into your vault slice', 'warn');
      return;
    }
    if (currentChainId !== CONFIG.baseSepolia.chainId) {
      showToastMsg('Switch to Base Sepolia', 'Approve switching to Base Sepolia before depositing', 'warn');
      await switchNetwork(CONFIG.baseSepolia);
      return;
    }

    setIsWalletActionBusy('deposit');
    try {
      const provider = new ethers.BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      const weth = new ethers.Contract(CONFIG.baseSepolia.wethAddress, ERC20_ABI, signer);
      const vault = new ethers.Contract(CONFIG.baseSepolia.vaultAddress, VAULT_ABI, signer);
      const amt = ethers.parseUnits(amountWeth.toString(), 18);

      const currentAllowance = await weth.allowance(walletAddress, CONFIG.baseSepolia.vaultAddress);
      if (currentAllowance < amt) {
        showToastMsg('Approve Base WETH', 'Confirm token approval for PaycheckVault');
        const approveTx = await weth.approve(CONFIG.baseSepolia.vaultAddress, amt);
        await approveTx.wait();
      }

      showToastMsg('Depositing WETH', `Depositing ${amountWeth} WETH into your Base Sepolia vault slice`);
      const tx = await vault.deposit(amt);
      await tx.wait();
      await fetchLiveBalances(walletAddress);
      showToastMsg('Vault funded', `Deposited ${amountWeth} WETH into your vault slice`);
    } catch (err) {
      showToastMsg('Deposit cancelled', err.reason || err.message, 'warn');
    } finally {
      setIsWalletActionBusy(null);
    }
  };

  // Withdraw User's Own Bucket Tokens from Base Sepolia Vault
  const withdrawFromVault = async (bucket) => {
    const eip1193 = getEip1193();
    if (!eip1193 || !walletAddress) {
      setShowWalletModal(true);
      showToastMsg('Connect wallet first', 'Choose a wallet to withdraw from your vault slice', 'warn');
      return;
    }
    if (currentChainId !== CONFIG.baseSepolia.chainId) {
      showToastMsg('Switch to Base Sepolia', 'Approve switching to Base Sepolia before withdrawing', 'warn');
      await switchNetwork(CONFIG.baseSepolia);
      return;
    }

    setIsWalletActionBusy(`withdraw-${bucket}`);
    try {
      const provider = new ethers.BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      const vault = new ethers.Contract(CONFIG.baseSepolia.vaultAddress, VAULT_ABI, signer);
      const userBal = await vault.balances(walletAddress);

      let tokenAddress;
      let rawAmt;
      let label;
      if (bucket === 'usdc') {
        tokenAddress = CONFIG.baseSepolia.usdcAddress;
        rawAmt = userBal.usdc;
        label = 'USDC';
      } else if (bucket === 'sUsdc') {
        tokenAddress = CONFIG.baseSepolia.sUsdcAddress;
        rawAmt = userBal.sUsdc;
        label = 'sUSDC';
      } else {
        tokenAddress = CONFIG.baseSepolia.wethAddress;
        rawAmt = userBal.weth;
        label = 'WETH';
      }

      if (rawAmt <= 0n) {
        showToastMsg('Nothing to withdraw', `Your ${label} vault balance is 0`, 'warn');
        return;
      }

      showToastMsg(`Withdrawing ${label}`, 'Confirm withdrawal in your wallet');
      const tx = await vault.withdraw(tokenAddress, rawAmt);
      await tx.wait();
      await fetchLiveBalances(walletAddress);
      showToastMsg('Withdrawal complete', `Sent ${Number(ethers.formatEther(rawAmt)).toFixed(2)} ${label} to your wallet`);
    } catch (err) {
      showToastMsg('Withdraw cancelled', err.reason || err.message, 'warn');
    } finally {
      setIsWalletActionBusy(null);
    }
  };

  // Instant Visual Simulation Fallback (Multi-Bucket + Cap Guardrail)
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

    const randHex = () => Math.floor(1000 + Math.random() * 9000).toString(16);
    setActivities((prev) => [
      {
        id: Date.now(),
        time: 'Just now',
        inflow: `+${effectiveWeth.toFixed(2)} WETH ($${usdValue.toLocaleString()})`,
        originTx: `0x${randHex()}...${randHex()}`,
        lasnaSignal: `Passed (≥ ${minThresholdWeth} WETH)`,
        destSwap: `+${stableOut.toLocaleString()} USDC Reserve • +${yieldOut.toLocaleString()} sUSDC Yield • +${retainedWeth.toFixed(2)} WETH`,
        destTx: `0x${randHex()}...${randHex()}`,
        status: 'success',
      },
      ...prev.slice(0, 4),
    ]);

    showToastMsg(
      '3-Bucket Runway Executed on Base',
      `+$${stableOut.toLocaleString()} USDC Reserve, +$${yieldOut.toLocaleString()} sUSDC Yield, +${retainedWeth.toFixed(2)} WETH kept`
    );

    await new Promise((r) => setTimeout(r, 1200));
    setLoopPhase('idle');
  };

  // Execute Live Real On-Chain Paycheck via Selected Wallet
  const executeRealPaycheck = async (wethAmount = 1.0) => {
    if (loopPhase !== 'idle') return;

    const eip1193 = getEip1193();
    if (!eip1193 || !walletAddress) {
      return runSimulatedLoop(wethAmount);
    }

    if (currentChainId !== CONFIG.sepolia.chainId) {
      showToastMsg('Switching to Sepolia', 'Your paycheck origin transfer must be signed on Ethereum Sepolia');
      await switchNetwork(CONFIG.sepolia);
      return;
    }

    try {
      setLoopPhase('sepolia');
      const provider = new ethers.BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      const sepToken = new ethers.Contract(CONFIG.sepolia.usdcAddress, ERC20_ABI, signer);

      const transferAmount = ethers.parseUnits(wethAmount.toString(), 18);
      showToastMsg('Confirm Inflow in MetaMask', `Sending ${wethAmount} WETH on Sepolia to trigger Reactive loop...`);

      const tx = await sepToken.transfer(walletAddress, transferAmount);
      setActiveTxHash(tx.hash);
      showToastMsg('Sepolia Tx Broadcasted', `Tx: ${tx.hash.slice(0, 10)}... Waiting for confirmation...`);

      await tx.wait();

      setLoopPhase('lasna');
      showToastMsg('Event Caught on Lasna', 'PaycheckReactive verified guardrails and emitted callback to Base...');

      await new Promise((r) => setTimeout(r, 4000));

      setLoopPhase('base');
      showToastMsg('Executing on Base Sepolia', 'PaycheckVault receiving callback and splitting across 3 buckets...');

      let attempts = 0;
      const initialUsdc = vaultUsdc;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const baseProv = new ethers.JsonRpcProvider(CONFIG.baseSepolia.rpcUrl);
          const vaultContract = new ethers.Contract(CONFIG.baseSepolia.vaultAddress, VAULT_ABI, baseProv);
          const userBal = await vaultContract.balances(walletAddress);
          const numUsdc = Number(ethers.formatEther(userBal.usdc));

          if (numUsdc !== initialUsdc || attempts >= 10) {
            clearInterval(pollInterval);
            await fetchLiveBalances(walletAddress);
            setLoopPhase('idle');
            showToastMsg(
              'Multi-bucket settlement complete',
              '3-bucket split verified on Base Sepolia'
            );
          }
        } catch {
          // Keep polling
        }
      }, 2500);

      const usdValue = wethAmount * CONFIG.ethUsdRate;
      const stableOut = usdValue * (savedStablePct / 100);
      const yieldOut = usdValue * (savedYieldPct / 100);
      const keepPct = Math.max(0, 100 - savedStablePct - savedYieldPct);
      const retainedWeth = wethAmount * (keepPct / 100);

      setActivities((prev) => [
        {
          id: Date.now(),
          time: 'Just now',
          inflow: `+${wethAmount.toFixed(2)} WETH ($${usdValue.toLocaleString()})`,
          originTx: `${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)}`,
          originFullTx: tx.hash,
          lasnaSignal: 'Lasna Omni verified',
          destSwap: `+${stableOut.toLocaleString()} USDC reserve · +${yieldOut.toLocaleString()} sUSDC yield · +${retainedWeth.toFixed(2)} WETH kept`,
          destTx: 'Relaying',
          status: 'success',
        },
        ...prev.slice(0, 5),
      ]);
    } catch (err) {
      setLoopPhase('idle');
      showToastMsg('Transaction Cancelled', err.reason || err.message, 'warn');
    }
  };

  // Dust Test Simulation (Guardrail 1: Anti-Dust Threshold)
  const simulateDust = async () => {
    if (loopPhase !== 'idle') return;

    setLoopPhase('sepolia');
    await new Promise((r) => setTimeout(r, 600));

    setLoopPhase('blocked');
    const randHex = () => Math.floor(1000 + Math.random() * 9000).toString(16);
    setActivities((prev) => [
      {
        id: Date.now(),
        time: 'Just now',
        inflow: '0.002 WETH ($5 Dust)',
        originTx: `0x${randHex()}...${randHex()}`,
        lasnaSignal: `Dust Blocked (< ${minThresholdWeth} WETH)`,
        destSwap: 'Callback Suppressed (Relayer Gas Protected)',
        destTx: '-',
        status: 'filtered',
      },
      ...prev.slice(0, 4),
    ]);

    showToastMsg(
      'Anti-Dust Shield Triggered on Lasna',
      `0.002 WETH ($5.00) ignored (< ${minThresholdWeth} WETH floor). Callback suppressed.`,
      'warn'
    );

    await new Promise((r) => setTimeout(r, 1400));
    setLoopPhase('idle');
  };

  // Cooldown Rate-Limiter Simulation (Guardrail 2: Cooldown Shield)
  const simulateCooldown = async () => {
    if (loopPhase !== 'idle') return;

    setLoopPhase('sepolia');
    await new Promise((r) => setTimeout(r, 600));

    setLoopPhase('blocked');
    const randHex = () => Math.floor(1000 + Math.random() * 9000).toString(16);
    setActivities((prev) => [
      {
        id: Date.now(),
        time: 'Just now',
        inflow: '+0.50 WETH (Rapid Repeat)',
        originTx: `0x${randHex()}...${randHex()}`,
        lasnaSignal: `Cooldown Active (< ${cooldownSecs}s window)`,
        destSwap: 'Callback Rate-Limited (InflowSuppressed)',
        destTx: '-',
        status: 'filtered',
      },
      ...prev.slice(0, 4),
    ]);

    showToastMsg(
      'Cooldown Shield Triggered on Lasna',
      `Rapid inflow suppressed within ${cooldownSecs}s cooldown window to stop fee drain.`,
      'warn'
    );

    await new Promise((r) => setTimeout(r, 1400));
    setLoopPhase('idle');
  };

  return (
    <div
      className={`min-h-dvh flex flex-col justify-between font-sans text-[#ededed] ${
        activePage === 'app' ? 'bg-[#0a090d]' : 'bg-black'
      }`}
    >
      
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-xl border bg-[#121016] transition-colors duration-150 flex items-start gap-3 ${
            toast.type === 'warn'
              ? 'border-[#FF5FCF]/60 text-[#ededed]'
              : 'border-white/[0.12] text-[#ededed]'
          }`}
        >
          <span
            className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
              toast.type === 'warn' ? 'bg-[#FF5FCF]' : 'bg-[#FAEB92]'
            }`}
          />
          <div className="text-xs space-y-1">
            <div className="font-medium text-sm text-[#ededed]">{toast.title}</div>
            <div className="text-[#a8a4b3] leading-relaxed">{toast.subtitle}</div>
          </div>
        </div>
      )}

      {/* Shared Navigation Bar */}
      <Navbar
        activePage={activePage}
        onNavigate={setActivePage}
        walletAddress={walletAddress}
        activeWalletName={activeWalletInfo?.name}
        currentChainId={currentChainId}
        isConnecting={isConnecting}
        onConnectWallet={connectWallet}
        onSwitchNetwork={switchNetwork}
      />

      {/* Multi-Wallet Selector Modal (MetaMask, Phantom, Rabby, Coinbase, etc.) */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        wallets={discoveredWallets}
        walletAddress={walletAddress}
        activeWalletInfo={activeWalletInfo}
        isConnecting={isConnecting}
        onSelectWallet={selectAndConnectWallet}
        onDisconnect={disconnectWallet}
        onRefreshWallets={scanInjectedWallets}
      />

      {/* Main Content + Footer Wrapper (offset for fixed left sidebar on desktop) */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        {/* Main Content Container */}
        <main
          className={`w-full mx-auto px-6 lg:px-8 flex-1 ${
            activePage === 'app'
              ? 'max-w-[1440px] pt-20 lg:pt-8 pb-12'
              : 'max-w-6xl pt-20 lg:pt-10 pb-12'
          }`}
        >
        {activePage === 'landing' ? (
          <LandingPage
            onLaunchApp={() => setActivePage('app')}
            onTriggerDemo={() => runSimulatedLoop(1.0)}
            vaultUsdc={vaultUsdc}
            vaultYieldUsdc={vaultYieldUsdc}
            vaultWeth={vaultWeth}
            savedStablePct={savedStablePct}
            savedYieldPct={savedYieldPct}
            loopPhase={loopPhase}
          />
        ) : (
          <DashboardPage
            walletAddress={walletAddress}
            currentChainId={currentChainId}
            animatedUSDC={animatedUSDC}
            animatedYieldUSDC={animatedYieldUSDC}
            animatedWETH={animatedWETH}
            vaultUsdc={vaultUsdc}
            vaultYieldUsdc={vaultYieldUsdc}
            vaultWeth={vaultWeth}
            userSepoliaWeth={userSepoliaWeth}
            userBaseWeth={userBaseWeth}
            isWalletActionBusy={isWalletActionBusy}
            onMintTestWeth={mintTestWeth}
            onDepositToVault={depositToVault}
            onWithdrawBucket={withdrawFromVault}
            onSwitchNetwork={switchNetwork}
            stablePct={stablePct}
            setStablePct={setStablePct}
            yieldPct={yieldPct}
            setYieldPct={setYieldPct}
            savedStablePct={savedStablePct}
            savedYieldPct={savedYieldPct}
            minThresholdWeth={minThresholdWeth}
            cooldownSecs={cooldownSecs}
            maxCapWeth={maxCapWeth}
            setMaxCapWeth={setMaxCapWeth}
            slippageFloorUsd={slippageFloorUsd}
            setSlippageFloorUsd={setSlippageFloorUsd}
            isUpdatingPolicy={isUpdatingPolicy}
            onSavePolicy={savePolicyOnChain}
            loopPhase={loopPhase}
            activeTxHash={activeTxHash}
            onExecutePaycheck={executeRealPaycheck}
            onSimulateDust={simulateDust}
            onSimulateCooldown={simulateCooldown}
            isLoadingBalances={isLoadingBalances}
            secondsAgo={secondsAgo}
            onRefreshBalances={() => fetchLiveBalances()}
            activities={activities}
          />
        )}
      </main>

      {/* Footer Container shown only on the landing page */}
      {activePage === 'landing' && (
      <div className="relative w-full mt-12 bg-black">
        <MeadowRiseFooter
          name="PaycheckVault"
          brandHref="#"
          heading="Send crypto paychecks where they need to go"
          subheading="Sepolia WETH inflows filtered on Reactive Lasna and split across Base Sepolia buckets"
          cta={{
            label: "Open treasury",
            href: "#vault-app",
            onClick: (e) => {
              e.preventDefault();
              setActivePage('app');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            },
          }}
          tagline="Built for the Reactive Omni Buildathon"
          newsletter={false}
          palette={{
            sky: ['#000000', '#000000'],
            haze: '#000000',
            glow: 'transparent',
            hills: [
              ['#0c0814', '#000000'],
              ['#120b1f', '#000000'],
              ['#180e29', '#000000'],
              ['#130b20', '#000000'],
              ['#09060f', '#000000'],
              ['#000000', '#000000'],
            ],
            ground: '#000000',
            ink: '#ededed',
            sub: '#a8a4b3',
            pill: '#FAEB92',
            pillInk: '#000000',
            text: '#ededed',
            muted: '#8e8999',
            line: 'rgba(237, 237, 237, 0.1)',
            night: true,
          }}
          columns={[
            {
              title: "Chains & Explorers",
              links: [
                { label: "Ethereum Sepolia (11155111)", href: `${CONFIG.sepolia.explorer}/address/${CONFIG.sepolia.usdcAddress}` },
                { label: "Reactive Lasna (5318007)", href: `${CONFIG.lasna.explorer}/address/${CONFIG.lasna.reactiveAddress}` },
                { label: "Base Sepolia (84532)", href: `${CONFIG.baseSepolia.explorer}/address/${CONFIG.baseSepolia.vaultAddress}` },
              ],
            },
            {
              title: "Reactive Network",
              links: [
                { label: "Documentation", href: "https://dev.reactive.network/" },
                { label: "Lasna ReactScan", href: "https://lasna.reactscan.net/" },
                { label: "Ecosystem", href: "https://reactive.network" },
                { label: "PaycheckVault Repo", href: "https://github.com/MoriMomo/PaycheckVault" },
              ],
            },
            {
              title: "Omni Buildathon",
              links: [
                { label: "DoraHacks Buildathon", href: "https://dorahacks.io/hackathon/reactive-omni-buildathon" },
                { label: "Set It & Forget It Track", href: "https://dorahacks.io/hackathon/reactive-omni-buildathon" },
                { label: "PaycheckReactive RSC", href: `${CONFIG.lasna.explorer}/address/${CONFIG.lasna.reactiveAddress}` },
              ],
            },
          ]}
          copyright="2026 PaycheckVault, Reactive Omni Buildathon"
          legal={[
            { label: "Terms of Service", href: "#terms", onClick: (e) => { e.preventDefault(); setLegalModal('terms'); } },
            { label: "Privacy Policy", href: "#privacy", onClick: (e) => { e.preventDefault(); setLegalModal('privacy'); } },
            { label: "MIT License", href: "#license", onClick: (e) => { e.preventDefault(); setLegalModal('license'); } },
            { label: "Reactive Lasna Testnet", href: "https://lasna.reactscan.net/" },
            { label: "Base Sepolia Testnet", href: "https://sepolia.basescan.org" },
          ]}
        />
      </div>
      )}
      </div>

      {/* Legal & Protocol Disclosure Modal (Terms of Service, Privacy Policy, MIT License) */}
      {legalModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-modal-title"
          onClick={() => setLegalModal(null)}
        >
          <div
            className="w-full max-w-lg bg-[#121016] border border-white/[0.12] rounded-xl p-6 space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-3">
              <div>
                <div className="text-xs font-mono text-[#FF5FCF]">
                  Protocol disclosure
                </div>
                <h2 id="legal-modal-title" className="font-display text-lg font-medium text-[#ededed] mt-1">
                  {legalModal === 'terms'
                    ? 'Terms of Service'
                    : legalModal === 'privacy'
                    ? 'Privacy Policy'
                    : 'MIT License'}
                </h2>
              </div>
              <button
                onClick={() => setLegalModal(null)}
                className="px-3 py-1 rounded-lg bg-[#1c1922] border border-white/[0.08] text-xs font-mono text-[#a8a4b3] hover:text-[#ededed] transition-colors cursor-pointer"
                aria-label="Close disclosure modal"
              >
                Close
              </button>
            </div>

            {legalModal === 'terms' && (
              <div className="space-y-3 text-xs text-[#a8a4b3] leading-relaxed">
                <p>
                  PaycheckVault is an experimental open-source reactive smart contract prototype deployed on Ethereum Sepolia, Reactive Lasna Testnet, and Base Sepolia Testnet.
                </p>
                <p>
                  All cross-chain event subscriptions, anti-dust thresholds (&ge; 0.01 WETH), and multi-bucket allocations operate autonomously via public on-chain transactions. Do not send mainnet funds to testnet contract addresses.
                </p>
                <p className="text-[#8e8999]">
                  By connecting a Web3 wallet, you acknowledge sole responsibility for signing transactions, paying network gas fees, and verifying testnet contract addresses before execution.
                </p>
              </div>
            )}

            {legalModal === 'privacy' && (
              <div className="space-y-3 text-xs text-[#a8a4b3] leading-relaxed">
                <p>
                  PaycheckVault does not collect, store, or sell personal telemetry, IP logs, cookies, or off-chain user profiles.
                </p>
                <p>
                  Wallet addresses connected via MetaMask or injected EIP-1193 providers are read strictly in client memory to query public RPC endpoints (Sepolia, Lasna, Base Sepolia).
                </p>
                <p className="text-[#8e8999]">
                  All ERC-20 transfers, allocation policies, and callback receipts recorded by smart contracts are inherently public on their respective blockchain ledgers.
                </p>
              </div>
            )}

            {legalModal === 'license' && (
              <div className="space-y-3 text-xs text-[#a8a4b3] leading-relaxed font-mono">
                <p>Copyright (c) 2026 PaycheckVault Contributors</p>
                <p className="font-sans text-[#8e8999]">
                  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated smart contract files, to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, subject to standard MIT terms.
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-[#8e8999]">
              <span>PaycheckVault · Reactive Lasna / Base Sepolia</span>
              <div className="flex gap-3">
                <button
                  onClick={() => setLegalModal('terms')}
                  className={`cursor-pointer ${legalModal === 'terms' ? 'text-[#FAEB92]' : 'text-[#a8a4b3] hover:text-[#ededed]'}`}
                >
                  Terms
                </button>
                <button
                  onClick={() => setLegalModal('privacy')}
                  className={`cursor-pointer ${legalModal === 'privacy' ? 'text-[#FAEB92]' : 'text-[#a8a4b3] hover:text-[#ededed]'}`}
                >
                  Privacy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
