import React from 'react';
import { ArrowUpRight, LogOut, RefreshCw, Wallet, X } from 'lucide-react';

export default function WalletModal({
  isOpen,
  onClose,
  wallets,
  walletAddress,
  activeWalletInfo,
  isConnecting,
  onSelectWallet,
  onDisconnect,
  onRefreshWallets,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#121016] border border-white/[0.12] rounded-xl p-6 space-y-5 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div>
            <h2 id="wallet-modal-title" className="font-display text-lg font-medium text-[#ededed]">
              {walletAddress ? 'Wallet connection' : 'Connect a wallet'}
            </h2>
            <p className="text-xs text-[#a8a4b3] mt-1">
              {walletAddress
                ? 'Switch browser wallet or disconnect your current session'
                : 'Choose an installed EVM wallet extension to sign Sepolia and Base transactions'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-[#1c1922] border border-white/[0.08] text-[#a8a4b3] hover:text-[#ededed] flex items-center justify-center cursor-pointer"
            aria-label="Close wallet dialog"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Active Session Summary */}
        {walletAddress && (
          <div className="p-4 rounded-lg bg-black border border-white/[0.08] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {activeWalletInfo?.icon ? (
                <img
                  src={activeWalletInfo.icon}
                  alt={activeWalletInfo.name}
                  className="w-7 h-7 rounded-md shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-md bg-[#1c1922] flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4 text-[#FAEB92]" strokeWidth={1.5} />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-medium text-[#ededed] truncate">
                  {activeWalletInfo?.name || 'Connected wallet'}
                </div>
                <div className="font-mono text-xs text-[#FAEB92] truncate">
                  {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
                </div>
              </div>
            </div>

            <button
              onClick={onDisconnect}
              className="h-8 px-3 rounded-lg bg-[#1c1922] hover:bg-[#25212d] border border-white/[0.08] text-xs font-mono text-[#FF5FCF] inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Disconnect</span>
            </button>
          </div>
        )}

        {/* Detected Browser Wallets (EIP-6963 + Phantom/MetaMask Fallback) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8e8999]">
            <span>{walletAddress ? 'Switch to another wallet' : 'Detected wallets'}</span>
            <button
              onClick={onRefreshWallets}
              className="inline-flex items-center gap-1 font-mono hover:text-[#ededed] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Scan</span>
            </button>
          </div>

          {wallets.length > 0 ? (
            <div className="space-y-2">
              {wallets.map((w) => {
                const isCurrent =
                  walletAddress && activeWalletInfo?.uuid === w.info.uuid;
                return (
                  <button
                    key={w.info.uuid}
                    onClick={() => onSelectWallet(w)}
                    disabled={isConnecting}
                    className={`w-full h-12 px-4 rounded-lg border flex items-center justify-between gap-3 transition-[background-color,border-color] duration-150 cursor-pointer disabled:opacity-50 ${
                      isCurrent
                        ? 'bg-[#1c1922] border-[#FAEB92]/60 text-[#ededed]'
                        : 'bg-black hover:bg-[#1c1922] border-white/[0.08] text-[#ededed]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {w.info.icon ? (
                        <img
                          src={w.info.icon}
                          alt={w.info.name}
                          className="w-6 h-6 rounded shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-[#1c1922] flex items-center justify-center shrink-0">
                          <Wallet className="w-4 h-4 text-[#a8a4b3]" strokeWidth={1.5} />
                        </div>
                      )}
                      <span className="text-sm font-medium">{w.info.name}</span>
                    </span>

                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1c1922] text-[#FAEB92]">
                      {isCurrent ? 'Active' : isConnecting ? 'Opening' : 'Connect'}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-black border border-white/[0.08] space-y-3">
              <p className="text-xs text-[#a8a4b3] leading-relaxed">
                No browser EVM wallet extension was detected in this tab. Install or unlock MetaMask, Phantom, or Rabby, then click Scan.
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1c1922] text-[#FAEB92] hover:text-white"
                >
                  <span>Install MetaMask</span>
                  <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </a>
                <a
                  href="https://phantom.app/download"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1c1922] text-[#FF5FCF] hover:text-white"
                >
                  <span>Install Phantom</span>
                  <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
