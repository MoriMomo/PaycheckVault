export const CONFIG = {
  sepolia: {
    chainId: 11155111,
    chainIdHex: '0xaa36a7',
    chainName: 'Ethereum Sepolia',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorer: 'https://sepolia.etherscan.io',
    usdcAddress: '0x4f93F4E22F90F1F66C4E56dB10D8a2990035A09e',
  },
  lasna: {
    chainId: 5318007,
    chainIdHex: '0x512577',
    chainName: 'Reactive Lasna Testnet',
    rpcUrl: 'https://lasna-rpc.rnk.dev',
    explorer: 'https://lasna.reactivescan.net',
    reactiveAddress: '0xe18f4DF3B4Faa2D7F49b3F1581c04427a0Be9223',
  },
  baseSepolia: {
    chainId: 84532,
    chainIdHex: '0x14a34',
    chainName: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    vaultAddress: '0x68FE8Ff67a3bF8bC3AdC78b4282bf79E6cbD0142',
    usdcAddress: '0xe18f4DF3B4Faa2D7F49b3F1581c04427a0Be9223',
    wethAddress: '0x4f93F4E22F90F1F66C4E56dB10D8a2990035A09e',
    dexAddress: '0xC56bffDC6d87222128e60D617221AeC584e9F643',
  },
  deployerRvmId: '0x18634B5266369a482836328b8954E67918e5255a',
};

export const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
];

export const VAULT_ABI = [
  'function owner() view returns (address)',
  'function allocationBps() view returns (uint256)',
  'function setConfig(address _dexRouter, address _inputToken, address _targetToken, uint256 _allocationBps) external',
  'event PaycheckAllocated(address indexed caller, uint256 amountIn, uint256 amountOut, uint256 timestamp)',
];

