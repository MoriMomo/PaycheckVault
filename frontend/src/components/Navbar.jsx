import React, { useState, useEffect } from 'react';
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
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showInspector, setShowInspector] = useState(false);

  // Track scroll position to morph between wide header (Image 2) and floating capsule pill (Image 1)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'HOW IT WORKS', href: '#how-it-works', isInternal: true },
    { label: 'CONTRACTS', href: '#contracts', isInternal: true },
    { label: 'REACTIVE SCAN', href: 'https://kopli.reactscan.net/', isExternal: true },
    { label: 'DOCS', href: 'https://dev.reactive.network/', isExternal: true },
    { label: 'BUILDATHON', href: 'https://dorahacks.io/hackathon/reactive-omni/', isExternal: true },
    { label: 'GITHUB', href: 'https://github.com/Reactive-Network/reactive-smart-contract-demos', isExternal: true },
  ];

  // If user is inside the Vault DApp Control Center (activePage === 'app')
  if (activePage === 'app') {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-white/10 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Left: Brand + Back to Overview */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
              title="Back to Landing Page"
            >
              <div className="h-6 w-6">
                <svg className="h-full w-full" viewBox="0 0 84 84" fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M42.0759 84C65.2719 84 84.0759 65.196 84.0759 42C84.0759 18.804 65.2719 0 42.0759 0C18.88 0 0.0759277 18.804 0.0759277 42C0.0759277 65.196 18.88 84 42.0759 84ZM42.076 73.5C59.473 73.5 73.576 59.397 73.576 42C73.576 24.603 59.473 10.5 42.076 10.5C24.679 10.5 10.576 24.603 10.576 42C10.576 59.397 24.679 73.5 42.076 73.5Z"
                    fill="#62D0FF"
                  />
                  <path d="M18.4509 44.625L44.7009 18.375V39.375H65.7009L39.4509 65.625V44.625H18.4509Z" fill="white" />
                </svg>
              </div>
              <span className="font-mono text-sm uppercase tracking-wider text-white font-bold group-hover:text-[#62D0FF] transition">
                PaycheckVault
              </span>
            </button>

            <span className="hidden sm:inline-block text-zinc-600 font-mono">/</span>

            <button
              onClick={() => onNavigate('landing')}
              className="text-xs font-mono text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
            >
              <span>←</span>
              <span>Overview</span>
            </button>
          </div>

          {/* Right: Network + Contracts + Connect Wallet */}
          <div className="flex items-center gap-3">
            {walletAddress && currentChainId === CONFIG.sepolia.chainId && (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full bg-[#2756FC]/20 text-[#62D0FF] border border-[#2756FC]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#62D0FF]" />
                Sepolia (Origin)
              </span>
            )}

            {walletAddress && currentChainId === CONFIG.baseSepolia.chainId && (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full bg-blue-900/30 text-blue-300 border border-blue-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Base Sepolia (Vault)
              </span>
            )}

            <button
              onClick={() => setShowInspector(!showInspector)}
              className="text-xs font-mono text-zinc-400 hover:text-white transition px-2.5 py-1.5 rounded-full border border-white/10 hover:bg-white/5 cursor-pointer"
            >
              {showInspector ? 'Hide Contracts' : 'Contracts'}
            </button>

            <button
              onClick={onConnectWallet}
              disabled={isConnecting}
              className={`px-4 py-1.5 rounded-full font-semibold text-xs transition active:scale-95 flex items-center gap-2 cursor-pointer ${
                walletAddress
                  ? 'bg-black text-[#00C853] border border-[#00C853] hover:bg-zinc-950'
                  : 'bg-white hover:bg-zinc-200 text-black font-bold'
              }`}
            >
              {isConnecting ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-black animate-ping" />
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

        {/* Contract Drawer in App Mode */}
        {showInspector && (
          <div className="border-t border-white/10 bg-black px-6 py-4 text-xs">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
              <div className="bg-black border border-white/10 p-3.5 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-[11px] text-zinc-400">
                  <span className="font-semibold text-[#CBB5FF]">1. Sepolia (Origin USDC)</span>
                  <span>11155111</span>
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

              <div className="bg-black border border-white/10 p-3.5 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-[11px] text-zinc-400">
                  <span className="font-semibold text-[#62D0FF]">2. Lasna (Reactive RSC)</span>
                  <span>5318007</span>
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

              <div className="bg-black border border-white/10 p-3.5 rounded-xl space-y-1.5">
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

  // =========================================================================
  // LANDING PAGE NAVBAR: Pitch Black & Zero Gradients
  // =========================================================================
  return (
    <nav
      className={`fixed left-0 top-0 z-50 w-full flex justify-center transition-all duration-450 ease-in-out ${
        isScrolled ? 'pt-2 sm:pt-3 px-3 sm:px-4' : 'pt-0 px-0'
      }`}
    >
      <div
        className={`relative transition-all duration-450 ease-in-out ${
          isScrolled
            ? 'w-fit px-5 sm:px-6 rounded-full'
            : 'w-full max-w-screen-2xl px-6 sm:px-8 rounded-none'
        }`}
      >
        {/* Solid Pitch Black Background for Scrolled Pill */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-black border border-white/15 transition-opacity duration-300 ease-in-out ${
            isScrolled ? 'opacity-100 rounded-full' : 'opacity-0 rounded-none'
          }`}
          style={{ borderRadius: 'inherit' }}
        />

        {/* Content Flex Row */}
        <div
          className={`relative flex items-center transition-all duration-450 ease-in-out ${
            isScrolled ? 'h-12 sm:h-14 justify-center' : 'h-16 justify-between'
          }`}
        >
          
          {/* Left Brand: PaycheckVault Logo & Badge */}
          <div className="flex items-center gap-3">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('landing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
              title="PaycheckVault — Home"
            >
              <div className="h-6 w-6 shrink-0">
                <svg className="h-full w-full" viewBox="0 0 84 84" fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M42.0759 84C65.2719 84 84.0759 65.196 84.0759 42C84.0759 18.804 65.2719 0 42.0759 0C18.88 0 0.0759277 18.804 0.0759277 42C0.0759277 65.196 18.88 84 42.0759 84ZM42.076 73.5C59.473 73.5 73.576 59.397 73.576 42C73.576 24.603 59.473 10.5 42.076 10.5C24.679 10.5 10.576 24.603 10.576 42C10.576 59.397 24.679 73.5 42.076 73.5Z"
                    fill="#62D0FF"
                  />
                  <path d="M18.4509 44.625L44.7009 18.375V39.375H65.7009L39.4509 65.625V44.625H18.4509Z" fill="white" />
                </svg>
              </div>
              <span className="font-display font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-[#62D0FF] transition">
                PaycheckVault
              </span>
              <span className="hidden xl:inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-white/10 text-[#62D0FF] border border-white/15">
                Reactive Omni
              </span>
            </a>

            {/* Vertical Divider after (⚡) icon when in scrolled capsule pill */}
            {isScrolled && (
              <div className="h-4 w-px bg-white/20 ml-2 mr-1 shrink-0 hidden md:block" />
            )}
          </div>

          {/* Right Navigation Links: divide-x list + Launch App button */}
          <div className="hidden md:flex shrink-0 items-center gap-3">
            <div className="flex shrink-0 divide-x divide-white/20 items-center">
              {navLinks.map((item) => (
                <div key={item.label} className="px-3 xl:px-4 inline-flex">
                  <a
                    href={item.href}
                    target={item.isExternal ? '_blank' : undefined}
                    rel={item.isExternal ? 'noreferrer' : undefined}
                    onClick={(e) => {
                      if (item.isInternal) {
                        e.preventDefault();
                        const el = document.querySelector(item.href);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="group"
                  >
                    <div className="flex items-center font-mono text-xs sm:text-sm font-medium relative text-[#F5F5F7] after:bg-white/50 after:absolute after:h-0.5 after:w-0 after:-bottom-1 after:left-0 group-hover:after:w-full after:transition-all after:duration-100 cursor-pointer">
                      <span className="uppercase">{item.label}</span>
                    </div>
                  </a>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigate('app')}
              className="ml-2 px-3.5 py-1.5 rounded-full bg-[#2756FC] hover:bg-[#3260ff] text-white font-sans font-medium text-xs sm:text-sm transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>Launch App</span>
              <span className="text-xs">→</span>
            </button>
          </div>

          {/* Mobile Hamburger Menu Toggle */}
          <div className="h-8 w-8 md:hidden shrink-0 flex justify-center items-center text-zinc-400 hover:text-white ml-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <svg
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="0"
                viewBox="0 0 20 20"
                className="h-5 w-5"
              >
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

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 p-4 rounded-2xl bg-black border border-white/10 space-y-3 font-mono text-xs">
            <div className="divide-y divide-white/10">
              {navLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.isExternal ? '_blank' : undefined}
                  rel={item.isExternal ? 'noreferrer' : undefined}
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    if (item.isInternal) {
                      e.preventDefault();
                      const el = document.querySelector(item.href);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="block py-2.5 text-zinc-300 hover:text-white transition"
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('app');
                }}
                className="w-full py-2 rounded-full bg-[#2756FC] text-white font-sans font-semibold text-xs text-center"
              >
                Launch Vault App →
              </button>
            </div>
          </div>
        )}

      </div>
    </nav>
  );
}
