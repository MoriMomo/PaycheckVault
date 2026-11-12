import React from 'react';
import { CONFIG } from '../config/contracts';

export default function LandingPage({
  onLaunchApp,
  onTriggerDemo,
  vaultUsdc,
  vaultWeth,
  savedPct,
  loopPhase,
}) {
  return (
    <div className="space-y-20 pb-16">
      
      {/* 1. Hero Section (Reactive Network Aesthetic) */}
      <section className="relative pt-12 sm:pt-20 text-center space-y-8 max-w-4xl mx-auto px-4">
        
        {/* Ambient Glow Behind Hero */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-[520px] max-w-full h-[260px] rounded-full bg-gradient-to-r from-[#2756FC]/25 via-[#62D0FF]/20 to-[#CBB5FF]/20 blur-[90px] -z-10"
        />

        {/* Top Pill Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#121215]/90 border border-white/[0.1] shadow-[0_0_30px_rgba(39,86,252,0.2)]">
          <span className="w-2 h-2 rounded-full bg-[#62D0FF] animate-pulse" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-300 font-semibold">
            Built on Reactive Network • Set It &amp; Forget It
          </span>
        </div>

        {/* Display Headline */}
        <div className="space-y-4">
          <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-[-0.03em] leading-[1.08] text-white">
            Get Paid on Ethereum.
            <br />
            <span className="bg-gradient-to-r from-[#FFFFFF] via-[#62D0FF] to-[#2756FC] bg-clip-text text-transparent">
              Auto-Invest on Base.
            </span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-normal">
            The first recipient-side autonomous smart vault. The moment USDC hits your wallet on Sepolia,{' '}
            <span className="text-slate-200 font-medium">Reactive Network</span> dispatches a cross-chain callback to convert{' '}
            <span className="text-[#62D0FF] font-mono font-semibold">{savedPct}%</span> into WETH on Base—with zero keepers, zero cron jobs, and zero manual steps.
          </p>
        </div>

        {/* Primary & Secondary CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={onLaunchApp}
            className="px-7 py-3.5 rounded-full font-display font-bold text-sm bg-[#2756FC] hover:bg-[#3662ff] text-white shadow-[0_0_32px_rgba(39,86,252,0.55)] hover:shadow-[0_0_42px_rgba(98,208,255,0.75)] transition active:scale-95 flex items-center gap-2.5 cursor-pointer"
          >
            <span>Launch Vault App</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>

          <button
            onClick={onTriggerDemo}
            className="px-6 py-3.5 rounded-full font-display font-semibold text-sm bg-[#121215] hover:bg-[#18181D] text-slate-200 border border-white/[0.12] hover:border-[#62D0FF]/50 transition active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 text-[#62D0FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Test Live Event Loop</span>
          </button>
        </div>

        {/* Live Telemetry Strip */}
        <div className="pt-4 grid grid-cols-3 max-w-xl mx-auto divide-x divide-white/[0.08] rounded-2xl reactive-card py-3.5 px-4">
          <div className="px-2">
            <div className="text-[10px] font-mono uppercase text-slate-400">Finality Speed</div>
            <div className="font-display text-lg sm:text-xl font-bold text-white mt-0.5">~1.2 sec</div>
          </div>
          <div className="px-2">
            <div className="text-[10px] font-mono uppercase text-slate-400">Vault Reserve</div>
            <div className="font-display text-lg sm:text-xl font-bold text-[#62D0FF] font-mono tabular-nums mt-0.5">
              ${vaultUsdc.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="px-2">
            <div className="text-[10px] font-mono uppercase text-slate-400">Off-Chain Bots</div>
            <div className="font-display text-lg sm:text-xl font-bold text-[#00C853] mt-0.5">0 Keepers</div>
          </div>
        </div>
      </section>

      {/* 2. Interactive 3-Chain Reactive Circuit Diagram */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#62D0FF] font-semibold">
              Cross-Chain Execution Pipeline
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
              How the Reactive Event Loop Works
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Sepolia (11155111) &rarr; Lasna (5318007) &rarr; Base (84532)
          </span>
        </div>

        <div className="reactive-card rounded-3xl p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-center">
            
            {/* Node 1: Ethereum Sepolia */}
            <div className={`lg:col-span-3 p-5 rounded-2xl border transition-all ${
              loopPhase === 'sepolia'
                ? 'border-[#CBB5FF] bg-[#CBB5FF]/10 shadow-[0_0_30px_rgba(203,181,255,0.2)]'
                : 'border-white/[0.08] bg-[#0A0A0C]/80'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#CBB5FF]/15 text-[#CBB5FF] border border-[#CBB5FF]/30">
                  1. Origin Chain
                </span>
                <span className="text-[11px] font-mono text-slate-500">ID: 11155111</span>
              </div>
              <div className="font-display text-base font-bold text-white mb-1">
                Ethereum Sepolia
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Employer or client sends standard ERC-20 USDC to your personal wallet address.
              </p>
              <div className="p-2.5 rounded-xl bg-[#121215] border border-white/[0.06] font-mono text-[11px] text-[#CBB5FF] truncate">
                emit Transfer(from, recipient, 500e18)
              </div>
            </div>

            {/* Connector 1 -> 2 */}
            <div className="lg:col-span-1 flex flex-col items-center justify-center py-2">
              <div className="w-full h-[2px] bg-white/10 relative rounded-full beam-active" />
              <span className="text-[10px] font-mono text-[#62D0FF] mt-1.5">Subscribe</span>
            </div>

            {/* Node 2: Reactive Network Lasna */}
            <div className={`lg:col-span-3 p-5 rounded-2xl border transition-all ${
              loopPhase === 'lasna'
                ? 'border-[#62D0FF] bg-[#62D0FF]/10 shadow-[0_0_30px_rgba(98,208,255,0.25)]'
                : 'border-[#2756FC]/40 bg-gradient-to-b from-[#2756FC]/10 to-[#0A0A0C]/90'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#62D0FF]/15 text-[#62D0FF] border border-[#62D0FF]/30">
                  2. ReactVM Layer
                </span>
                <span className="text-[11px] font-mono text-slate-400">ID: 5318007</span>
              </div>
              <div className="font-display text-base font-bold text-white mb-1">
                Reactive Network (Lasna)
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                <code className="text-[#62D0FF]">PaycheckReactive.sol</code> catches the log in real time, filters dust (&ge; $10), and emits a cross-chain callback.
              </p>
              <div className="p-2.5 rounded-xl bg-[#121215] border border-[#62D0FF]/20 font-mono text-[11px] text-[#62D0FF] truncate">
                emit Callback(84532, vault, payload)
              </div>
            </div>

            {/* Connector 2 -> 3 */}
            <div className="lg:col-span-1 flex flex-col items-center justify-center py-2">
              <div className="w-full h-[2px] bg-white/10 relative rounded-full beam-active" />
              <span className="text-[10px] font-mono text-[#00C853] mt-1.5">Callback</span>
            </div>

            {/* Node 3: Base Sepolia */}
            <div className={`lg:col-span-3 p-5 rounded-2xl border transition-all ${
              loopPhase === 'base'
                ? 'border-[#00C853] bg-[#00C853]/10 shadow-[0_0_30px_rgba(0,200,83,0.25)]'
                : 'border-white/[0.08] bg-[#0A0A0C]/80'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30">
                  3. Target Vault
                </span>
                <span className="text-[11px] font-mono text-slate-500">ID: 84532</span>
              </div>
              <div className="font-display text-base font-bold text-white mb-1">
                Base Sepolia Vault
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                <code className="text-slate-200">PaycheckVault.sol</code> verifies RVM ID and automatically swaps {savedPct}% USDC into WETH on MockDEX.
              </p>
              <div className="p-2.5 rounded-xl bg-[#121215] border border-white/[0.06] font-mono text-[11px] text-[#00C853] truncate">
                MockDEX.swap(USDC, WETH, {savedPct}%)
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Bento Grid Showcase (4 Cards) */}
      <section className="space-y-5">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#62D0FF] font-semibold">
            Architectural Advantages
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
            Why Reactive Network Changes Everything
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          
          {/* Bento 1 (7 Cols): Recipient-Side Trigger */}
          <div className="md:col-span-7 reactive-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#2756FC]/15 border border-[#2756FC]/40 flex items-center justify-center text-[#62D0FF]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-bold text-white">
                Recipient-Side Event Watching
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Standard smart vaults are blind to external token transfers unless the sender calls a custom deposit method. PaycheckVault subscribes directly to <code className="text-slate-200 font-mono">topic_2 == yourWallet</code> on Ethereum Sepolia—meaning your employer, DAO, or client pays your normal wallet address with zero friction.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#0A0A0C]/90 border border-white/[0.06] font-mono text-xs text-slate-300 flex items-center justify-between">
              <span>service.subscribe(11155111, USDC, Transfer, REACTIVE_IGNORE, wallet)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#2756FC]/20 text-[#62D0FF]">Active</span>
            </div>
          </div>

          {/* Bento 2 (5 Cols): Zero Keepers */}
          <div className="md:col-span-5 reactive-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#00C853]/15 border border-[#00C853]/40 flex items-center justify-center text-[#00C853]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-bold text-white">
                No Keepers. No Cron Servers.
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Eliminates Gelato subscriptions, Chainlink Automation upkeep, and centralized off-chain AWS bots. Execution is guaranteed cryptographically by the Reactive Network consensus layer.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-[#0A0A0C]/80 border border-white/[0.06] text-slate-400">
                Off-Chain Bots: <span className="text-white font-bold">None</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0A0A0C]/80 border border-white/[0.06] text-slate-400">
                Trust Model: <span className="text-[#00C853] font-bold">On-Chain</span>
              </div>
            </div>
          </div>

          {/* Bento 3 (5 Cols): Anti-Dust Gas Shield */}
          <div className="md:col-span-5 reactive-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-bold text-white">
                Anti-Dust Gas Shield
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Spam and dust transfers (&lt; $10 USDC) are filtered directly inside <code className="text-slate-200 font-mono">PaycheckReactive.react()</code> on Lasna—preventing unnecessary Base Sepolia callbacks and preserving your gas reserve.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#0A0A0C]/90 border border-amber-500/20 font-mono text-xs text-amber-300">
              if (amount &gt;= 10 USDC) emit Callback(...)
            </div>
          </div>

          {/* Bento 4 (7 Cols): Cryptographic RVM ID Verification */}
          <div className="md:col-span-7 reactive-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#CBB5FF]/15 border border-[#CBB5FF]/40 flex items-center justify-center text-[#CBB5FF]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-bold text-white">
                Strict Dual-Layer Callback Authentication
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                <code className="text-slate-200 font-mono">PaycheckVault.sol</code> inherits Reactive's <code className="text-slate-200 font-mono">AbstractCallback</code> and enforces both <code className="text-[#62D0FF] font-mono">authorizedSenderOnly</code> (Base Sepolia Callback Proxy) and <code className="text-[#CBB5FF] font-mono">rvmIdOnly</code> (bound to your deployer wallet at construction).
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#0A0A0C]/90 border border-white/[0.06] font-mono text-xs text-slate-300 flex items-center justify-between gap-2">
              <span className="truncate">Authorized RVM ID: {CONFIG.deployerRvmId}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#00C853]/20 text-[#00C853] shrink-0">Verified</span>
            </div>
          </div>

        </div>
      </section>

      {/* 4. Live Deployed Contract Registry & Bottom CTA */}
      <section className="reactive-card rounded-3xl p-6 sm:p-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#00C853] font-semibold">
              ● Live Testnet Deployments
            </span>
            <h2 className="font-display text-2xl font-bold text-white mt-1">
              Verified On-Chain Contracts
            </h2>
          </div>
          <button
            onClick={onLaunchApp}
            className="px-6 py-3 rounded-full font-display font-bold text-xs bg-white hover:bg-slate-200 text-[#0A0A0C] transition active:scale-95 cursor-pointer self-start md:self-auto"
          >
            Open Live Vault Dashboard &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-4 rounded-2xl bg-[#0A0A0C]/90 border border-white/[0.08] space-y-2">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span className="text-[#CBB5FF] font-semibold">Sepolia Origin USDC</span>
              <span>Chain 11155111</span>
            </div>
            <div className="text-slate-200 truncate text-[11px]">{CONFIG.sepolia.usdcAddress}</div>
            <a
              href={`${CONFIG.sepolia.explorer}/address/${CONFIG.sepolia.usdcAddress}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-[11px] text-[#62D0FF] hover:underline pt-1"
            >
              View on Sepolia Etherscan ↗
            </a>
          </div>

          <div className="p-4 rounded-2xl bg-[#0A0A0C]/90 border border-white/[0.08] space-y-2">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span className="text-[#62D0FF] font-semibold">Lasna PaycheckReactive</span>
              <span>Chain 5318007</span>
            </div>
            <div className="text-slate-200 truncate text-[11px]">{CONFIG.lasna.reactiveAddress}</div>
            <a
              href={`${CONFIG.lasna.explorer}/address/${CONFIG.lasna.reactiveAddress}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-[11px] text-[#62D0FF] hover:underline pt-1"
            >
              View on Lasna ReactScan ↗
            </a>
          </div>

          <div className="p-4 rounded-2xl bg-[#0A0A0C]/90 border border-white/[0.08] space-y-2">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span className="text-[#2756FC] font-semibold">Base Sepolia Vault</span>
              <span>Chain 84532</span>
            </div>
            <div className="text-slate-200 truncate text-[11px]">{CONFIG.baseSepolia.vaultAddress}</div>
            <a
              href={`${CONFIG.baseSepolia.explorer}/address/${CONFIG.baseSepolia.vaultAddress}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-[11px] text-[#62D0FF] hover:underline pt-1"
            >
              View on Base Sepolia Scan ↗
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
