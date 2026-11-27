import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Layers,
  Lock,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import { CONFIG, DEPLOYED_CONTRACTS } from '../config/contracts';
import MicroSlats from './ui/MicroSlats';
import FoldText from './ui/FoldText';

const SECTION_FOLD_PROPS = {
  foldStyle: 'paper',
  splitBy: 'char',
  hinge: 'top',
  trigger: 'scroll',
  foldAngle: 92,
  duration: 0.65,
  stagger: 0.03,
  staggerFrom: 'start',
  ease: 'power3.out',
  hoverRefold: false,
  refoldRadius: 140,
  refoldAngle: 45,
  perspective: 700,
  creaseShading: 0.55,
  fontSize: 'inherit',
  fontWeight: 500,
};

const CARD_FOLD_PROPS = {
  ...SECTION_FOLD_PROPS,
  duration: 0.55,
  stagger: 0.02,
  refoldRadius: 120,
  refoldAngle: 35,
};

const VERIFIED_PROOFS = {
  sepoliaTx: '0x60c423124030d83e8d8947c4553050e09223d852c09f39664e5df2613fb7a48c',
  lasnaTx: '0x6c7b7167826d8569a8f2cb5f9933568ea5d73b855d56f50004f01a04b20be0c6',
  baseTx: '0xa9852b7fa4cfa8474f99891fb9940ec0780ddc6d414ddebd9db4cf2576525220',
};

export default function LandingPage({
  onLaunchApp,
  protocolTvl = { usdc: 0, sUsdc: 0, weth: 0 },
  loopPhase = 'idle',
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [showContracts, setShowContracts] = useState(false);

  const wethUsd = protocolTvl.weth * CONFIG.ethUsdRate;
  const totalTvlUsd = Math.max(1, protocolTvl.usdc + protocolTvl.sUsdc + wethUsd);
  const usdcShare = Math.round((protocolTvl.usdc / totalTvlUsd) * 100);
  const yieldShare = Math.round((protocolTvl.sUsdc / totalTvlUsd) * 100);
  const wethShare = Math.max(0, 100 - usdcShare - yieldShare);

  const handleCopy = (key, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-16 pb-16 bg-black text-[#ededed]">
      {/* 1. HERO SECTION */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left: Interactive <MicroSlats /> WebGL Wave */}
          <div className="lg:col-span-5">
            <div className="relative w-full h-[360px] sm:h-[440px] lg:h-[540px] bg-black rounded-xl overflow-hidden">
              <MicroSlats
                preset="swell"
                color="#9929EA"
                glintColor="#FF5FCF"
                backgroundColor="#000000"
                slatWidth={10}
                slatHeight={25}
                gap={3}
                roundness={0.75}
                interactive
                cursorStrength={1}
                cursorSize={40}
                swirl={0}
                trail={1.4}
                lean={0}
                intro
              />
            </div>
          </div>

          {/* Right: Direct Product Copy, 2 Actions, Live Vault Snapshot */}
          <div className="lg:col-span-7 space-y-6 lg:border-l lg:border-white/[0.08] lg:pl-10">
            <div className="space-y-4">
              <h1 className="font-display text-[36px] sm:text-[48px] lg:text-[56px] font-medium tracking-[-0.03em] text-[#ededed] leading-[1.05]">
                <FoldText
                  {...SECTION_FOLD_PROPS}
                  trigger="mount"
                  text="Signal-driven cross-chain treasury rules"
                />
              </h1>

              <p className="text-base sm:text-lg text-[#a8a4b3] leading-relaxed max-w-[36rem]">
                When WETH hits your Ethereum Sepolia or Base Sepolia wallet, PaycheckReactive enforces dust and cooldown queueing on Lasna and triggers PaycheckVault on Base Sepolia to auto-split your approved Base WETH into USDC, sUSDC yield, and operating WETH — with zero keepers or backend servers.
              </p>
            </div>

            {/* Primary & Secondary Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onLaunchApp}
                className="h-11 px-6 rounded-lg text-sm font-medium bg-[#FAEB92] hover:bg-[#fdf2b0] text-black transition-[background-color,transform] duration-150 active:scale-[0.98] inline-flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAEB92]"
              >
                <span>Open treasury</span>
                <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              </button>

              <a
                href="#how-it-works"
                className="h-11 px-5 rounded-lg text-sm font-normal bg-[#121016] hover:bg-[#1c1922] text-[#ededed] border border-white/[0.08] transition-[background-color,transform] duration-150 active:scale-[0.98] inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5FCF]"
              >
                <span>How it works</span>
              </a>
            </div>

            {/* Live Protocol TVL & Verified End-to-End Proofs */}
            <div className="bg-[#121016] border border-white/[0.08] rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FAEB92]" />
                  <span className="text-xs font-medium text-[#ededed]">
                    Protocol TVL · Base Sepolia
                  </span>
                </div>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1c1922] text-[#a8a4b3] tabular-nums">
                  ${Math.round(protocolTvl.usdc + protocolTvl.sUsdc + wethUsd).toLocaleString('en-US')} locked
                </span>
              </div>

              {/* Live Contract Balances */}
              <div className="grid grid-cols-3 gap-4 pt-1">
                <div>
                  <div className="text-xs text-[#a8a4b3]">USDC reserve</div>
                  <div className="text-lg sm:text-xl font-mono font-medium text-[#FAEB92] tabular-nums mt-1">
                    ${protocolTvl.usdc.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#a8a4b3]">sUSDC yield</div>
                  <div className="text-lg sm:text-xl font-mono font-medium text-[#FF5FCF] tabular-nums mt-1">
                    ${protocolTvl.sUsdc.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#a8a4b3]">WETH reserve</div>
                  <div className="text-lg sm:text-xl font-mono font-medium text-[#ededed] tabular-nums mt-1">
                    {protocolTvl.weth.toFixed(2)} WETH
                  </div>
                </div>
              </div>

              {/* 3-Band Solid Composition Bar */}
              <div className="h-2.5 w-full rounded bg-black p-0.5 border border-white/[0.08] flex gap-0.5 overflow-hidden">
                <div style={{ width: `${usdcShare}%` }} className="h-full rounded-[2px] bg-[#FAEB92]" />
                <div style={{ width: `${yieldShare}%` }} className="h-full rounded-[2px] bg-[#FF5FCF]" />
                <div style={{ width: `${wethShare}%` }} className="h-full rounded-[2px] bg-[#9929EA]" />
              </div>

              {/* Real Verified Cross-Chain Tx Links */}
              <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <span className="text-[#8e8999]">Last verified 1.0 WETH run</span>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`${CONFIG.sepolia.explorer}/tx/${VERIFIED_PROOFS.sepoliaTx}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1c1922] text-[#ededed] hover:text-[#FAEB92] transition-colors duration-150"
                  >
                    <span>Sepolia</span>
                    <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </a>
                  <a
                    href={`${CONFIG.lasna.explorer}/tx/${VERIFIED_PROOFS.lasnaTx}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1c1922] text-[#FF5FCF] hover:text-white transition-colors duration-150"
                  >
                    <span>Lasna</span>
                    <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </a>
                  <a
                    href={`${CONFIG.baseSepolia.explorer}/tx/${VERIFIED_PROOFS.baseTx}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1c1922] text-[#FAEB92] hover:text-white transition-colors duration-150"
                  >
                    <span>Base</span>
                    <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW CROSS-CHAIN SETTLEMENT WORKS */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        <div className="border-t border-white/[0.08] pt-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-[28px] sm:text-[32px] leading-[1.15] font-medium text-[#ededed] tracking-[-0.02em]">
              <FoldText {...SECTION_FOLD_PROPS} text="What happens when a paycheck arrives" />
            </h2>
          </div>
          <div className="font-mono text-xs px-3 py-1 rounded bg-[#121016] border border-white/[0.08] text-[#a8a4b3] tabular-nums w-fit">
            11155111 → 5318007 → 84532
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1: Origin (Sepolia) */}
          <div
            className={`p-5 rounded-xl border transition-[background-color,border-color] duration-150 flex flex-col justify-between gap-4 ${loopPhase === 'sepolia'
              ? 'bg-[#1c1922] border-[#FAEB92]/60'
              : 'bg-[#121016] border-white/[0.08]'
              }`}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-[#1c1922] text-[#ededed]">1. Sepolia inflow</span>
                <span className="text-[#8e8999] tabular-nums">11155111</span>
              </div>
              <h3 className="font-display text-base font-medium text-[#ededed]">
                <FoldText {...CARD_FOLD_PROPS} text="You receive WETH" />
              </h3>
              <p className="text-sm text-[#a8a4b3] leading-relaxed">
                Someone sends WETH to your monitored Sepolia wallet. The ERC-20 token emits a <code className="font-mono text-xs text-[#FAEB92]">Transfer(from, to, value)</code> log that Reactive picks up automatically.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-black border border-white/[0.08] font-mono text-xs text-[#a8a4b3] truncate">
              <span className="text-[#8e8999]">Watch </span>
              <span className="text-[#ededed]">to == your wallet</span>
            </div>
          </div>

          {/* Step 2: Reactive Brain (Lasna Omni) */}
          <div
            className={`p-5 rounded-xl border transition-[background-color,border-color] duration-150 flex flex-col justify-between gap-4 ${loopPhase === 'lasna'
              ? 'bg-[#1c1922] border-[#FF5FCF]/60'
              : 'bg-[#121016] border-white/[0.08]'
              }`}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-[#1c1922] text-[#FF5FCF]">2. Lasna check</span>
                <span className="text-[#8e8999] tabular-nums">5318007</span>
              </div>
              <h3 className="font-display text-base font-medium text-[#ededed]">
                <FoldText {...CARD_FOLD_PROPS} text="Filters verify amount and timing" />
              </h3>
              <p className="text-sm text-[#a8a4b3] leading-relaxed">
                PaycheckReactive runs <code className="font-mono text-xs text-[#ededed]">react(LogRecord)</code> under <code className="font-mono text-xs text-[#ededed]">onlySystem</code>, checks the 0.01 WETH minimum and 30s cooldown, and calls <code className="font-mono text-xs text-[#FF5FCF]">requestCallbackV_1_0</code>.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-black border border-white/[0.08] font-mono text-xs text-[#a8a4b3] truncate">
              <span className="text-[#8e8999]">SYSTEM </span>
              <span className="text-[#FF5FCF]">0x8888...8888</span>
            </div>
          </div>

          {/* Step 3: Destination (Base Sepolia) */}
          <div
            className={`p-5 rounded-xl border transition-[background-color,border-color] duration-150 flex flex-col justify-between gap-4 ${loopPhase === 'base'
              ? 'bg-[#1c1922] border-[#FAEB92]/60'
              : 'bg-[#121016] border-white/[0.08]'
              }`}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-[#9929EA] text-white">3. Base split</span>
                <span className="text-[#8e8999] tabular-nums">84532</span>
              </div>
              <h3 className="font-display text-base font-medium text-[#ededed]">
                <FoldText {...CARD_FOLD_PROPS} text="Vault splits the payout" />
              </h3>
              <p className="text-sm text-[#a8a4b3] leading-relaxed">
                Base Omni Proxy delivers the callback to PaycheckVault, which verifies cap and slippage bounds before routing payouts across USDC reserve, sUSDC yield, and retained WETH (50% / 30% / 20% by default).
              </p>
            </div>
            <div className="p-3 rounded-lg bg-black border border-white/[0.08] font-mono text-xs text-[#a8a4b3] truncate">
              <span className="text-[#8e8999]">Vault </span>
              <span className="text-[#FAEB92]">
                {CONFIG.baseSepolia.vaultAddress.slice(0, 6)}...{CONFIG.baseSepolia.vaultAddress.slice(-4)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROTOCOL ARCHITECTURE & GUARDRAILS */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="border-t border-white/[0.08] pt-10 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <h2 className="font-display text-[28px] sm:text-[32px] leading-[1.15] font-medium text-[#ededed] tracking-[-0.02em]">
            <FoldText {...SECTION_FOLD_PROPS} text="What the contracts enforce" />
          </h2>
        </div>

        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {[
            {
              index: '01',
              icon: Layers,
              tag: 'Split rules',
              title: 'Three buckets in one callback',
              desc: 'Each Base Sepolia callback splits payouts into USDC for near-term expenses, sUSDC for yield, and liquid WETH using your configured percentages (50% / 30% / 20% by default).',
              tagClass: 'text-[#FAEB92]',
            },
            {
              index: '02',
              icon: ShieldAlert,
              tag: 'Spam filter',
              title: 'Dust floor and cooldown window',
              desc: 'PaycheckReactive ignores transfers below 0.01 WETH or arriving within 30 seconds of the previous run, logging InflowSuppressed on Lasna instead of wasting callback gas.',
              tagClass: 'text-[#FF5FCF]',
            },
            {
              index: '03',
              icon: Scale,
              tag: 'Swap limits',
              title: 'Per-callback cap and slippage floor',
              desc: 'PaycheckVault caps each swap with maxSingleAllocation and reverts on Base Sepolia if DEX output falls below minStableOutPerInput.',
              tagClass: 'text-[#ededed]',
            },
            {
              index: '04',
              icon: Lock,
              tag: 'Access control',
              title: 'Restricted to your bound Reactive contract',
              desc: 'PaycheckVault uses dual onlyServiceProvider and onlyCallbackSender checks so only the Base Omni Proxy forwarding calls from your PaycheckReactive contract can move vault funds.',
              tagClass: 'text-[#FAEB92]',
            },
          ].map((spec) => {
            const Icon = spec.icon;
            return (
              <div
                key={spec.index}
                className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-baseline"
              >
                <div className="md:col-span-4 flex items-center gap-3">
                  <span className="font-mono text-xs text-[#8e8999] tabular-nums w-6">{spec.index}</span>
                  <Icon className="w-4 h-4 shrink-0 text-[#8e8999]" strokeWidth={1.5} />
                  <span className={`font-mono text-xs px-2.5 py-0.5 rounded bg-[#121016] border border-white/[0.08] ${spec.tagClass}`}>
                    {spec.tag}
                  </span>
                </div>
                <div className="md:col-span-8 space-y-2">
                  <h3 className="font-display text-base sm:text-lg font-medium text-[#ededed] tracking-tight">
                    <FoldText {...CARD_FOLD_PROPS} text={spec.title} />
                  </h3>
                  <p className="text-sm text-[#a8a4b3] leading-relaxed">
                    {spec.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. VERIFIED CONTRACT REGISTRY (COLLAPSIBLE) */}
      <section id="contracts" className="max-w-6xl mx-auto px-4 sm:px-6 space-y-4">
        <div className="border-t border-white/[0.08] pt-10">
          <button
            type="button"
            onClick={() => setShowContracts((prev) => !prev)}
            aria-expanded={showContracts}
            aria-controls="verified-contracts-panel"
            className="w-full flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#121016] border border-white/[0.08] hover:border-white/[0.16] transition-colors duration-150 cursor-pointer text-left"
          >
            <div className="space-y-0.5">
              <h2 className="font-display text-base font-medium text-[#ededed]">
                <FoldText {...CARD_FOLD_PROPS} text="Deployed contracts" />
              </h2>
              <p className="text-xs text-[#8e8999]">
                Verified public addresses on Ethereum Sepolia, Reactive Lasna, and Base Sepolia
              </p>
            </div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1c1922] border border-white/[0.08] text-xs font-mono text-[#ededed]">
              <span>{showContracts ? 'Hide contracts' : 'View verified contracts (3)'}</span>
              <ChevronDown
                className={`w-4 h-4 text-[#a8a4b3] transition-transform duration-150 ${showContracts ? 'rotate-180' : ''}`}
                strokeWidth={1.5}
              />
            </span>
          </button>
        </div>

        {showContracts && (
          <div id="verified-contracts-panel" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEPLOYED_CONTRACTS.map((contract) => (
              <div key={contract.key} className="bg-[#121016] border border-white/[0.08] p-5 rounded-xl space-y-3">
                <div className="flex justify-between items-center gap-2 text-xs">
                  <span className={`font-medium ${contract.titleClass}`}>{contract.name}</span>
                  <span className="font-mono px-2 py-0.5 rounded bg-[#1c1922] text-[#8e8999] tabular-nums">
                    {contract.chainId}
                  </span>
                </div>
                <div
                  title={contract.address}
                  className="font-mono text-xs text-[#ededed] bg-black px-3 py-2.5 rounded-lg border border-white/[0.08] tabular-nums"
                >
                  {`${contract.address.slice(0, 10)}...${contract.address.slice(-8)}`}
                </div>
                <div className="flex justify-between items-center pt-1 text-xs font-mono">
                  <button
                    onClick={() => handleCopy(contract.key, contract.address)}
                    className="inline-flex items-center gap-1.5 text-[#a8a4b3] hover:text-[#ededed] transition-colors duration-150 cursor-pointer"
                  >
                    {copiedKey === contract.key ? (
                      <Check className="w-4 h-4 text-[#FAEB92]" strokeWidth={1.5} />
                    ) : (
                      <Copy className="w-4 h-4" strokeWidth={1.5} />
                    )}
                    <span>{copiedKey === contract.key ? 'Copied' : 'Copy'}</span>
                  </button>
                  <a
                    href={contract.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#FAEB92] hover:underline"
                  >
                    <span>{contract.explorerName}</span>
                    <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
