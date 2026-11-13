import React, { useState } from 'react';
import { CONFIG } from '../config/contracts';
import SplitFlapText from './ui/SplitFlapText';
import CursorGrid from './ui/CursorGrid';

export default function LandingPage({
  onLaunchApp,
  onTriggerDemo,
  vaultUsdc,
  vaultWeth,
  savedPct,
  loopPhase,
}) {
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (key, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-16 pb-20 bg-black text-white">
      
      {/* ============================================================== */}
      {/* 1. HERO SECTION: PITCH BLACK & ZERO GRADIENTS                  */}
      {/* ============================================================== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* ========================================================== */}
          {/* LEFT COLUMN: Seamless <CursorGrid /> Interactive Canvas    */}
          {/* ========================================================== */}
          <div className="lg:col-span-5">
            <div className="relative w-full h-[380px] sm:h-[460px] lg:h-[620px] bg-black overflow-hidden">
              <CursorGrid
                cellSize={48}
                color="#ffffff"
                highlight="area"
                gridStyle="lines"
                radius={140}
                holdTime={400}
                fadeDuration={800}
                fillOpacity={0.06}
                gridOpacity={0.08}
                spotlight={0.6}
                edgeFade={0.32}
                clickPulse
              />
            </div>
          </div>

          {/* ========================================================== */}
          {/* RIGHT COLUMN: Product Name + SplitFlapText + Site Info     */}
          {/* ========================================================== */}
          <div className="lg:col-span-7 space-y-6 lg:border-l lg:border-white/10 lg:pl-10">
            
            {/* Eyebrow Metadata Tag */}
            <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
              PROTOCOL ARCHITECTURE &bull; OMNI VAULT
            </div>

            {/* Product Name Display Header */}
            <div className="space-y-3">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.05]">
                PaycheckVault
              </h1>

              {/* REACT BITS: SplitFlapText Mechanical Departure Board */}
              <div className="py-1 overflow-x-auto">
                <SplitFlapText
                  words={['PAYCHECKVAULT', 'CROSS-CHAIN', 'AUTO-INVEST', 'ZERO-KEEPERS', 'SIGNAL-LIVE']}
                  flipDuration={0.10}
                  stagger={0.05}
                  cycleDelay={2200}
                  charset="alphanumeric"
                  flipsPerChar={6}
                  order="left"
                  align="left"
                  tileStyle="board"
                  tileColor="#000000"
                  textColor="#58A6FF"
                  glare={0}
                  depth={0}
                  tileRadius={6}
                  gap={4}
                  fontSize={26}
                  loop
                  padTo={13}
                  intro
                />
              </div>

              {/* Monospace Subtitle Tag in Square Brackets */}
              <div className="font-mono text-xs sm:text-sm font-semibold tracking-wider text-zinc-400">
                ON-CHAIN IF-THIS-THEN-THAT FOR SMART CONTRACTS
              </div>
            </div>

            {/* Core Value Proposition Paragraphs */}
            <div className="space-y-3 text-zinc-400 text-sm sm:text-base leading-relaxed">
              <p>
                Smart contracts need to react across chains. Today that means off-chain bots, custom infrastructure, and constant maintenance.
              </p>
              <p className="text-zinc-300">
                <strong className="text-white">PaycheckVault</strong> replaces all of it with a single on-chain automation layer: the moment USDC enters your wallet on Ethereum Sepolia, Reactive Lasna detects the event and executes auto-DCA into WETH on Base Sepolia.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-1 flex flex-wrap gap-3">
              <button
                onClick={onLaunchApp}
                className="px-6 py-2.5 rounded-md font-display font-bold text-xs sm:text-sm bg-[#2756FC] hover:bg-[#3260ff] text-white transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>Launch Vault App</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>

              <button
                onClick={onTriggerDemo}
                className="px-5 py-2.5 rounded-md font-display font-semibold text-xs sm:text-sm bg-black hover:bg-zinc-900 text-zinc-200 border border-white/15 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-[1px] bg-[#10B981]" />
                <span>Simulate Event Loop</span>
              </button>
            </div>

            {/* Following Information On The Site Itself */}
            <div className="space-y-5 pt-3">
              
              {/* 1. LATEST NEWS ↗ Section */}
              <div className="border-t border-white/10 pt-4 space-y-2.5">
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

                <div className="space-y-2 text-xs sm:text-[13px]">
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
                  <div className="text-zinc-500 text-xs font-mono pt-0.5">
                    PaycheckVault: Live deployed on Sepolia, Lasna &amp; Base Sepolia
                  </div>
                </div>
              </div>

              {/* 2. START BUILDING ↗ Section */}
              <div className="border-t border-white/10 pt-4 space-y-1.5">
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
              <div className="border-t border-white/10 pt-4 space-y-3.5">
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
                  <span className="text-[10px] font-mono text-[#10B981] uppercase tracking-wider">
                    Network Active
                  </span>
                </div>

                {/* Big Metrics Grid */}
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

                {/* PaycheckVault Protocol Telemetry */}
                <div className="p-3 rounded-md bg-black border border-white/10 grid grid-cols-3 gap-2 text-center font-mono">
                  <div>
                    <div className="text-[9px] uppercase text-zinc-500">Speed</div>
                    <div className="text-xs font-bold text-white mt-0.5">~1.2s</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-zinc-500">Vault USDC</div>
                    <div className="text-xs font-bold text-[#58A6FF] mt-0.5">
                      ${vaultUsdc.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-zinc-500">Bots</div>
                    <div className="text-xs font-bold text-[#10B981] mt-0.5">0 Keepers</div>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. INTERACTIVE 3-CHAIN REACTIVE CIRCUIT DIAGRAM                 */}
      {/* ============================================================== */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#58A6FF] font-semibold">
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

        <div className="relative rounded-lg bg-black border border-white/12 p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            
            {/* Step 1: Origin (Sepolia) */}
            <div
              className={`p-5 rounded-lg border transition-colors duration-200 ${
                loopPhase === 'sepolia'
                  ? 'bg-black border-[#58A6FF]'
                  : 'bg-black border-white/10'
              }`}
            >
              <div className="flex justify-between items-center gap-2 text-xs font-mono text-zinc-400 mb-3">
                <span className="px-2 py-0.5 rounded-[3px] bg-white/10 text-white whitespace-nowrap shrink-0">1. Origin</span>
                <span className="whitespace-nowrap">Sepolia &bull; 11155111</span>
              </div>
              <h3 className="font-display text-base font-bold text-white mb-1.5">
                Salary Deposit Inflow
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Employer deposits USDC to recipient's wallet. An ERC-20 <code className="text-[#58A6FF]">Transfer(from, to, value)</code> event is emitted on Ethereum Sepolia.
              </p>
              <div className="p-2.5 rounded-md bg-black border border-white/10 font-mono text-[10px] text-zinc-300">
                <span className="text-zinc-500">Filter: </span>
                <span>to == 0x1863...255a</span>
              </div>
            </div>

            {/* Step 2: Reactive Brain (Lasna) */}
            <div
              className={`p-5 rounded-lg border transition-colors duration-200 ${
                loopPhase === 'lasna'
                  ? 'bg-black border-[#58A6FF]'
                  : 'bg-black border-white/10'
              }`}
            >
              <div className="flex justify-between items-center gap-2 text-xs font-mono text-zinc-400 mb-3">
                <span className="px-2 py-0.5 rounded-[3px] bg-black text-[#58A6FF] border border-[#58A6FF]/70 font-semibold whitespace-nowrap shrink-0">
                  2. Reactive Brain
                </span>
                <span className="whitespace-nowrap">Lasna &bull; 5318007</span>
              </div>
              <h3 className="font-display text-base font-bold text-white mb-1.5">
                On-Chain Inversion of Control
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Reactive Network RVM ingests the event, evaluates <code className="text-zinc-200">react(LogRecord)</code>, applies the &ge; 10 USDC threshold, and dispatches a cross-chain callback.
              </p>
              <div className="p-2.5 rounded-md bg-black border border-white/10 font-mono text-[10px] text-zinc-300">
                <span className="text-zinc-500">RSC: </span>
                <span className="text-zinc-200">PaycheckReactive</span>
              </div>
            </div>

            {/* Step 3: Destination (Base Sepolia) */}
            <div
              className={`p-5 rounded-lg border transition-colors duration-200 ${
                loopPhase === 'base'
                  ? 'bg-black border-[#10B981]'
                  : 'bg-black border-white/10'
              }`}
            >
              <div className="flex justify-between items-center gap-2 text-xs font-mono text-zinc-400 mb-3">
                <span className="px-2 py-0.5 rounded-[3px] bg-black text-zinc-200 border border-[#2756FC]/70 font-semibold whitespace-nowrap shrink-0">
                  3. Destination
                </span>
                <span className="whitespace-nowrap">Base &bull; 84532</span>
              </div>
              <h3 className="font-display text-base font-bold text-white mb-1.5">
                Autonomous DCA Execution
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                The vault receives the callback, verifies authorized caller, and swaps {savedPct}% USDC into WETH via MockDEX; funds remain liquid and auto-compounded.
              </p>
              <div className="p-2.5 rounded-md bg-black border border-white/10 font-mono text-[10px] text-zinc-300">
                <span className="text-zinc-500">Vault: </span>
                <span className="text-[#10B981]">0x68FE...0142</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. 4-CARD BENTO GRID SHOWCASE (Pitch Black)                     */}
      {/* ============================================================== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#58A6FF] font-semibold">
              Core Innovations
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
              Built for Autonomous Settlement
            </h2>
          </div>
          <span className="text-xs font-mono text-zinc-500">PROTOCOL SPECIFICATIONS &bull; V1</span>
        </div>

        <div className="border-y border-white/10 divide-y divide-white/10">
          {[
            {
              index: '01',
              tag: 'INVERSION OF CONTROL',
              title: 'Zero-Click Autonomous Execution',
              desc: 'No Gelato, Chainlink Automation, or server-side cron jobs. The trigger originates directly from the Ethereum Sepolia block header and executes on Base via the Reactive relayer network.',
              accent: 'text-[#58A6FF]',
            },
            {
              index: '02',
              tag: 'VM ISOLATION',
              title: 'Dual-Environment State Isolation',
              desc: 'Sepolia state stays on Sepolia. Lasna handles detection and authorization. Base Sepolia handles vault swaps. A vulnerability on one chain cannot compromise the others.',
              accent: 'text-zinc-200',
            },
            {
              index: '03',
              tag: 'GAS GUARDRAIL',
              title: 'Anti-Dust Filtering Threshold',
              desc: 'The Reactive contract enforces a >= 10 USDC threshold. Phishing dust transfers and micro-transactions are silently filtered on Lasna without burning gas on Base Sepolia.',
              accent: 'text-[#10B981]',
            },
            {
              index: '04',
              tag: 'ATOMIC EXECUTION',
              title: 'Pre-Funded Vault Liquidity',
              desc: 'The destination vault is pre-seeded with 5,000 USDC and 0.004 ETH for callback proxy gas. Swaps execute atomically on MockDEX at 1 USDC = 0.5 WETH instantly.',
              accent: 'text-[#58A6FF]',
            },
          ].map((spec) => (
            <div
              key={spec.index}
              className="py-5 sm:py-6 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-8 items-baseline"
            >
              <div className="md:col-span-4 flex items-center gap-3">
                <span className="font-mono text-xs text-zinc-500 tabular-nums">{spec.index}</span>
                <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-white/12 rounded-[3px] ${spec.accent}`}>
                  {spec.tag}
                </span>
              </div>
              <div className="md:col-span-8 space-y-1.5">
                <h3 className="font-display text-base sm:text-lg font-bold text-white tracking-tight">
                  {spec.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  {spec.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. VERIFIED CONTRACT REGISTRY (Pitch Black)                     */}
      {/* ============================================================== */}
      <section id="contracts" className="max-w-6xl mx-auto px-4 sm:px-6 space-y-4">
        <div className="border-t border-white/10 pt-8 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#58A6FF] font-semibold">
              Live Verified Deployments
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
              Multi-Chain Smart Contract Registry
            </h2>
          </div>
          <span className="text-xs font-mono text-[#10B981] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-[1px] bg-[#10B981]" />
            Testnet Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Sepolia Contract Card */}
          <div className="bg-black border border-white/10 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-200 font-semibold">Sepolia (Origin)</span>
              <span className="text-zinc-500">ID: 11155111</span>
            </div>
            <div className="font-mono text-[11px] text-zinc-300 break-all bg-black p-2 rounded border border-white/10">
              {CONFIG.sepolia.usdcAddress}
            </div>
            <div className="flex justify-between items-center pt-1 text-xs">
              <button
                onClick={() => handleCopy('sepolia', CONFIG.sepolia.usdcAddress)}
                className="text-zinc-400 hover:text-white transition font-mono text-[11px] cursor-pointer"
              >
                {copiedKey === 'sepolia' ? 'Copied' : 'Copy'}
              </button>
              <a
                href={`${CONFIG.sepolia.explorer}/address/${CONFIG.sepolia.usdcAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#58A6FF] hover:underline font-mono text-[11px]"
              >
                Etherscan ↗
              </a>
            </div>
          </div>

          {/* Lasna RSC Card */}
          <div className="bg-black border border-white/10 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#58A6FF] font-semibold">Lasna (Reactive RSC)</span>
              <span className="text-zinc-500">ID: 5318007</span>
            </div>
            <div className="font-mono text-[11px] text-zinc-300 break-all bg-black p-2 rounded border border-white/10">
              {CONFIG.lasna.reactiveAddress}
            </div>
            <div className="flex justify-between items-center pt-1 text-xs">
              <button
                onClick={() => handleCopy('lasna', CONFIG.lasna.reactiveAddress)}
                className="text-zinc-400 hover:text-white transition font-mono text-[11px] cursor-pointer"
              >
                {copiedKey === 'lasna' ? 'Copied' : 'Copy'}
              </button>
              <a
                href={`${CONFIG.lasna.explorer}/address/${CONFIG.lasna.reactiveAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#58A6FF] hover:underline font-mono text-[11px]"
              >
                ReactScan ↗
              </a>
            </div>
          </div>

          {/* Base Sepolia Vault Card */}
          <div className="bg-black border border-white/10 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#2756FC] font-semibold">Base Sepolia (Vault)</span>
              <span className="text-zinc-500">ID: 84532</span>
            </div>
            <div className="font-mono text-[11px] text-zinc-300 break-all bg-black p-2 rounded border border-white/10">
              {CONFIG.baseSepolia.vaultAddress}
            </div>
            <div className="flex justify-between items-center pt-1 text-xs">
              <button
                onClick={() => handleCopy('base', CONFIG.baseSepolia.vaultAddress)}
                className="text-zinc-400 hover:text-white transition font-mono text-[11px] cursor-pointer"
              >
                {copiedKey === 'base' ? 'Copied' : 'Copy'}
              </button>
              <a
                href={`${CONFIG.baseSepolia.explorer}/address/${CONFIG.baseSepolia.vaultAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#58A6FF] hover:underline font-mono text-[11px]"
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
