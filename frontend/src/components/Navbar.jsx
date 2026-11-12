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
        <span className="hidden md:flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full bg-[#2756FC]/15 text-[#62D0FF] border border-[#2756FC]/40">
          <span className="w-1.5 h-1.5 rounded-full bg-[#62D0FF] animate-pulse" />
          Sepolia (Origin)
        </span>
      );
    }

    if (currentChainId === CONFIG.baseSepolia.chainId) {
      return (
        <span className="hidden md:flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full bg-[#0052FF]/15 text-blue-300 border border-[#0052FF]/40">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Base Sepolia (Vault)
        </span>
      );
    }

    return (
      <button
        onClick={() => onSwitchNetwork(CONFIG.sepolia)}
        className="hidden md:flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition cursor-pointer"
      >
        Switch to Sepolia ↗
      </button>
    );
  };

  return (
    <header className="border-b border-white/[0.08] bg-[#0A0A0C]/85 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand Identity */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-3 group cursor-pointer focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2756FC] to-[#62D0FF] p-[1px] shadow-[0_0_24px_rgba(39,86,252,0.45)] group-hover:shadow-[0_0_32px_rgba(98,208,255,0.65)] transition">
            <div className="w-full h-full bg-[#0A0A0C] rounded-[11px] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#62D0FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-display text-base font-bold tracking-tight text-white">
              PaycheckVault
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#2756FC]/15 text-[#62D0FF] border border-[#2756FC]/30">
              REACTIVE OMNI
            </span>
          </div>
        </button>

        {/* Center: Two-Page Switcher Pill (Landing vs Vault App) */}
        <nav aria-label="Main Navigation" className="flex items-center p-1 rounded-full bg-[#121215] border border-white/[0.08]">
          <button
            onClick={() => onNavigate('landing')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
              activePage === 'landing'
                ? 'bg-[#2756FC] text-white shadow-[0_0_16px_rgba(39,86,252,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onNavigate('app')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activePage === 'app'
                ? 'bg-[#2756FC] text-white shadow-[0_0_16px_rgba(39,86,252,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activePage === 'app' ? 'bg-[#62D0FF] animate-pulse' : 'bg-[#00C853]'}`} />
            <span>Vault App</span>
          </button>
        </nav>

        {/* Right: Network + Contracts + Wallet CTA */}
        <div className="flex items-center gap-2.5">
          {renderNetworkBadge()}

          <button
            onClick={() => setShowInspector(!showInspector)}
            className="hidden sm:inline-flex text-xs text-slate-400 hover:text-white transition px-3 py-1.5 rounded-full border border-transparent hover:border-white/10 hover:bg-white/[0.04] cursor-pointer"
          >
            {showInspector ? 'Hide Contracts' : 'Contracts'}
          </button>

          <button
            onClick={onConnectWallet}
            disabled={isConnecting}
            className={`px-4 py-2 rounded-full font-semibold text-xs transition active:scale-95 flex items-center gap-2 cursor-pointer ${
              walletAddress
                ? 'bg-[#00C853]/10 text-[#00C853] border border-[#00C853]/30 hover:bg-[#00C853]/20'
                : 'bg-white hover:bg-[#F5F5F7] text-[#0A0A0C] font-bold shadow-[0_0_24px_rgba(255,255,255,0.2)]'
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
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
            <div className="reactive-card p-3.5 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span className="font-semibold text-[#CBB5FF]">1. Sepolia (Origin USDC)</span>
                <span>ID: 11155111</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-200 truncate">{CONFIG.sepolia.usdcAddress}</span>
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
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span className="font-semibold text-[#62D0FF]">2. Lasna (Reactive RSC)</span>
                <span>ID: 5318007</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-200 truncate">{CONFIG.lasna.reactiveAddress}</span>
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
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span className="font-semibold text-[#2756FC]">3. Base Sepolia (Vault)</span>
                <span>ID: 84532</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-200 truncate">{CONFIG.baseSepolia.vaultAddress}</span>
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
