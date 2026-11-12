import React, { useState } from 'react';
import { CONFIG } from '../config/contracts';

export default function LandingPage({
  onLaunchApp,
  onTriggerDemo,
  vaultUsdc,
  vaultWeth,
  savedPct,
  loopPhase,
}) {
  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (key, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!emailInput) return;
    setSubscribed(true);
    setTimeout(() => setSubscribed(false), 3500);
    setEmailInput('');
  };

  return (
    <div className="space-y-14 pb-20">
      
      {/* ============================================================== */}
      {/* 1. TOP CURVED FLUID WAVE BANNER (Matching reactive.network)      */}
      {/* ============================================================== */}
      <section className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 pt-2">
        <div className="relative w-full h-40 sm:h-52 md:h-60 rounded-2xl sm:rounded-3xl overflow-hidden bg-[#02040A] border border-blue-900/30 shadow-[0_0_50px_rgba(20,50,160,0.18)] flex items-center justify-center">
          
          {/* Subtle Ambient Dot Grid inside banner */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(98, 208, 255, 0.4) 1px, transparent 1px)',
              backgroundSize: '16px 16px'
            }}
          />

          {/* Glowing Fluid Curve Wave Graphic - High Fidelity to reactive.network */}
          <svg
            className="w-full h-full object-cover pointer-events-none select-none"
            viewBox="0 0 1200 360"
            fill="none"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Luminous Specular Rim Gradient */}
              <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.3" />
                <stop offset="15%" stopColor="#38bdf8" stopOpacity="0.95" />
                <stop offset="45%" stopColor="#60a5fa" stopOpacity="0.85" />
                <stop offset="70%" stopColor="#1d4ed8" stopOpacity="0.8" />
                <stop offset="90%" stopColor="#0284c7" stopOpacity="0.4" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>

              {/* Deep Blue Body Gradient */}
              <linearGradient id="bodyGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0b1b4d" stopOpacity="0.8" />
                <stop offset="30%" stopColor="#1e40af" stopOpacity="0.65" />
                <stop offset="60%" stopColor="#2563eb" stopOpacity="0.5" />
                <stop offset="90%" stopColor="#0f172a" stopOpacity="0.2" />
              </linearGradient>

              {/* Ambient Glow */}
              <radialGradient id="centerGlow" cx="25%" cy="20%" r="55%">
                <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.35" />
                <stop offset="50%" stopColor="#030712" stopOpacity="0.1" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>

              <filter id="softBlur" x="-15%" y="-15%" width="130%" height="130%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background Radial Glow */}
            <rect width="1200" height="360" fill="url(#centerGlow)" />

            {/* Dark organic shadow contour underneath */}
            <path
              d="M -30 380 C 120 180, 260 20, 520 40 C 780 60, 880 340, 1140 220 L 1220 380 Z"
              fill="#03081a"
              opacity="0.85"
            />

            {/* Translucent Deep Blue Wave Body */}
            <path
              d="M -40 340 C 100 130, 240 25, 500 45 C 760 65, 870 300, 1120 190 C 1170 165, 1220 120, 1260 90"
              stroke="url(#bodyGrad)"
              strokeWidth="90"
              strokeLinecap="round"
              fill="none"
              filter="url(#softBlur)"
            />

            {/* Specular Bright Luminous Crest Line */}
            <path
              d="M -40 330 C 100 120, 240 20, 500 38 C 760 56, 870 290, 1120 180 C 1170 155, 1220 110, 1260 80"
              stroke="url(#rimGrad)"
              strokeWidth="6"
              fill="none"
              filter="url(#softBlur)"
            />

            {/* Void cutout arc inside the loop */}
            <path
              d="M -20 380 C 140 210, 280 120, 500 135 C 720 150, 860 370, 1120 280 L 1240 380 Z"
              fill="#02040A"
              opacity="0.95"
            />
          </svg>

          {/* Solitary Tiny Star / Pinpoint Light on the Far Right (As seen in reactive.network screenshot) */}
          <div className="absolute right-14 sm:right-28 top-[54%] w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_#ffffff,0_0_20px_#38bdf8]" />
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. TWO-COLUMN SPLIT SECTION (Exact layout of reactive.network) */}
      {/* ============================================================== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
          
          {/* LEFT COLUMN: // INTERLUDE + Headline + Brackets + Copy + Input */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Monospace Interlude Tag */}
            <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
              // INTERLUDE
            </div>

            {/* Giant Title */}
            <h1 className="font-display text-5xl sm:text-6xl lg:text-[70px] font-bold tracking-tight text-white leading-[1.04]">
              Reactive Network
            </h1>

            {/* Monospace Subtitle Tag in Square Brackets */}
            <div className="font-mono text-xs sm:text-sm font-semibold tracking-wider text-zinc-400">
              [ ON-CHAIN IF-THIS-THEN-THAT FOR SMART CONTRACTS ]
            </div>

            {/* Core Value Proposition Paragraphs */}
            <div className="space-y-3.5 text-zinc-400 text-base sm:text-[17px] leading-relaxed max-w-xl">
              <p>
                Smart contracts need to react across chains. Today that means off-chain bots, custom infrastructure, and constant maintenance.
              </p>
              <p className="text-zinc-300">
                Reactive Network replaces all of it with a single on-chain automation layer.
              </p>
            </div>

            {/* Featured Buildathon Implementation Callout */}
            <div className="p-4 rounded-xl bg-[#121215] border border-white/[0.08] max-w-xl space-y-2 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#62D0FF] animate-pulse" />
                  <span className="text-[11px] font-mono text-[#62D0FF] uppercase tracking-wider font-semibold">
                    DoraHacks Omni Buildathon • Featured Protocol
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">SET IT &amp; FORGET IT</span>
              </div>
              <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
                <span className="text-white font-semibold">PaycheckVault:</span> Autonomous recipient-side cross-chain smart vault. When USDC hits your wallet on Sepolia, Reactive Lasna triggers a callback to auto-invest {savedPct}% into WETH on Base—zero keepers, 100% on-chain.
              </p>
            </div>

            {/* Input Row + Action Buttons (Exact reactive.network style) */}
            <div className="space-y-2.5 pt-1">
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-md">
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Your email address"
                  className="bg-[#121215] border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 flex-1 font-sans"
                />
                <button
                  type="submit"
                  className="text-sm font-medium text-white hover:text-[#62D0FF] transition px-3 py-2.5 cursor-pointer whitespace-nowrap"
                >
                  {subscribed ? 'Subscribed ✓' : 'Subscribe'}
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-500">
                <span>Follow Reactive Network for updates.</span>
                <span className="text-zinc-700">•</span>
                <button
                  onClick={onLaunchApp}
                  className="text-white hover:text-[#62D0FF] transition underline font-sans font-semibold cursor-pointer"
                >
                  Launch Vault App ↗
                </button>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={onLaunchApp}
                className="px-6 py-2.5 rounded-full font-display font-bold text-xs sm:text-sm bg-[#2756FC] hover:bg-[#3662ff] text-white shadow-[0_0_24px_rgba(39,86,252,0.45)] hover:shadow-[0_0_32px_rgba(98,208,255,0.65)] transition active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>Launch Vault App</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>

              <button
                onClick={onTriggerDemo}
                className="px-5 py-2.5 rounded-full font-display font-semibold text-xs sm:text-sm bg-[#121215] hover:bg-[#18181D] text-zinc-200 border border-white/[0.1] hover:border-[#62D0FF]/40 transition active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-[#00C853] animate-pulse" />
                <span>Simulate Event Loop</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: LATEST NEWS ↗ + START BUILDING ↗ + MAINNET STATS ↗ */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6 lg:border-l lg:border-zinc-800/80 lg:pl-10">
            
            {/* 1. LATEST NEWS ↗ Section */}
            <div className="border-t border-zinc-800/80 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <a
                  href="https://reactive.network/blog"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono uppercase text-zinc-400 hover:text-white tracking-wider flex items-center gap-1 transition"
                >
                  <span>LATEST NEWS</span>
                  <span>↗</span>
                </a>
              </div>

              <div className="space-y-2.5 text-xs sm:text-[13px]">
                <a
                  href="https://dorahacks.io"
                  target="_blank"
                  rel="noreferrer"
                  className="block text-zinc-400 hover:text-zinc-200 transition leading-snug"
                >
                  Reactive Omni Buildathon: Thirty Days to Find Out What One Second Buys
                </a>
                <a
                  href="https://reactive.network/blog"
                  target="_blank"
                  rel="noreferrer"
                  className="block text-zinc-400 hover:text-zinc-200 transition leading-snug"
                >
                  Reactive Circuit: Incentive Program For Working Integrations
                </a>
                <a
                  href="https://reactive.network/blog"
                  target="_blank"
                  rel="noreferrer"
                  className="block text-zinc-400 hover:text-zinc-200 transition leading-snug"
                >
                  Reactive Mainnet: Migration Complete
                </a>
                <div className="text-zinc-500 text-xs font-mono pt-1">
                  PaycheckVault: Live deployed on Sepolia, Lasna &amp; Base Sepolia
                </div>
              </div>
            </div>

            {/* 2. START BUILDING ↗ Section */}
            <div className="border-t border-zinc-800/80 pt-4 space-y-2">
              <a
                href="https://docs.reactive.network"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono uppercase text-zinc-400 hover:text-white tracking-wider flex items-center gap-1 transition"
              >
                <span>START BUILDING</span>
                <span>↗</span>
              </a>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Deploy autonomous reactive smart contracts on Lasna Testnet with sub-second event subscription and cross-chain callback dispatch.
              </p>
            </div>

            {/* 3. MAINNET ↗ & LASNA TELEMETRY Section */}
            <div className="border-t border-zinc-800/80 pt-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <a
                  href="https://reactivescan.net"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono uppercase text-zinc-400 hover:text-white tracking-wider flex items-center gap-1 transition"
                >
                  <span>MAINNET</span>
                  <span>↗</span>
                </a>
                <span className="text-[10px] font-mono text-[#00C853] uppercase tracking-wider">
                  Network Active
                </span>
              </div>

              {/* Big Metrics Grid (Matching reactive.network numbers) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                    9,023,270
                  </div>
                  <div className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider mt-0.5">
                    BLOCKS
                  </div>
                </div>

                <div>
                  <div className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight flex items-baseline gap-1.5">
                    <span>$0.00279</span>
                    <span className="text-xs font-mono text-zinc-400 font-normal">-14.44%</span>
                  </div>
                  <div className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider mt-0.5">
                    $REACT
                  </div>
                </div>
              </div>

              {/* PaycheckVault Live Protocol Telemetry */}
              <div className="p-3 rounded-xl bg-[#121215] border border-white/[0.06] grid grid-cols-3 gap-2 text-center font-mono">
                <div>
                  <div className="text-[9px] uppercase text-zinc-500">Speed</div>
                  <div className="text-xs font-bold text-white mt-0.5">~1.2s</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase text-zinc-500">Vault USDC</div>
                  <div className="text-xs font-bold text-[#62D0FF] mt-0.5">
                    ${vaultUsdc.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase text-zinc-500">Bots</div>
                  <div className="text-xs font-bold text-[#00C853] mt-0.5">0 Keepers</div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. INTERACTIVE 3-CHAIN REACTIVE CIRCUIT DIAGRAM                 */}
      {/* ============================================================== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="border-t border-zinc-800/80 pt-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#62D0FF] font-semibold">
              Cross-Chain Execution Pipeline
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
              How the Reactive Event Loop Works
            </h2>
          </div>
          <div className="text-xs font-mono text-zinc-400">
            Chain Trio: Sepolia (11155111) → Lasna (5318007) → Base (84532)
          </div>
        </div>

        <div className="relative rounded-2xl reactive-card p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            
            {/* Step 1: Origin (Sepolia) */}
            <div
              className={`p-5 rounded-xl border transition-all duration-300 ${
                loopPhase === 'sepolia'
                  ? 'bg-[#2756FC]/15 border-[#62D0FF] shadow-[0_0_24px_rgba(98,208,255,0.3)]'
                  : 'bg-[#18181D]/60 border-white/[0.08]'
              }`}
            >
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-3">
                <span className="px-2 py-0.5 rounded bg-white/[0.06] text-white">1. Origin Chain</span>
                <span>Sepolia • 11155111</span>
              </div>
              <h3 className="font-display text-base font-bold text-white mb-1.5">
                Salary Deposit Inflow
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Employer deposits USDC to recipient's wallet. An ERC-20 <code className="text-[#62D0FF]">Transfer(from, to, value)</code> event is emitted on Ethereum Sepolia.
              </p>
              <div className="p-2.5 rounded-lg bg-[#0A0A0C] border border-white/[0.06] font-mono text-[10px] text-zinc-300">
                <span className="text-zinc-500">Filter: </span>
                <span>to == 0x1863...255a</span>
              </div>
            </div>

            {/* Step 2: Reactive Brain (Lasna) */}
            <div
              className={`p-5 rounded-xl border transition-all duration-300 ${
                loopPhase === 'lasna'
                  ? 'bg-[#2756FC]/25 border-[#62D0FF] shadow-[0_0_32px_rgba(98,208,255,0.45)]'
                  : 'bg-[#18181D]/60 border-white/[0.08]'
              }`}
            >
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-3">
                <span className="px-2 py-0.5 rounded bg-[#2756FC]/25 text-[#62D0FF] font-semibold">
                  2. Reactive Brain
                </span>
                <span>Lasna • 5318007</span>
              </div>
              <h3 className="font-display text-base font-bold text-white mb-1.5">
                On-Chain Inversion of Control
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Reactive Network RVM ingests the event, evaluates <code className="text-[#CBB5FF]">react(LogRecord)</code>, applies the &ge; 10 USDC threshold, and dispatches a cross-chain callback.
              </p>
              <div className="p-2.5 rounded-lg bg-[#0A0A0C] border border-white/[0.06] font-mono text-[10px] text-zinc-300">
                <span className="text-zinc-500">RSC: </span>
                <span className="text-[#CBB5FF]">PaycheckReactive</span>
              </div>
            </div>

            {/* Step 3: Destination (Base Sepolia) */}
            <div
              className={`p-5 rounded-xl border transition-all duration-300 ${
                loopPhase === 'base'
                  ? 'bg-[#00C853]/15 border-[#00C853] shadow-[0_0_24px_rgba(0,200,83,0.3)]'
                  : 'bg-[#18181D]/60 border-white/[0.08]'
              }`}
            >
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mb-3">
                <span className="px-2 py-0.5 rounded bg-[#0052FF]/20 text-blue-300 font-semibold">
                  3. Destination Chain
                </span>
                <span>Base Sepolia • 84532</span>
              </div>
              <h3 className="font-display text-base font-bold text-white mb-1.5">
                Autonomous DCA Execution
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                The vault receives the callback, verifies authorized caller, and swaps {savedPct}% USDC into WETH via MockDEX—funds remain liquid and auto-compounded.
              </p>
              <div className="p-2.5 rounded-lg bg-[#0A0A0C] border border-white/[0.06] font-mono text-[10px] text-zinc-300">
                <span className="text-zinc-500">Vault: </span>
                <span className="text-[#00C853]">0x68FE...0142</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. 4-CARD BENTO GRID SHOWCASE                                  */}
      {/* ============================================================== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="border-t border-zinc-800/80 pt-8">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#62D0FF] font-semibold">
            Core Innovations
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
            Built for the 'Set It &amp; Forget It' Track
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          <div className="reactive-card p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#2756FC]/15 border border-[#2756FC]/30 flex items-center justify-center text-[#62D0FF]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              Zero-Click Autonomous Execution
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              No Gelato, Chainlink Automation, or server-side cron jobs. The trigger originates directly from the Ethereum Sepolia block header and executes on Base via the Reactive relayer network.
            </p>
          </div>

          <div className="reactive-card p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#CBB5FF]/15 border border-[#CBB5FF]/30 flex items-center justify-center text-[#CBB5FF]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              Dual-Environment VM Isolation
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Sepolia state stays on Sepolia. Lasna handles detection and authorization. Base Sepolia handles vault swaps. A vulnerability on one chain cannot compromise the others.
            </p>
          </div>

          <div className="reactive-card p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#00C853]/15 border border-[#00C853]/30 flex items-center justify-center text-[#00C853]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              Anti-Dust Filtering Threshold
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              The Reactive contract enforces a &ge; 10 USDC threshold. Phishing dust transfers and micro-transactions are silently filtered on Lasna without burning gas on Base Sepolia.
            </p>
          </div>

          <div className="reactive-card p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              Pre-Funded Vault Liquidity
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              The destination vault is pre-seeded with 5,000 USDC and 0.004 ETH for callback proxy gas. Swaps execute atomically on MockDEX at 1 USDC = 0.5 WETH instantly.
            </p>
          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. VERIFIED CONTRACT REGISTRY                                  */}
      {/* ============================================================== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-4">
        <div className="border-t border-zinc-800/80 pt-8 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#62D0FF] font-semibold">
              Live Verified Deployments
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
              Multi-Chain Smart Contract Registry
            </h2>
          </div>
          <span className="text-xs font-mono text-[#00C853] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00C853]" />
            Testnet Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Sepolia Contract Card */}
          <div className="reactive-card p-4 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#CBB5FF] font-semibold">Sepolia (Origin)</span>
              <span className="text-zinc-500">ID: 11155111</span>
            </div>
            <div className="font-mono text-[11px] text-zinc-300 break-all bg-black/40 p-2 rounded border border-white/[0.05]">
              {CONFIG.sepolia.usdcAddress}
            </div>
            <div className="flex justify-between items-center pt-1 text-xs">
              <button
                onClick={() => handleCopy('sepolia', CONFIG.sepolia.usdcAddress)}
                className="text-zinc-400 hover:text-white transition font-mono text-[11px] cursor-pointer"
              >
                {copiedKey === 'sepolia' ? 'Copied ✓' : 'Copy'}
              </button>
              <a
                href={`${CONFIG.sepolia.explorer}/address/${CONFIG.sepolia.usdcAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#62D0FF] hover:underline font-mono text-[11px]"
              >
                Etherscan ↗
              </a>
            </div>
          </div>

          {/* Lasna RSC Card */}
          <div className="reactive-card p-4 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#62D0FF] font-semibold">Lasna (Reactive RSC)</span>
              <span className="text-zinc-500">ID: 5318007</span>
            </div>
            <div className="font-mono text-[11px] text-zinc-300 break-all bg-black/40 p-2 rounded border border-white/[0.05]">
              {CONFIG.lasna.reactiveAddress}
            </div>
            <div className="flex justify-between items-center pt-1 text-xs">
              <button
                onClick={() => handleCopy('lasna', CONFIG.lasna.reactiveAddress)}
                className="text-zinc-400 hover:text-white transition font-mono text-[11px] cursor-pointer"
              >
                {copiedKey === 'lasna' ? 'Copied ✓' : 'Copy'}
              </button>
              <a
                href={`${CONFIG.lasna.explorer}/address/${CONFIG.lasna.reactiveAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#62D0FF] hover:underline font-mono text-[11px]"
              >
                ReactScan ↗
              </a>
            </div>
          </div>

          {/* Base Sepolia Vault Card */}
          <div className="reactive-card p-4 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#2756FC] font-semibold">Base Sepolia (Vault)</span>
              <span className="text-zinc-500">ID: 84532</span>
            </div>
            <div className="font-mono text-[11px] text-zinc-300 break-all bg-black/40 p-2 rounded border border-white/[0.05]">
              {CONFIG.baseSepolia.vaultAddress}
            </div>
            <div className="flex justify-between items-center pt-1 text-xs">
              <button
                onClick={() => handleCopy('base', CONFIG.baseSepolia.vaultAddress)}
                className="text-zinc-400 hover:text-white transition font-mono text-[11px] cursor-pointer"
              >
                {copiedKey === 'base' ? 'Copied ✓' : 'Copy'}
              </button>
              <a
                href={`${CONFIG.baseSepolia.explorer}/address/${CONFIG.baseSepolia.vaultAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#62D0FF] hover:underline font-mono text-[11px]"
              >
                BaseScan ↗
              </a>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}