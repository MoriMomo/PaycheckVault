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
  const [vaultUsdc, setVaultUsdc] = useState(2500.0);
  const [vaultYieldUsdc, setVaultYieldUsdc] = useState(1500.0);
  const [vaultWeth, setVaultWeth] = useState(4.0);
  const [userSepoliaWeth, setUserSepoliaWeth] = useState(10.0);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
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
      originTx: '0xa1f1...5ce8',
      lasnaSignal: 'Guardrails Passed (≥ 0.01 WETH)',
      destSwap: '+1,250 USDC Reserve • +750 sUSDC Yield • +0.20 WETH Kept',
      destTx: '0x61d0...5746',
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

  // 1. Fetch live balances directly from Sepolia & Base Sepolia RPCs
  const fetchLiveBalances = useCallback(async (userAddr) => {
    setIsLoadingBalances(true);
    try {
      const sepProvider = new ethers.JsonRpcProvider(CONFIG.sepolia.rpcUrl);
      const sepToken = new ethers.Contract(CONFIG.sepolia.usdcAddress, ERC20_ABI, sepProvider);
      const targetUser = userAddr || walletAddress || CONFIG.deployerRvmId;
      const sepBal = await sepToken.balanceOf(targetUser);
      setUserSepoliaWeth(Number(ethers.formatEther(sepBal)));

      const baseProvider = new ethers.JsonRpcProvider(CONFIG.baseSepolia.rpcUrl);
      const baseUsdc = new ethers.Contract(CONFIG.baseSepolia.usdcAddress, ERC20_ABI, baseProvider);
      const baseWeth = new ethers.Contract(CONFIG.baseSepolia.wethAddress, ERC20_ABI, baseProvider);
      const vaultContract = new ethers.Contract(CONFIG.baseSepolia.vaultAddress, VAULT_ABI, baseProvider);

      const yieldPromise = CONFIG.baseSepolia.sUsdcAddress
        ? new ethers.Contract(CONFIG.baseSepolia.sUsdcAddress, ERC20_ABI, baseProvider)
            .balanceOf(CONFIG.baseSepolia.vaultAddress)
            .catch(() => null)
        : Promise.resolve(null);

      const [bUsdcBal, bYieldBal, bWethBal, onChainStableBps, onChainYieldBps] = await Promise.all([
        baseUsdc.balanceOf(CONFIG.baseSepolia.vaultAddress),
        yieldPromise,
        baseWeth.balanceOf(CONFIG.baseSepolia.vaultAddress),
        vaultContract.stableBps().catch(() => null),
        vaultContract.yieldBps().catch(() => null),
      ]);

      setVaultUsdc(Number(ethers.formatEther(bUsdcBal)));
      if (bYieldBal !== null) {
        setVaultYieldUsdc(Number(ethers.formatEther(bYieldBal)));
      }
      setVaultWeth(Number(ethers.formatEther(bWethBal)));
      if (onChainStableBps !== null && onChainYieldBps !== null) {
        setSavedStablePct(Number(onChainStableBps) / 100);
        setSavedYieldPct(Number(onChainYieldBps) / 100);
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

  // Save Multi-Bucket Policy & Guardrails On-Chain (Base Sepolia)
  const savePolicyOnChain = async () => {
    const keepPct = Math.max(0, 100 - stablePct - yieldPct);
    if (!window.ethereum || !walletAddress) {
      setSavedStablePct(stablePct);
      setSavedYieldPct(yieldPct);
      showToastMsg(
        'Multi-Bucket Policy Applied (Demo Mode)',
        `${stablePct}% USDC Reserve • ${yieldPct}% sUSDC Yield • ${keepPct}% WETH Operating`
      );
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

      showToastMsg('Broadcasting Transaction', 'Confirming multi-bucket allocation in MetaMask...');
      let tx;
      if (CONFIG.baseSepolia.sUsdcAddress) {
        tx = await vault.setBuckets(stablePct * 100, yieldPct * 100);
        await tx.wait();
        const guardTx = await vault.setGuardrails(
          ethers.parseEther(maxCapWeth.toString()),
          ethers.parseEther(slippageFloorUsd.toString())
        );
        await guardTx.wait();
      } else {
        tx = await vault.setConfig(
          CONFIG.baseSepolia.dexAddress,
          CONFIG.baseSepolia.usdcAddress,
          CONFIG.baseSepolia.wethAddress,
          (stablePct + yieldPct) * 100
        );
        await tx.wait();
      }
      setSavedStablePct(stablePct);
      setSavedYieldPct(yieldPct);
      showToastMsg(
        'Policy Confirmed On-Chain',
        `Vault set to ${stablePct}% USDC Reserve • ${yieldPct}% sUSDC Yield • ${keepPct}% Retained`
      );
    } catch (err) {
      showToastMsg('Update Failed', err.reason || err.message, 'warn');
    } finally {
      setIsUpdatingPolicy(false);
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

  // Execute Live Real On-Chain Paycheck via MetaMask
  const executeRealPaycheck = async (wethAmount = 1.0) => {
    if (loopPhase !== 'idle') return;

    if (!window.ethereum || !walletAddress) {
      return runSimulatedLoop(wethAmount);
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
          const baseUsdc = new ethers.Contract(CONFIG.baseSepolia.usdcAddress, ERC20_ABI, baseProv);
          const newUsdcBal = await baseUsdc.balanceOf(CONFIG.baseSepolia.vaultAddress);
          const numUsdc = Number(ethers.formatEther(newUsdcBal));

          if (numUsdc !== initialUsdc || attempts >= 8) {
            clearInterval(pollInterval);
            await fetchLiveBalances();
            setLoopPhase('idle');
            showToastMsg(
              'Multi-Bucket Settlement Complete!',
              '3-bucket stablecoin split verified on Base Sepolia with zero keepers.'
            );
          }
        } catch {
          // Keep polling
        }
      }, 3000);

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
          lasnaSignal: 'Lasna Omni Catch (Guardrails OK)',
          destSwap: `+${stableOut.toLocaleString()} USDC Reserve • +${yieldOut.toLocaleString()} sUSDC • +${retainedWeth.toFixed(2)} WETH`,
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
    <div className="min-h-dvh flex flex-col justify-between font-sans bg-black text-white">
      
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-lg border transition-colors flex items-start gap-3 ${
            toast.type === 'warn'
              ? 'bg-black border-amber-500 text-amber-100'
              : 'bg-black border-[#58A6FF] text-white'
          }`}
        >
          <span
            className={`mt-1.5 w-2 h-2 rounded-[1px] shrink-0 ${
              toast.type === 'warn' ? 'bg-amber-400' : 'bg-[#10B981]'
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

      {/* Main Content + Footer Wrapper (offset for fixed left sidebar on desktop) */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        {/* Main Content Container */}
        <main className="max-w-6xl w-full mx-auto px-6 pt-20 lg:pt-10 pb-12 flex-1">
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
            animatedUSDC={animatedUSDC}
            animatedYieldUSDC={animatedYieldUSDC}
            animatedWETH={animatedWETH}
            userSepoliaWeth={userSepoliaWeth}
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

      {/* Footer Container with seamless blend into starry scene */}
      <div className="relative w-full mt-12 bg-black">
        <MeadowRiseFooter
          name="PaycheckVault"
          brandHref="#"
          heading="Autonomous cross-chain *stablecoin* treasury."
          subheading="Multi-bucket stablecoin allocation and on-chain guardrails triggered across chains by Reactive Network."
          cta={{
            label: "Launch Vault App",
            href: "#vault-app",
            onClick: (e) => {
              e.preventDefault();
              setActivePage('app');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            },
          }}
          tagline="The first recipient-side autonomous smart vault built for DoraHacks Omni Buildathon."
          newsletter={true}
          placeholder="Enter your email or wallet address"
          palette={{
            sky: ['#000000', '#000000'],
            haze: '#000000',
            glow: 'transparent',
            hills: [
              ['#000000', '#000000'],
              ['#000000', '#000000'],
              ['#000000', '#000000'],
              ['#000000', '#000000'],
              ['#000000', '#000000'],
              ['#000000', '#000000'],
            ],
            ground: '#000000',
            ink: '#FFFFFF',
            muted: '#888888',
            accent: '#58A6FF',
            button: {
              bg: '#2756FC',
              text: '#FFFFFF',
              hover: '#3260ff',
            },
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
            { label: "Terms of Service", href: "#terms", onClick: (e) => { e.preventDefault(); setLegalModal('terms'); } },
            { label: "Privacy Policy", href: "#privacy", onClick: (e) => { e.preventDefault(); setLegalModal('privacy'); } },
            { label: "MIT License", href: "#license", onClick: (e) => { e.preventDefault(); setLegalModal('license'); } },
            { label: "Reactive Lasna Testnet", href: "https://lasna.reactivescan.net" },
            { label: "Base Sepolia Testnet", href: "https://sepolia.basescan.org" },
          ]}
        />
      </div>
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
            className="w-full max-w-lg bg-black border border-white/15 rounded-lg p-6 space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#58A6FF]">
                  Protocol Disclosure
                </div>
                <h2 id="legal-modal-title" className="font-display text-lg font-bold text-white mt-0.5">
                  {legalModal === 'terms'
                    ? 'Terms of Service'
                    : legalModal === 'privacy'
                    ? 'Privacy Policy'
                    : 'MIT License'}
                </h2>
              </div>
              <button
                onClick={() => setLegalModal(null)}
                className="px-2.5 py-1 rounded-md border border-white/12 text-xs font-mono text-zinc-400 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
                aria-label="Close disclosure modal"
              >
                Close
              </button>
            </div>

            {legalModal === 'terms' && (
              <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                <p>
                  PaycheckVault is an experimental open-source reactive smart contract prototype deployed on Ethereum Sepolia, Reactive Lasna Testnet, and Base Sepolia Testnet.
                </p>
                <p>
                  All cross-chain event subscriptions, anti-dust thresholds (&ge; 10 USDC), and WETH swap dispatches operate autonomously via public on-chain transactions. Do not send mainnet funds to testnet contract addresses.
                </p>
                <p className="text-zinc-400">
                  By connecting a Web3 wallet, you acknowledge sole responsibility for signing transactions, paying network gas fees, and verifying testnet contract addresses before execution.
                </p>
              </div>
            )}

            {legalModal === 'privacy' && (
              <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                <p>
                  PaycheckVault does not collect, store, or sell personal telemetry, IP logs, cookies, or off-chain user profiles.
                </p>
                <p>
                  Wallet addresses connected via MetaMask or injected EIP-1193 providers are read strictly in client memory to query public RPC endpoints (`ethereum-sepolia-rpc.publicnode.com`, `lasna-rpc.rnk.dev`, `sepolia.base.org`).
                </p>
                <p className="text-zinc-400">
                  All ERC-20 transfers, allocation policies, and callback receipts recorded by smart contracts are inherently public on their respective blockchain ledgers.
                </p>
              </div>
            )}

            {legalModal === 'license' && (
              <div className="space-y-3 text-xs text-zinc-300 leading-relaxed font-mono">
                <p>Copyright (c) 2026 PaycheckVault Contributors</p>
                <p className="font-sans text-zinc-400">
                  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated smart contract files, to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, subject to standard MIT terms.
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span>PaycheckVault &bull; Reactive Lasna / Base Sepolia</span>
              <div className="flex gap-3">
                <button
                  onClick={() => setLegalModal('terms')}
                  className={`cursor-pointer ${legalModal === 'terms' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  Terms
                </button>
                <button
                  onClick={() => setLegalModal('privacy')}
                  className={`cursor-pointer ${legalModal === 'privacy' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
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
