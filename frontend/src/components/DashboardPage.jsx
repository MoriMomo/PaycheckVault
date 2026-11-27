import React, { useState, useEffect } from 'react';
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

function parsePlainEnglishRule(text, currentStable, currentYield) {
  const lower = text.toLowerCase();
  const pickPct = (re) => {
    const m = lower.match(re);
    return m ? Math.min(100, Math.max(0, Math.round(Number(m[1])))) : null;
  };
  let nextStable = pickPct(/(\d{1,3})\s*%?\s*(?:in\s+|to\s+)?(?:core\s+)?(?:usdc|stable|reserve)/);
  let nextYield = pickPct(/(\d{1,3})\s*%?\s*(?:in\s+|to\s+)?(?:susdc|yield|savings)/);
  const nextWeth = pickPct(/(\d{1,3})\s*%?\s*(?:in\s+|to\s+)?(?:weth|eth|operating)/);

  if (nextStable === null && nextYield === null && nextWeth === null) return null;
  nextStable = nextStable ?? currentStable;
  nextYield = nextYield ?? (nextWeth !== null ? Math.max(0, 100 - nextStable - nextWeth) : currentYield);
  if (nextStable + nextYield > 100) nextYield = Math.max(0, 100 - nextStable);

  const capMatch = lower.match(/(?:max|cap)\s*(\d+(?:\.\d+)?)\s*weth/);
  const capVal = capMatch ? [2, 5, 10].reduce((a, b) => (Math.abs(b - Number(capMatch[1])) < Math.abs(a - Number(capMatch[1])) ? b : a)) : null;
  const floorMatch = lower.match(/(?:floor|slippage)\s*\$?(\d{3,4})/);
  const floorVal = floorMatch ? [1800, 2000, 2250].reduce((a, b) => (Math.abs(b - Number(floorMatch[1])) < Math.abs(a - Number(floorMatch[1])) ? b : a)) : null;

  return { stable: nextStable, yieldVal: nextYield, capVal, floorVal };
}

export default function DashboardPage({
  walletAddress,
  onConnectWallet,
  currentChainId,
  reactiveStats = { callbacks: 0, dustBlocked: 0, cooldownBlocked: 0, lasnaReactGas: null, baseVaultEthGas: null },
  lastUpdated,
  lastTriggeredTs = 0,
  isPreviewMode = false,
  previewAddress = null,
  onEnablePreview,
  onExitPreview,
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
  isAutoSplitEnabled = false,
  pendingLasnaWeth = 0,
  onEnableAutoSplit,
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
  isLoadingBalances,
  onRefreshBalances,
  activities,
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [ruleText, setRuleText] = useState('');
  const [rulePreview, setRulePreview] = useState('');
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const secondsAgo = Math.max(0, Math.floor((nowMs - (lastUpdated || nowMs)) / 1000));
  const cooldownRemaining =
    lastTriggeredTs > 0
      ? Math.max(0, cooldownSecs - (Math.floor(nowMs / 1000) - lastTriggeredTs))
      : 0;

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

  const bucketItems = [
    {
      key: 'usdc',
      cardTitle: 'Core reserve',
      rowLabel: 'USDC reserve',
      badge: 'USDC',
      badgeClass: 'bg-[#1c1922] text-[#FAEB92]',
      dotClass: 'bg-[#FAEB92]',
      withdrawClass: 'text-[#FAEB92]',
      loadingLabel: 'Loading USDC balance',
      formattedCard: `$${animatedUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      formattedRow: `$${animatedUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      rawBalance: vaultUsdc,
      actualShare: actualStableShare,
      targetLabel: `${savedStablePct}% target`,
      targetPct: savedStablePct,
    },
    {
      key: 'sUsdc',
      cardTitle: 'Yield vault',
      rowLabel: 'sUSDC yield',
      badge: 'sUSDC',
      badgeClass: 'bg-[#1c1922] text-[#FF5FCF]',
      dotClass: 'bg-[#FF5FCF]',
      withdrawClass: 'text-[#FF5FCF]',
      loadingLabel: 'Loading sUSDC balance',
      formattedCard: `$${animatedYieldUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      formattedRow: `$${animatedYieldUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      rawBalance: vaultYieldUsdc,
      actualShare: actualYieldShare,
      targetLabel: `${savedYieldPct}% target`,
      targetPct: savedYieldPct,
    },
    {
      key: 'weth',
      cardTitle: 'Operating asset',
      rowLabel: 'Operating WETH',
      badge: 'WETH',
      badgeClass: 'bg-[#9929EA] text-white',
      dotClass: 'bg-[#9929EA]',
      withdrawClass: 'text-[#ededed]',
      loadingLabel: 'Loading WETH balance',
      formattedCard: (
        <>
          {animatedWETH.toFixed(4)}
          <span className="ml-1.5 text-xs text-[#8e8999] font-sans font-normal">WETH</span>
        </>
      ),
      formattedRow: `$${Math.round(wethUsdValue).toLocaleString('en-US')} (${animatedWETH.toFixed(2)})`,
      rawBalance: vaultWeth,
      actualShare: actualWethShare,
      targetLabel: `${savedKeepPct}% kept`,
      targetPct: savedKeepPct,
    },
  ];

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
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[32px] leading-[1.15] font-medium tracking-[-0.02em] text-[#ededed]">
              Treasury
            </h1>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-[#121016] border border-white/[0.08] text-[#a8a4b3]">
              Testnet Simulation · $2,500/ETH Mock DEX
            </span>
          </div>
          <p className="text-sm text-[#a8a4b3] max-w-2xl">
            Cross-chain signal-driven treasury automation: Sepolia WETH inflows trigger PaycheckReactive on Lasna (dust &amp; cooldown firewall) to split your pre-funded Base Sepolia vault slice into USDC, sUSDC yield, and operating WETH.
          </p>
        </div>

        {/* Action Cluster */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => onExecutePaycheck(1.0, 'sepolia')}
            disabled={loopPhase !== 'idle'}
            className="h-10 px-4 rounded-lg text-sm font-medium bg-[#FAEB92] hover:bg-[#fdf2b0] text-black transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAEB92]"
          >
            <Send className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>{loopPhase !== 'idle' ? 'Relaying' : 'Send 1.0 WETH'}</span>
          </button>

          <button
            onClick={() => onExecutePaycheck(1.0, 'baseSepolia')}
            disabled={loopPhase !== 'idle'}
            className="h-10 px-4 rounded-lg text-sm font-normal text-[#ededed] bg-[#1c1922] hover:bg-[#25212d] border border-white/[0.08] transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAEB92]"
            title="Send 1.0 WETH directly on Base Sepolia to trigger Lasna auto-pull & split"
          >
            <Send className="w-4 h-4 shrink-0 text-[#FAEB92]" strokeWidth={1.5} />
            <span>Pay 1.0 Base WETH</span>
          </button>

          <button
            onClick={() => onExecutePaycheck(0.002)}
            disabled={loopPhase !== 'idle'}
            className="h-10 px-4 rounded-lg text-sm font-normal text-[#ededed] bg-[#1c1922] hover:bg-[#25212d] border border-white/[0.08] transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5FCF]"
            title={`Send a real 0.002 WETH tx on Sepolia (< ${minThresholdWeth} WETH floor) to trigger Lasna InflowSuppressed`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0 text-[#a8a4b3]" strokeWidth={1.5} />
            <span>Test 0.002 WETH dust</span>
          </button>

          <button
            onClick={() => onExecutePaycheck(0.05)}
            disabled={loopPhase !== 'idle'}
            className="h-10 px-4 rounded-lg text-sm font-normal text-[#ededed] bg-[#1c1922] hover:bg-[#25212d] border border-white/[0.08] transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5FCF]"
            title={`Send 0.05 WETH within the ${cooldownSecs}s cooldown window to test Lasna rate-limiting`}
          >
            <Clock className="w-4 h-4 shrink-0 text-[#a8a4b3]" strokeWidth={1.5} />
            <span>{cooldownRemaining > 0 ? `Test cooldown (${cooldownRemaining}s)` : 'Test 0.05 WETH'}</span>
          </button>

          <a
            href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
            target="_blank"
            rel="noreferrer"
            className="h-10 px-3 rounded-lg text-xs font-mono text-[#a8a4b3] hover:text-[#FAEB92] bg-[#121016] border border-white/[0.08] inline-flex items-center gap-1 transition-colors duration-150"
          >
            <span>Sepolia faucet</span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
          </a>
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

        {/* Reactive Firewall Counters & Contract Gas Reserves */}
        <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-4 text-[#a8a4b3] tabular-nums">
            <span>
              Callbacks: <strong className="text-[#ededed] font-medium">{reactiveStats.callbacks}</strong>
            </span>
            <span>
              Dust blocked: <strong className="text-[#FF5FCF] font-medium">{reactiveStats.dustBlocked}</strong>
            </span>
            <span>
              Cooldowns blocked: <strong className="text-[#FF5FCF] font-medium">{reactiveStats.cooldownBlocked}</strong>
            </span>
            {pendingLasnaWeth > 0 && (
              <span className="px-2 py-0.5 rounded bg-[#1c1922] border border-[#FAEB92]/40 text-[#FAEB92]">
                Queued: {pendingLasnaWeth.toFixed(2)} WETH
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 tabular-nums">
            <span className="text-[#a8a4b3]">
              Lasna RSC:{' '}
              <span className={reactiveStats.lasnaReactGas !== null && reactiveStats.lasnaReactGas < 0.05 ? 'text-[#FF5FCF]' : 'text-[#ededed]'}>
                {reactiveStats.lasnaReactGas !== null ? `${reactiveStats.lasnaReactGas.toFixed(3)} REACT` : '...'}
              </span>
            </span>
            <span className="text-[#a8a4b3]">
              Base vault gas:{' '}
              <span className={reactiveStats.baseVaultEthGas !== null && reactiveStats.baseVaultEthGas < 0.005 ? 'text-[#FF5FCF]' : 'text-[#ededed]'}>
                {reactiveStats.baseVaultEthGas !== null ? `${reactiveStats.baseVaultEthGas.toFixed(4)} ETH` : '...'}
              </span>
            </span>
            {(walletAddress || isPreviewMode) && (
              <span
                className={`px-2 py-0.5 rounded bg-[#1c1922] border border-white/[0.08] ${
                  cooldownRemaining > 0 ? 'text-[#FF5FCF]' : 'text-[#FAEB92]'
                }`}
              >
                {cooldownRemaining > 0 ? `Cooldown ${cooldownRemaining}s` : 'Cooldown ready'}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 3. Main 12-Column Workspace Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns */}
        <div className="xl:col-span-7 space-y-6">
          {/* 3 Compact Stat Cards with Per-User Withdraw */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-busy={isLoadingBalances}>
            {bucketItems.map((b) => (
              <div key={b.key} className="bg-[#121016] border border-white/[0.08] p-5 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs text-[#a8a4b3]">
                  <span>{b.cardTitle}</span>
                  <span className={`font-mono text-xs px-2 py-0.5 rounded ${b.badgeClass}`}>
                    {b.badge}
                  </span>
                </div>
                {isLoadingBalances ? (
                  <div className="h-7 w-28 bg-[#1c1922] rounded" aria-label={b.loadingLabel} />
                ) : (
                  <div className="text-[28px] leading-none font-mono font-medium tabular-nums text-[#ededed]">
                    {b.formattedCard}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-[#8e8999] font-mono tabular-nums">
                  <span>{b.targetLabel}</span>
                  {walletAddress && b.rawBalance > 0 && (
                    <button
                      onClick={() => onWithdrawBucket(b.key)}
                      disabled={isWalletActionBusy !== null}
                      className={`${b.withdrawClass} hover:underline disabled:opacity-50 cursor-pointer`}
                    >
                      {isWalletActionBusy === `withdraw-${b.key}` ? 'Withdrawing' : 'Withdraw'}
                    </button>
                  )}
                </div>
              </div>
            ))}
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
              {bucketItems.map((b, idx) => (
                <div
                  key={b.key}
                  className={`${idx === bucketItems.length - 1 ? 'pt-3' : 'py-3'} grid grid-cols-12 items-center`}
                >
                  <span className="col-span-4 flex items-center gap-2 text-[#ededed]">
                    <span className={`w-2 h-2 rounded-full ${b.dotClass} shrink-0`} />
                    <span>{b.rowLabel}</span>
                  </span>
                  <span className="col-span-4 text-right font-mono tabular-nums text-[#ededed]">
                    {b.formattedRow}
                  </span>
                  <span className="col-span-2 text-right font-mono tabular-nums text-[#a8a4b3]">
                    {b.actualShare}%
                  </span>
                  <span className="col-span-2 text-right font-mono tabular-nums text-[#8e8999]">
                    {b.targetPct}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Interactive Wallet Onboarding & Balances Card */}
          <div className="bg-[#121016] border border-white/[0.08] p-5 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <Wallet className="w-4 h-4 shrink-0 text-[#8e8999] mt-0.5" strokeWidth={1.5} />
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#a8a4b3]">
                    <span>
                      {walletAddress
                        ? 'Your connected wallet'
                        : isPreviewMode
                        ? 'Read-only sample preview'
                        : 'No wallet connected'}
                    </span>
                    {isPreviewMode && (
                      <span className="font-mono px-2 py-0.5 rounded bg-[#1c1922] border border-[#FF5FCF]/40 text-[#FF5FCF]">
                        Read-only
                      </span>
                    )}
                  </div>
                  {walletAddress ? (
                    <div className="font-mono text-xs text-[#ededed] truncate">
                      {walletAddress}
                    </div>
                  ) : isPreviewMode ? (
                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                      <span className="text-[#ededed] truncate">{previewAddress}</span>
                      <button onClick={onExitPreview} className="text-[#FF5FCF] hover:underline cursor-pointer">
                        Exit preview
                      </button>
                      <button onClick={onConnectWallet} className="text-[#FAEB92] hover:underline cursor-pointer">
                        Connect wallet
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                      <button onClick={onConnectWallet} className="text-[#FAEB92] hover:underline cursor-pointer">
                        Connect wallet to view your vault
                      </button>
                      <button onClick={onEnablePreview} className="text-[#a8a4b3] hover:text-[#ededed] hover:underline cursor-pointer">
                        Preview sample vault (read-only)
                      </button>
                    </div>
                  )}
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

            {walletAddress && vaultWeth <= 0 && !isAutoSplitEnabled && (
              <div className="p-3 rounded-lg bg-black border border-[#FAEB92]/40 text-xs text-[#a8a4b3]">
                New wallet step 1: Click <span className="font-mono text-[#FAEB92]">&quot;Enable Auto-Split&quot;</span> (1-time Base WETH approval) or deposit Base WETH below so PaycheckVault can split incoming paychecks automatically.
              </div>
            )}

            {/* Public Testnet Faucet & Deposit Actions */}
            <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={onEnableAutoSplit}
                  disabled={isWalletActionBusy !== null || isAutoSplitEnabled}
                  className={`h-8 px-3 rounded-lg border text-xs font-mono inline-flex items-center gap-1.5 transition-[background-color] duration-150 ${
                    isAutoSplitEnabled
                      ? 'bg-[#1c1922] border-[#FAEB92]/40 text-[#FAEB92] cursor-default'
                      : 'bg-[#FAEB92] hover:bg-[#fdf2b0] border-[#FAEB92] text-black font-medium cursor-pointer disabled:opacity-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>
                    {isWalletActionBusy === 'enable-autosplit'
                      ? 'Approving'
                      : isAutoSplitEnabled
                      ? 'Auto-Split active'
                      : 'Enable Auto-Split'}
                  </span>
                </button>
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
                  {walletAddress
                    ? 'No on-chain settlements for this wallet yet'
                    : 'Connect a wallet to view your on-chain settlements'}
                </div>
              ) : (
                activities.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {item.status === 'pending' ? (
                      <Clock className="w-4 h-4 shrink-0 text-[#FAEB92] mt-0.5" strokeWidth={1.5} />
                    ) : item.status === 'filtered' ? (
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
                      {item.lasnaFullTx && (
                        <a
                          href={`${CONFIG.lasna.explorer}/tx/${item.lasnaFullTx}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1c1922] text-[#FF5FCF] hover:text-white"
                        >
                          <span>Lasna</span>
                          <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </a>
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

            {/* Plain-English Rule Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const parsed = parsePlainEnglishRule(ruleText, stablePct, yieldPct);
                if (!parsed) {
                  setRulePreview('Try: "40% USDC reserve, 35% sUSDC yield, max 2 WETH"');
                  return;
                }
                setStablePct(parsed.stable);
                setYieldPct(parsed.yieldVal);
                if (parsed.capVal !== null) setMaxCapWeth(parsed.capVal);
                if (parsed.floorVal !== null) setSlippageFloorUsd(parsed.floorVal);
                const wethLeft = Math.max(0, 100 - parsed.stable - parsed.yieldVal);
                setRulePreview(`Parsed: ${parsed.stable}% USDC · ${parsed.yieldVal}% sUSDC · ${wethLeft}% WETH — click Save policy to commit`);
              }}
              className="space-y-1.5"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ruleText}
                  onChange={(e) => setRuleText(e.target.value)}
                  placeholder='Plain-English rule: "40% USDC, 35% sUSDC, max 2 WETH"'
                  aria-label="Plain-English allocation rule"
                  className="flex-1 h-9 px-3 rounded-lg bg-black border border-white/[0.08] text-xs text-[#ededed] placeholder:text-[#8e8999] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAEB92]"
                />
                <button
                  type="submit"
                  className="h-9 px-3 rounded-lg bg-[#1c1922] hover:bg-[#25212d] border border-white/[0.08] text-xs font-mono text-[#FAEB92] cursor-pointer shrink-0"
                >
                  Apply
                </button>
              </div>
              {rulePreview && <div className="text-xs font-mono text-[#a8a4b3]">{rulePreview}</div>}
            </form>

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
                    step="1"
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
                    step="1"
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
