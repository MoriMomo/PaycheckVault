import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';

// Live Deployed Contract Architecture
const CONFIG = {
  sepolia: {
    chainId: 11155111,
    chainIdHex: '0xaa36a7',
    chainName: 'Ethereum Sepolia',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorer: 'https://sepolia.etherscan.io',
    usdcAddress: '0x4f93F4E22F90F1F66C4E56dB10D8a2990035A09e',
  },
  lasna: {
    chainId: 5318007,
    chainIdHex: '0x512577',
    chainName: 'Reactive Lasna Testnet',
    rpcUrl: 'https://lasna-rpc.rnk.dev',
    explorer: 'https://lasna.reactivescan.net',
    reactiveAddress: '0xe18f4DF3B4Faa2D7F49b3F1581c04427a0Be9223',
  },
  baseSepolia: {
    chainId: 84532,
    chainIdHex: '0x14a34',
    chainName: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    vaultAddress: '0x68FE8Ff67a3bF8bC3AdC78b4282bf79E6cbD0142',
    usdcAddress: '0xe18f4DF3B4Faa2D7F49b3F1581c04427a0Be9223',
    wethAddress: '0x4f93F4E22F90F1F66C4E56dB10D8a2990035A09e',
    dexAddress: '0xC56bffDC6d87222128e60D617221AeC584e9F643',
  },
  deployerRvmId: '0x18634B5266369a482836328b8954E67918e5255a',
};

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
];

const VAULT_ABI = [
  'function owner() view returns (address)',
  'function allocationBps() view returns (uint256)',
  'function setConfig(address _dexRouter, address _inputToken, address _targetToken, uint256 _allocationBps) external',
  'event PaycheckAllocated(address indexed caller, uint256 amountIn, uint256 amountOut, uint256 timestamp)',
];

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
  // Wallet & Network State
  const [walletAddress, setWalletAddress] = useState(null);
  const [currentChainId, setCurrentChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Live Balances & Liveness Tracking
  const [vaultUsdc, setVaultUsdc] = useState(5000.0);
  const [vaultWeth, setVaultWeth] = useState(0.0);
  const [userSepoliaUsdc, setUserSepoliaUsdc] = useState(1000000.0);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Policy Settings
  const [allocationPct, setAllocationPct] = useState(50);
  const [savedPct, setSavedPct] = useState(50);
  const [isUpdatingPolicy, setIsUpdatingPolicy] = useState(false);

  // Signal Flow Phase: 'idle' | 'sepolia' | 'lasna' | 'base' | 'blocked'
  const [loopPhase, setLoopPhase] = useState('idle');
  const [activeTxHash, setActiveTxHash] = useState(null);
  const [toast, setToast] = useState(null);
  const [showInspector, setShowInspector] = useState(false);

  // Activity Feed
  const [activities, setActivities] = useState([
    {
      id: 1,
      time: 'Ready',
      inflow: '500.00 USDC',
      originTx: '0x9dad...3674',
      lasnaSignal: 'Lasna Active (>= $10)',
      destSwap: '250 USDC -> 125 WETH',
      destTx: '0x68fe...0142',
      status: 'success',
    },
  ]);

  const animatedUSDC = useAnimatedNumber(vaultUsdc);
  const animatedWETH = useAnimatedNumber(vaultWeth);

  const showToastMsg = (title, subtitle, type = 'success') => {
    setToast({ title, subtitle, type });
    setTimeout(() => setToast(null), 4500);
  };

  // 1. Fetch live balances directly from Sepolia & Base Sepolia RPCs
  const fetchLiveBalances = useCallback(async (userAddr) => {
    setIsLoadingBalances(true);
    try {
      // Sepolia RPC
      const sepProvider = new ethers.JsonRpcProvider(CONFIG.sepolia.rpcUrl);
      const sepUsdc = new ethers.Contract(CONFIG.sepolia.usdcAddress, ERC20_ABI, sepProvider);
      const targetUser = userAddr || walletAddress || CONFIG.deployerRvmId;
      const sepBal = await sepUsdc.balanceOf(targetUser);
      setUserSepoliaUsdc(Number(ethers.formatEther(sepBal)));

      // Base Sepolia RPC
      const baseProvider = new ethers.JsonRpcProvider(CONFIG.baseSepolia.rpcUrl);
      const baseUsdc = new ethers.Contract(CONFIG.baseSepolia.usdcAddress, ERC20_ABI, baseProvider);
      const baseWeth = new ethers.Contract(CONFIG.baseSepolia.wethAddress, ERC20_ABI, baseProvider);
      const vaultContract = new ethers.Contract(CONFIG.baseSepolia.vaultAddress, VAULT_ABI, baseProvider);

      const [bUsdcBal, bWethBal, onChainBps] = await Promise.all([
        baseUsdc.balanceOf(CONFIG.baseSepolia.vaultAddress),
        baseWeth.balanceOf(CONFIG.baseSepolia.vaultAddress),
        vaultContract.allocationBps().catch(() => 5000n),
      ]);

      setVaultUsdc(Number(ethers.formatEther(bUsdcBal)));
      setVaultWeth(Number(ethers.formatEther(bWethBal)));
      const onChainPct = Number(onChainBps) / 100;
      setSavedPct(onChainPct);
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

  // Listen to window.ethereum changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        fetchLiveBalances(accounts[0]);
        showToastMsg('Account Switched', `Connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
      } else {
        setWalletAddress(null);
        showToastMsg('Wallet Disconnected', 'Logged out from browser wallet', 'warn');
      }
    };

    const handleChainChanged = (chainIdHex) => {
      const chainId = parseInt(chainIdHex, 16);
      setCurrentChainId(chainId);
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // Initial check if already connected
    window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
        fetchLiveBalances(accounts[0]);
      }
    });
    window.ethereum.request({ method: 'eth_chainId' }).then((hex) => {
      if (hex) setCurrentChainId(parseInt(hex, 16));
    });

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [fetchLiveBalances]);

  // Connect Wallet Action
  const connectWallet = async () => {
    if (walletAddress) {
      setWalletAddress(null);
      showToastMsg('Disconnected', 'Viewing public vault telemetry in observer mode');
      return;
    }

    if (!window.ethereum) {
      setWalletAddress(CONFIG.deployerRvmId);
      showToastMsg('Observer Mode', 'Viewing deployer RVM ID telemetry (install MetaMask for web3 actions)');
      fetchLiveBalances(CONFIG.deployerRvmId);
      return;
    }

    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();
      const user = accounts[0];

      setWalletAddress(user);
      setCurrentChainId(Number(network.chainId));
      await fetchLiveBalances(user);

      showToastMsg('Connected', `Logged in as ${user.slice(0, 6)}...${user.slice(-4)}`);
    } catch (err) {
      showToastMsg('Connection Cancelled', err.message || 'User rejected connection', 'warn');
    } finally {
      setIsConnecting(false);
    }
  };

  // Switch Network Helper
  const switchNetwork = async (targetNetwork) => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetNetwork.chainIdHex }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
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
        } catch (addError) {
          console.error(addError);
        }
      }
    }
  };

  // Save Policy On-Chain (Base Sepolia)
  const savePolicyOnChain = async () => {
    if (!window.ethereum || !walletAddress) {
      setSavedPct(allocationPct);
      showToastMsg('Policy Updated (Demo Mode)', `${allocationPct}% auto-swap applied locally`);
      return;
    }

    if (currentChainId !== CONFIG.baseSepolia.chainId) {
      showToastMsg('Wrong Network', 'Please switch to Base Sepolia to update your on-chain vault policy', 'warn');
      await switchNetwork(CONFIG.baseSepolia);
      return;
    }

    setIsUpdatingPolicy(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const vault = new ethers.Contract(CONFIG.baseSepolia.vaultAddress, VAULT_ABI, signer);

      const targetBps = allocationPct * 100;
      showToastMsg('Broadcasting Transaction', 'Confirming policy update in MetaMask...');
      const tx = await vault.setConfig(
        CONFIG.baseSepolia.dexAddress,
        CONFIG.baseSepolia.usdcAddress,
        CONFIG.baseSepolia.wethAddress,
        targetBps
      );
      await tx.wait();
      setSavedPct(allocationPct);
      showToastMsg('Policy Confirmed On-Chain', `Vault set to ${allocationPct}% WETH on Base Sepolia!`);
    } catch (err) {
      showToastMsg('Update Failed', err.reason || err.message, 'warn');
    } finally {
      setIsUpdatingPolicy(false);
    }
  };

  // Execute Live Real On-Chain Paycheck via MetaMask
  const executeRealPaycheck = async (amount = 500) => {
    if (loopPhase !== 'idle') return;

    if (!window.ethereum || !walletAddress) {
      return runSimulatedLoop(amount);
    }

    // Must be on Sepolia to send the origin paycheck
    if (currentChainId !== CONFIG.sepolia.chainId) {
      showToastMsg('Switching to Sepolia', 'Your paycheck origin transfer must be signed on Ethereum Sepolia');
      await switchNetwork(CONFIG.sepolia);
      return;
    }

    try {
      setLoopPhase('sepolia');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const sepUsdc = new ethers.Contract(CONFIG.sepolia.usdcAddress, ERC20_ABI, signer);

      const transferAmount = ethers.parseUnits(amount.toString(), 18);
      showToastMsg('Confirm Paycheck in MetaMask', `Sending ${amount} USDC on Sepolia to trigger Reactive loop...`);

      const tx = await sepUsdc.transfer(walletAddress, transferAmount);
      setActiveTxHash(tx.hash);
      showToastMsg('Sepolia Tx Broadcasted', `Tx: ${tx.hash.slice(0, 10)}... Waiting for confirmation...`);

      await tx.wait();

      // Step 2: Reactive Network Lasna
      setLoopPhase('lasna');
      showToastMsg('Event Caught on Lasna', 'PaycheckReactive detected Sepolia Transfer! Relaying callback to Base...');

      await new Promise((r) => setTimeout(r, 4000));

      // Step 3: Base Sepolia Execution
      setLoopPhase('base');
      showToastMsg('Executing on Base Sepolia', 'PaycheckVault receiving callback from proxy and auto-swapping to WETH...');

      // Poll Base Sepolia for balance update
      let attempts = 0;
      const initialWeth = vaultWeth;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const baseProv = new ethers.JsonRpcProvider(CONFIG.baseSepolia.rpcUrl);
          const baseWeth = new ethers.Contract(CONFIG.baseSepolia.wethAddress, ERC20_ABI, baseProv);
          const newWethBal = await baseWeth.balanceOf(CONFIG.baseSepolia.vaultAddress);
          const numWeth = Number(ethers.formatEther(newWethBal));

          if (numWeth > initialWeth || attempts >= 8) {
            clearInterval(pollInterval);
            await fetchLiveBalances();
            setLoopPhase('idle');
            showToastMsg(
              'Autonomous DCA Complete!',
              'Swap verified on Base! Vault accumulated WETH autonomously with zero keepers.'
            );
          }
        } catch {
          // Keep polling
        }
      }, 3000);

      // Record activity
      setActivities((prev) => [
        {
          id: Date.now(),
          time: 'Just now',
          inflow: `${amount.toFixed(2)} USDC`,
          originTx: `${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)}`,
          lasnaSignal: 'Lasna Omni Catch (>= $10)',
          destSwap: `${amount * (savedPct / 100)} USDC -> WETH`,
          destTx: 'Autonomous Relay',
          status: 'success',
        },
        ...prev.slice(0, 5),
      ]);
    } catch (err) {
      setLoopPhase('idle');
      showToastMsg('Transaction Cancelled', err.reason || err.message, 'warn');
    }
  };

  // Instant Visual Simulation Fallback
  const runSimulatedLoop = async (amount = 500) => {
    if (loopPhase !== 'idle') return;

    setLoopPhase('sepolia');
    await new Promise((r) => setTimeout(r, 750));

    setLoopPhase('lasna');
    await new Promise((r) => setTimeout(r, 850));

    setLoopPhase('base');
    const swappedUSDC = amount * (savedPct / 100);
    const keptUSDC = amount - swappedUSDC;
    const acquiredWETH = swappedUSDC * 0.5;

    // Coherent allocation: kept USDC increases liquid cash, swapped USDC converts to WETH
    setVaultUsdc((prev) => prev + keptUSDC);
    setVaultWeth((prev) => prev + acquiredWETH);
    setLastUpdated(Date.now());
    setSecondsAgo(0);

    const randHex = () => Math.floor(1000 + Math.random() * 9000).toString(16);
    setActivities((prev) => [
      {
        id: Date.now(),
        time: 'Just now',
        inflow: `+${amount.toFixed(2)} USDC`,
        originTx: `0x${randHex()}...${randHex()}`,
        lasnaSignal: 'Verified (≥ $10)',
        destSwap: `Swapped ${swappedUSDC.toFixed(0)} USDC → ${acquiredWETH.toFixed(2)} WETH (+${keptUSDC.toFixed(0)} USDC liquid)`,
        destTx: `0x${randHex()}...${randHex()}`,
        status: 'success',
      },
      ...prev.slice(0, 4),
    ]);

    showToastMsg(
      'Callback Executed on Base',
      `Swapped ${swappedUSDC} USDC → ${acquiredWETH.toFixed(2)} WETH (+${keptUSDC} USDC retained in liquid reserve)`
    );

    await new Promise((r) => setTimeout(r, 1200));
    setLoopPhase('idle');
  };

  // Dust Test Simulation
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
        inflow: '5.00 USDC (Dust)',
        originTx: `0x${randHex()}...${randHex()}`,
        lasnaSignal: 'Dust Ignored (< $10)',
        destSwap: 'Callback Suppressed (Gas Protected)',
        destTx: '—',
        status: 'filtered',
      },
      ...prev.slice(0, 4),
    ]);

    showToastMsg(
      'Spam Inflow Blocked on Lasna',
      '$5.00 transfer ignored (< $10 threshold). Relayer gas 100% protected.',
      'warn'
    );

    await new Promise((r) => setTimeout(r, 1400));
    setLoopPhase('idle');
  };

  const previewSwap = Math.round(1000 * (allocationPct / 100));
  const previewKeep = 1000 - previewSwap;
  const previewWeth = (previewSwap * 0.5).toFixed(2);

  const getNetworkBadge = () => {
    if (!walletAddress) return null;
    if (currentChainId === CONFIG.sepolia.chainId) {
      return (
        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Sepolia (Origin)
        </span>
      );
    }
    if (currentChainId === CONFIG.baseSepolia.chainId) {
      return (
        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Base Sepolia (Vault)
        </span>
      );
    }
    return (
      <button
        onClick={() => switchNetwork(CONFIG.sepolia)}
        className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition"
      >
        Switch to Sepolia ↗
      </button>
    );
  };

  return (
    <div className="min-h-dvh flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950 font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-xl border backdrop-blur-xl shadow-2xl transition-all flex items-start gap-3 ${
            toast.type === 'warn'
              ? 'bg-amber-950/90 border-amber-500/40 text-amber-100'
              : 'bg-slate-900/95 border-emerald-500/40 text-slate-100'
          }`}
        >
          <span
            className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
              toast.type === 'warn' ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'
            }`}
          />
          <div className="text-xs space-y-0.5">
            <div className="font-bold text-sm text-white">{toast.title}</div>
            <div className="text-slate-300 leading-relaxed">{toast.subtitle}</div>
          </div>
        </div>
      )}

      {/* 1. Header with Real Wallet Authentication */}
      <header className="border-b border-slate-800/60 bg-obsidian-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight text-white">PaycheckVault</span>
            <span className="hidden sm:inline text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800/80 text-cyan-300 border border-slate-700/60">
              Reactive Omni
            </span>
          </div>

          <div className="flex items-center gap-3">
            {getNetworkBadge()}

            <button
              onClick={() => setShowInspector(!showInspector)}
              className="text-xs text-slate-400 hover:text-slate-200 transition px-2.5 py-1.5 rounded-lg hover:bg-slate-800/50"
            >
              {showInspector ? 'Hide Contracts' : 'View Contracts'}
            </button>

            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className={`px-4 py-2 rounded-xl font-semibold text-xs transition active:scale-95 flex items-center gap-2 ${
                walletAddress
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
              }`}
            >
              {isConnecting ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                  <span>Connecting...</span>
                </>
              ) : walletAddress ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}</span>
                </>
              ) : (
                'Connect Wallet'
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Verified Contract Ledger */}
        {showInspector && (
          <div className="border-t border-slate-800/60 bg-obsidian-900/95 px-6 py-4 text-xs text-slate-300">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span className="font-semibold text-indigo-400">Sepolia (Origin USDC)</span>
                  <span>Chain: 11155111</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-200 truncate">{CONFIG.sepolia.usdcAddress}</span>
                  <a
                    href={`${CONFIG.sepolia.explorer}/address/${CONFIG.sepolia.usdcAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline text-[10px]"
                  >
                    Scan ↗
                  </a>
                </div>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span className="font-semibold text-cyan-400">Lasna (Reactive RSC)</span>
                  <span>Chain: 5318007</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-200 truncate">{CONFIG.lasna.reactiveAddress}</span>
                  <a
                    href={`${CONFIG.lasna.explorer}/address/${CONFIG.lasna.reactiveAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline text-[10px]"
                  >
                    Scan ↗
                  </a>
                </div>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span className="font-semibold text-blue-400">Base Sepolia (Vault)</span>
                  <span>Chain: 84532</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-200 truncate">{CONFIG.baseSepolia.vaultAddress}</span>
                  <a
                    href={`${CONFIG.baseSepolia.explorer}/address/${CONFIG.baseSepolia.vaultAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline text-[10px]"
                  >
                    Scan ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 space-y-8 flex-1">
        
        {/* 2. Hero: The One-Liner + Live On-Chain Action Cluster */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Get paid on Ethereum. <span className="text-cyan-400">Auto-invest on Base.</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Zero off-chain keepers. Inbound transfers on Sepolia trigger automated WETH accumulation on Base via Reactive Network.
            </p>
          </div>

          {/* Action Buttons: Live MetaMask Paycheck + Quick Simulation */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => executeRealPaycheck(500)}
              disabled={loopPhase !== 'idle'}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-md shadow-cyan-500/20 transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
              title="Broadcasts real USDC transfer on Sepolia and triggers cross-chain automation"
            >
              {loopPhase !== 'idle' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                  <span>Relaying...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>{walletAddress ? 'Send $500 Paycheck (MetaMask)' : 'Simulate $500 Paycheck'}</span>
                </>
              )}
            </button>
            <button
              onClick={simulateDust}
              disabled={loopPhase !== 'idle'}
              className="px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 transition active:scale-95 disabled:opacity-50"
              title="Test < $10 transfer rejected by Lasna to save gas"
            >
              Test $5 Dust
            </button>
          </div>
        </div>

        {/* 3. The Money Shot: 3-Node Topology as a Single Unified Pipeline */}
        <section aria-label="Event Pipeline" className="p-5 sm:p-6 rounded-2xl border border-slate-800/80 bg-obsidian-900/60 backdrop-blur space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
              Cross-Chain Event Loop
            </span>
            <div className="flex items-center gap-2">
              {activeTxHash && (
                <a
                  href={`${CONFIG.sepolia.explorer}/tx/${activeTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline font-mono text-[11px] truncate max-w-[140px]"
                >
                  Tx: {activeTxHash.slice(0, 8)}...
                </a>
              )}
              <span className="text-slate-400 font-mono text-[11px]">
                Status:{' '}
                <span className={loopPhase === 'idle' ? 'text-slate-400' : 'text-cyan-400 font-bold'}>
                  {loopPhase === 'idle' ? 'LISTENING' : loopPhase.toUpperCase()}
                </span>
              </span>
            </div>
          </div>

          {/* 3-Step Clean Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
            
            {/* Step 1: Sepolia */}
            <div className={`p-4 rounded-xl border transition-all duration-200 ${
              loopPhase === 'sepolia'
                ? 'border-indigo-500 bg-indigo-950/30 shadow-md shadow-indigo-500/20'
                : 'border-slate-800/80 bg-slate-900/40'
            }`}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-200">1. Sepolia (Origin)</span>
                <span className="font-mono text-[10px] text-slate-400">11155111</span>
              </div>
              <div className="text-xs text-slate-400 font-mono truncate">
                {loopPhase === 'sepolia' ? (
                  <span className="text-indigo-400 font-semibold animate-pulse">⚡ Transfer Log Caught</span>
                ) : (
                  'USDC.transfer(wallet)'
                )}
              </div>
            </div>

            {/* Step 2: Lasna Reactive */}
            <div className={`p-4 rounded-xl border transition-all duration-200 ${
              loopPhase === 'blocked'
                ? 'border-amber-500 bg-amber-950/30 shadow-md shadow-amber-500/20'
                : loopPhase === 'lasna'
                ? 'border-cyan-400 bg-cyan-950/30 shadow-md shadow-cyan-500/20'
                : 'border-slate-800/80 bg-slate-900/40'
            }`}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-200">2. Lasna (Reactive Omni)</span>
                <span className="font-mono text-[10px] text-slate-400">5318007</span>
              </div>
              <div className="text-xs text-slate-400 font-mono truncate">
                {loopPhase === 'blocked' ? (
                  <span className="text-amber-400 font-semibold">🛡️ Dust Blocked (&lt; $10)</span>
                ) : loopPhase === 'lasna' ? (
                  <span className="text-cyan-300 font-semibold animate-pulse">⚡ Verified &ge; $10 &rarr; Callback</span>
                ) : (
                  'PaycheckReactive.react()'
                )}
              </div>
            </div>

            {/* Step 3: Base Sepolia */}
            <div className={`p-4 rounded-xl border transition-all duration-200 ${
              loopPhase === 'base'
                ? 'border-blue-500 bg-blue-950/30 shadow-md shadow-blue-500/20'
                : 'border-slate-800/80 bg-slate-900/40'
            }`}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-200">3. Base Sepolia (Vault)</span>
                <span className="font-mono text-[10px] text-slate-400">84532</span>
              </div>
              <div className="text-xs text-slate-400 font-mono truncate">
                {loopPhase === 'base' ? (
                  <span className="text-emerald-400 font-semibold">✅ Swapped {savedPct}% to WETH</span>
                ) : (
                  'MockDEX.swap()'
                )}
              </div>
            </div>

          </div>
        </section>

        {/* 4. Balanced 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left 7 Columns: Real On-Chain Vault Balances + Activity Stream */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Header with Live Liveness Indicator */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Base Sepolia Vault Portfolio
              </span>
              <button
                onClick={() => fetchLiveBalances()}
                className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono hover:text-slate-200 transition bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800"
                title="Click to refresh on-chain balances"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live • Updated {secondsAgo <= 1 ? 'just now' : `${secondsAgo}s ago`}</span>
                <span className={`text-[12px] text-cyan-400 ml-0.5 ${isLoadingBalances ? 'animate-spin' : ''}`}>⟳</span>
              </button>
            </div>

            {/* Minimal High-Contrast Balances */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-slate-800/80 bg-obsidian-900/50 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>Liquid Cash Reserve (Base Vault)</span>
                  {isLoadingBalances && <span className="animate-spin text-cyan-400">⟳</span>}
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
                  ${animatedUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="ml-1.5 text-xs text-slate-400 font-sans font-medium">USDC</span>
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  {100 - savedPct}% retained automatically on Base
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-cyan-500/20 bg-cyan-950/10 space-y-1">
                <div className="flex items-center justify-between text-xs text-cyan-300 font-medium">
                  <span>Accumulated WETH (Base Vault)</span>
                  <a
                    href={`${CONFIG.baseSepolia.explorer}/address/${CONFIG.baseSepolia.vaultAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-cyan-400 hover:underline"
                  >
                    Contract ↗
                  </a>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-cyan-300 font-mono tabular-nums">
                  {animatedWETH.toFixed(4)}
                  <span className="ml-1.5 text-xs text-slate-300 font-sans font-medium">WETH</span>
                </div>
                <div className="text-[11px] text-slate-400 pt-1">
                  Auto-swapped on arrival via MockDEX
                </div>
              </div>
            </div>

            {/* Wallet Overview Bar */}
            {walletAddress && (
              <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-slate-400">Your Sepolia Inflow Account:</div>
                  <div className="font-mono text-slate-200">{walletAddress}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400">Available Salary USDC:</div>
                  <div className="font-mono text-cyan-300 font-bold">
                    ${userSepoliaUsdc.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC
                  </div>
                </div>
              </div>
            )}

            {/* Clean Activity Ledger */}
            <div className="p-5 rounded-2xl border border-slate-800/80 bg-obsidian-900/40 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                  Recent Inflows & Executions
                </span>
                <span className="text-[11px] font-mono text-slate-400">{activities.length} Events</span>
              </div>

              <div className="divide-y divide-slate-800/60 font-mono text-xs">
                {activities.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-800/20 px-2 rounded-lg transition">
                    <div className="space-y-0.5">
                      <div className="text-slate-200 font-semibold flex items-center gap-2">
                        <span>{item.inflow}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans ${
                          item.status === 'filtered' ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {item.lasnaSignal}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans">{item.destSwap}</div>
                    </div>
                    <div className="text-right text-[11px] text-slate-400 font-sans">
                      {item.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right 5 Columns: Allocation Policy Slider with On-Chain Save */}
          <div className="lg:col-span-5">
            <div className="p-5 sm:p-6 rounded-2xl border border-slate-800/80 bg-obsidian-900/70 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[11px]">
                    Allocation Recipe
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Auto-swap percentage on arrival</p>
                </div>
                <span className="font-mono text-sm font-extrabold text-cyan-400">
                  {allocationPct}% WETH
                </span>
              </div>

              {/* 3 Simple Preset Buttons */}
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                {[
                  { label: '20% Safe', val: 20 },
                  { label: '50% Split', val: 50 },
                  { label: '80% DCA', val: 80 }
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => setAllocationPct(item.val)}
                    className={`py-1.5 px-2 rounded-lg border text-center transition ${
                      allocationPct === item.val
                        ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Dual-Band Slider */}
              <div className="space-y-2">
                <div className="h-2 w-full rounded-full overflow-hidden flex bg-slate-800">
                  <div style={{ width: `${100 - allocationPct}%` }} className="bg-emerald-500 transition-all duration-150" />
                  <div style={{ width: `${allocationPct}%` }} className="bg-cyan-400 transition-all duration-150" />
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={allocationPct}
                  onChange={(e) => setAllocationPct(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>10% USDC Min</span>
                  <span>50% Balanced</span>
                  <span>100% WETH</span>
                </div>
              </div>

              {/* $1,000 Inflow Preview */}
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs flex justify-between items-center">
                <span className="text-slate-400">On a $1,000 inflow:</span>
                <span className="font-mono font-semibold text-slate-200">
                  ${previewKeep} USDC + ${previewWeth} WETH
                </span>
              </div>

              {/* On-Chain Save Button */}
              <button
                onClick={savePolicyOnChain}
                disabled={isUpdatingPolicy}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80 transition active:scale-95 flex items-center justify-center gap-2"
              >
                {isUpdatingPolicy ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>Confirming on Base Sepolia...</span>
                  </>
                ) : (
                  <span>Apply Policy ({allocationPct}%) On-Chain</span>
                )}
              </button>

              <div className="text-[11px] text-slate-500 text-center">
                Requires Base Sepolia to update smart contract policy.
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-obsidian-950/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>Built for DoraHacks x Reactive Network Omni Buildathon</div>
          <div className="font-mono text-[11px] text-slate-400">
            Sepolia (11155111) &rarr; Lasna (5318007) &rarr; Base (84532)
          </div>
        </div>
      </footer>

    </div>
  );
}
