import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

const WALLET_STORAGE_KEY = 'paycheckvault_wallet_rdns';

const LEGACY_WALLET_META = [
  { check: (p) => p.isPhantom, info: { uuid: 'fallback-phantom', name: 'Phantom', rdns: 'app.phantom', icon: null } },
  { check: (p) => p.isMetaMask, info: { uuid: 'fallback-metamask', name: 'MetaMask', rdns: 'io.metamask', icon: null } },
  { check: (p) => p.isRabby, info: { uuid: 'fallback-rabby', name: 'Rabby Wallet', rdns: 'io.rabby', icon: null } },
  { check: (p) => p.isCoinbaseWallet, info: { uuid: 'fallback-coinbase', name: 'Coinbase Wallet', rdns: 'com.coinbase.wallet', icon: null } },
];

function collectFallbackWallets(addEntry) {
  if (window.phantom?.ethereum) {
    addEntry(
      { uuid: 'fallback-phantom', name: 'Phantom', rdns: 'app.phantom', icon: null },
      window.phantom.ethereum
    );
  }

  const legacyProviders = Array.isArray(window.ethereum?.providers)
    ? window.ethereum.providers
    : window.ethereum
    ? [window.ethereum]
    : [];

  for (const provider of legacyProviders) {
    const matched = LEGACY_WALLET_META.find((entry) => entry.check(provider));
    addEntry(
      matched?.info || { uuid: 'fallback-browser', name: 'Browser Wallet', rdns: 'injected.browser', icon: null },
      provider
    );
  }
}

/**
 * Discovers EIP-6963 & legacy injected wallets, persists selection,
 * tracks active account/chain changes, and handles wallet switching.
 */
export function useWallet({ showToast }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [currentChainId, setCurrentChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [discoveredWallets, setDiscoveredWallets] = useState([]);
  const [activeProvider, setActiveProvider] = useState(null);
  const [activeWalletInfo, setActiveWalletInfo] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const scanWallets = useCallback(() => {
    const byKey = new Map();

    const addEntry = (info, provider) => {
      if (!provider || typeof provider.request !== 'function') return;
      const key = info.rdns || info.name;
      if (!byKey.has(key)) {
        byKey.set(key, { info, provider });
      }
    };

    const onAnnounce = (event) => {
      const detail = event?.detail;
      if (detail?.info && detail?.provider) {
        addEntry(detail.info, detail.provider);
        setDiscoveredWallets(Array.from(byKey.values()));
      }
    };

    window.addEventListener('eip6963:announceProvider', onAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    collectFallbackWallets(addEntry);

    const list = Array.from(byKey.values());
    setDiscoveredWallets(list);

    const timer = setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce);
    }, 300);

    return { list, cleanup: () => { clearTimeout(timer); window.removeEventListener('eip6963:announceProvider', onAnnounce); } };
  }, []);

  // Discover wallets asynchronously on mount and restore previously approved session
  useEffect(() => {
    let innerCleanup = () => {};
    let restoreTimer;

    const initTimer = setTimeout(() => {
      const { list, cleanup } = scanWallets();
      innerCleanup = cleanup;

      const savedRdns = window.localStorage?.getItem(WALLET_STORAGE_KEY);
      if (!savedRdns) return;

      restoreTimer = setTimeout(() => {
        const match = list.find((w) => (w.info.rdns || w.info.name) === savedRdns);
        if (!match) return;
        match.provider
          .request({ method: 'eth_accounts' })
          .then((accounts) => {
            if (accounts?.length > 0) {
              setActiveProvider(match.provider);
              setActiveWalletInfo(match.info);
              setWalletAddress(accounts[0]);
            }
          })
          .catch(() => {});
      }, 150);
    }, 0);

    return () => {
      clearTimeout(initTimer);
      clearTimeout(restoreTimer);
      innerCleanup();
    };
  }, [scanWallets]);

  // Subscribe to active provider account & network events
  useEffect(() => {
    const provider = activeProvider || window.ethereum;
    if (!provider || typeof provider.on !== 'function') return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        showToast('Account switched', `Connected as ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
      } else {
        setWalletAddress(null);
        setActiveProvider(null);
        setActiveWalletInfo(null);
        window.localStorage?.removeItem(WALLET_STORAGE_KEY);
        showToast('Wallet disconnected', 'Connect a wallet to view your vault', 'warn');
      }
    };

    const handleChainChanged = (chainIdHex) => {
      setCurrentChainId(parseInt(chainIdHex, 16));
    };

    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);

    if (activeProvider) {
      provider
        .request({ method: 'eth_chainId' })
        .then((hex) => {
          if (hex) setCurrentChainId(parseInt(hex, 16));
        })
        .catch(() => {});
    }

    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged);
      provider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [activeProvider, showToast]);

  const getEip1193 = useCallback(() => activeProvider || window.ethereum, [activeProvider]);

  const openWalletModal = useCallback(() => {
    scanWallets();
    setShowWalletModal(true);
  }, [scanWallets]);

  const closeWalletModal = useCallback(() => setShowWalletModal(false), []);

  const selectWallet = useCallback(
    async (walletEntry) => {
      setIsConnecting(true);
      try {
        const targetProvider = walletEntry.provider;

        // Trigger MetaMask account picker if previously authorized
        if (targetProvider.isMetaMask && !targetProvider.isPhantom) {
          try {
            await targetProvider.request({
              method: 'wallet_requestPermissions',
              params: [{ eth_accounts: {} }],
            });
          } catch (permErr) {
            if (permErr?.code === 4001) throw permErr;
          }
        }

        const browserProvider = new ethers.BrowserProvider(targetProvider);
        const accounts = await browserProvider.send('eth_requestAccounts', []);
        const network = await browserProvider.getNetwork();
        const user = accounts[0];

        setActiveProvider(targetProvider);
        setActiveWalletInfo(walletEntry.info);
        window.localStorage?.setItem(WALLET_STORAGE_KEY, walletEntry.info.rdns || walletEntry.info.name);
        setWalletAddress(user);
        setCurrentChainId(Number(network.chainId));
        setShowWalletModal(false);

        showToast(
          `${walletEntry.info.name} connected`,
          `Loaded vault slice for ${user.slice(0, 6)}...${user.slice(-4)}`
        );
      } catch (err) {
        showToast('Connection cancelled', err?.message || 'Wallet rejected connection', 'warn');
      } finally {
        setIsConnecting(false);
      }
    },
    [showToast]
  );

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setActiveProvider(null);
    setActiveWalletInfo(null);
    setCurrentChainId(null);
    setShowWalletModal(false);
    window.localStorage?.removeItem(WALLET_STORAGE_KEY);
    showToast('Wallet disconnected', 'Connect a wallet to view your vault');
  }, [showToast]);

  const switchNetwork = useCallback(
    async (targetNetwork) => {
      const eip1193 = getEip1193();
      if (!eip1193) {
        openWalletModal();
        return false;
      }
      try {
        await eip1193.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetNetwork.chainIdHex }],
        });
        setCurrentChainId(targetNetwork.chainId);
        return true;
      } catch (switchError) {
        if (switchError?.code === 4902) {
          try {
            await eip1193.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: targetNetwork.chainIdHex,
                  chainName: targetNetwork.chainName,
                  rpcUrls: [targetNetwork.rpcUrl],
                  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                  blockExplorerUrls: [targetNetwork.explorer],
                },
              ],
            });
            setCurrentChainId(targetNetwork.chainId);
            return true;
          } catch (addError) {
            console.error(addError);
          }
        }
        return false;
      }
    },
    [getEip1193, openWalletModal]
  );

  return {
    walletAddress,
    activeWalletInfo,
    currentChainId,
    isConnecting,
    discoveredWallets,
    showWalletModal,
    openWalletModal,
    closeWalletModal,
    scanWallets,
    selectWallet,
    disconnectWallet,
    switchNetwork,
    getEip1193,
  };
}
