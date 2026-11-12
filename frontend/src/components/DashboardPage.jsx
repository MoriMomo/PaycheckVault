import React from 'react';
import { CONFIG } from '../config/contracts';

export default function DashboardPage({
  walletAddress,
  animatedUSDC,
  animatedWETH,
  userSepoliaUsdc,
  allocationPct,
  setAllocationPct,
  savedPct,
  isUpdatingPolicy,
  onSavePolicy,
  loopPhase,
  activeTxHash,
  onExecutePaycheck,
  onSimulateDust,
  isLoadingBalances,
  secondsAgo,
  onRefreshBalances,
  activities,
}) {
  const previewSwap = Math.round(1000 * (allocationPct / 100));
  const previewKeep = 1000 - previewSwap;
  const previewWeth = (previewSwap * 0.5).toFixed(2);

  return (
    <div className="space-y-8 pb-12">
      
      {/* 1. Top Command Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#62D0FF]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#62D0FF] animate-pulse" />
            <span>Autonomous Vault Terminal</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            PaycheckVault <span className="text-[#62D0FF]">Control Center</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl">
            Trigger a real or simulated Sepolia USDC paycheck below and watch Reactive Network execute the Base Sepolia swap in real time.
          </p>
        </div>

        {/* Action Cluster */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onExecutePaycheck(500)}
            disabled={loopPhase !== 'idle'}
            className="px-5 py-2.5 rounded-full font-display font-bold text-xs bg-[#2756FC] hover:bg-[#3662ff] text-white shadow-[0_0_24px_rgba(39,86,252,0.5)] transition active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {loopPhase !== 'idle' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#62D0FF] animate-ping" />
                <span>Relaying Cross-Chain...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-[#62D0FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{walletAddress ? 'Send $500 Paycheck (MetaMask)' : 'Simulate $500 Paycheck'}</span>
              </>
            )}
          </button>

          <button
            onClick={onSimulateDust}
            disabled={loopPhase !== 'idle'}
            className="px-4 py-2.5 rounded-full text-xs font-medium text-slate-300 hover:text-white bg-[#121215] hover:bg-[#18181D] border border-white/[0.1] hover:border-amber-500/40 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Test < $10 transfer rejected by Lasna to save gas"
          >
            Test $5 Dust Shield
          </button>
        </div>
      </div>

      {/* 2. Live 3-Node Signal Telemetry Circuit */}
      <section aria-label="Event Pipeline" className="reactive-card p-5 sm:p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2756FC]" />
            <span className="font-display font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              Cross-Chain Signal Telemetry
            </span>
          </div>
          <div className="flex items-center gap-3">
            {activeTxHash && (
              <a
                href={`${CONFIG.sepolia.explorer}/tx/${activeTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#62D0FF] hover:underline font-mono text-[11px] truncate max-w-[160px]"
              >
                Tx: {activeTxHash.slice(0, 10)}... ↗
              </a>
            )}
            <span className="text-slate-400 font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-[#0A0A0C] border border-white/[0.08]">
              State:{' '}
              <span className={loopPhase === 'idle' ? 'text-[#00C853]' : 'text-[#62D0FF] font-bold'}>
                {loopPhase === 'idle' ? 'LISTENING' : loopPhase.toUpperCase()}
              </span>
            </span>
          </div>
        </div>

        {/* 3-Step Circuit Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 relative">
          
          {/* Step 1: Sepolia */}
          <div className={`p-4 rounded-2xl border transition-all duration-200 ${
            loopPhase === 'sepolia'
              ? 'border-[#CBB5FF] bg-[#CBB5FF]/15 shadow-[0_0_25px_rgba(203,181,255,0.2)]'
              : 'border-white/[0.08] bg-[#0A0A0C]/80'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-display font-bold text-white">1. Sepolia (Origin)</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-[#CBB5FF]">11155111</span>
            </div>
            <div className="text-xs text-slate-400 font-mono truncate">
              {loopPhase === 'sepolia' ? (
                <span className="text-[#CBB5FF] font-semibold animate-pulse">⚡ Transfer Log Caught</span>
              ) : (
                'USDC.transfer(recipient)'
              )}
            </div>
          </div>

          {/* Step 2: Lasna Reactive */}
          <div className={`p-4 rounded-2xl border transition-all duration-200 ${
            loopPhase === 'blocked'
              ? 'border-amber-500 bg-amber-950/30 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
              : loopPhase === 'lasna'
              ? 'border-[#62D0FF] bg-[#62D0FF]/15 shadow-[0_0_25px_rgba(98,208,255,0.25)]'
              : 'border-white/[0.08] bg-[#0A0A0C]/80'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-display font-bold text-white">2. Lasna (ReactVM)</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-[#62D0FF]">5318007</span>
            </div>
            <div className="text-xs text-slate-400 font-mono truncate">
              {loopPhase === 'blocked' ? (
                <span className="text-amber-400 font-semibold">🛡️ Dust Blocked (&lt; $10)</span>
              ) : loopPhase === 'lasna' ? (
                <span className="text-[#62D0FF] font-semibold animate-pulse">⚡ Verified &ge; $10 &rarr; Callback</span>
              ) : (
                'PaycheckReactive.react()'
              )}
            </div>
          </div>

          {/* Step 3: Base Sepolia */}
          <div className={`p-4 rounded-2xl border transition-all duration-200 ${
            loopPhase === 'base'
              ? 'border-[#00C853] bg-[#00C853]/15 shadow-[0_0_25px_rgba(0,200,83,0.25)]'
              : 'border-white/[0.08] bg-[#0A0A0C]/80'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-display font-bold text-white">3. Base Sepolia (Vault)</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-[#00C853]">84532</span>
            </div>
            <div className="text-xs text-slate-400 font-mono truncate">
              {loopPhase === 'base' ? (
                <span className="text-[#00C853] font-semibold">✅ Swapped {savedPct}% to WETH</span>
              ) : (
                'MockDEX.swap(USDC, WETH)'
              )}
            </div>
          </div>

        </div>
      </section>

      {/* 3. Main 2-Column Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 7 Columns: Live Vault Balances + Activity Ledger */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Header with Live Liveness Indicator */}
          <div className="flex items-center justify-between px-1">
            <span className="font-display text-xs font-bold text-slate-300 uppercase tracking-wider">
              Base Sepolia Vault Portfolio
            </span>
            <button
              onClick={onRefreshBalances}
              className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono hover:text-white transition bg-[#121215] px-3 py-1 rounded-full border border-white/[0.08] hover:border-[#62D0FF]/40 cursor-pointer"
              title="Click to refresh on-chain balances"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse" />
              <span>Live • Updated {secondsAgo <= 1 ? 'just now' : `${secondsAgo}s ago`}</span>
              <span className={`text-[12px] text-[#62D0FF] ml-0.5 ${isLoadingBalances ? 'animate-spin' : ''}`}>⟳</span>
            </button>
          </div>

          {/* High-Contrast Portfolio Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="reactive-card p-6 rounded-3xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Liquid Cash Reserve</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-300">
                  Base USDC
                </span>
              </div>
              <div className="font-display text-3xl font-bold text-white font-mono tabular-nums pt-1">
                ${animatedUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>{100 - savedPct}% retained liquid</span>
                <span className="text-[#00C853] font-mono">Protected</span>
              </div>
            </div>

            <div className="reactive-card p-6 rounded-3xl space-y-2 border-[#2756FC]/40">
              <div className="flex items-center justify-between text-xs text-[#62D0FF] font-medium">
                <span>Accumulated WETH</span>
                <a
                  href={`${CONFIG.baseSepolia.explorer}/address/${CONFIG.baseSepolia.vaultAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-mono text-[#62D0FF] hover:underline"
                >
                  BaseScan ↗
                </a>
              </div>
              <div className="font-display text-3xl font-bold text-[#62D0FF] font-mono tabular-nums pt-1">
                {animatedWETH.toFixed(4)}
                <span className="ml-1.5 text-sm text-slate-300 font-sans font-medium">WETH</span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>{savedPct}% auto-invested</span>
                <span className="text-[#62D0FF] font-mono">MockDEX</span>
              </div>
            </div>
          </div>

          {/* Connected Wallet Salary Account Bar */}
          <div className="reactive-card p-4 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-slate-400 text-[11px]">
                {walletAddress ? 'Connected Sepolia Inflow Wallet (RVM ID):' : 'Monitored Sepolia Recipient (RVM ID):'}
              </div>
              <div className="font-mono text-slate-200 truncate">
                {walletAddress || CONFIG.deployerRvmId}
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-slate-400 text-[11px]">Available Sepolia Salary Balance:</div>
              <div className="font-mono text-[#62D0FF] font-bold">
                ${userSepoliaUsdc.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC
              </div>
            </div>
          </div>

          {/* Cryptographic Activity Ledger */}
          <div className="reactive-card p-5 sm:p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-display font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                Cryptographic Execution Ledger
              </span>
              <span className="text-[11px] font-mono text-slate-400">{activities.length} Events</span>
            </div>

            <div className="divide-y divide-white/[0.06] font-mono text-xs">
              {activities.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] px-2.5 rounded-xl transition"
                >
                  <div className="space-y-1">
                    <div className="text-white font-semibold flex flex-wrap items-center gap-2">
                      <span>{item.inflow}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-medium ${
                          item.status === 'filtered'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30'
                        }`}
                      >
                        {item.lasnaSignal}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans">{item.destSwap}</div>
                  </div>
                  <div className="text-right text-[11px] text-slate-500 font-sans shrink-0">
                    {item.time}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right 5 Columns: Allocation Recipe Control */}
        <div className="lg:col-span-5">
          <div className="reactive-card p-6 sm:p-7 rounded-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider">
                  Allocation Strategy
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure automatic USDC &rarr; WETH split
                </p>
              </div>
              <span className="font-mono text-base font-extrabold text-[#62D0FF] px-3 py-1 rounded-full bg-[#2756FC]/15 border border-[#2756FC]/40">
                {allocationPct}% WETH
              </span>
            </div>

            {/* 3 Strategy Presets */}
            <div className="grid grid-cols-3 gap-2.5 text-xs font-semibold">
              {[
                { label: '20% Safe', val: 20 },
                { label: '50% Split', val: 50 },
                { label: '80% DCA', val: 80 },
              ].map((item) => (
                <button
                  key={item.val}
                  onClick={() => setAllocationPct(item.val)}
                  className={`py-2 px-3 rounded-xl border text-center transition cursor-pointer ${
                    allocationPct === item.val
                      ? 'bg-[#2756FC] border-[#62D0FF] text-white shadow-[0_0_16px_rgba(39,86,252,0.4)]'
                      : 'border-white/[0.08] bg-[#0A0A0C]/70 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Dual-Band Visual Split Track & Slider */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-[#00C853]">Liquid Reserve: {100 - allocationPct}%</span>
                <span className="text-[#62D0FF]">Auto-DCA WETH: {allocationPct}%</span>
              </div>

              <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-[#0A0A0C] p-[1px] border border-white/[0.08]">
                <div
                  style={{ width: `${100 - allocationPct}%` }}
                  className="bg-[#00C853] transition-all duration-150 rounded-l-full"
                />
                <div
                  style={{ width: `${allocationPct}%` }}
                  className="bg-gradient-to-r from-[#2756FC] to-[#62D0FF] transition-all duration-150 rounded-r-full"
                />
              </div>

              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={allocationPct}
                onChange={(e) => setAllocationPct(Number(e.target.value))}
                aria-label="WETH Allocation Percentage"
                className="w-full h-1.5 bg-[#0A0A0C] rounded-lg appearance-none cursor-pointer"
              />

              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>10% Min</span>
                <span>50% Balanced</span>
                <span>100% Max WETH</span>
              </div>
            </div>

            {/* $1,000 Inflow Preview Box */}
            <div className="p-4 rounded-2xl bg-[#0A0A0C]/90 border border-white/[0.08] space-y-2 text-xs">
              <div className="text-slate-400 font-medium">Simulated $1,000.00 Paycheck Split:</div>
              <div className="flex items-center justify-between font-mono pt-1">
                <span className="text-[#00C853]">+${previewKeep}.00 USDC kept</span>
                <span className="text-slate-500">&bull;</span>
                <span className="text-[#62D0FF]">+{previewWeth} WETH bought</span>
              </div>
            </div>

            {/* On-Chain Save CTA */}
            <button
              onClick={onSavePolicy}
              disabled={isUpdatingPolicy}
              className="w-full py-3 rounded-full font-display font-bold text-xs bg-white hover:bg-slate-200 text-[#0A0A0C] shadow-[0_0_24px_rgba(255,255,255,0.15)] transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isUpdatingPolicy ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#2756FC] animate-ping" />
                  <span>Confirming on Base Sepolia...</span>
                </>
              ) : (
                <span>Apply Policy ({allocationPct}%) On-Chain</span>
              )}
            </button>

            <div className="text-[11px] text-slate-500 text-center font-mono">
              Active On-Chain Policy: <span className="text-slate-300">{savedPct}% WETH</span> ({savedPct * 100} bps)
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

