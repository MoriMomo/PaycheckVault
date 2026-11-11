import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';

// Smooth numeric odometer hook (zero layout shift)
function useAnimatedNumber(targetValue, duration = 420) {
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

// SignalNode Component (Screen 2: Real-Time Cross-Chain Topology)
function SignalNode({ step, chainName, chainId, contractName, roleLabel, state, statusText, accent, explorerUrl }) {
  const accentMap = {
    indigo: {
      activeBorder: 'border-indigo-500 bg-indigo-950/25 shadow-lg shadow-indigo-500/20',
      dot: 'bg-indigo-400',
      bar: 'bg-indigo-500',
      badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
      text: 'text-indigo-300'
    },
    cyan: {
      activeBorder: 'border-cyan-400 bg-cyan-950/25 shadow-lg shadow-cyan-500/20',
      dot: 'bg-cyan-400',
      bar: 'bg-cyan-400',
      badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
      text: 'text-cyan-300'
    },
    blue: {
      activeBorder: 'border-[#0052FF] bg-blue-950/25 shadow-lg shadow-blue-600/25',
      dot: 'bg-[#3B82F6]',
      bar: 'bg-[#0052FF]',
      badge: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
      text: 'text-blue-300'
    },
    blocked: {
      activeBorder: 'border-amber-500 bg-amber-950/25 shadow-lg shadow-amber-500/20',
      dot: 'bg-amber-400',
      bar: 'bg-amber-500',
      badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      text: 'text-amber-300'
    }
  };

  const style = state === 'blocked' ? accentMap.blocked : accentMap[accent];
  const isActive = state === 'active' || state === 'done' || state === 'blocked';

  return (
    <div className={`p-5 rounded-2xl border transition-all duration-300 backdrop-blur relative ${
      isActive ? style.activeBorder : 'border-slate-800/90 bg-obsidian-900/80'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            {state === 'active' && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`} />
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isActive ? style.dot : 'bg-slate-600'}`} />
          </span>
          <span className="font-bold text-sm text-slate-100">{step}. {chainName}</span>
        </div>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-mono text-slate-400 hover:text-cyan-300 transition flex items-center gap-1"
          title="Open chain explorer"
        >
          ID: {chainId}
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      <div className="space-y-1.5 text-xs text-slate-400 mb-4">
        <div className="flex justify-between items-center">
          <span>Role:</span>
          <span className={`px-2 py-0.5 rounded-md border text-[11px] font-medium ${style.badge}`}>{roleLabel}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Contract:</span>
          <span className="font-mono text-slate-200">{contractName}</span>
        </div>
      </div>

      <div className="h-1.5 w-full bg-slate-800/90 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            state === 'active' || state === 'done' || state === 'blocked' ? `w-full ${style.bar}` : 'w-0'
          }`}
        />
      </div>

      <p className={`mt-3 text-xs text-center font-medium transition-colors ${
        isActive ? style.text : 'text-slate-400'
      }`}>
        {statusText}
      </p>
    </div>
  );
}

export default function App() {
  // Portfolio & Policy State
  const [allocationPct, setAllocationPct] = useState(50);
  const [savedPct, setSavedPct] = useState(50);
  const [usdcBalance, setUsdcBalance] = useState(3250.00);
  const [wethBalance, setWethBalance] = useState(4.8750);
  const [inflowCount, setInflowCount] = useState(6);

  // Signal Loop State: 'idle' | 'sepolia' | 'lasna' | 'base' | 'blocked'
  const [loopPhase, setLoopPhase] = useState('idle');
  const [toast, setToast] = useState(null);
  const [copiedChip, setCopiedChip] = useState(null);

  // Wallet & Live Testnet Addresses
  const [walletAddress, setWalletAddress] = useState(null);
  const [showTestnetConfig, setShowTestnetConfig] = useState(false);
  const vaultAddress = '0xa6eA49Ed671B8a4dfCDd34E36b7a75Ac79B8A5a6';

  // Animated Numbers
  const animatedUSDC = useAnimatedNumber(usdcBalance);
  const animatedWETH = useAnimatedNumber(wethBalance);

  // Activity Stream Rows
  const [activities, setActivities] = useState([
    {
      id: 1,
      time: '2m ago',
      inflow: '500.00 USDC',
      originTx: '0x8f2c...39a1',
      lasnaSignal: 'PaycheckTriggered (50%)',
      destSwap: '250 USDC → 0.1250 WETH',
      destTx: '0x4d91...e82b',
      status: 'success'
    },
    {
      id: 2,
      time: '1d ago',
      inflow: '1,200.00 USDC',
      originTx: '0x3a19...7c04',
      lasnaSignal: 'PaycheckTriggered (50%)',
      destSwap: '600 USDC → 0.3000 WETH',
      destTx: '0x9c72...11f0',
      status: 'success'
    },
    {
      id: 3,
      time: '3d ago',
      inflow: '4.20 USDC',
      originTx: '0x1b08...55d2',
      lasnaSignal: 'Filtered (< $10 Anti-Dust)',
      destSwap: 'No callback emitted (Gas Saved)',
      destTx: '—',
      status: 'filtered'
    }
  ]);

  const showToastMsg = (title, subtitle, type = 'success') => {
    setToast({ title, subtitle, type });
    setTimeout(() => setToast(null), 4000);
  };

  const copyAddress = (label, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedChip(label);
    setTimeout(() => setCopiedChip(null), 1800);
  };

  const connectWallet = async () => {
    if (walletAddress) {
      setWalletAddress(null);
      return;
    }
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        if (accounts[0]) {
          setWalletAddress(accounts[0]);
          showToastMsg('Wallet Connected', `Bound to RVM ID ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
          return;
        }
      } catch (err) {
        // Fallback gracefully
      }
    }
    setWalletAddress('0x71C95911E9a5D330f4D621842EC243EE1343249A');
    showToastMsg('Demo Signer Active', 'RVM ID matched across Sepolia, Lasna & Base Sepolia');
  };

  const saveRecipe = () => {
    setSavedPct(allocationPct);
    showToastMsg(
      `Allocation Policy Saved (${allocationPct}%)`,
      `PaycheckVault will now swap ${allocationPct}% of every verified Sepolia inflow into WETH on Base.`
    );
  };

  // Simulate $500 Paycheck Inflow (Full 3-Chain Loop)
  const simulatePaycheck = async (amount = 500) => {
    if (loopPhase !== 'idle') return;

    // Phase 1: Sepolia Inflow
    setLoopPhase('sepolia');
    await new Promise(r => setTimeout(r, 850));

    // Phase 2: Lasna Omni Evaluation
    setLoopPhase('lasna');
    await new Promise(r => setTimeout(r, 950));

    // Phase 3: Base Sepolia Callback Execution
    setLoopPhase('base');
    const swappedUSDC = amount * (savedPct / 100);
    const keptUSDC = amount - swappedUSDC;
    const acquiredWETH = swappedUSDC * 0.0005;

    setUsdcBalance(prev => prev + keptUSDC);
    setWethBalance(prev => prev + acquiredWETH);
    setInflowCount(prev => prev + 1);

    const randHex = () => Math.floor(1000 + Math.random() * 9000).toString(16);
    setActivities(prev => [
      {
        id: Date.now(),
        time: 'Just now',
        inflow: `${amount.toFixed(2)} USDC`,
        originTx: `0x${randHex()}...${randHex()}`,
        lasnaSignal: `PaycheckTriggered (${savedPct}%)`,
        destSwap: `${swappedUSDC.toFixed(0)} USDC → ${acquiredWETH.toFixed(4)} WETH`,
        destTx: `0x${randHex()}...${randHex()}`,
        status: 'success'
      },
      ...prev.slice(0, 5)
    ]);

    showToastMsg(
      'Cross-Chain Callback Executed!',
      `Swapped ${swappedUSDC} USDC → ${acquiredWETH.toFixed(4)} WETH on Base Sepolia (${keptUSDC} USDC kept liquid)`
    );

    await new Promise(r => setTimeout(r, 1400));
    setLoopPhase('idle');
  };

  // Simulate $5 Dust Spam (Anti-Dust Guard Demo)
  const simulateDustSpam = async () => {
    if (loopPhase !== 'idle') return;

    setLoopPhase('sepolia');
    await new Promise(r => setTimeout(r, 700));

    setLoopPhase('blocked');
    const randHex = () => Math.floor(1000 + Math.random() * 9000).toString(16);
    setActivities(prev => [
      {
        id: Date.now(),
        time: 'Just now',
        inflow: '5.00 USDC (Dust)',
        originTx: `0x${randHex()}...${randHex()}`,
        lasnaSignal: 'Blocked (< $10 minInflowThreshold)',
        destSwap: 'Callback Suppressed — Relayer Gas Protected',
        destTx: '—',
        status: 'filtered'
      },
      ...prev.slice(0, 5)
    ]);

    showToastMsg(
      'Anti-Dust Guard Triggered on Lasna',
      '$5.00 USDC transfer ignored (< $10 threshold). Zero destination callback gas spent.',
      'warn'
    );

    await new Promise(r => setTimeout(r, 1500));
    setLoopPhase('idle');
  };

  const previewSwap = Math.round(1000 * (allocationPct / 100));
  const previewKeep = 1000 - previewSwap;
  const previewWeth = (previewSwap * 0.0005).toFixed(2);

  return (
    <div className="min-h-dvh flex flex-col justify-between">
      {/* Floating Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all flex items-start gap-3 ${
            toast.type === 'warn'
              ? 'bg-amber-950/90 border-amber-500/50 text-amber-100'
              : 'bg-obsidian-900/95 border-emerald-500/50 text-slate-100'
          }`}
        >
          <span className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${
            toast.type === 'warn' ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'
          }`} />
          <div className="text-xs space-y-1">
            <div className="font-bold text-sm">{toast.title}</div>
            <div className="text-slate-300 leading-relaxed">{toast.subtitle}</div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-obsidian-900/75 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-white/10">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-extrabold tracking-tight text-white">PaycheckVault</span>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                  Reactive Omni
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Autonomous Cross-Chain Payroll & Grant Splitter • Sepolia → Lasna → Base
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* RVM Identity Chip */}
            <button
              onClick={() => copyAddress('rvm', walletAddress || '0x71C95911E9a5D330f4D621842EC243EE1343249A')}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-obsidian-800/90 hover:bg-slate-800 border border-slate-700/70 text-xs transition cursor-pointer"
              title="Click to copy RVM Deployer ID"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">RVM ID:</span>
              <span className="font-mono text-slate-200">0x71C...49A</span>
              {copiedChip === 'rvm' && <span className="text-emerald-400 font-semibold">Copied!</span>}
            </button>

            <button
              onClick={() => setShowTestnetConfig(!showTestnetConfig)}
              className="px-3.5 py-2.5 rounded-xl bg-obsidian-800 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-xs font-semibold transition cursor-pointer"
              aria-label="Toggle Contract Addresses"
            >
              Contracts
            </button>

            <button
              onClick={connectWallet}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition active:scale-95 cursor-pointer ${
                walletAddress
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/20'
              }`}
            >
              {walletAddress
                ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                : 'Connect Wallet'}
            </button>
          </div>
        </div>

        {/* Collapsible Contract & Proxy Inspector */}
        {showTestnetConfig && (
          <div className="border-t border-slate-800/80 bg-obsidian-950/95 px-6 py-4">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-obsidian-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-slate-400 font-medium">Sepolia Origin Token (USDC)</div>
                  <div className="font-mono text-slate-200 mt-0.5">Chain ID: 11155111</div>
                </div>
                <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-300 font-mono">ERC-20 Transfer</span>
              </div>
              <div className="p-3 rounded-xl bg-obsidian-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-slate-400 font-medium">Lasna Reactive Contract</div>
                  <div className="font-mono text-cyan-300 mt-0.5">Chain ID: 5318007 (0x512577)</div>
                </div>
                <span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 font-mono">PaycheckReactive</span>
              </div>
              <div className="p-3 rounded-xl bg-obsidian-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-slate-400 font-medium">Base Sepolia Callback Proxy</div>
                  <div className="font-mono text-blue-300 mt-0.5">{vaultAddress.slice(0, 10)}...{vaultAddress.slice(-6)}</div>
                </div>
                <button
                  onClick={() => copyAddress('proxy', vaultAddress)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono cursor-pointer"
                >
                  {copiedChip === 'proxy' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl w-full mx-auto px-6 py-8 space-y-8 flex-1">
        
        {/* Hero Banner + Primary Demo Triggers */}
        <section className="p-6 sm:p-8 rounded-3xl border border-slate-800/90 bg-gradient-to-br from-obsidian-900 via-obsidian-900 to-obsidian-800/90 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold">
              <span>Set It and Forget It Track</span>
              <span>•</span>
              <span>Zero Off-Chain Keepers</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Get paid on Ethereum. <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">Auto-invest on Base.</span>
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Whenever an employer, DAO, or client sends USDC to your address on <strong className="text-indigo-300">Sepolia</strong>, 
              <strong className="text-cyan-300"> PaycheckReactive</strong> on Lasna catches the raw ERC-20 <code className="font-mono text-xs bg-slate-800 px-1.5 py-0.5 rounded">Transfer</code> event and dispatches an authenticated callback to <strong className="text-blue-400">Base Sepolia</strong> to swap <strong className="text-white">{savedPct}%</strong> into WETH.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              onClick={() => simulatePaycheck(500)}
              disabled={loopPhase !== 'idle'}
              className="px-6 py-3.5 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 shadow-xl shadow-cyan-500/25 transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2.5"
            >
              {loopPhase !== 'idle' ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-slate-950" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Cross-Chain Signal In-Flight...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Simulate $500 Paycheck Inflow</span>
                </>
              )}
            </button>

            <button
              onClick={simulateDustSpam}
              disabled={loopPhase !== 'idle'}
              className="px-5 py-2.5 rounded-xl font-semibold text-xs bg-obsidian-800 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🛡️ Test $5 Dust Transfer (Anti-Spam Guard)</span>
            </button>
          </div>
        </section>

        {/* SCREEN 2: Real-Time 3-Chain Signal Topology */}
        <section aria-label="Cross-Chain Signal Topology" className="p-6 rounded-3xl border border-slate-800/90 bg-obsidian-900/70 backdrop-blur space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Live Cross-Chain Event Loop
              </h2>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-slate-800 text-cyan-300 border border-slate-700">
                CometBFT ~1s Finality
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Status: <span className="text-emerald-400 font-semibold">{loopPhase === 'idle' ? 'Subscribed & Listening' : `Executing (${loopPhase.toUpperCase()})`}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
            <SignalNode
              step={1}
              chainName="Ethereum Sepolia"
              chainId={11155111}
              contractName="USDC.transfer()"
              roleLabel="Origin Inflow"
              accent="indigo"
              explorerUrl="https://sepolia.etherscan.io"
              state={loopPhase === 'sepolia' ? 'active' : (loopPhase === 'lasna' || loopPhase === 'base' || loopPhase === 'blocked') ? 'done' : 'idle'}
              statusText={
                loopPhase === 'sepolia'
                  ? '⚡ ERC-20 Transfer Log Emitted!'
                  : 'Watching recipient wallet for USDC transfers'
              }
            />

            <SignalNode
              step={2}
              chainName="Reactive Lasna"
              chainId={5318007}
              contractName="PaycheckReactive.sol"
              roleLabel="Event State Machine"
              accent="cyan"
              explorerUrl="https://lasna.reactscan.net"
              state={
                loopPhase === 'blocked'
                  ? 'blocked'
                  : loopPhase === 'lasna'
                  ? 'active'
                  : loopPhase === 'base'
                  ? 'done'
                  : 'idle'
              }
              statusText={
                loopPhase === 'blocked'
                  ? '🛡️ Blocked: Below $10 minInflowThreshold!'
                  : loopPhase === 'lasna'
                  ? '⚡ Verified ≥ $10 → Emitting Callback!'
                  : 'Filtering topic_0 (Transfer) & topic_2 (Recipient)'
              }
            />

            <SignalNode
              step={3}
              chainName="Base Sepolia"
              chainId={84532}
              contractName="PaycheckVault.sol"
              roleLabel="Destination Vault"
              accent="blue"
              explorerUrl="https://sepolia.basescan.org"
              state={loopPhase === 'base' ? 'active' : 'idle'}
              statusText={
                loopPhase === 'base'
                  ? `✅ Swapped ${savedPct}% USDC → WETH via MockDEX!`
                  : 'Enforces authorizedSenderOnly + rvmIdOnly'
              }
            />
          </div>
        </section>

        {/* SCREEN 1 & SCREEN 3: Bento Grid (Portfolio Balances + Allocation Control + Activity Feed) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left 7 Columns: Screen 3 (Portfolio Balances + Activity Stream) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Dual Asset Bento Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Card A: Liquid USDC Held */}
              <div className="p-6 rounded-3xl border border-slate-800/90 bg-obsidian-900/90 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Liquid Savings (Base)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold">
                    {100 - savedPct}% Retained
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tabular-nums tracking-tight">
                  ${animatedUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="ml-2 text-sm font-sans font-semibold text-slate-400">USDC</span>
                </div>
                <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <span>Ready for immediate spending</span>
                  <span className="font-mono text-emerald-400">0% Slippage</span>
                </div>
              </div>

              {/* Card B: Accumulated WETH */}
              <div className="p-6 rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-obsidian-900 to-cyan-950/20 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                    Accumulated ETH (Base)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold">
                    {savedPct}% Auto-DCA
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-cyan-300 font-mono tabular-nums tracking-tight">
                  {animatedWETH.toFixed(4)}
                  <span className="ml-2 text-sm font-sans font-semibold text-slate-300">WETH</span>
                </div>
                <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <span>Across {inflowCount} paycheck inflows</span>
                  <span className="font-mono text-cyan-300">≈ ${(animatedWETH * 2000).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            {/* Live Activity Stream Table */}
            <div className="p-6 rounded-3xl border border-slate-800/90 bg-obsidian-900/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Autonomous Execution Ledger</h3>
                  <p className="text-xs text-slate-400">Verifiable origin → reactive → callback transaction provenance</p>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-obsidian-800 text-slate-300 border border-slate-700">
                  {activities.length} Events
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="py-2.5 pr-3">Time</th>
                      <th className="py-2.5 px-3">Sepolia Inflow</th>
                      <th className="py-2.5 px-3">Lasna RVM Signal</th>
                      <th className="py-2.5 pl-3 text-right">Base Sepolia Callback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {activities.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 pr-3 text-slate-400 whitespace-nowrap">{item.time}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-100">{item.inflow}</div>
                          <div className="text-[10px] text-indigo-400">{item.originTx}</div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            item.status === 'filtered'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
                              : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/25'
                          }`}>
                            {item.lasnaSignal}
                          </span>
                        </td>
                        <td className="py-3 pl-3 text-right whitespace-nowrap">
                          <div className={item.status === 'filtered' ? 'text-slate-400' : 'text-emerald-400 font-semibold'}>
                            {item.destSwap}
                          </div>
                          <div className="text-[10px] text-slate-500">{item.destTx}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Screen 1 (Vault Setup & Allocation Slider) */}
          <div className="lg:col-span-5">
            <div className="p-6 sm:p-7 rounded-3xl border border-slate-800/90 bg-obsidian-900/90 space-y-6 sticky top-28">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                    Rule Recipe Engine
                  </span>
                  <h3 className="text-lg font-extrabold text-white mt-0.5">
                    Paycheck Allocation Split
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-mono font-semibold">
                  Active: {savedPct}%
                </span>
              </div>

              {/* One-Click Preset Pills */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: 'Conservative', pct: 20 },
                  { label: 'Balanced', pct: 50 },
                  { label: 'Heavy DCA', pct: 80 }
                ].map((preset) => (
                  <button
                    key={preset.pct}
                    onClick={() => setAllocationPct(preset.pct)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      allocationPct === preset.pct
                        ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                        : 'bg-obsidian-800/80 border-slate-700/70 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {preset.pct}% {preset.label}
                  </button>
                ))}
              </div>

              {/* Dual-Band Visual Split Bar & Slider */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-emerald-400">Keep Liquid: {100 - allocationPct}% USDC</span>
                  <span className="text-cyan-300">Auto-Swap: {allocationPct}% WETH</span>
                </div>

                {/* Dual-Band Bar */}
                <div className="h-3 w-full rounded-full overflow-hidden flex bg-obsidian-800 p-0.5 border border-slate-700/80">
                  <div
                    style={{ width: `${100 - allocationPct}%` }}
                    className="h-full bg-emerald-500 rounded-l-full transition-all duration-150"
                  />
                  <div
                    style={{ width: `${allocationPct}%` }}
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-r-full transition-all duration-150"
                  />
                </div>

                <label htmlFor="allocationSlider" className="sr-only">Allocation Percentage to Swap</label>
                <input
                  id="allocationSlider"
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={allocationPct}
                  onChange={(e) => setAllocationPct(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />

                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>10% Min</span>
                  <span>50% Split</span>
                  <span>100% Max</span>
                </div>
              </div>

              {/* Live Math Preview Pill */}
              <div className="p-4 rounded-2xl bg-obsidian-800/90 border border-slate-700/70 space-y-2.5 text-xs">
                <div className="text-slate-400 font-semibold flex items-center justify-between">
                  <span>Live Simulation per $1,000 Paycheck:</span>
                  <span className="font-mono text-[11px] text-slate-400">allocationBps = {allocationPct * 100}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-obsidian-900 border border-emerald-500/20">
                    <div className="text-[11px] text-slate-400">Retained Cash</div>
                    <div className="text-base font-extrabold text-emerald-400 font-mono tabular-nums mt-0.5">
                      ${previewKeep} USDC
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-obsidian-900 border border-cyan-500/25">
                    <div className="text-[11px] text-slate-400">Swapped to ETH</div>
                    <div className="text-base font-extrabold text-cyan-300 font-mono tabular-nums mt-0.5">
                      ${previewSwap} → {previewWeth} WETH
                    </div>
                  </div>
                </div>
              </div>

              {/* Security & Anti-Dust Guarantees */}
              <div className="space-y-2 text-xs text-slate-300 bg-obsidian-800/40 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">🛡️ Anti-Dust Threshold:</span>
                  <span className="font-mono text-emerald-400 font-semibold">≥ 10.00 USDC</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">🔐 Callback Auth:</span>
                  <span className="font-mono text-cyan-300">Proxy + rvmIdOnly</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">⛽ Destination Gas Tank:</span>
                  <span className="font-mono text-slate-200">0.02 ETH Pre-funded</span>
                </div>
              </div>

              <button
                onClick={saveRecipe}
                className="w-full py-3.5 rounded-2xl font-extrabold text-xs uppercase tracking-wider bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/20 transition active:scale-95 cursor-pointer"
              >
                Update Vault Allocation Policy ({allocationPct}%)
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PaycheckVault — Built for the Reactive Omni Buildathon (Set It and Forget It Track)</span>
          <span className="font-mono text-slate-400">Sepolia (11155111) → Lasna (5318007) → Base Sepolia (84532)</span>
        </div>
      </footer>
    </div>
  );
}
