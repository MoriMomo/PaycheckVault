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
    { label: 'DOCS', href: 'https://docs.reactive.network/' },
    { label: 'REACTIVE SCAN', href: 'https://reactscan.net/' },
    { label: 'ECOSYSTEM', href: 'https://reactive.network/ecosystem' },
    { label: '$REACT', href: 'https://reactive.network/token' },
    { label: 'STAKE/SWAP', href: 'https://portal.reactive.network/' },
    { label: 'GITHUB', href: 'https://github.com/Reactive-Network/reactive-smart-contract-demos' },
    { label: 'BLOG', href: 'https://blog.reactive.network/' },
  ];

  // If user is inside the Vault DApp Control Center (activePage === 'app')
  // show the specialized Web3 App Toolbar with wallet, network, contracts, and back link
  if (activePage === 'app') {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0C]/90 backdrop-blur-xl border-b border-white/8 transition-all">
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
                    fill="url(#appNavGrad)"
                  />
                  <path d="M18.4509 44.625L44.7009 18.375V39.375H65.7009L39.4509 65.625V44.625H18.4509Z" fill="white" />
                  <defs>
                    <linearGradient id="appNavGrad" x1="0" y1="0" x2="84" y2="84" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#62D0FF" />
                      <stop offset="0.5" stopColor="#3C2EFF" />
                      <stop offset="1" stopColor="#CBB5FF" />
                    </linearGradient>
                  </defs>
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
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full bg-[#2756FC]/15 text-[#62D0FF] border border-[#2756FC]/40">
                <span className="w-1.5 h-1.5 rounded-full bg-[#62D0FF] animate-pulse" />
                Sepolia (Origin)
              </span>
            )}

            {walletAddress && currentChainId === CONFIG.baseSepolia.chainId && (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full bg-[#0052FF]/15 text-blue-300 border border-[#0052FF]/40">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Base Sepolia (Vault)
              </span>
            )}

            <button
              onClick={() => setShowInspector(!showInspector)}
              className="text-xs font-mono text-zinc-400 hover:text-white transition px-2.5 py-1.5 rounded-full border border-white/8 hover:bg-white/5 cursor-pointer"
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

        {/* Contract Drawer in App Mode */}
        {showInspector && (
          <div className="border-t border-white/8 bg-[#0A0A0C]/95 px-6 py-4 text-xs">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
              <div className="reactive-card p-3.5 rounded-xl space-y-1.5">
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

              <div className="reactive-card p-3.5 rounded-xl space-y-1.5">
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

              <div className="reactive-card p-3.5 rounded-xl space-y-1.5">
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
  // LANDING PAGE NAVBAR:
  // Replicates reactive.network's authentic 2-state responsive navbar:
  // State 1 (Top / Unscrolled): Full-width header matching Image 2
  // State 2 (Scrolled): Floating centered capsule pill matching Image 1
  // =========================================================================
  return (
    <nav
      className={`fixed left-0 top-0 z-50 w-full flex justify-center transition-all duration-450 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        isScrolled ? 'pt-2 sm:pt-3 px-3 sm:px-4' : 'pt-0 px-0'
      }`}
    >
      <div
        className={`relative transition-all duration-450 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isScrolled
            ? 'w-fit px-5 sm:px-6 rounded-full'
            : 'w-full max-w-[1536px] px-6 sm:px-8 rounded-none'
        }`}
      >
        {/* Backdrop blur and subtle glow container in scrolled state */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 backdrop-blur-md bg-[#0A0A0C]/85 ring-1 ring-white/10 shadow-lg shadow-black/50 transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isScrolled ? 'opacity-100 rounded-full' : 'opacity-0 rounded-none'
          }`}
          style={{ borderRadius: 'inherit' }}
        />

        {/* Content Flex Row */}
        <div
          className={`relative flex items-center transition-all duration-450 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isScrolled ? 'h-12 sm:h-14 justify-center' : 'h-16 justify-between'
          }`}
        >
          
          {/* Left Brand: SVG Logo that morphs between full wordmark (119px) and circular icon (24px) */}
          <div className="flex items-center">
            <a
              href="https://reactive.network"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('landing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`block h-6 shrink-0 overflow-hidden transition-all duration-450 ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer select-none ${
                isScrolled ? 'w-6' : 'w-[119px]'
              }`}
              title="Reactive Network"
            >
              <div className="h-6 w-[119px]">
                <svg className="h-full" viewBox="0 0 417 84" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Letters: 'reactive' */}
                  <path d="M122.485 62.9999H112.573V20.9999H122.485V25.7879C125.341 22.4279 129.709 20.1599 135.085 20.1599V29.5679C134.749 29.4839 134.329 29.4839 133.993 29.4839C127.693 29.4839 122.485 33.9359 122.485 40.3199V62.9999Z" fill="white" />
                  <path d="M137.213 41.9999C137.213 29.6519 146.453 20.1599 158.633 20.1599C170.561 20.1599 178.709 28.8959 178.709 41.4119C178.709 43.0079 178.457 44.7719 178.289 46.4519H147.041C148.721 51.6599 153.425 54.8519 159.641 54.8519C163.673 54.8519 167.537 53.4239 170.057 50.6519L176.357 56.9519C172.325 61.4039 166.445 63.8399 159.557 63.8399C146.873 63.8399 137.213 54.3479 137.213 41.9999ZM158.465 29.0639C152.669 29.0639 147.713 32.9279 146.873 38.7239H169.385C168.545 32.7599 164.093 29.0639 158.465 29.0639Z" fill="white" />
                  <path d="M184.053 41.9999C184.053 29.9879 192.873 20.1599 204.885 20.1599C210.177 20.1599 215.049 22.9319 217.821 26.2079V20.9999H227.733V62.9999H217.821V57.6239C215.049 61.0679 210.177 63.8399 204.885 63.8399C192.873 63.8399 184.053 54.0119 184.053 41.9999ZM205.893 30.0719C199.341 30.0719 193.965 35.4479 193.965 41.9999C193.965 48.5519 199.341 53.9279 205.893 53.9279C212.445 53.9279 217.821 48.5519 217.821 41.9999C217.821 35.4479 212.445 30.0719 205.893 30.0719Z" fill="white" />
                  <path d="M256.834 63.8399C244.822 63.8399 234.994 54.0119 234.994 41.9999C234.994 29.9039 244.822 20.1599 256.834 20.1599C263.05 20.1599 268.678 22.7639 272.626 26.9639L265.654 33.9359C263.47 31.5839 260.278 30.0719 256.834 30.0719C250.282 30.0719 244.906 35.4479 244.906 41.9999C244.906 48.5519 250.282 53.9279 256.834 53.9279C260.278 53.9279 263.47 52.4159 265.654 49.9799L272.626 57.0359C268.678 61.2359 263.05 63.8399 256.834 63.8399Z" fill="white" />
                  <path d="M275.982 20.9999H280.014C282.198 20.9999 283.71 19.5719 283.71 17.3879V9.74393H293.622V20.9999H304.29V30.9119H293.622V45.9479C293.622 52.5839 294.63 54.2639 298.662 54.2639C300.51 54.2639 302.19 54.0119 304.29 53.5919V62.9999C302.358 63.5039 299.586 63.8399 297.318 63.8399C287.742 63.8399 283.71 59.4719 283.71 48.8879V30.9119H275.982V20.9999Z" fill="white" />
                  <path d="M322.067 62.9999H312.155V20.9999H322.067V62.9999ZM311.231 7.55993C311.231 4.36793 313.835 1.67993 317.111 1.67993C320.387 1.67993 322.991 4.36793 322.991 7.55993C322.991 10.8359 320.387 13.5239 317.111 13.5239C313.835 13.5239 311.231 10.8359 311.231 7.55993Z" fill="white" />
                  <path d="M345.114 62.9999L327.642 20.9999H338.394L350.658 50.9039L362.838 20.9999H373.59L356.202 62.9999H345.114Z" fill="white" />
                  <path d="M375.104 41.9999C375.104 29.6519 384.344 20.1599 396.524 20.1599C408.452 20.1599 416.6 28.8959 416.6 41.4119C416.6 43.0079 416.348 44.7719 416.18 46.4519H384.932C386.612 51.6599 391.316 54.8519 397.532 54.8519C401.564 54.8519 405.428 53.4239 407.948 50.6519L414.248 56.9519C410.216 61.4039 404.336 63.8399 397.448 63.8399C384.764 63.8399 375.104 54.3479 375.104 41.9999ZM396.356 29.0639C390.56 29.0639 385.604 32.9279 384.764 38.7239H407.276C406.436 32.7599 401.984 29.0639 396.356 29.0639Z" fill="white" />
                  {/* Glowing Ring & Lightning bolt */}
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M42.0759 84C65.2719 84 84.0759 65.196 84.0759 42C84.0759 18.804 65.2719 0 42.0759 0C18.88 0 0.0759277 18.804 0.0759277 42C0.0759277 65.196 18.88 84 42.0759 84ZM42.076 73.5C59.473 73.5 73.576 59.397 73.576 42C73.576 24.603 59.473 10.5 42.076 10.5C24.679 10.5 10.576 24.603 10.576 42C10.576 59.397 24.679 73.5 42.076 73.5Z"
                    fill="url(#navIconGrad)"
                  />
                  <path d="M18.4509 44.625L44.7009 18.375V39.375H65.7009L39.4509 65.625V44.625H18.4509Z" fill="white" />
                  <defs>
                    <linearGradient id="navIconGrad" x1="0.0759277" y1="0" x2="84.0759" y2="84" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#62D0FF" />
                      <stop offset="0.5" stopColor="#3C2EFF" />
                      <stop offset="1" stopColor="#CBB5FF" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </a>

            {/* Vertical Divider after (⚡) icon when in scrolled capsule pill (Image 1) */}
            {isScrolled && (
              <div className="h-4 w-px bg-white/20 ml-4 mr-0 shrink-0 hidden md:block" />
            )}
          </div>

          {/* Right Navigation Links: divide-x list matching Image 1 & Image 2 */}
          <div className="hidden md:flex shrink-0 divide-x divide-white/20 items-center">
            {navLinks.map((item) => (
              <div key={item.label} className="px-3 xl:px-4 inline-flex">
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group"
                >
                  <div className="flex items-center inline-block font-mono text-xs sm:text-sm font-medium relative text-[#F5F5F7] after:bg-white/50 after:absolute after:h-0.5 after:w-0 after:-bottom-1 after:left-0 group-hover:after:w-full after:transition-all after:duration-100 cursor-pointer">
                    <span className="uppercase">{item.label}</span>
                  </div>
                </a>
              </div>
            ))}
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
          <div className="md:hidden mt-2 p-4 rounded-2xl bg-[#0A0A0C]/95 border border-white/10 backdrop-blur-xl space-y-3 font-mono text-xs">
            <div className="divide-y divide-white/10">
              {navLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
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
