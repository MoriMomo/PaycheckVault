import React, { useState } from 'react';
import { CONFIG } from '../config/contracts';

export default function Navbar({
  activePage,
  onNavigate,
  walletAddress,
  currentChainId,
  isConnecting,
  onConnectWallet,
  onSwitchNetwork,
}) {
  const [showInspector, setShowInspector] = useState(false);

  const renderNetworkBadge = () => {
    if (!walletAddress) return null;

    if (currentChainId === CONFIG.sepolia.chainId) {
      return (
        <span className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full bg-[#2756FC]/15 text-[#62D0FF] border border-[#2756FC]/40">
          <span className="w-1.5 h-1.5 rounded-full bg-[#62D0FF] animate-pulse" />
          Sepolia (Origin)
        </span>
      );
    }

    if (currentChainId === CONFIG.baseSepolia.chainId) {
      return (
        <span className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full bg-[#0052FF]/15 text-blue-300 border border-[#0052FF]/40">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Base Sepolia (Vault)
        </span>
      );
    }

    return (
      <button
        onClick={() => onSwitchNetwork(CONFIG.sepolia)}
        className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition cursor-pointer"
      >
        Switch to Sepolia ↗
      </button>
    );
  };

  return (
    <header className="border-b border-white/[0.08] bg-[#0A0A0C]/90 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Reactive Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
          >
            {/* Reactive Circle Glyph */}
            <div className="w-8 h-8 rounded-full bg-[#121215] border border-blue-500/40 flex items-center justify-center shadow-[0_0_16px_rgba(39,86,252,0.4)] group-hover:border-[#62D0FF] transition">
              <svg className="w-4 h-4 text-[#62D0FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-sans text-lg font-bold tracking-tight text-white">
              reactive
            </span>
          </button>

          {/* Sub-badge for PaycheckVault */}
          <span className="hidden md:inline-flex items-center text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#2756FC]/15 text-[#62D0FF] border border-[#2756FC]/30">
            PAYCHECK VAULT
          </span>
        </div>

        {/* Center / Navigation Links (Matching reactive.network exactly) */}
        <nav className="hidden lg:flex items-center gap-5 xl:gap-7 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
          <a
            href="https://docs.reactive.network"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition"
          >
            Docs
          </a>
          <a
            href={CONFIG.lasna.explorer}
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition"
          >
            Reactive Scan
          </a>
          <a
            href="https://reactive.network"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition"
          >
            Ecosystem
          </a>
          <a
            href="https://reactive.network"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition"
          >
            $REACT
          </a>
          <a
            href="https://reactive.network"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition"
          >
            Stake/Swap
          </a>
          <a
            href="https://github.com/Reactive-Network"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition"
          >
            GitHub
          </a>
          <a
            href="https://reactive.network/blog"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition"
          >
            Blog
          </a>
        </nav>

        {/* Right: Switcher Pill + Network + Wallet CTA */}
        <div className="flex items-center gap-2.5">
          {/* Two-Page Switcher Pill */}
          <div className="flex items-center p-1 rounded-full bg-[#121215] border border-white/[0.08]">
            <button
              onClick={() => onNavigate('landing')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                activePage === 'landing'
                  ? 'bg-[#2756FC] text-white shadow-[0_0_14px_rgba(39,86,252,0.5)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => onNavigate('app')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activePage === 'app'
                  ? 'bg-[#2756FC] text-white shadow-[0_0_14px_rgba(39,86,252,0.5)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activePage === 'app' ? 'bg-[#62D0FF] animate-pulse' : 'bg-[#00C853]'}`} />
              <span>Vault App</span>
            </button>
          </div>

          {renderNetworkBadge()}

          <button
            onClick={() => setShowInspector(!showInspector)}
            className="hidden sm:inline-flex text-xs text-zinc-400 hover:text-white transition px-2.5 py-1.5 rounded-full border border-transparent hover:border-white/10 hover:bg-white/[0.04] cursor-pointer"
          >
            {showInspector ? 'Hide Contracts' : 'Contracts'}
          </button>

          <button
            onClick={onConnectWallet}
            disabled={isConnecting}
            className={`px-4 py-1.5 rounded-full font-semibold text-xs transition active:scale-95 flex items-center gap-2 cursor-pointer ${
              walletAddress
                ? 'bg-[#00C853]/10 text-[#00C853] border border-[#00C853]/30 hover:bg-[#00C853]/20'
                : 'bg-white hover:bg-zinc-200 text-[#0A0A0C] font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)]'
            }`}
          >
            {isConnecting ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#0A0A0C] animate-ping" />
                <span>Connecting...</span>
              </>
            ) : walletAddress ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#00C853]" />
                <span className="font-mono">{`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}</span>
              </>
            ) : (
              'Connect Wallet'
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Verified Contract Drawer */}
      {showInspector && (
        <div className="border-t border-white/[0.08] bg-[#0A0A0C]/95 px-6 py-4 text-xs">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
            <div className="reactive-card p-3.5 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center text-[11px] text-zinc-400">
                <span className="font-semibold text-[#CBB5FF]">1. Sepolia (Origin USDC)</span>
                <span>ID: 11155111</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-200 truncate">{CONFIG.sepolia.usdcAddress}</span>
                <a
                  href={`${CONFIG.sepolia.explorer}/address/${CONFIG.sepolia.usdcAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#62D0FF] hover:underline text-[10px] shrink-0"
                >
                  Etherscan ↗
                </a>
              </div>
            </div>

            <div className="reactive-card p-3.5 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center text-[11px] text-zinc-400">
                <span className="font-semibold text-[#62D0FF]">2. Lasna (Reactive RSC)</span>
                <span>ID: 5318007</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-200 truncate">{CONFIG.lasna.reactiveAddress}</span>
                <a
                  href={`${CONFIG.lasna.explorer}/address/${CONFIG.lasna.reactiveAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#62D0FF] hover:underline text-[10px] shrink-0"
                >
                  ReactScan ↗
                </a>
              </div>
            </div>

            <div className="reactive-card p-3.5 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center text-[11px] text-zinc-400">
                <span className="font-semibold text-[#2756FC]">3. Base Sepolia (Vault)</span>
                <span>ID: 84532</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-200 truncate">{CONFIG.baseSepolia.vaultAddress}</span>
                <a
                  href={`${CONFIG.baseSepolia.explorer}/address/${CONFIG.baseSepolia.vaultAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#62D0FF] hover:underline text-[10px] shrink-0"
                >
                  BaseScan ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

