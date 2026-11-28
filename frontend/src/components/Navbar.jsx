import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Compass,
  FileCode2,
  GitBranch,
  Layers,
  LayoutDashboard,
  Menu,
  Radar,
  Wallet,
  Workflow,
  X,
} from 'lucide-react';
import { CONFIG, DEPLOYED_CONTRACTS } from '../config/contracts';
import BagiLogo from './ui/BagiLogo';

export default function Navbar({
  activePage,
  onNavigate,
  walletAddress,
  activeWalletName,
  currentChainId,
  isConnecting,
  onConnectWallet,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showInspector, setShowInspector] = useState(false);

  const isDashboard = activePage === 'app';

  const navLinks = [
    { label: 'How it works', href: '#how-it-works', isInternal: true, icon: Workflow },
    { label: 'Contracts', href: '#contracts', isInternal: true, icon: FileCode2 },
    { label: 'Lasna Scan', href: 'https://lasna.reactscan.net/', isExternal: true, icon: Radar },
    { label: 'Docs', href: 'https://dev.reactive.network/', isExternal: true, icon: BookOpen },
    { label: 'GitHub', href: 'https://github.com/MoriMomo/PaycheckVault', isExternal: true, icon: GitBranch },
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

  const renderBrand = () => (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        setMobileMenuOpen(false);
        onNavigate('landing');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      className="flex items-center gap-3 cursor-pointer select-none group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAEB92] rounded-lg"
      title="Bagi-Bagi home"
    >
      <div className="h-6 w-6 shrink-0">
        <BagiLogo className="h-full w-full" />
      </div>
      <span className="font-display font-medium text-base tracking-tight text-[#ededed] group-hover:text-[#FAEB92] transition-colors duration-150 leading-none">
        Bagi-Bagi
      </span>
    </a>
  );

  const renderSidebarBody = () => (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {/* Workspace Group */}
        <div>
          <div className="px-3 pb-2 text-xs text-[#8e8999]">
            Workspace
          </div>
          <div className="space-y-1">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('landing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-full h-9 flex items-center justify-between px-3 rounded-lg text-sm transition-[background-color,color] duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAEB92] ${
                activePage === 'landing'
                  ? 'bg-[#1c1922] text-[#ededed] font-medium shadow-[inset_0_1px_0_rgba(237,237,237,0.08)]'
                  : 'text-[#a8a4b3] hover:text-[#ededed] hover:bg-[#121016]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Compass
                  className={`w-4 h-4 shrink-0 ${activePage === 'landing' ? 'text-[#FF5FCF]' : 'text-[#8e8999]'}`}
                  strokeWidth={1.5}
                />
                <span>Overview</span>
              </span>
              {activePage === 'landing' && <span className="w-1.5 h-1.5 rounded-full bg-[#FF5FCF]" />}
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('app');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-full h-9 flex items-center justify-between px-3 rounded-lg text-sm transition-[background-color,color] duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAEB92] ${
                isDashboard
                  ? 'bg-[#1c1922] text-[#ededed] font-medium shadow-[inset_0_1px_0_rgba(237,237,237,0.08)]'
                  : 'text-[#a8a4b3] hover:text-[#ededed] hover:bg-[#121016]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <LayoutDashboard
                  className={`w-4 h-4 shrink-0 ${isDashboard ? 'text-[#FAEB92]' : 'text-[#8e8999]'}`}
                  strokeWidth={1.5}
                />
                <span>Treasury</span>
              </span>
              {isDashboard && <span className="w-1.5 h-1.5 rounded-full bg-[#FAEB92]" />}
            </button>
          </div>
        </div>

        {/* Protocol Links Group */}
        <div>
          <div className="px-3 pb-2 text-xs text-[#8e8999]">
            Protocol
          </div>
          <div className="space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.isExternal ? '_blank' : undefined}
                  rel={item.isExternal ? 'noreferrer' : undefined}
                  onClick={(e) => handleLinkClick(e, item)}
                  className="h-9 flex items-center justify-between px-3 rounded-lg text-sm text-[#a8a4b3] hover:text-[#ededed] hover:bg-[#121016] transition-[background-color,color] duration-150 cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAEB92]"
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0 text-[#8e8999] group-hover:text-[#a8a4b3]" strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </span>
                  {item.isExternal && (
                    <ArrowUpRight className="w-4 h-4 shrink-0 text-[#8e8999] group-hover:text-[#FAEB92]" strokeWidth={1.5} />
                  )}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className={`p-4 border-t border-white/[0.08] space-y-2 ${isDashboard ? 'bg-[#0a090d]' : 'bg-black'}`}>
        {walletAddress && currentChainId === CONFIG.sepolia.chainId && (
          <div className="h-8 flex items-center justify-between px-3 rounded-lg bg-[#121016] border border-white/[0.08] text-xs text-[#a8a4b3]">
            <span className="truncate">Sepolia origin</span>
            <span className="font-mono text-[#ededed]">11155111</span>
          </div>
        )}

        {walletAddress && currentChainId === CONFIG.baseSepolia.chainId && (
          <div className="h-8 flex items-center justify-between px-3 rounded-lg bg-[#121016] border border-white/[0.08] text-xs text-[#a8a4b3]">
            <span className="truncate">Base vault</span>
            <span className="font-mono text-[#FAEB92]">84532</span>
          </div>
        )}

        <button
          onClick={() => setShowInspector(!showInspector)}
          className="w-full h-9 text-xs text-[#a8a4b3] hover:text-[#ededed] bg-[#121016] hover:bg-[#1c1922] border border-white/[0.08] px-3 rounded-lg flex items-center justify-between transition-[background-color,color] duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAEB92]"
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 shrink-0 text-[#8e8999]" strokeWidth={1.5} />
            <span>{showInspector ? 'Hide contracts' : 'Deployments'}</span>
          </span>
          <span className="font-mono text-xs text-[#8e8999]">{showInspector ? 'Close' : '3'}</span>
        </button>

        <button
          onClick={onConnectWallet}
          disabled={isConnecting}
          className={`w-full h-9 px-3 rounded-lg text-xs font-medium transition-[background-color,color] duration-150 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAEB92] ${
            walletAddress
              ? 'bg-[#121016] text-[#ededed] border border-white/[0.08] hover:bg-[#1c1922]'
              : 'bg-[#FAEB92] hover:bg-[#fdf2b0] text-black'
          }`}
        >
          {isConnecting ? (
            <span>Connecting</span>
          ) : walletAddress ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[#FAEB92]" />
              <span className="font-mono tabular-nums">
                {activeWalletName ? `${activeWalletName} · ` : ''}
                {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
              </span>
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>Connect wallet</span>
            </>
          )}
        </button>

        {activePage === 'landing' && (
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('app');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-full h-9 rounded-lg bg-[#1c1922] hover:bg-[#25212d] text-[#ededed] border border-white/[0.08] text-xs font-medium flex items-center justify-center gap-2 transition-[background-color] duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAEB92]"
          >
            <span>Open treasury</span>
            <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Fixed Left Sidebar */}
      <aside
        className={`hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 border-r border-white/[0.08] flex-col ${
          isDashboard ? 'bg-[#0a090d]' : 'bg-black'
        }`}
      >
        <div className="px-5 py-5 border-b border-white/[0.08]">
          {renderBrand()}
        </div>
        {renderSidebarBody()}
      </aside>

      {/* Mobile / Tablet Top Header */}
      <header
        className={`lg:hidden fixed top-0 left-0 right-0 z-50 border-b border-white/[0.08] ${
          isDashboard ? 'bg-[#0a090d]' : 'bg-black'
        }`}
      >
        <div className="px-4 h-14 flex items-center justify-between gap-3">
          {renderBrand()}

          <div className="flex items-center gap-2">
            {activePage === 'landing' ? (
              <button
                onClick={() => onNavigate('app')}
                className="h-8 px-3 rounded-lg bg-[#FAEB92] hover:bg-[#fdf2b0] text-black font-medium text-xs transition-[background-color] duration-150 cursor-pointer"
              >
                Open treasury
              </button>
            ) : (
              <button
                onClick={onConnectWallet}
                disabled={isConnecting}
                className={`h-8 px-3 rounded-lg font-medium text-xs transition-[background-color] duration-150 cursor-pointer ${
                  walletAddress
                    ? 'bg-[#121016] text-[#ededed] border border-white/[0.08] font-mono tabular-nums'
                    : 'bg-[#FAEB92] text-black'
                }`}
              >
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connect'}
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="h-8 w-8 flex justify-center items-center rounded-lg text-[#a8a4b3] hover:text-[#ededed] hover:bg-[#121016] cursor-pointer"
              aria-label="Toggle navigation sidebar"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <Menu className="w-4 h-4" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className={`border-t border-white/[0.08] max-h-[calc(100dvh-3.5rem)] flex flex-col overflow-y-auto ${isDashboard ? 'bg-[#0a090d]' : 'bg-black'}`}>
            {renderSidebarBody()}
          </div>
        )}
      </header>

      {/* Deployments Inspector Panel */}
      {showInspector && (
        <div className="fixed inset-x-0 lg:left-64 bottom-0 lg:bottom-auto lg:top-0 z-40 border-t lg:border-t-0 lg:border-b border-white/[0.08] bg-[#121016] px-6 py-4 text-xs">
          <div className="max-w-[1440px] mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#ededed]">
                Verified multi-chain deployments
              </span>
              <button
                onClick={() => setShowInspector(false)}
                className="inline-flex items-center gap-1.5 text-xs text-[#a8a4b3] hover:text-[#ededed] cursor-pointer"
              >
                <span>Close</span>
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
              {DEPLOYED_CONTRACTS.map((contract) => (
                <div key={contract.key} className="bg-black border border-white/[0.08] p-4 rounded-lg space-y-2">
                  <div className="flex justify-between items-center text-xs text-[#a8a4b3]">
                    <span className="font-sans font-medium text-[#ededed]">{contract.inspectorLabel}</span>
                    <span className={`px-2 py-0.5 rounded bg-[#1c1922] text-xs ${contract.badgeClass}`}>
                      {contract.chainId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[#a8a4b3] truncate">{contract.address}</span>
                    <a
                      href={contract.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#FAEB92] hover:underline text-xs shrink-0"
                    >
                      <span>{contract.explorerName}</span>
                      <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
