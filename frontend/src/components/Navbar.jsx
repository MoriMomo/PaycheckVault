import React, { useState } from 'react';
import { CONFIG } from '../config/contracts';

export default function Navbar({
  activePage,
  onNavigate,
  walletAddress,
  currentChainId,
  isConnecting,
  onConnectWallet,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showInspector, setShowInspector] = useState(false);

  const navLinks = [
    { label: 'HOW IT WORKS', href: '#how-it-works', isInternal: true },
    { label: 'CONTRACTS', href: '#contracts', isInternal: true },
    { label: 'REACTIVE SCAN', href: 'https://kopli.reactscan.net/', isExternal: true },
    { label: 'DOCS', href: 'https://dev.reactive.network/', isExternal: true },
    { label: 'BUILDATHON', href: 'https://dorahacks.io/hackathon/reactive-omni/', isExternal: true },
    { label: 'GITHUB', href: 'https://github.com/Reactive-Network/reactive-smart-contract-demos', isExternal: true },
  ];

  const handleLinkClick = (e, item) => {
    setMobileMenuOpen(false);
    if (item.isInternal) {
      e.preventDefault();
      if (activePage !== 'landing') {
        onNavigate('landing');
        setTimeout(() => {
          const el = document.querySelector(item.href);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      } else {
        const el = document.querySelector(item.href);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const renderBrand = (compact = false) => (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        setMobileMenuOpen(false);
        onNavigate('landing');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      className="flex items-center gap-2.5 cursor-pointer select-none group"
      title="PaycheckVault Home"
    >
      <div className="h-6 w-6 shrink-0">
        <svg className="h-full w-full" viewBox="0 0 84 84" fill="none">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M42.0759 84C65.2719 84 84.0759 65.196 84.0759 42C84.0759 18.804 65.2719 0 42.0759 0C18.88 0 0.0759277 18.804 0.0759277 42C0.0759277 65.196 18.88 84 42.0759 84ZM42.076 73.5C59.473 73.5 73.576 59.397 73.576 42C73.576 24.603 59.473 10.5 42.076 10.5C24.679 10.5 10.576 24.603 10.576 42C10.576 59.397 24.679 73.5 42.076 73.5Z"
            fill="#58A6FF"
          />
          <path d="M18.4509 44.625L44.7009 18.375V39.375H65.7009L39.4509 65.625V44.625H18.4509Z" fill="white" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="font-display font-bold text-base tracking-tight text-white group-hover:text-[#58A6FF] transition leading-none">
          PaycheckVault
        </span>
        {!compact && (
          <span className="mt-1 inline-block w-fit px-1.5 py-0.5 rounded-[3px] text-[9px] font-mono uppercase tracking-wider bg-white/8 text-[#58A6FF] border border-white/12 leading-none">
            Reactive Omni
          </span>
        )}
      </div>
    </a>
  );

  const renderSidebarBody = () => (
    <>
      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {/* Workspace Switcher */}
        <div className="space-y-1.5">
          <div className="px-3 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            Workspace
          </div>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-mono text-xs transition cursor-pointer ${
              activePage === 'landing'
                ? 'bg-white/10 text-white border border-white/15'
                : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <span>OVERVIEW</span>
            {activePage === 'landing' && <span className="w-1.5 h-1.5 rounded-[1px] bg-[#58A6FF]" />}
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('app');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-mono text-xs transition cursor-pointer ${
              activePage === 'app'
                ? 'bg-[#2756FC] text-white border border-[#2756FC]'
                : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <span>VAULT APP</span>
            <span className={`w-1.5 h-1.5 rounded-[1px] ${activePage === 'app' ? 'bg-white' : 'bg-[#10B981]'}`} />
          </button>
        </div>

        {/* Protocol Links */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            Protocol
          </div>
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.isExternal ? '_blank' : undefined}
              rel={item.isExternal ? 'noreferrer' : undefined}
              onClick={(e) => handleLinkClick(e, item)}
              className="flex items-center justify-between px-3 py-2 rounded-md font-mono text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition cursor-pointer group"
            >
              <span>{item.label}</span>
              <span className="text-[10px] text-zinc-600 group-hover:text-zinc-300 transition">
                {item.isExternal ? '↗' : '→'}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Bottom Controls: Network, Contracts Inspector, Wallet & App CTA */}
      <div className="p-4 border-t border-white/10 space-y-2.5 bg-black">
        {walletAddress && currentChainId === CONFIG.sepolia.chainId && (
          <div className="flex items-center gap-2 text-[11px] font-mono px-3 py-1.5 rounded-md bg-black text-[#58A6FF] border border-[#2756FC]/60">
            <span className="w-1.5 h-1.5 rounded-[1px] bg-[#58A6FF] shrink-0" />
            <span className="truncate">Sepolia (Origin)</span>
          </div>
        )}

        {walletAddress && currentChainId === CONFIG.baseSepolia.chainId && (
          <div className="flex items-center gap-2 text-[11px] font-mono px-3 py-1.5 rounded-md bg-black text-zinc-200 border border-[#2756FC]/60">
            <span className="w-1.5 h-1.5 rounded-[1px] bg-[#58A6FF] shrink-0" />
            <span className="truncate">Base Sepolia (Vault)</span>
          </div>
        )}

        <button
          onClick={() => setShowInspector(!showInspector)}
          className="w-full text-xs font-mono text-zinc-400 hover:text-white transition px-3 py-2 rounded-md border border-white/10 hover:bg-white/5 flex items-center justify-between cursor-pointer"
        >
          <span>{showInspector ? 'Hide Contracts' : 'Contracts'}</span>
          <span className="text-[10px] text-zinc-500">{showInspector ? '×' : '3'}</span>
        </button>

        <button
          onClick={onConnectWallet}
          disabled={isConnecting}
          className={`w-full px-3.5 py-2 rounded-md font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer ${
            walletAddress
              ? 'bg-black text-[#10B981] border border-[#10B981]/60 hover:bg-zinc-950'
              : 'bg-white hover:bg-zinc-200 text-black font-bold'
          }`}
        >
          {isConnecting ? (
            <>
              <span className="w-1.5 h-1.5 rounded-[1px] bg-[#58A6FF]" />
              <span>Connecting...</span>
            </>
          ) : walletAddress ? (
            <>
              <span className="w-1.5 h-1.5 rounded-[1px] bg-[#10B981]" />
              <span className="font-mono">{`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}</span>
            </>
          ) : (
            'Connect Wallet'
          )}
        </button>

        {activePage === 'landing' && (
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('app');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-full py-2 rounded-md bg-[#2756FC] hover:bg-[#3260ff] text-white font-sans font-semibold text-xs text-center transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Launch Vault App</span>
            <span>→</span>
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 bg-black border-r border-white/10 flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          {renderBrand(false)}
        </div>
        {renderSidebarBody()}
      </aside>

      {/* Mobile / Tablet Top Header + Slide-down Drawer */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-black border-b border-white/10">
        <div className="px-4 h-14 flex items-center justify-between gap-3">
          {renderBrand(true)}

          <div className="flex items-center gap-2">
            {activePage === 'landing' ? (
              <button
                onClick={() => onNavigate('app')}
                className="px-3 py-1.5 rounded-md bg-[#2756FC] hover:bg-[#3260ff] text-white font-sans font-medium text-xs transition cursor-pointer"
              >
                Launch App →
              </button>
            ) : (
              <button
                onClick={onConnectWallet}
                disabled={isConnecting}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs transition cursor-pointer ${
                  walletAddress
                    ? 'bg-black text-[#10B981] border border-[#10B981]/60'
                    : 'bg-white text-black font-bold'
                }`}
              >
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connect'}
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="h-8 w-8 flex justify-center items-center text-zinc-400 hover:text-white cursor-pointer"
              aria-label="Toggle navigation sidebar"
            >
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 20 20" className="h-5 w-5">
                {mobileMenuOpen ? (
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                ) : (
                  <path
                    fillRule="evenodd"
                    d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z"
                    clipRule="evenodd"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="bg-black border-t border-white/10 max-h-[calc(100dvh-3.5rem)] flex flex-col overflow-y-auto">
            {renderSidebarBody()}
          </div>
        )}
      </header>

      {/* Contracts Inspector Panel (Floating next to sidebar on desktop, below header on mobile) */}
      {showInspector && (
        <div className="fixed inset-x-0 lg:left-64 bottom-0 lg:bottom-auto lg:top-0 z-40 bg-black border-t lg:border-t-0 lg:border-b border-white/10 px-6 py-4 text-xs">
          <div className="max-w-5xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                Verified Multi-Chain Deployments
              </span>
              <button
                onClick={() => setShowInspector(false)}
                className="font-mono text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Close ×
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
              <div className="bg-black border border-white/10 p-3.5 rounded-lg space-y-1.5">
                <div className="flex justify-between items-center text-[11px] text-zinc-400">
                  <span className="font-semibold text-zinc-200">1. Sepolia (Origin USDC)</span>
                  <span>11155111</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-zinc-200 truncate">{CONFIG.sepolia.usdcAddress}</span>
                  <a
                    href={`${CONFIG.sepolia.explorer}/address/${CONFIG.sepolia.usdcAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#58A6FF] hover:underline text-[10px] shrink-0"
                  >
                    Etherscan ↗
                  </a>
                </div>
              </div>

              <div className="bg-black border border-white/10 p-3.5 rounded-lg space-y-1.5">
                <div className="flex justify-between items-center text-[11px] text-zinc-400">
                  <span className="font-semibold text-[#58A6FF]">2. Lasna (Reactive RSC)</span>
                  <span>5318007</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-zinc-200 truncate">{CONFIG.lasna.reactiveAddress}</span>
                  <a
                    href={`${CONFIG.lasna.explorer}/address/${CONFIG.lasna.reactiveAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#58A6FF] hover:underline text-[10px] shrink-0"
                  >
                    ReactScan ↗
                  </a>
                </div>
              </div>

              <div className="bg-black border border-white/10 p-3.5 rounded-lg space-y-1.5">
                <div className="flex justify-between items-center text-[11px] text-zinc-400">
                  <span className="font-semibold text-[#2756FC]">3. Base Sepolia (Vault)</span>
                  <span>84532</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-zinc-200 truncate">{CONFIG.baseSepolia.vaultAddress}</span>
                  <a
                    href={`${CONFIG.baseSepolia.explorer}/address/${CONFIG.baseSepolia.vaultAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#58A6FF] hover:underline text-[10px] shrink-0"
                  >
                    BaseScan ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
