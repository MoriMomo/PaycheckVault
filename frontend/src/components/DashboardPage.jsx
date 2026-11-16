import React from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  Clock,
  Coins,
  RefreshCw,
  Send,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { CONFIG } from '../config/contracts';

const STRATEGY_PRESETS = [
  { id: 'conservative', label: 'Conservative', sub: '70 / 20 / 10', stable: 70, yieldVal: 20 },
  { id: 'balanced', label: 'Balanced runway', sub: '50 / 30 / 20', stable: 50, yieldVal: 30 },
  { id: 'yield', label: 'Yield focus', sub: '20 / 70 / 10', stable: 20, yieldVal: 70 },
];

export default function DashboardPage({
  walletAddress,
  currentChainId,
  animatedUSDC,
  animatedYieldUSDC,
  animatedWETH,
  vaultUsdc,
  vaultYieldUsdc,
  vaultWeth,
  userSepoliaWeth,
  userBaseWeth = 0,
  userSepoliaEth = null,
  userBaseEth = null,
  isWalletActionBusy,
  onMintTestWeth,
  onDepositToVault,
  onWithdrawBucket,
  onSwitchNetwork,
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

  // Live Base Sepolia portfolio share calculation
  const wethUsdValue = animatedWETH * CONFIG.ethUsdRate;
  const totalPortfolioUsd = Math.max(1, animatedUSDC + animatedYieldUSDC + wethUsdValue);
  const actualStableShare = Math.round((animatedUSDC / totalPortfolioUsd) * 100);
  const actualYieldShare = Math.round((animatedYieldUSDC / totalPortfolioUsd) * 100);
  const actualWethShare = Math.max(0, 100 - actualStableShare - actualYieldShare);

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

  const phaseLabel =
    loopPhase === 'idle'
      ? 'Listening'
      : loopPhase === 'blocked'
      ? 'Suppressed'
      : loopPhase === 'sepolia'
      ? 'Sepolia inflow'
      : loopPhase === 'lasna'
      ? 'Lasna relay'
      : 'Base settlement';

  return (
    <div className="space-y-6 text-[#ededed]">
      {/* 1. Top Command Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-[32px] leading-[1.15] font-medium tracking-[-0.02em] text-[#ededed]">
            Treasury
          </h1>
          <p className="text-sm text-[#a8a4b3] max-w-2xl">
            Send WETH on Sepolia. PaycheckReactive checks dust and cooldown limits on Lasna and triggers PaycheckVault on Base Sepolia to split funds into your three buckets.
          </p>
        </div>

        {/* Action Cluster */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => onExecutePaycheck(1.0)}
            disabled={loopPhase !== 'idle'}
            className="h-10 px-4 rounded-lg text-sm font-medium bg-[#FAEB92] hover:bg-[#fdf2b0] text-black transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAEB92]"
          >
            <Send className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>
              {loopPhase !== 'idle'
                ? 'Relaying'
                : walletAddress
                ? 'Send 1.0 WETH'
                : 'Simulate 1.0 WETH'}
            </span>
          </button>

          <button
            onClick={onSimulateDust}
            disabled={loopPhase !== 'idle'}
            className="h-10 px-4 rounded-lg text-sm font-normal text-[#ededed] bg-[#1c1922] hover:bg-[#25212d] border border-white/[0.08] transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5FCF]"
            title={`Test < ${minThresholdWeth} WETH inflow suppressed by Lasna`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0 text-[#a8a4b3]" strokeWidth={1.5} />
            <span>Test small inflow</span>
          </button>

          <button
            onClick={onSimulateCooldown}
            disabled={loopPhase !== 'idle'}
            className="h-10 px-4 rounded-lg text-sm font-normal text-[#ededed] bg-[#1c1922] hover:bg-[#25212d] border border-white/[0.08] transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5FCF]"
            title={`Test rapid inflow rate-limited inside ${cooldownSecs}s cooldown`}
          >
            <Clock className="w-4 h-4 shrink-0 text-[#a8a4b3]" strokeWidth={1.5} />
            <span>Test repeat inflow</span>
          </button>
        </div>
      </div>

      {/* 2. Live 3-Node Signal Relay Strip */}
      <section aria-label="Cross-chain signal relay" className="bg-[#121016] border border-white/[0.08] p-5 rounded-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-[#ededed]">
            Signal relay
          </span>
          <div className="flex items-center gap-3">
            {activeTxHash && (
              <a
                href={`${CONFIG.sepolia.explorer}/tx/${activeTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#FAEB92] hover:underline font-mono text-xs"
              >
                <span>{activeTxHash.slice(0, 10)}...</span>
                <ArrowUpRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              </a>
            )}
            <span className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1 rounded bg-[#1c1922] border border-white/[0.08] text-[#a8a4b3]">
              <span
                className={`w-2 h-2 rounded-full ${
                  loopPhase === 'idle'
                    ? 'bg-[#FAEB92]'
                    : loopPhase === 'blocked'
                    ? 'bg-[#FF5FCF]'
                    : 'bg-[#9929EA]'
                }`}
              />
              <span>{phaseLabel}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className={`p-4 rounded-lg border transition-[background-color,border-color] duration-150 ${
              loopPhase === 'sepolia'
                ? 'border-[#FAEB92]/60 bg-[#1c1922]'
                : 'border-white/[0.08] bg-black'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-medium text-[#ededed]">1. Sepolia origin</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1c1922] border border-white/[0.08] text-[#a8a4b3] tabular-nums">
                11155111
              </span>
            </div>
            <div className="text-xs font-mono text-[#8e8999] truncate">
              {loopPhase === 'sepolia' ? (
                <span className="text-[#ededed]">WETH transfer log caught</span>
              ) : (
                'WETH.transfer(recipient, amount)'
              )}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg border transition-[background-color,border-color] duration-150 ${
              loopPhase === 'blocked'
                ? 'border-[#FF5FCF]/60 bg-[#1c1922]'
                : loopPhase === 'lasna'
                ? 'border-[#9929EA] bg-[#1c1922]'
                : 'border-white/[0.08] bg-black'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-medium text-[#ededed]">2. Lasna Omni</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1c1922] border border-white/[0.08] text-[#FF5FCF] tabular-nums">
                5318007
              </span>
            </div>
            <div className="text-xs font-mono text-[#8e8999] truncate">
              {loopPhase === 'blocked' ? (
                <span className="text-[#FF5FCF]">Suppressed via InflowSuppressed</span>
              ) : loopPhase === 'lasna' ? (
                <span className="text-[#FF5FCF]">Guardrails passed, callback sent</span>
              ) : (
                `Floor >= ${minThresholdWeth} WETH · ${cooldownSecs}s cooldown`
              )}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg border transition-[background-color,border-color] duration-150 ${
              loopPhase === 'base'
                ? 'border-[#FAEB92]/60 bg-[#1c1922]'
                : 'border-white/[0.08] bg-black'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-medium text-[#ededed]">3. Base Sepolia vault</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1c1922] border border-white/[0.08] text-[#FAEB92] tabular-nums">
                84532
              </span>
            </div>
            <div className="text-xs font-mono text-[#8e8999] truncate">
              {loopPhase === 'base' ? (
                <span className="text-[#FAEB92]">
                  Settled {savedStablePct}% / {savedYieldPct}% / {savedKeepPct}%
                </span>
              ) : (
                `Split ${savedStablePct}% USDC · ${savedYieldPct}% sUSDC · ${savedKeepPct}% WETH`
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Main 12-Column Workspace Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns */}
        <div className="xl:col-span-7 space-y-6">
          {/* 3 Compact Stat Cards with Per-User Withdraw */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-busy={isLoadingBalances}>
            <div className="bg-[#121016] border border-white/[0.08] p-5 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs text-[#a8a4b3]">
                <span>Core reserve</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1c1922] text-[#FAEB92]">
                  USDC
                </span>
              </div>
              {isLoadingBalances ? (
                <div className="h-7 w-28 bg-[#1c1922] rounded" aria-label="Loading USDC balance" />
              ) : (
                <div className="text-[28px] leading-none font-mono font-medium tabular-nums text-[#ededed]">
                  ${animatedUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-[#8e8999] font-mono tabular-nums">
                <span>{savedStablePct}% target</span>
                {walletAddress && vaultUsdc > 0 && (
                  <button
                    onClick={() => onWithdrawBucket('usdc')}
                    disabled={isWalletActionBusy !== null}
                    className="text-[#FAEB92] hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    {isWalletActionBusy === 'withdraw-usdc' ? 'Withdrawing' : 'Withdraw'}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#121016] border border-white/[0.08] p-5 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs text-[#a8a4b3]">
                <span>Yield vault</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1c1922] text-[#FF5FCF]">
                  sUSDC
                </span>
              </div>
              {isLoadingBalances ? (
                <div className="h-7 w-28 bg-[#1c1922] rounded" aria-label="Loading sUSDC balance" />
              ) : (
                <div className="text-[28px] leading-none font-mono font-medium tabular-nums text-[#ededed]">
                  ${animatedYieldUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-[#8e8999] font-mono tabular-nums">
                <span>{savedYieldPct}% target</span>
                {walletAddress && vaultYieldUsdc > 0 && (
                  <button
                    onClick={() => onWithdrawBucket('sUsdc')}
                    disabled={isWalletActionBusy !== null}
                    className="text-[#FF5FCF] hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    {isWalletActionBusy === 'withdraw-sUsdc' ? 'Withdrawing' : 'Withdraw'}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#121016] border border-white/[0.08] p-5 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs text-[#a8a4b3]">
                <span>Operating asset</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#9929EA] text-white">
                  WETH
                </span>
              </div>
              {isLoadingBalances ? (
                <div className="h-7 w-28 bg-[#1c1922] rounded" aria-label="Loading WETH balance" />
              ) : (
                <div className="text-[28px] leading-none font-mono font-medium tabular-nums text-[#ededed]">
                  {animatedWETH.toFixed(4)}
                  <span className="ml-1.5 text-xs text-[#8e8999] font-sans font-normal">WETH</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-[#8e8999] font-mono tabular-nums">
                <span>{savedKeepPct}% kept</span>
                {walletAddress && vaultWeth > 0 && (
                  <button
                    onClick={() => onWithdrawBucket('weth')}
                    disabled={isWalletActionBusy !== null}
                    className="text-[#ededed] hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    {isWalletActionBusy === 'withdraw-weth' ? 'Withdrawing' : 'Withdraw'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Primary Data Moment: Runway Composition vs Policy Target */}
          <section aria-label="Vault runway composition" className="bg-[#121016] border border-white/[0.08] p-6 rounded-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-medium text-[#ededed]">Runway composition</h2>
                <p className="text-xs text-[#8e8999] font-mono tabular-nums mt-1">
                  ${Math.round(totalPortfolioUsd).toLocaleString('en-US')} total Base Sepolia vault slice
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`${CONFIG.baseSepolia.explorer}/address/${CONFIG.baseSepolia.vaultAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="h-8 px-3 rounded-lg bg-[#1c1922] hover:bg-[#25212d] border border-white/[0.08] text-xs font-mono text-[#FAEB92] inline-flex items-center gap-1.5 transition-[background-color,color] duration-150"
                >
                  <span>BaseScan</span>
                  <ArrowUpRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                </a>
                <button
                  onClick={onRefreshBalances}
                  className="h-8 px-3 rounded-lg bg-[#1c1922] hover:bg-[#25212d] border border-white/[0.08] text-xs font-mono text-[#a8a4b3] hover:text-[#ededed] inline-flex items-center gap-2 transition-[background-color,color] duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAEB92]"
                  title="Refresh on-chain balances"
                >
                  <RefreshCw className={`w-4 h-4 shrink-0 ${isLoadingBalances ? 'animate-spin text-[#FF5FCF]' : 'text-[#8e8999]'}`} strokeWidth={1.5} />
                  <span>{isLoadingBalances ? 'Syncing' : `${secondsAgo}s ago`}</span>
                </button>
              </div>
            </div>

            {/* Proportional Bar */}
            <div className="h-3 w-full rounded bg-black p-0.5 border border-white/[0.08] flex gap-0.5 overflow-hidden">
              <div style={{ width: `${actualStableShare}%` }} className="h-full rounded-[2px] bg-[#FAEB92]" />
              <div style={{ width: `${actualYieldShare}%` }} className="h-full rounded-[2px] bg-[#FF5FCF]" />
              <div style={{ width: `${actualWethShare}%` }} className="h-full rounded-[2px] bg-[#9929EA]" />
            </div>

            {/* Aligned Asset Share Table */}
            <div className="divide-y divide-white/[0.08] text-xs">
              <div className="pb-2 grid grid-cols-12 text-[#8e8999]">
                <span className="col-span-4">Bucket</span>
                <span className="col-span-4 text-right">On-chain value</span>
                <span className="col-span-2 text-right">Actual</span>
                <span className="col-span-2 text-right">Target</span>
              </div>
              <div className="py-3 grid grid-cols-12 items-center">
                <span className="col-span-4 flex items-center gap-2 text-[#ededed]">
                  <span className="w-2 h-2 rounded-full bg-[#FAEB92] shrink-0" />
                  <span>USDC reserve</span>
                </span>
                <span className="col-span-4 text-right font-mono tabular-nums text-[#ededed]">
                  ${animatedUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="col-span-2 text-right font-mono tabular-nums text-[#a8a4b3]">
                  {actualStableShare}%
                </span>
                <span className="col-span-2 text-right font-mono tabular-nums text-[#8e8999]">
                  {savedStablePct}%
                </span>
              </div>
              <div className="py-3 grid grid-cols-12 items-center">
                <span className="col-span-4 flex items-center gap-2 text-[#ededed]">
                  <span className="w-2 h-2 rounded-full bg-[#FF5FCF] shrink-0" />
                  <span>sUSDC yield</span>
                </span>
                <span className="col-span-4 text-right font-mono tabular-nums text-[#ededed]">
                  ${animatedYieldUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="col-span-2 text-right font-mono tabular-nums text-[#a8a4b3]">
                  {actualYieldShare}%
                </span>
                <span className="col-span-2 text-right font-mono tabular-nums text-[#8e8999]">
                  {savedYieldPct}%
                </span>
              </div>
              <div className="pt-3 grid grid-cols-12 items-center">
                <span className="col-span-4 flex items-center gap-2 text-[#ededed]">
                  <span className="w-2 h-2 rounded-full bg-[#9929EA] shrink-0" />
                  <span>Operating WETH</span>
                </span>
                <span className="col-span-4 text-right font-mono tabular-nums text-[#ededed]">
                  ${Math.round(wethUsdValue).toLocaleString('en-US')} ({animatedWETH.toFixed(2)})
                </span>
                <span className="col-span-2 text-right font-mono tabular-nums text-[#a8a4b3]">
                  {actualWethShare}%
                </span>
                <span className="col-span-2 text-right font-mono tabular-nums text-[#8e8999]">
                  {savedKeepPct}%
                </span>
              </div>
            </div>
          </section>

          {/* Interactive Wallet Onboarding & Balances Card */}
          <div className="bg-[#121016] border border-white/[0.08] p-5 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <Wallet className="w-4 h-4 shrink-0 text-[#8e8999] mt-0.5" strokeWidth={1.5} />
                <div className="space-y-1 min-w-0">
                  <div className="text-xs text-[#a8a4b3]">
                    {walletAddress ? 'Your connected wallet' : 'Default demo wallet (connect yours in sidebar)'}
                  </div>
                  <div className="font-mono text-xs text-[#ededed] truncate">
                    {walletAddress || CONFIG.deployerRvmId}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-5 shrink-0">
                <div>
                  <div className="text-xs text-[#8e8999]">Sepolia WETH</div>
                  <div className="font-mono text-sm font-medium text-[#FAEB92] tabular-nums mt-0.5">
                    {userSepoliaWeth.toLocaleString('en-US', { maximumFractionDigits: 2 })} WETH
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#8e8999]">Base wallet WETH</div>
                  <div className="font-mono text-sm font-medium text-[#ededed] tabular-nums mt-0.5">
                    {userBaseWeth.toLocaleString('en-US', { maximumFractionDigits: 2 })} WETH
                  </div>
                </div>
                {walletAddress && userSepoliaEth !== null && userBaseEth !== null && (
                  <div className="flex items-center gap-4 pl-4 border-l border-white/[0.08]">
                    <div>
                      <div className="text-xs text-[#8e8999]">Sepolia gas</div>
                      <div
                        className={`font-mono text-xs tabular-nums mt-0.5 ${
                          userSepoliaEth < 0.001 ? 'text-[#FF5FCF]' : 'text-[#a8a4b3]'
                        }`}
                      >
                        {userSepoliaEth.toFixed(4)} ETH
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#8e8999]">Base gas</div>
                      <div
                        className={`font-mono text-xs tabular-nums mt-0.5 ${
                          userBaseEth < 0.001 ? 'text-[#FF5FCF]' : 'text-[#a8a4b3]'
                        }`}
                      >
                        {userBaseEth.toFixed(4)} ETH
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {walletAddress &&
              ((userSepoliaEth !== null && userSepoliaEth < 0.001) ||
                (userBaseEth !== null && userBaseEth < 0.001)) && (
                <div className="p-3 rounded-lg bg-black border border-[#FF5FCF]/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[#a8a4b3]">
                    Low testnet gas (&lt; 0.001 ETH). Fund ETH before signing:
                  </span>
                  <div className="flex items-center gap-3 font-mono">
                    {userSepoliaEth !== null && userSepoliaEth < 0.001 && (
                      <a
                        href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#FAEB92] hover:underline"
                      >
                        <span>Sepolia faucet</span>
                        <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </a>
                    )}
                    {userBaseEth !== null && userBaseEth < 0.001 && (
                      <a
                        href="https://www.alchemy.com/faucets/base-sepolia"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#FF5FCF] hover:underline"
                      >
                        <span>Base Sepolia faucet</span>
                        <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </a>
                    )}
                  </div>
                </div>
              )}

            {/* Public Testnet Faucet & Deposit Actions */}
            <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onMintTestWeth('sepolia', 5)}
                  disabled={isWalletActionBusy !== null}
                  className="h-8 px-3 rounded-lg bg-[#1c1922] hover:bg-[#25212d] border border-white/[0.08] text-xs font-mono text-[#ededed] inline-flex items-center gap-1.5 transition-[background-color] duration-150 disabled:opacity-50 cursor-pointer"
                >
                  <Coins className="w-3.5 h-3.5 text-[#FAEB92]" strokeWidth={1.5} />
                  <span>{isWalletActionBusy === 'mint-sepolia' ? 'Minting' : 'Mint 5 Sepolia WETH'}</span>
                </button>
                <button
                  onClick={() => onMintTestWeth('baseSepolia', 5)}
                  disabled={isWalletActionBusy !== null}
                  className="h-8 px-3 rounded-lg bg-[#1c1922] hover:bg-[#25212d] border border-white/[0.08] text-xs font-mono text-[#ededed] inline-flex items-center gap-1.5 transition-[background-color] duration-150 disabled:opacity-50 cursor-pointer"
                >
                  <Coins className="w-3.5 h-3.5 text-[#FF5FCF]" strokeWidth={1.5} />
                  <span>{isWalletActionBusy === 'mint-baseSepolia' ? 'Minting' : 'Mint 5 Base WETH'}</span>
                </button>
                <button
                  onClick={() => onDepositToVault(2)}
                  disabled={isWalletActionBusy !== null}
                  className="h-8 px-3 rounded-lg bg-[#1c1922] hover:bg-[#25212d] border border-white/[0.08] text-xs font-mono text-[#FAEB92] inline-flex items-center gap-1.5 transition-[background-color] duration-150 disabled:opacity-50 cursor-pointer"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{isWalletActionBusy === 'deposit' ? 'Depositing' : 'Deposit 2 WETH to vault'}</span>
                </button>
              </div>

              {walletAddress && currentChainId && (
                <div className="flex items-center gap-2 text-xs font-mono">
                  <button
                    onClick={() => onSwitchNetwork(CONFIG.sepolia)}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      currentChainId === CONFIG.sepolia.chainId
                        ? 'bg-[#FAEB92] text-black'
                        : 'bg-[#1c1922] text-[#a8a4b3] hover:text-white'
                    }`}
                  >
                    Sepolia
                  </button>
                  <button
                    onClick={() => onSwitchNetwork(CONFIG.baseSepolia)}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      currentChainId === CONFIG.baseSepolia.chainId
                        ? 'bg-[#FF5FCF] text-black'
                        : 'bg-[#1c1922] text-[#a8a4b3] hover:text-white'
                    }`}
                  >
                    Base
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Execution Ledger */}
          <section aria-label="Execution ledger" className="bg-[#121016] border border-white/[0.08] p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-[#ededed]">Execution ledger</h2>
              <span className="text-xs font-mono text-[#8e8999] tabular-nums">{activities.length} entries</span>
            </div>

            <div className="divide-y divide-white/[0.08] text-xs">
              {activities.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#8e8999]">
                  No on-chain settlements for this wallet yet
                </div>
              ) : (
                activities.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {item.status === 'filtered' ? (
                      <Ban className="w-4 h-4 shrink-0 text-[#FF5FCF] mt-0.5" strokeWidth={1.5} />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#FAEB92] mt-0.5" strokeWidth={1.5} />
                    )}
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-medium text-[#ededed] tabular-nums">{item.inflow}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded bg-[#1c1922] ${
                            item.status === 'filtered' ? 'text-[#FF5FCF]' : 'text-[#FAEB92]'
                          }`}
                        >
                          {item.lasnaSignal}
                        </span>
                      </div>
                      <div className="text-xs text-[#a8a4b3]">{item.destSwap}</div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pl-7 sm:pl-0">
                    <span className="text-xs text-[#8e8999]">{item.time}</span>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      {item.originFullTx ? (
                        <a
                          href={`${CONFIG.sepolia.explorer}/tx/${item.originFullTx}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1c1922] text-[#ededed] hover:text-[#FAEB92]"
                        >
                          <span>Sepolia</span>
                          <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </a>
                      ) : (
                        <span className="text-[#8e8999]">{item.originTx}</span>
                      )}
                      {item.destFullTx && (
                        <a
                          href={`${CONFIG.baseSepolia.explorer}/tx/${item.destFullTx}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1c1922] text-[#FAEB92] hover:text-white"
                        >
                          <span>Base</span>
                          <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right 5 Columns: Multi-Bucket Policy & Guardrails */}
        <div className="xl:col-span-5">
          <section aria-label="Policy and guardrails" className="bg-[#121016] border border-white/[0.08] p-6 rounded-xl space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-medium text-[#ededed]">
                  Policy &amp; guardrails
                </h2>
                <p className="text-xs text-[#a8a4b3] mt-1">
                  Configure stablecoin splits and risk limits for your address
                </p>
              </div>
              <span className="font-mono text-xs font-medium text-[#FAEB92] px-3 py-1 rounded-md bg-[#1c1922] border border-white/[0.08] tabular-nums">
                {stablePct}/{yieldPct}/{keepPct}
              </span>
            </div>

            {/* 3 Runway Strategy Presets */}
            <div className="grid grid-cols-3 gap-3">
              {STRATEGY_PRESETS.map((preset) => {
                const isSelected = stablePct === preset.stable && yieldPct === preset.yieldVal;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setStablePct(preset.stable);
                      setYieldPct(preset.yieldVal);
                    }}
                    className={`p-3 rounded-lg border text-left transition-[background-color,border-color,color] duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAEB92] ${
                      isSelected
                        ? 'bg-[#1c1922] border-[#FAEB92]/60 text-[#ededed] shadow-[inset_0_1px_0_rgba(237,237,237,0.08)]'
                        : 'border-white/[0.08] bg-black text-[#a8a4b3] hover:text-[#ededed] hover:bg-[#1c1922]'
                    }`}
                  >
                    <div className="text-xs font-medium leading-tight">{preset.label}</div>
                    <div className="text-xs font-mono text-[#8e8999] mt-1 tabular-nums">{preset.sub}</div>
                  </button>
                );
              })}
            </div>

            {/* Target Split Sliders */}
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between gap-2 text-xs font-mono tabular-nums">
                <span className="text-[#FAEB92]">USDC {stablePct}%</span>
                <span className="text-[#FF5FCF]">sUSDC {yieldPct}%</span>
                <span className="text-[#a8a4b3]">WETH {keepPct}%</span>
              </div>

              <div className="h-3 w-full rounded bg-black overflow-hidden flex gap-0.5 p-0.5 border border-white/[0.08]">
                <div style={{ width: `${stablePct}%` }} className="h-full rounded-[2px] bg-[#FAEB92]" />
                <div style={{ width: `${yieldPct}%` }} className="h-full rounded-[2px] bg-[#FF5FCF]" />
                <div style={{ width: `${keepPct}%` }} className="h-full rounded-[2px] bg-[#9929EA]" />
              </div>

              <div className="space-y-4 pt-1">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-[#a8a4b3]">
                    <label htmlFor="stable-range">Core USDC reserve</label>
                    <span className="font-mono text-[#ededed] tabular-nums">{stablePct}%</span>
                  </div>
                  <input
                    id="stable-range"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={stablePct}
                    onChange={(e) => handleStableChange(Number(e.target.value))}
                    className="w-full unslop-range"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-[#a8a4b3]">
                    <label htmlFor="yield-range">Treasury sUSDC yield</label>
                    <span className="font-mono text-[#ededed] tabular-nums">{yieldPct}%</span>
                  </div>
                  <input
                    id="yield-range"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={yieldPct}
                    onChange={(e) => handleYieldChange(Number(e.target.value))}
                    className="w-full unslop-range"
                  />
                </div>
              </div>
            </div>

            {/* On-Chain Risk Guardrails */}
            <div className="p-4 rounded-lg bg-black border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#ededed]">
                  On-chain risk guardrails
                </span>
                <span className="font-mono text-xs text-[#FAEB92]">Enforced</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="cap-select" className="block text-xs text-[#a8a4b3]">
                    Max callback cap
                  </label>
                  <select
                    id="cap-select"
                    value={maxCapWeth}
                    onChange={(e) => setMaxCapWeth(Number(e.target.value))}
                    className="w-full h-9 bg-[#1c1922] border border-white/[0.08] rounded-lg px-3 font-mono text-xs text-[#ededed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAEB92]"
                  >
                    <option value={2}>2.0 WETH</option>
                    <option value={5}>5.0 WETH</option>
                    <option value={10}>10.0 WETH</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="slippage-select" className="block text-xs text-[#a8a4b3]">
                    Slippage floor
                  </label>
                  <select
                    id="slippage-select"
                    value={slippageFloorUsd}
                    onChange={(e) => setSlippageFloorUsd(Number(e.target.value))}
                    className="w-full h-9 bg-[#1c1922] border border-white/[0.08] rounded-lg px-3 font-mono text-xs text-[#ededed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAEB92]"
                  >
                    <option value={1800}>$1,800 / ETH</option>
                    <option value={2000}>$2,000 / ETH</option>
                    <option value={2250}>$2,250 / ETH</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-[#8e8999] pt-3 border-t border-white/[0.08] tabular-nums">
                <span>Dust limit &ge; {minThresholdWeth} WETH</span>
                <span>Cooldown {cooldownSecs}s</span>
              </div>
            </div>

            {/* 1.0 WETH ($2,500) Output Preview */}
            <div className="p-4 rounded-lg bg-black border border-white/[0.08] space-y-2">
              <div className="text-xs text-[#a8a4b3]">Simulated 1.0 WETH ($2,500) split</div>
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs tabular-nums">
                <span className="text-[#FAEB92]">+${previewStable.toLocaleString()} USDC</span>
                <span className="text-[#FF5FCF]">+${previewYield.toLocaleString()} sUSDC</span>
                <span className="text-[#ededed]">+{previewWeth} WETH</span>
              </div>
            </div>

            {/* On-Chain Save CTA */}
            <button
              onClick={onSavePolicy}
              disabled={isUpdatingPolicy}
              className="w-full h-11 rounded-lg font-medium text-sm bg-[#FAEB92] hover:bg-[#fdf2b0] text-black transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAEB92]"
            >
              <span>
                {isUpdatingPolicy
                  ? 'Confirming on Base Sepolia'
                  : `Save ${stablePct}/${yieldPct}/${keepPct} policy`}
              </span>
            </button>

            <div className="text-xs font-mono text-[#8e8999] text-center tabular-nums">
              On-chain policy{' '}
              <span className="text-[#ededed]">
                {savedStablePct}% USDC · {savedYieldPct}% sUSDC · {savedKeepPct}% WETH
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
