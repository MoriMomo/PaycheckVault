import { useState, useRef, useEffect, useCallback } from 'react';
import { CONFIG } from './config/contracts';
import { useWallet } from './hooks/useWallet';
import { useVault } from './hooks/useVault';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/DashboardPage';
import WalletModal from './components/WalletModal';
import LegalModal from './components/LegalModal';
import MeadowRiseFooter from '@/components/ui/meadow-rise-footer';

const FOOTER_PALETTE = {
  sky: ['#000000', '#000000'],
  haze: '#000000',
  glow: 'transparent',
  hills: [
    ['#0c0814', '#000000'],
    ['#120b1f', '#000000'],
    ['#180e29', '#000000'],
    ['#130b20', '#000000'],
    ['#09060f', '#000000'],
    ['#000000', '#000000'],
  ],
  ground: '#000000',
  ink: '#ededed',
  sub: '#a8a4b3',
  pill: '#FAEB92',
  pillInk: '#000000',
  text: '#ededed',
  muted: '#8e8999',
  line: 'rgba(237, 237, 237, 0.1)',
  night: true,
};

export default function App() {
  const [activePage, setActivePage] = useState('landing');
  const [toast, setToast] = useState(null);
  const [legalModal, setLegalModal] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((title, subtitle, type = 'success') => {
    setToast({ title, subtitle, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const wallet = useWallet({ showToast });
  const vault = useVault({
    walletAddress: wallet.walletAddress,
    currentChainId: wallet.currentChainId,
    getEip1193: wallet.getEip1193,
    switchNetwork: wallet.switchNetwork,
    openWalletModal: wallet.openWalletModal,
    showToast,
  });

  return (
    <div
      className={`min-h-dvh flex flex-col justify-between font-sans text-[#ededed] ${
        activePage === 'app' ? 'bg-[#0a090d]' : 'bg-black'
      }`}
    >
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-xl border bg-[#121016] transition-colors duration-150 flex items-start gap-3 ${
            toast.type === 'warn'
              ? 'border-[#FF5FCF]/60 text-[#ededed]'
              : 'border-white/[0.12] text-[#ededed]'
          }`}
        >
          <span
            className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
              toast.type === 'warn' ? 'bg-[#FF5FCF]' : 'bg-[#FAEB92]'
            }`}
          />
          <div className="text-xs space-y-1">
            <div className="font-medium text-sm text-[#ededed]">{toast.title}</div>
            <div className="text-[#a8a4b3] leading-relaxed">{toast.subtitle}</div>
          </div>
        </div>
      )}

      <Navbar
        activePage={activePage}
        onNavigate={setActivePage}
        walletAddress={wallet.walletAddress}
        activeWalletName={wallet.activeWalletInfo?.name}
        currentChainId={wallet.currentChainId}
        isConnecting={wallet.isConnecting}
        onConnectWallet={wallet.openWalletModal}
        onSwitchNetwork={wallet.switchNetwork}
      />

      <WalletModal
        isOpen={wallet.showWalletModal}
        onClose={wallet.closeWalletModal}
        wallets={wallet.discoveredWallets}
        walletAddress={wallet.walletAddress}
        activeWalletInfo={wallet.activeWalletInfo}
        isConnecting={wallet.isConnecting}
        onSelectWallet={wallet.selectWallet}
        onDisconnect={wallet.disconnectWallet}
        onRefreshWallets={wallet.scanWallets}
      />

      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        <main
          className={`w-full mx-auto px-6 lg:px-8 flex-1 ${
            activePage === 'app'
              ? 'max-w-[1440px] pt-20 lg:pt-8 pb-12'
              : 'max-w-6xl pt-20 lg:pt-10 pb-12'
          }`}
        >
          {activePage === 'landing' ? (
            <LandingPage
              onLaunchApp={() => setActivePage('app')}
              protocolTvl={vault.protocolTvl}
              loopPhase={vault.loopPhase}
            />
          ) : (
            <DashboardPage
              walletAddress={wallet.walletAddress}
              onConnectWallet={wallet.openWalletModal}
              currentChainId={wallet.currentChainId}
              animatedUSDC={vault.animatedUSDC}
              animatedYieldUSDC={vault.animatedYieldUSDC}
              animatedWETH={vault.animatedWETH}
              vaultUsdc={vault.vaultUsdc}
              vaultYieldUsdc={vault.vaultYieldUsdc}
              vaultWeth={vault.vaultWeth}
              userSepoliaWeth={vault.userSepoliaWeth}
              userBaseWeth={vault.userBaseWeth}
              userSepoliaEth={vault.userSepoliaEth}
              userBaseEth={vault.userBaseEth}
              isWalletActionBusy={vault.isWalletActionBusy}
              onMintTestWeth={vault.mintTestWeth}
              onDepositToVault={vault.depositToVault}
              onWithdrawBucket={vault.withdrawFromVault}
              onSwitchNetwork={wallet.switchNetwork}
              stablePct={vault.stablePct}
              setStablePct={vault.setStablePct}
              yieldPct={vault.yieldPct}
              setYieldPct={vault.setYieldPct}
              savedStablePct={vault.savedStablePct}
              savedYieldPct={vault.savedYieldPct}
              minThresholdWeth={vault.minThresholdWeth}
              cooldownSecs={vault.cooldownSecs}
              maxCapWeth={vault.maxCapWeth}
              setMaxCapWeth={vault.setMaxCapWeth}
              slippageFloorUsd={vault.slippageFloorUsd}
              setSlippageFloorUsd={vault.setSlippageFloorUsd}
              isUpdatingPolicy={vault.isUpdatingPolicy}
              onSavePolicy={vault.savePolicyOnChain}
              loopPhase={vault.loopPhase}
              activeTxHash={vault.activeTxHash}
              onExecutePaycheck={vault.executeRealPaycheck}
              isLoadingBalances={vault.isLoadingBalances}
              secondsAgo={vault.secondsAgo}
              onRefreshBalances={vault.refreshBalances}
              activities={vault.activities}
            />
          )}
        </main>

        {activePage === 'landing' && (
          <div className="relative w-full mt-12 bg-black">
            <MeadowRiseFooter
              name="PaycheckVault"
              brandHref="#"
              heading="Send crypto paychecks where they need to go"
              subheading="Sepolia WETH inflows filtered on Reactive Lasna and split across Base Sepolia buckets"
              cta={{
                label: 'Open treasury',
                href: '#vault-app',
                onClick: (e) => {
                  e.preventDefault();
                  setActivePage('app');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                },
              }}
              tagline="Built for the Reactive Omni Buildathon"
              newsletter={false}
              palette={FOOTER_PALETTE}
              columns={[
                {
                  title: 'Chains & Explorers',
                  links: [
                    { label: 'Ethereum Sepolia (11155111)', href: `${CONFIG.sepolia.explorer}/address/${CONFIG.sepolia.usdcAddress}` },
                    { label: 'Reactive Lasna (5318007)', href: `${CONFIG.lasna.explorer}/address/${CONFIG.lasna.reactiveAddress}` },
                    { label: 'Base Sepolia (84532)', href: `${CONFIG.baseSepolia.explorer}/address/${CONFIG.baseSepolia.vaultAddress}` },
                  ],
                },
                {
                  title: 'Reactive Network',
                  links: [
                    { label: 'Documentation', href: 'https://dev.reactive.network/' },
                    { label: 'Lasna ReactScan', href: 'https://lasna.reactscan.net/' },
                    { label: 'Ecosystem', href: 'https://reactive.network' },
                    { label: 'PaycheckVault Repo', href: 'https://github.com/MoriMomo/PaycheckVault' },
                  ],
                },
                {
                  title: 'Omni Buildathon',
                  links: [
                    { label: 'DoraHacks Buildathon', href: 'https://dorahacks.io/hackathon/reactive-omni-buildathon' },
                    { label: 'Set It & Forget It Track', href: 'https://dorahacks.io/hackathon/reactive-omni-buildathon' },
                    { label: 'PaycheckReactive RSC', href: `${CONFIG.lasna.explorer}/address/${CONFIG.lasna.reactiveAddress}` },
                  ],
                },
              ]}
              copyright="2026 PaycheckVault, Reactive Omni Buildathon"
              legal={[
                { label: 'Terms of Service', href: '#terms', onClick: (e) => { e.preventDefault(); setLegalModal('terms'); } },
                { label: 'Privacy Policy', href: '#privacy', onClick: (e) => { e.preventDefault(); setLegalModal('privacy'); } },
                { label: 'MIT License', href: '#license', onClick: (e) => { e.preventDefault(); setLegalModal('license'); } },
                { label: 'Reactive Lasna Testnet', href: 'https://lasna.reactscan.net/' },
                { label: 'Base Sepolia Testnet', href: 'https://sepolia.basescan.org' },
              ]}
            />
          </div>
        )}
      </div>

      <LegalModal
        legalModal={legalModal}
        onSelectLegal={setLegalModal}
        onClose={() => setLegalModal(null)}
      />
    </div>
  );
}
