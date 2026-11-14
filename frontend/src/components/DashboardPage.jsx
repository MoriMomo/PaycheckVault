import React from 'react';
import { CONFIG } from '../config/contracts';

const STRATEGY_PRESETS = [
  { id: 'conservative', label: 'Conservative', sub: '70 / 20 / 10', stable: 70, yieldVal: 20 },
  { id: 'balanced', label: 'Balanced Runway', sub: '50 / 30 / 20', stable: 50, yieldVal: 30 },
  { id: 'yield', label: 'Yield Focus', sub: '20 / 70 / 10', stable: 20, yieldVal: 70 },
];

export default function DashboardPage({
  walletAddress,
  animatedUSDC,
  animatedYieldUSDC,
  animatedWETH,
  userSepoliaWeth,
  stablePct,
  setStablePct,
  yieldPct,
  setYieldPct,
  savedStablePct,
  savedYieldPct,
  minThresholdWeth,
  cooldownSecs,
  maxCapWeth,
  setMaxCapWeth,
  slippageFloorUsd,
  setSlippageFloorUsd,
  isUpdatingPolicy,
  onSavePolicy,
  loopPhase,
  activeTxHash,
  onExecutePaycheck,
  onSimulateDust,
  onSimulateCooldown,
  isLoadingBalances,
  secondsAgo,
  onRefreshBalances,
  activities,
}) {
  const keepPct = Math.max(0, 100 - stablePct - yieldPct);
  const savedKeepPct = Math.max(0, 100 - savedStablePct - savedYieldPct);

  const previewUsd = CONFIG.ethUsdRate;
  const previewStable = Math.round(previewUsd * (stablePct / 100));
  const previewYield = Math.round(previewUsd * (yieldPct / 100));
  const previewWeth = (1.0 * (keepPct / 100)).toFixed(2);

  const handleStableChange = (nextStable) => {
    setStablePct(nextStable);
    if (nextStable + yieldPct > 100) {
      setYieldPct(100 - nextStable);
    }
  };

  const handleYieldChange = (nextYield) => {
    setYieldPct(nextYield);
    if (stablePct + nextYield > 100) {
      setStablePct(100 - nextYield);
    }
  };

  return (
    <div className="space-y-8 pb-12 bg-black text-white">

      {/* 1. Top Command Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 pt-2">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#58A6FF]">
            <span className="w-1.5 h-1.5 rounded-[1px] bg-[#58A6FF]" />
            <span>Autonomous Multi-Bucket Stablecoin Terminal</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            PaycheckVault <span className="text-[#58A6FF]">Runway Shield</span>
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-xl">
            Stream volatile WETH inflows on Sepolia. Reactive Lasna enforces dust and cooldown guardrails, then Base Sepolia splits funds into 3 stablecoin and operating buckets.
          </p>
        </div>

        {/* Action Cluster */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onExecutePaycheck(1.0)}
            disabled={loopPhase !== 'idle'}
            className="px-4 py-2.5 rounded-md font-display font-bold text-xs bg-[#2756FC] hover:bg-[#3260ff] text-white transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {loopPhase !== 'idle' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-[1px] bg-[#58A6FF]" />
                <span>Relaying Cross-Chain...</span>
              </>
            ) : (
              <span>{walletAddress ? 'Send 1.0 WETH Inflow (MetaMask)' : 'Simulate 1.0 WETH ($2,500)'}</span>
            )}
          </button>

          <button
            onClick={onSimulateDust}
            disabled={loopPhase !== 'idle'}
            className="px-3.5 py-2.5 rounded-md text-xs font-medium text-zinc-300 hover:text-white bg-black hover:bg-zinc-900 border border-white/10 hover:border-amber-500/40 transition-colors disabled:opacity-50 cursor-pointer"
            title={`Test < ${minThresholdWeth} WETH inflow suppressed by Lasna`}
          >
            Test Dust Shield
          </button>

          <button
            onClick={onSimulateCooldown}
            disabled={loopPhase !== 'idle'}
            className="px-3.5 py-2.5 rounded-md text-xs font-medium text-zinc-300 hover:text-white bg-black hover:bg-zinc-900 border border-white/10 hover:border-amber-500/40 transition-colors disabled:opacity-50 cursor-pointer"
            title={`Test rapid inflow rate-limited inside ${cooldownSecs}s cooldown`}
          >
            Test Cooldown Shield
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
              <span className={loopPhase === 'idle' ? 'text-[#10B981]' : loopPhase === 'blocked' ? 'text-amber-400 font-bold' : 'text-[#58A6FF] font-bold'}>
                {loopPhase === 'idle' ? 'LISTENING' : loopPhase.toUpperCase()}
              </span>
            </span>
          </div>
        </div>

        {/* 3-Step Circuit Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 relative">
          {/* Step 1: Sepolia */}
          <div
            className={`p-4 rounded-md border transition-colors duration-200 ${
              loopPhase === 'sepolia' ? 'border-zinc-300 bg-black' : 'border-white/10 bg-black'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-display font-bold text-white">1. Sepolia (Origin)</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-[3px] bg-black border border-white/10 text-zinc-300">
                11155111
              </span>
            </div>
            <div className="text-xs text-zinc-400 font-mono truncate">
              {loopPhase === 'sepolia' ? (
                <span className="text-zinc-100 font-semibold">WETH Transfer Log Caught</span>
              ) : (
                'WETH.transfer(recipient, amount)'
              )}
            </div>
          </div>

          {/* Step 2: Lasna Reactive */}
          <div
            className={`p-4 rounded-md border transition-colors duration-200 ${
              loopPhase === 'blocked'
                ? 'border-amber-500 bg-black'
                : loopPhase === 'lasna'
                ? 'border-[#58A6FF] bg-black'
                : 'border-white/10 bg-black'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-display font-bold text-white">2. Lasna (ReactVM)</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-[3px] bg-black border border-white/10 text-[#58A6FF]">
                5318007
              </span>
            </div>
            <div className="text-xs text-zinc-400 font-mono truncate">
              {loopPhase === 'blocked' ? (
                <span className="text-amber-400 font-semibold">Guardrail Block (InflowSuppressed)</span>
              ) : loopPhase === 'lasna' ? (
                <span className="text-[#58A6FF] font-semibold">Dust &amp; Cooldown OK &rarr; Callback</span>
              ) : (
                `Dust ≥ ${minThresholdWeth} WETH • Cooldown ${cooldownSecs}s`
              )}
            </div>
          </div>

          {/* Step 3: Base Sepolia */}
          <div
            className={`p-4 rounded-md border transition-colors duration-200 ${
              loopPhase === 'base' ? 'border-[#10B981] bg-black' : 'border-white/10 bg-black'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-display font-bold text-white">3. Base Sepolia (Vault)</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-[3px] bg-black border border-white/10 text-[#10B981]">
                84532
              </span>
            </div>
            <div className="text-xs text-zinc-400 font-mono truncate">
              {loopPhase === 'base' ? (
                <span className="text-[#10B981] font-semibold">
                  Split {savedStablePct}% / {savedYieldPct}% / {savedKeepPct}%
                </span>
              ) : (
                `MultiBucket(${savedStablePct}% USDC, ${savedYieldPct}% sUSDC)`
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Main 2-Column Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left 7 Columns: 3-Bucket Portfolio + Activity Ledger */}
        <div className="lg:col-span-7 space-y-6">

          {/* Header with Live Liveness Indicator */}
          <div className="flex items-center justify-between px-1">
            <span className="font-display text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Base Sepolia 3-Bucket Runway
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

          {/* 3-Bucket Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5" aria-busy={isLoadingBalances}>
            {/* Bucket 1: Core Stable Reserve */}
            <div className="bg-black border border-white/10 p-5 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>1. Core Reserve</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-[3px] bg-black border border-[#10B981]/50 text-[#10B981]">
                  USDC
                </span>
              </div>
              {isLoadingBalances ? (
                <div className="pt-2 pb-1">
                  <div className="h-7 w-28 bg-white/8 border border-white/10 rounded-[4px]" aria-label="Loading USDC balance" />
                </div>
              ) : (
                <div className="font-display text-2xl font-bold text-white font-mono tabular-nums pt-1">
                  ${animatedUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-1">
                <span>{savedStablePct}% runway</span>
                <span className="text-[#10B981] font-mono">Taxes / Ops</span>
              </div>
            </div>

            {/* Bucket 2: Treasury Yield Vault */}
            <div className="bg-black border border-white/10 p-5 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>2. Yield Vault</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-[3px] bg-black border border-[#58A6FF]/50 text-[#58A6FF]">
                  sUSDC
                </span>
              </div>
              {isLoadingBalances ? (
                <div className="pt-2 pb-1">
                  <div className="h-7 w-28 bg-white/8 border border-white/10 rounded-[4px]" aria-label="Loading sUSDC balance" />
                </div>
              ) : (
                <div className="font-display text-2xl font-bold text-[#58A6FF] font-mono tabular-nums pt-1">
                  ${animatedYieldUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-1">
                <span>{savedYieldPct}% idle yield</span>
                <span className="text-[#58A6FF] font-mono">Savings</span>
              </div>
            </div>

            {/* Bucket 3: Retained Operating Asset */}
            <div className="bg-black border border-white/10 p-5 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>3. Operating</span>
                <a
                  href={`${CONFIG.baseSepolia.explorer}/address/${CONFIG.baseSepolia.vaultAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-mono text-zinc-300 hover:text-white underline"
                >
                  BaseScan ↗
                </a>
              </div>
              {isLoadingBalances ? (
                <div className="pt-2 pb-1 flex items-center gap-2">
                  <div className="h-7 w-24 bg-white/8 border border-white/10 rounded-[4px]" aria-label="Loading WETH balance" />
                </div>
              ) : (
                <div className="font-display text-2xl font-bold text-zinc-100 font-mono tabular-nums pt-1">
                  {animatedWETH.toFixed(4)}
                  <span className="ml-1 text-xs text-zinc-400 font-sans font-medium">WETH</span>
                </div>
              )}
              <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-1">
                <span>{savedKeepPct}% retained</span>
                <span className="text-zinc-300 font-mono">Liquid ETH</span>
              </div>
            </div>
          </div>

          {/* Monitored Sepolia Inflow Account Bar */}
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
              <div className="text-zinc-400 text-[11px]">Sepolia Monitored Asset Balance:</div>
              {isLoadingBalances ? (
                <div className="mt-1 sm:ml-auto h-4 w-28 bg-white/8 border border-white/10 rounded-[3px]" aria-label="Loading Sepolia balance" />
              ) : (
                <div className="font-mono text-[#58A6FF] font-bold">
                  {userSepoliaWeth.toLocaleString('en-US', { maximumFractionDigits: 2 })} WETH
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
                  className="py-3 flex items-center justify-between gap-3 hover:bg-zinc-950 px-2.5 rounded-md transition"
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

        {/* Right 5 Columns: Multi-Bucket Policy & Guardrails */}
        <div className="lg:col-span-5">
          <div className="bg-black border border-white/10 p-6 sm:p-7 rounded-lg space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider">
                  Multi-Bucket &amp; Guardrails
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Configure stablecoin splits &amp; risk ceilings
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-[#58A6FF] px-2.5 py-1 rounded-md bg-black border border-[#2756FC]">
                {stablePct}/{yieldPct}/{keepPct}
              </span>
            </div>

            {/* 3 Runway Strategy Presets */}
            <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
              {STRATEGY_PRESETS.map((preset) => {
                const isSelected = stablePct === preset.stable && yieldPct === preset.yieldVal;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setStablePct(preset.stable);
                      setYieldPct(preset.yieldVal);
                    }}
                    className={`py-2 px-2 rounded-md border text-center transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#2756FC] border-[#58A6FF] text-white'
                        : 'border-white/10 bg-black text-zinc-400 hover:text-white hover:border-white/25'
                    }`}
                  >
                    <div className="text-[11px] font-display leading-tight">{preset.label}</div>
                    <div className="text-[10px] font-mono opacity-80 mt-0.5">{preset.sub}</div>
                  </button>
                );
              })}
            </div>

            {/* 3-Band Solid-Color Split Track (ZERO GRADIENTS) */}
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between gap-2 text-[11px] font-mono">
                <span className="text-[#10B981]">USDC Reserve: {stablePct}%</span>
                <span className="text-[#58A6FF]">sUSDC Yield: {yieldPct}%</span>
                <span className="text-zinc-300">WETH Kept: {keepPct}%</span>
              </div>

              <div className="h-2.5 w-full rounded-[3px] overflow-hidden flex bg-black p-px border border-white/10">
                <div
                  style={{ width: `${stablePct}%` }}
                  className="bg-[#10B981] transition-all duration-150"
                />
                <div
                  style={{ width: `${yieldPct}%` }}
                  className="bg-[#2756FC] transition-all duration-150"
                />
                <div
                  style={{ width: `${keepPct}%` }}
                  className="bg-zinc-600 transition-all duration-150"
                />
              </div>

              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                    <span>Bucket 1: Core USDC Reserve</span>
                    <span className="font-mono text-[#10B981]">{stablePct}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={stablePct}
                    onChange={(e) => handleStableChange(Number(e.target.value))}
                    aria-label="Core USDC Reserve Percentage"
                    className="w-full h-1.5 bg-zinc-800 rounded-md appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                    <span>Bucket 2: Treasury sUSDC Yield</span>
                    <span className="font-mono text-[#58A6FF]">{yieldPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={yieldPct}
                    onChange={(e) => handleYieldChange(Number(e.target.value))}
                    aria-label="Treasury sUSDC Yield Percentage"
                    className="w-full h-1.5 bg-zinc-800 rounded-md appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* On-Chain Risk Guardrails */}
            <div className="p-3.5 rounded-md bg-black border border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-[11px] uppercase tracking-wider text-zinc-300">
                  On-Chain Risk Guardrails
                </span>
                <span className="font-mono text-[10px] text-[#10B981]">ENFORCED</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label htmlFor="cap-select" className="block text-[10px] font-mono text-zinc-400">
                    Max Callback Cap
                  </label>
                  <select
                    id="cap-select"
                    value={maxCapWeth}
                    onChange={(e) => setMaxCapWeth(Number(e.target.value))}
                    className="w-full bg-black border border-white/15 rounded-md px-2.5 py-1.5 font-mono text-xs text-white"
                  >
                    <option value={2}>2.0 WETH</option>
                    <option value={5}>5.0 WETH</option>
                    <option value={10}>10.0 WETH</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="slippage-select" className="block text-[10px] font-mono text-zinc-400">
                    Slippage Floor
                  </label>
                  <select
                    id="slippage-select"
                    value={slippageFloorUsd}
                    onChange={(e) => setSlippageFloorUsd(Number(e.target.value))}
                    className="w-full bg-black border border-white/15 rounded-md px-2.5 py-1.5 font-mono text-xs text-white"
                  >
                    <option value={1800}>$1,800 / ETH</option>
                    <option value={2000}>$2,000 / ETH</option>
                    <option value={2250}>$2,250 / ETH</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-white/10">
                <span>Dust Floor: ≥ {minThresholdWeth} WETH</span>
                <span>Cooldown: {cooldownSecs}s</span>
              </div>
            </div>

            {/* 1.0 WETH ($2,500) Preview Box */}
            <div className="p-3.5 rounded-md bg-black border border-white/10 space-y-1.5 text-xs">
              <div className="text-zinc-400 font-medium">Simulated 1.0 WETH ($2,500) Split:</div>
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] pt-0.5">
                <span className="text-[#10B981]">+${previewStable.toLocaleString()} USDC</span>
                <span className="text-[#58A6FF]">+${previewYield.toLocaleString()} sUSDC</span>
                <span className="text-zinc-200">+{previewWeth} WETH</span>
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
                <span>Apply Multi-Bucket Policy ({stablePct}/{yieldPct}/{keepPct})</span>
              )}
            </button>

            <div className="text-[11px] font-mono text-zinc-500 text-center">
              Active Policy:{' '}
              <span className="text-zinc-300 font-semibold">
                {savedStablePct}% USDC • {savedYieldPct}% sUSDC • {savedKeepPct}% WETH
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
