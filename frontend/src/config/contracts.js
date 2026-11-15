export const CONFIG = {
  sepolia: {
    chainId: 11155111,
    chainIdHex: '0xaa36a7',
    chainName: 'Ethereum Sepolia',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorer: 'https://sepolia.etherscan.io',
    usdcAddress: '0xC56bffDC6d87222128e60D617221AeC584e9F643',
  },
  lasna: {
    chainId: 5318007,
    chainIdHex: '0x512577',
    chainName: 'Reactive Lasna Testnet',
    rpcUrl: 'https://lasna-rpc.rnk.dev',
    explorer: 'https://lasna.reactivescan.net',
    reactiveAddress: '0xC56bffDC6d87222128e60D617221AeC584e9F643',
  },
  baseSepolia: {
    chainId: 84532,
    chainIdHex: '0x14a34',
    chainName: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    vaultAddress: '0xf51084Ac7aECC4689bb8d906F6900c8070c489D2',
    usdcAddress: '0x30A2A3AcD2E5118F50E34A0Ee2e464C5EF8614B0',
    sUsdcAddress: '0x58aB359b4aA491C45dd013B580aE0be50Bf4fE14',
    wethAddress: '0xbBAD7e94D7E3950da3F365Cc9E715f834A59C35f',
    dexAddress: '0xE4BF9404aA3A6aE552EaD8F91CCC8b68269c4841',
  },
  inflowAsset: 'WETH',
  ethUsdRate: 2500,
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
  'function stableBps() view returns (uint256)',
  'function yieldBps() view returns (uint256)',
  'function maxSingleAllocation() view returns (uint256)',
  'function minStableOutPerInput() view returns (uint256)',
  'function setBuckets(uint256 _stableBps, uint256 _yieldBps) external',
  'function setGuardrails(uint256 _maxSingleAllocation, uint256 _minStableOutPerInput) external',
  'function setConfig(address _dexRouter, address _inputToken, address _targetToken, uint256 _allocationBps) external',
  'event PaycheckAllocated(address indexed caller, uint256 amountIn, uint256 amountOut, uint256 timestamp)',
  'event MultiBucketAllocated(address indexed caller, uint256 effectiveInflow, uint256 stableOut, uint256 yieldOut, uint256 retainedIn, uint256 timestamp)',
];

