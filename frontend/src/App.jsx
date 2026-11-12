import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';

const DEPLOYED_CONTRACTS = {
  sepoliaUsdc: '0x4f93F4E22F90F1F66C4E56dB10D8a2990035A09e',
  lasnaReactive: '0xe18f4DF3B4Faa2D7F49b3F1581c04427a0Be9223',
  baseVault: '0x68FE8Ff67a3bF8bC3AdC78b4282bf79E6cbD0142',
  deployerRvmId: '0x18634B5266369a482836328b8954E67918e5255a',
};

// Smooth numeric odometer hook (zero layout shift)
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
  // Core Portfolio & Policy State
  const [allocationPct, setAllocationPct] = useState(50);
  const [savedPct, setSavedPct] = useState(50);
  const [usdcBalance, setUsdcBalance] = useState(3250.0);
  const [wethBalance, setWethBalance] = useState(4.875);
  const [inflowCount, setInflowCount] = useState(6);

  // Execution Loop State: 'idle' | 'sepolia' | 'lasna' | 'base' | 'blocked'
  const [loopPhase, setLoopPhase] = useState('idle');
  const [toast, setToast] = useState(null);
  const [copiedChip, setCopiedChip] = useState(null);

  // Wallet & View Mode
  const [walletAddress, setWalletAddress] = useState(null);
  const [showInspector, setShowInspector] = useState(false);

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
      lasnaSignal: 'Verified (≥ $10)',
      destSwap: '250 USDC → 0.1250 WETH',
      destTx: '0x4d91...e82b',
      status: 'success'
    },
    {
      id: 2,
      time: '1d ago',
      inflow: '1,200.00 USDC',
      originTx: '0x3a19...7c04',
      lasnaSignal: 'Verified (≥ $10)',
      destSwap: '600 USDC → 0.3000 WETH',
      destTx: '0x9c72...11f0',
      status: 'success'
    },
    {
      id: 3,
      time: '3d ago',
      inflow: '4.20 USDC',
      originTx: '0x1b08...55d2',
      lasnaSignal: 'Dust Ignored (< $10)',
      destSwap: 'Callback Suppressed (Gas Protected)',
      destTx: '—',
      status: 'filtered'
    }
  ]);

  const showToastMsg = (title, subtitle, type = 'success') => {
    setToast({ title, subtitle, type });
    setTimeout(() => setToast(null), 3800);
  };

  const copyText = (label, text) => {
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
        const accounts = await provider.send('eth_requestAccounts', []);
        if (accounts[0]) {
          setWalletAddress(accounts[0]);
          showToastMsg('Wallet Connected', `Authenticated RVM ID: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
          return;
        }
      } catch (err) {
        // Fallback gracefully
      }
    }
    setWalletAddress('0x71C95911E9a5D330f4D621842EC243EE1343249A');
    showToastMsg('Demo Wallet Active', 'RVM ID matched across Sepolia, Lasna & Base');
  };

  const saveRecipe = () => {
    setSavedPct(allocationPct);
    showToastMsg(
      `Policy Active: ${allocationPct}% WETH`,
      `${100 - allocationPct}% kept in liquid USDC, ${allocationPct}% swapped to WETH on every verified inflow.`
    );
  };

  // Simulate $500 Paycheck Inflow
  const simulatePaycheck = async (amount = 500) => {
    if (loopPhase !== 'idle') return;

    setLoopPhase('sepolia');
    await new Promise((r) => setTimeout(r, 750));

    setLoopPhase('lasna');
    await new Promise((r) => setTimeout(r, 850));

    setLoopPhase('base');
    const swappedUSDC = amount * (savedPct / 100);
    const keptUSDC = amount - swappedUSDC;
    const acquiredWETH = swappedUSDC * 0.0005;

    setUsdcBalance((prev) => prev + keptUSDC);
    setWethBalance((prev) => prev + acquiredWETH);
    setInflowCount((prev) => prev + 1);

    const randHex = () => Math.floor(1000 + Math.random() * 9000).toString(16);
    setActivities((prev) => [
      {
        id: Date.now(),
        time: 'Just now',
        inflow: `${amount.toFixed(2)} USDC`,
        originTx: `0x${randHex()}...${randHex()}`,
        lasnaSignal: `Verified (≥ $10)`,
        destSwap: `${swappedUSDC.toFixed(0)} USDC → ${acquiredWETH.toFixed(4)} WETH`,
        destTx: `0x${randHex()}...${randHex()}`,
        status: 'success'
      },
      ...prev.slice(0, 4)
    ]);

    showToastMsg(
      'Callback Executed on Base',
      `Swapped ${swappedUSDC} USDC → ${acquiredWETH.toFixed(4)} WETH (${keptUSDC} USDC retained)`
    );

    await new Promise((r) => setTimeout(r, 1200));
    setLoopPhase('idle');
  };

  // Simulate $5 Dust Transfer (Anti-Dust Guard)
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
        status: 'filtered'
      },
      ...prev.slice(0, 4)
    ]);

    showToastMsg(
      'Spam Inflow Blocked on Lasna',
      '$5.00 transfer ignored (< $10 threshold). Saved relayer execution gas.',
      'warn'
    );

    await new Promise((r) => setTimeout(r, 1400));
    setLoopPhase('idle');
  };

  const previewSwap = Math.round(1000 * (allocationPct / 100));
  const previewKeep = 1000 - previewSwap;
  const previewWeth = (previewSwap * 0.0005).toFixed(2);

  return (
    <div className="min-h-dvh flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950">
      
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
          <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
            toast.type === 'warn' ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'
          }`} />
          <div className="text-xs space-y-0.5">
            <div className="font-bold text-sm text-white">{toast.title}</div>
            <div className="text-slate-300 leading-relaxed">{toast.subtitle}</div>
          </div>
        </div>
      )}

      {/* 1. Header (Clean, Uncluttered Navigation) */}
      <header className="border-b border-slate-800/60 bg-obsidian-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight text-white">PaycheckVault</span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800/80 text-cyan-300 border border-slate-700/60">
              Reactive Omni
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowInspector(!showInspector)}
              className="text-xs text-slate-400 hover:text-slate-200 transition px-2.5 py-1.5 rounded-lg hover:bg-slate-800/50"
            >
              {showInspector ? 'Hide Contracts' : 'View Contracts'}
            </button>
            <button
              onClick={connectWallet}
              className={`px-4 py-2 rounded-xl font-semibold text-xs transition active:scale-95 ${
                walletAddress
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
              }`}
            >
              {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connect'}
            </button>
          </div>
        </div>

        {/* Collapsible Contract Reference (Out of the main visual path) */}
        {showInspector && (
          <div className="border-t border-slate-800/60 bg-obsidian-900/95 px-6 py-4 text-xs text-slate-300">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span className="font-semibold text-indigo-400">Sepolia (Origin USDC)</span>
                  <span>ID: 11155111</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-200 truncate">{DEPLOYED_CONTRACTS.sepoliaUsdc}</span>
                  <a
                    href={`https://sepolia.etherscan.io/address/${DEPLOYED_CONTRACTS.sepoliaUsdc}`}
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
                  <span>ID: 5318007</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-200 truncate">{DEPLOYED_CONTRACTS.lasnaReactive}</span>
                  <a
                    href={`https://lasna.reactivescan.net/address/${DEPLOYED_CONTRACTS.lasnaReactive}`}
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
                  <span>ID: 84532</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-200 truncate">{DEPLOYED_CONTRACTS.baseVault}</span>
                  <a
                    href={`https://sepolia.basescan.org/address/${DEPLOYED_CONTRACTS.baseVault}`}
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
        
        {/* 2. Hero: The One-Liner + 2 Big Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Get paid on Ethereum. <span className="text-cyan-400">Auto-invest on Base.</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Zero off-chain keepers. Transfers on Sepolia trigger automated WETH accumulation on Base in ~1s.
            </p>
          </div>

          {/* Clean Action Cluster */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => simulatePaycheck(500)}
              disabled={loopPhase !== 'idle'}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-md shadow-cyan-500/20 transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
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
                  <span>Simulate $500 Paycheck</span>
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
              Cross-Chain Signal Flow
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              Status: <span className={loopPhase === 'idle' ? 'text-slate-400' : 'text-cyan-400 font-bold'}>
                {loopPhase === 'idle' ? 'Listening' : loopPhase.toUpperCase()}
              </span>
            </span>
          </div>

          {/* 3-Step Clean Grid with Connecting Lines */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
            
            {/* Step 1: Sepolia */}
            <div className={`p-4 rounded-xl border transition-all duration-200 ${
              loopPhase === 'sepolia'
                ? 'border-indigo-500 bg-indigo-950/20 shadow-md shadow-indigo-500/10'
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
                ? 'border-amber-500 bg-amber-950/20 shadow-md shadow-amber-500/10'
                : loopPhase === 'lasna'
                ? 'border-cyan-400 bg-cyan-950/20 shadow-md shadow-cyan-500/10'
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
                ? 'border-blue-500 bg-blue-950/20 shadow-md shadow-blue-500/10'
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

        {/* 4. Balanced 2-Column Grid (No nested clutter) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left 7 Columns: Balances + Clean Activity Stream */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Minimal High-Contrast Balances */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-slate-800/80 bg-obsidian-900/50 space-y-1">
                <div className="text-xs text-slate-400 font-medium">Liquid Cash Reserve (Base)</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
                  ${animatedUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="ml-1.5 text-xs text-slate-400 font-sans font-medium">USDC</span>
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  {100 - savedPct}% retained automatically
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-cyan-500/20 bg-cyan-950/10 space-y-1">
                <div className="text-xs text-cyan-300 font-medium">Accumulated WETH (Base)</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-cyan-300 font-mono tabular-nums">
                  {animatedWETH.toFixed(4)}
                  <span className="ml-1.5 text-xs text-slate-300 font-sans font-medium">WETH</span>
                </div>
                <div className="text-[11px] text-slate-400 pt-1">
                  Across {inflowCount} verified inflows
                </div>
              </div>
            </div>

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

          {/* Right 5 Columns: Allocation Policy Slider (Single clear task) */}
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

              {/* $1,000 Preview Calculation */}
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs flex justify-between items-center">
                <span className="text-slate-400">On a $1,000 inflow:</span>
                <span className="font-mono font-semibold text-slate-200">
                  ${previewKeep} USDC + ${previewSwap} WETH
                </span>
              </div>

              {/* Save Button */}
              <button
                onClick={saveRecipe}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80 transition active:scale-95"
              >
                Apply Policy ({allocationPct}%)
              </button>

              {/* Single Security Footnote */}
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                <span>Anti-Dust Threshold: &ge; $10</span>
                <span>Protected by RVM ID</span>
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* 5. Minimal Footer */}
      <footer className="border-t border-slate-800/40 py-4 px-6 text-center text-[11px] text-slate-400">
        <span>PaycheckVault • Reactive Omni Buildathon (Set It and Forget It)</span>
      </footer>
    </div>
  );
}
