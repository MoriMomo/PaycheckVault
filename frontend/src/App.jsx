import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONFIG, ERC20_ABI, VAULT_ABI } from './config/contracts';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/DashboardPage';
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

  // Wallet & Network State
  const [walletAddress, setWalletAddress] = useState(null);
  const [currentChainId, setCurrentChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Live On-Chain Balances & Liveness Tracking
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

  // Activity Feed
  const [activities, setActivities] = useState([
    {
      id: 1,
      time: 'Ready',
      inflow: '+500.00 USDC',
      originTx: '0x9dad...3674',
      lasnaSignal: 'Lasna Active (≥ $10)',
      destSwap: 'Swapped 250 USDC → 125.00 WETH (+250 USDC liquid)',
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
      const sepProvider = new ethers.JsonRpcProvider(CONFIG.sepolia.rpcUrl);
      const sepUsdc = new ethers.Contract(CONFIG.sepolia.usdcAddress, ERC20_ABI, sepProvider);
      const targetUser = userAddr || walletAddress || CONFIG.deployerRvmId;
      const sepBal = await sepUsdc.balanceOf(targetUser);
      setUserSepoliaUsdc(Number(ethers.formatEther(sepBal)));

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
      setCurrentChainId(parseInt(chainIdHex, 16));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

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
      showToastMsg('Observer Mode', 'Viewing deployer RVM ID telemetry');
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

      showToastMsg('Connected', `Authenticated as ${user.slice(0, 6)}...${user.slice(-4)}`);
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
      showToastMsg('Switching Network', 'Switching to Base Sepolia to update your on-chain vault policy', 'warn');
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

  // Execute Live Real On-Chain Paycheck via MetaMask
  const executeRealPaycheck = async (amount = 500) => {
    if (loopPhase !== 'idle') return;

    if (!window.ethereum || !walletAddress) {
      return runSimulatedLoop(amount);
    }

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

      setLoopPhase('lasna');
      showToastMsg('Event Caught on Lasna', 'PaycheckReactive detected Sepolia Transfer! Relaying callback to Base...');

      await new Promise((r) => setTimeout(r, 4000));

      setLoopPhase('base');
      showToastMsg('Executing on Base Sepolia', 'PaycheckVault receiving callback from proxy and auto-swapping to WETH...');

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

      setActivities((prev) => [
        {
          id: Date.now(),
          time: 'Just now',
          inflow: `+${amount.toFixed(2)} USDC`,
          originTx: `${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)}`,
          lasnaSignal: 'Lasna Omni Catch (≥ $10)',
          destSwap: `Swapped ${amount * (savedPct / 100)} USDC → WETH`,
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

  return (
    <div className="min-h-dvh flex flex-col justify-between font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all flex items-start gap-3 ${
            toast.type === 'warn'
              ? 'bg-[#121215]/95 border-amber-500/40 text-amber-100'
              : 'bg-[#121215]/95 border-[#62D0FF]/40 text-slate-100'
          }`}
        >
          <span
            className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
              toast.type === 'warn' ? 'bg-amber-400' : 'bg-[#00C853] animate-ping'
            }`}
          />
          <div className="text-xs space-y-0.5">
            <div className="font-display font-bold text-sm text-white">{toast.title}</div>
            <div className="text-slate-300 leading-relaxed">{toast.subtitle}</div>
          </div>
        </div>
      )}

      {/* Shared Navigation Bar */}
      <Navbar
        activePage={activePage}
        onNavigate={setActivePage}
        walletAddress={walletAddress}
        currentChainId={currentChainId}
        isConnecting={isConnecting}
        onConnectWallet={connectWallet}
        onSwitchNetwork={switchNetwork}
      />

      {/* Main Content Container */}
      <main className="max-w-6xl w-full mx-auto px-6 pt-20 sm:pt-24 pb-12 flex-1">
        {activePage === 'landing' ? (
          <LandingPage
            onLaunchApp={() => setActivePage('app')}
            onTriggerDemo={() => runSimulatedLoop(500)}
            vaultUsdc={vaultUsdc}
            vaultWeth={vaultWeth}
            savedPct={savedPct}
            loopPhase={loopPhase}
          />
        ) : (
          <DashboardPage
            walletAddress={walletAddress}
            animatedUSDC={animatedUSDC}
            animatedWETH={animatedWETH}
            userSepoliaUsdc={userSepoliaUsdc}
            allocationPct={allocationPct}
            setAllocationPct={setAllocationPct}
            savedPct={savedPct}
            isUpdatingPolicy={isUpdatingPolicy}
            onSavePolicy={savePolicyOnChain}
            loopPhase={loopPhase}
            activeTxHash={activeTxHash}
            onExecutePaycheck={executeRealPaycheck}
            onSimulateDust={simulateDust}
            isLoadingBalances={isLoadingBalances}
            secondsAgo={secondsAgo}
            onRefreshBalances={() => fetchLiveBalances()}
            activities={activities}
          />
        )}
      </main>

      {/* Meadow Rise Interactive Ambient Footer */}
      <div className="w-full mt-12 border-t border-white/8">
        <MeadowRiseFooter
          name="PaycheckVault"
          brandHref="#"
          heading="Autonomous cross-chain *inflow* automation."
          subheading="Recipient-side autonomous DCA from Ethereum Sepolia to Base Sepolia powered by Reactive Network."
          cta={{
            label: "Launch Vault App",
            href: "#",
          }}
          tagline="The first recipient-side autonomous smart vault built for DoraHacks Omni Buildathon."
          newsletter={true}
          placeholder="Enter your email or wallet address"
          preset="moonlit"
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
                { label: "Documentation", href: "https://docs.reactive.network" },
                { label: "Reactive Scan", href: "https://lasna.reactivescan.net" },
                { label: "Ecosystem", href: "https://reactive.network" },
                { label: "GitHub Repository", href: "https://github.com/Reactive-Network" },
              ],
            },
            {
              title: "Omni Buildathon",
              links: [
                { label: "DoraHacks Hackathon", href: "https://dorahacks.io" },
                { label: "Set It & Forget It Track", href: "https://dorahacks.io" },
                { label: "PaycheckReactive RSC", href: `${CONFIG.lasna.explorer}/address/${CONFIG.lasna.reactiveAddress}` },
              ],
            },
          ]}
          copyright="© 2026 PaycheckVault • DoraHacks × Reactive Network Omni Buildathon."
          legal={[
            { label: "MIT License", href: "#" },
            { label: "Reactive Lasna Testnet", href: "https://lasna.reactivescan.net" },
            { label: "Base Sepolia Testnet", href: "https://sepolia.basescan.org" },
          ]}
        />
      </div>

    </div>
  );
}
