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
    <div className="space-y-8 pb-12 bg-black text-white">
      
      {/* 1. Top Command Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#58A6FF]">
            <span className="w-1.5 h-1.5 rounded-[1px] bg-[#58A6FF]" />
            <span>Autonomous Vault Terminal</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            PaycheckVault <span className="text-[#58A6FF]">Control Center</span>
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-xl">
            Trigger a real or simulated Sepolia USDC paycheck below and watch Reactive Network execute the Base Sepolia swap in real time.
          </p>
        </div>

        {/* Action Cluster */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onExecutePaycheck(500)}
            disabled={loopPhase !== 'idle'}
            className="px-5 py-2.5 rounded-md font-display font-bold text-xs bg-[#2756FC] hover:bg-[#3260ff] text-white transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {loopPhase !== 'idle' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-[1px] bg-[#58A6FF]" />
                <span>Relaying Cross-Chain...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-[#58A6FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{walletAddress ? 'Send $500 Paycheck (MetaMask)' : 'Simulate $500 Paycheck'}</span>
              </>
            )}
          </button>

          <button
            onClick={onSimulateDust}
            disabled={loopPhase !== 'idle'}
            className="px-4 py-2.5 rounded-md text-xs font-medium text-zinc-300 hover:text-white bg-black hover:bg-zinc-900 border border-white/10 hover:border-amber-500/40 transition-colors disabled:opacity-50 cursor-pointer"
            title="Test < $10 transfer rejected by Lasna to save gas"
          >
            Test $5 Dust Shield
          </button>
        </div>
      </div>

      {/* 2. Live 3-Node Signal Telemetry Circuit */}
      <section aria-label="Event Pipeline" className="bg-black border border-white/12 p-5 sm:p-6 rounded-lg space-y-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-[1px] bg-[#2756FC]" />
            <span className="font-display font-bold text-zinc-200 uppercase tracking-wider text-[11px]">
              Cross-Chain Signal Telemetry
            </span>
          </div>
          <div className="flex items-center gap-3">
            {activeTxHash && (
              <a
                href={`${CONFIG.sepolia.explorer}/tx/${activeTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#58A6FF] hover:underline font-mono text-[11px] truncate max-w-[160px]"
              >
                Tx: {activeTxHash.slice(0, 10)}... ↗
              </a>
            )}
            <span className="text-zinc-400 font-mono text-[11px] px-2.5 py-0.5 rounded-[3px] bg-black border border-white/10">
              State:{' '}
              <span className={loopPhase === 'idle' ? 'text-[#10B981]' : 'text-[#58A6FF] font-bold'}>
                {loopPhase === 'idle' ? 'LISTENING' : loopPhase.toUpperCase()}
              </span>
            </span>
          </div>
        </div>

        {/* 3-Step Circuit Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 relative">
          
          {/* Step 1: Sepolia */}
          <div className={`p-4 rounded-md border transition-colors duration-200 ${
            loopPhase === 'sepolia'
              ? 'border-zinc-300 bg-black'
              : 'border-white/10 bg-black'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-display font-bold text-white">1. Sepolia (Origin)</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-[3px] bg-black border border-white/10 text-zinc-300">11155111</span>
            </div>
            <div className="text-xs text-zinc-400 font-mono truncate">
              {loopPhase === 'sepolia' ? (
                <span className="text-zinc-100 font-semibold">Transfer Log Caught</span>
              ) : (
                'USDC.transfer(recipient)'
              )}
            </div>
          </div>

          {/* Step 2: Lasna Reactive */}
          <div className={`p-4 rounded-md border transition-colors duration-200 ${
            loopPhase === 'blocked'
              ? 'border-amber-500 bg-black'
              : loopPhase === 'lasna'
              ? 'border-[#58A6FF] bg-black'
              : 'border-white/10 bg-black'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-display font-bold text-white">2. Lasna (ReactVM)</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-[3px] bg-black border border-white/10 text-[#58A6FF]">5318007</span>
            </div>
            <div className="text-xs text-zinc-400 font-mono truncate">
              {loopPhase === 'blocked' ? (
                <span className="text-amber-400 font-semibold">Dust Blocked (&lt; $10)</span>
              ) : loopPhase === 'lasna' ? (
                <span className="text-[#58A6FF] font-semibold">Verified &ge; $10 &rarr; Callback</span>
              ) : (
                'PaycheckReactive.react()'
              )}
            </div>
          </div>

          {/* Step 3: Base Sepolia */}
          <div className={`p-4 rounded-md border transition-colors duration-200 ${
            loopPhase === 'base'
              ? 'border-[#10B981] bg-black'
              : 'border-white/10 bg-black'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-display font-bold text-white">3. Base Sepolia (Vault)</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-[3px] bg-black border border-white/10 text-[#10B981]">84532</span>
            </div>
            <div className="text-xs text-zinc-400 font-mono truncate">
              {loopPhase === 'base' ? (
                <span className="text-[#10B981] font-semibold">Swapped {savedPct}% to WETH</span>
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
            <span className="font-display text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Base Sepolia Vault Portfolio
            </span>
            <button
              onClick={onRefreshBalances}
              className="flex items-center gap-1.5 text-[11px] text-zinc-300 font-mono hover:text-white transition bg-black px-3 py-1 rounded-md border border-white/10 hover:border-[#58A6FF]/40 cursor-pointer"
              title="Click to refresh on-chain balances"
            >
              <span className="w-1.5 h-1.5 rounded-[1px] bg-[#10B981]" />
              <span>{isLoadingBalances ? 'Refreshing...' : `Updated ${secondsAgo}s ago`}</span>
            </button>
          </div>

          {/* Dual Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-busy={isLoadingBalances}>
            <div className="bg-black border border-white/10 p-6 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>Liquid Cash Reserve</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-[3px] bg-black border border-white/10 text-zinc-300">
                  Base USDC
                </span>
              </div>
              {isLoadingBalances ? (
                <div className="pt-2 pb-1">
                  <div className="h-8 w-36 bg-white/8 border border-white/10 rounded-[4px]" aria-label="Loading USDC balance" />
                </div>
              ) : (
                <div className="font-display text-3xl font-bold text-white font-mono tabular-nums pt-1">
                  ${animatedUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-1">
                <span>{100 - savedPct}% retained liquid</span>
                <span className="text-[#10B981] font-mono">Protected</span>
              </div>
            </div>

            <div className="bg-black border border-white/10 p-6 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-[#58A6FF] font-medium">
                <span>Accumulated WETH</span>
                <a
                  href={`${CONFIG.baseSepolia.explorer}/address/${CONFIG.baseSepolia.vaultAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-mono text-[#58A6FF] hover:underline"
                >
                  BaseScan ↗
                </a>
              </div>
              {isLoadingBalances ? (
                <div className="pt-2 pb-1 flex items-center gap-2">
                  <div className="h-8 w-32 bg-white/8 border border-white/10 rounded-[4px]" aria-label="Loading WETH balance" />
                  <div className="h-4 w-10 bg-white/6 rounded-[3px]" />
                </div>
              ) : (
                <div className="font-display text-3xl font-bold text-[#58A6FF] font-mono tabular-nums pt-1">
                  {animatedWETH.toFixed(4)}
                  <span className="ml-1.5 text-sm text-zinc-300 font-sans font-medium">WETH</span>
                </div>
              )}
              <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-1">
                <span>{savedPct}% auto-invested</span>
                <span className="text-[#58A6FF] font-mono">MockDEX</span>
              </div>
            </div>
          </div>

          {/* Connected Wallet Salary Account Bar */}
          <div className="bg-black border border-white/10 p-4 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-zinc-400 text-[11px]">
                {walletAddress ? 'Connected Sepolia Inflow Wallet (RVM ID):' : 'Monitored Sepolia Recipient (RVM ID):'}
              </div>
              <div className="font-mono text-zinc-200 truncate">
                {walletAddress || CONFIG.deployerRvmId}
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-zinc-400 text-[11px]">Available Sepolia Salary Balance:</div>
              {isLoadingBalances ? (
                <div className="mt-1 sm:ml-auto h-4 w-28 bg-white/8 border border-white/10 rounded-[3px]" aria-label="Loading Sepolia balance" />
              ) : (
                <div className="font-mono text-[#58A6FF] font-bold">
                  ${userSepoliaUsdc.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC
                </div>
              )}
            </div>
          </div>

          {/* Cryptographic Activity Ledger */}
          <div className="bg-black border border-white/10 p-5 sm:p-6 rounded-lg space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-display font-bold text-zinc-200 uppercase tracking-wider text-[11px]">
                Cryptographic Execution Ledger
              </span>
              <span className="text-[11px] font-mono text-zinc-400">{activities.length} Events</span>
            </div>

            <div className="divide-y divide-white/10 font-mono text-xs">
              {activities.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-zinc-950 px-2.5 rounded-xl transition"
                >
                  <div className="space-y-1">
                    <div className="text-white font-semibold flex flex-wrap items-center gap-2">
                      <span>{item.inflow}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-[3px] font-sans font-medium ${
                          item.status === 'filtered'
                            ? 'bg-black text-amber-400 border border-amber-500'
                            : 'bg-black text-[#10B981] border border-[#10B981]'
                        }`}
                      >
                        {item.lasnaSignal}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-sans">{item.destSwap}</div>
                  </div>
                  <div className="text-right text-[11px] text-zinc-500 font-sans shrink-0">
                    {item.time}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right 5 Columns: Allocation Recipe Control */}
        <div className="lg:col-span-5">
          <div className="bg-black border border-white/10 p-6 sm:p-7 rounded-lg space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider">
                  Allocation Strategy
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Configure automatic USDC &rarr; WETH split
                </p>
              </div>
              <span className="font-mono text-base font-extrabold text-[#58A6FF] px-3 py-1 rounded-md bg-black border border-[#2756FC]">
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
                      ? 'bg-[#2756FC] border-[#58A6FF] text-white'
                      : 'border-white/10 bg-black text-zinc-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Dual-Band Visual Split Track & Slider (SOLID COLOR, NO GRADIENT) */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-[#10B981]">Liquid Reserve: {100 - allocationPct}%</span>
                <span className="text-[#58A6FF]">Auto-DCA WETH: {allocationPct}%</span>
              </div>

              <div className="h-2.5 w-full rounded-sm overflow-hidden flex bg-black p-px border border-white/10">
                <div
                  style={{ width: `${100 - allocationPct}%` }}
                  className="bg-[#10B981] transition-all duration-150 rounded-l-sm"
                />
                <div
                  style={{ width: `${allocationPct}%` }}
                  className="bg-[#2756FC] transition-all duration-150 rounded-r-sm"
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
                className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer"
              />

              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>10% Min</span>
                <span>50% Balanced</span>
                <span>100% Max WETH</span>
              </div>
            </div>

            {/* $1,000 Inflow Preview Box */}
            <div className="p-4 rounded-md bg-black border border-white/10 space-y-2 text-xs">
              <div className="text-zinc-400 font-medium">Simulated $1,000.00 Paycheck Split:</div>
              <div className="flex items-center justify-between font-mono pt-1">
                <span className="text-[#10B981]">+${previewKeep}.00 USDC kept</span>
                <span className="text-zinc-500">&bull;</span>
                <span className="text-[#58A6FF]">+{previewWeth} WETH bought</span>
              </div>
            </div>

            {/* On-Chain Save CTA */}
            <button
              onClick={onSavePolicy}
              disabled={isUpdatingPolicy}
              className="w-full py-3 rounded-md font-display font-bold text-xs bg-white hover:bg-zinc-200 text-black transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isUpdatingPolicy ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-[1px] bg-[#2756FC]" />
                  <span>Confirming on Base Sepolia...</span>
                </>
              ) : (
                <span>Apply Policy ({allocationPct}%) On-Chain</span>
              )}
            </button>

            <div className="text-[11px] font-mono text-zinc-500 text-center">
              Active On-Chain Policy: <span className="text-zinc-300 font-semibold">{savedPct}% WETH</span> ({savedPct * 100} bps)
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
