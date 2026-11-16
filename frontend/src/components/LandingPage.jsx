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
import { CONFIG } from '../config/contracts';
import MicroSlats from './ui/MicroSlats';

const VERIFIED_PROOFS = {
  sepoliaTx: '0x043025677f893c2367986950c26c1cd0017bda08422adc26cc13d8f69359fc68',
  lasnaTx: '0x8fce8c56ed954acc43f12c8ae2fce2d599322a79d42baba890853de841057631',
  baseTx: '0x3a2ad37d975ca1fae92b412f2ebed8c4c00f146a9d1a60fda2aa9a8f7416d9c6',
};

export default function LandingPage({
  onLaunchApp,
  vaultUsdc,
  vaultYieldUsdc = 0,
  vaultWeth,
  savedStablePct = 50,
  savedYieldPct = 30,
  loopPhase = 'idle',
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [showContracts, setShowContracts] = useState(false);
  const savedKeepPct = Math.max(0, 100 - savedStablePct - savedYieldPct);

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
                Auto-split crypto paychecks across chains
              </h1>

              <p className="text-base sm:text-lg text-[#a8a4b3] leading-relaxed max-w-[36rem]">
                Get paid in WETH on Ethereum Sepolia. PaycheckReactive checks transfer limits on Lasna and triggers PaycheckVault on Base Sepolia to split payouts into USDC for expenses, sUSDC for yield, and leftover WETH.
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

            {/* Live Base Sepolia Snapshot & Verified End-to-End Proofs */}
            <div className="bg-[#121016] border border-white/[0.08] rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FAEB92]" />
                  <span className="text-xs font-medium text-[#ededed]">
                    Base Sepolia vault
                  </span>
                </div>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1c1922] text-[#a8a4b3] tabular-nums">
                  {savedStablePct}/{savedYieldPct}/{savedKeepPct} split
                </span>
              </div>

              {/* Live 3-Bucket Figures */}
              <div className="grid grid-cols-3 gap-4 pt-1">
                <div>
                  <div className="text-xs text-[#a8a4b3]">USDC (expenses)</div>
                  <div className="text-lg sm:text-xl font-mono font-medium text-[#FAEB92] tabular-nums mt-1">
                    ${vaultUsdc.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#a8a4b3]">sUSDC (yield)</div>
                  <div className="text-lg sm:text-xl font-mono font-medium text-[#FF5FCF] tabular-nums mt-1">
                    ${vaultYieldUsdc.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#a8a4b3]">WETH (kept)</div>
                  <div className="text-lg sm:text-xl font-mono font-medium text-[#ededed] tabular-nums mt-1">
                    {vaultWeth.toFixed(2)} WETH
                  </div>
                </div>
              </div>

              {/* 3-Band Solid Composition Bar */}
              <div className="h-2.5 w-full rounded bg-black p-0.5 border border-white/[0.08] flex gap-0.5 overflow-hidden">
                <div style={{ width: `${savedStablePct}%` }} className="h-full rounded-[2px] bg-[#FAEB92]" />
                <div style={{ width: `${savedYieldPct}%` }} className="h-full rounded-[2px] bg-[#FF5FCF]" />
                <div style={{ width: `${savedKeepPct}%` }} className="h-full rounded-[2px] bg-[#9929EA]" />
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
              What happens when a paycheck arrives
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
                You receive WETH
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
                Filters verify amount and timing
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
                Vault splits the payout
              </h3>
              <p className="text-sm text-[#a8a4b3] leading-relaxed">
                Base Omni Proxy delivers the callback to PaycheckVault, which verifies cap and slippage bounds before routing {savedStablePct}% to USDC, {savedYieldPct}% to sUSDC, and keeping {savedKeepPct}% in WETH.
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
            What the contracts enforce
          </h2>
          {/* <span className="text-xs font-mono text-[#8e8999]">Reactive Omni v2</span> */}
        </div>

        <div className="border-y border-white/[0.08] divide-y divide-white/[0.08]">
          {[
            {
              index: '01',
              icon: Layers,
              tag: 'Split rules',
              title: 'Three buckets in one callback',
              desc: `Each Base Sepolia callback swaps ${savedStablePct}% into USDC for near-term expenses, moves ${savedYieldPct}% into sUSDC for yield, and leaves ${savedKeepPct}% as liquid WETH.`,
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
                    {spec.title}
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
                Deployed contracts
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
            {[
              {
                key: 'sepolia',
                name: 'Sepolia WETH',
                chainId: '11155111',
                address: CONFIG.sepolia.usdcAddress,
                explorerName: 'Etherscan',
                explorerUrl: `${CONFIG.sepolia.explorer}/address/${CONFIG.sepolia.usdcAddress}`,
                titleClass: 'text-[#ededed]',
              },
              {
                key: 'lasna',
                name: 'Lasna PaycheckReactive',
                chainId: '5318007',
                address: CONFIG.lasna.reactiveAddress,
                explorerName: 'ReactScan',
                explorerUrl: `${CONFIG.lasna.explorer}/address/${CONFIG.lasna.reactiveAddress}`,
                titleClass: 'text-[#FF5FCF]',
              },
              {
                key: 'base',
                name: 'Base PaycheckVault',
                chainId: '84532',
                address: CONFIG.baseSepolia.vaultAddress,
                explorerName: 'BaseScan',
                explorerUrl: `${CONFIG.baseSepolia.explorer}/address/${CONFIG.baseSepolia.vaultAddress}`,
                titleClass: 'text-[#FAEB92]',
              },
            ].map((contract) => (
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
