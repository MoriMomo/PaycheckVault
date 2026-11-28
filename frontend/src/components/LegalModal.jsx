export default function LegalModal({ legalModal, onSelectLegal, onClose }) {
  if (!legalModal) return null;

  const title =
    legalModal === 'terms'
      ? 'Terms of Service'
      : legalModal === 'privacy'
      ? 'Privacy Policy'
      : 'MIT License';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#121016] border border-white/[0.12] rounded-xl p-6 space-y-4 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-3">
          <div>
            <div className="text-xs font-mono text-[#FF5FCF]">Protocol disclosure</div>
            <h2 id="legal-modal-title" className="font-display text-lg font-medium text-[#ededed] mt-1">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-[#1c1922] border border-white/[0.08] text-xs font-mono text-[#a8a4b3] hover:text-[#ededed] transition-colors cursor-pointer"
            aria-label="Close disclosure modal"
          >
            Close
          </button>
        </div>

        {legalModal === 'terms' && (
          <div className="space-y-3 text-xs text-[#a8a4b3] leading-relaxed">
            <p>
              Bagi-Bagi is an experimental open-source reactive smart contract prototype deployed on Ethereum Sepolia, Reactive Lasna Testnet, and Base Sepolia Testnet.
            </p>
            <p>
              All cross-chain event subscriptions, anti-dust thresholds (&ge; 0.01 WETH), and multi-bucket allocations operate autonomously via public on-chain transactions. Do not send mainnet funds to testnet contract addresses.
            </p>
            <p className="text-[#8e8999]">
              By connecting a Web3 wallet, you acknowledge sole responsibility for signing transactions, paying network gas fees, and verifying testnet contract addresses before execution.
            </p>
          </div>
        )}

        {legalModal === 'privacy' && (
          <div className="space-y-3 text-xs text-[#a8a4b3] leading-relaxed">
            <p>
              Bagi-Bagi does not collect, store, or sell personal telemetry, IP logs, cookies, or off-chain user profiles.
            </p>
            <p>
              Wallet addresses connected via MetaMask, Phantom, or injected EIP-1193 providers are read strictly in client memory to query public RPC endpoints (Sepolia, Lasna, Base Sepolia).
            </p>
            <p className="text-[#8e8999]">
              All ERC-20 transfers, allocation policies, and callback receipts recorded by smart contracts are inherently public on their respective blockchain ledgers.
            </p>
          </div>
        )}

        {legalModal === 'license' && (
          <div className="space-y-3 text-xs text-[#a8a4b3] leading-relaxed font-mono">
            <p>Copyright (c) 2026 Bagi-Bagi Contributors</p>
            <p className="font-sans text-[#8e8999]">
              Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated smart contract files, to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, subject to standard MIT terms.
            </p>
          </div>
        )}

        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-[#8e8999]">
          <span>Bagi-Bagi · Reactive Lasna / Base Sepolia</span>
          <div className="flex gap-3">
            <button
              onClick={() => onSelectLegal('terms')}
              className={`cursor-pointer ${legalModal === 'terms' ? 'text-[#FAEB92]' : 'text-[#a8a4b3] hover:text-[#ededed]'}`}
            >
              Terms
            </button>
            <button
              onClick={() => onSelectLegal('privacy')}
              className={`cursor-pointer ${legalModal === 'privacy' ? 'text-[#FAEB92]' : 'text-[#a8a4b3] hover:text-[#ededed]'}`}
            >
              Privacy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
