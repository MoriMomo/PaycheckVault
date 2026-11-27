const deployment = require("./frontend/src/config/deployment.json");

/**
 * SINGLE SOURCE OF TRUTH for the live PaycheckVault v3 testnet deployment.
 *
 * Read-only consumer scripts (check-balances.js, preflight.js) import from here
 * so contract addresses can never drift between scripts again. Every value can
 * still be overridden at runtime via the matching .env variable (useful when
 * inspecting a fresh deployment produced by the deploy-*.js scripts).
 *
 * When you redeploy, update THIS file (and README.md) — nowhere else.
 * Historical proof emitters stay paired with the published transaction hashes.
 */

const env = process.env;

const ADDRESSES = {
  sepolia: {
    chainId: 11155111,
    rpcUrl: env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    explorer: "https://sepolia.etherscan.io",
    // Origin WETH (MockERC20 with public mint) — the monitored inflow token
    token: env.SEPOLIA_TOKEN_ADDRESS || deployment.sepolia.token,
    // Official Reactive Network Sepolia faucet (send ETH -> receive lREACT on Lasna)
    faucet: env.SEPOLIA_FAUCET_CONTRACT || "0x9b9BB25f1A81078C544C829c5EB7822d747Cf434",
    monitoredRecipient: env.SEPOLIA_MONITORED_RECIPIENT || "0x18634B5266369a482836328b8954E67918e5255a",
  },
  lasna: {
    chainId: 5318007,
    rpcUrl: env.LASNA_RPC_URL || "https://lasna-rpc.rnk.dev",
    explorer: "https://lasna.reactscan.net",
    // PaycheckReactive (Wildcard Omni v3) — pays callback gas in REACT
    reactive: env.LASNA_REACTIVE_ADDRESS || deployment.lasna.reactive,
    system: "0x8888888888888888888888888888888888888888",
  },
  baseSepolia: {
    chainId: 84532,
    rpcUrl: env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
    // Multi-User PaycheckVault (Omni) — destination execution
    vault: env.BASE_VAULT_ADDRESS || deployment.baseSepolia.vault,
    // Omni callback proxy that invokes the vault (must hold ETH for gas)
    callbackProxy: env.BASE_SEPOLIA_CALLBACK_PROXY || "0x476F44b11F5C942c58f4c8E3d0300E5710743585",
    weth: env.BASE_WETH_ADDRESS || deployment.baseSepolia.weth,
    usdc: env.BASE_USDC_ADDRESS || deployment.baseSepolia.usdc,
    susdc: env.BASE_SUSDC_ADDRESS || deployment.baseSepolia.susdc,
    dex: env.BASE_DEX_ADDRESS || deployment.baseSepolia.dex,
  },
};

// Verified end-to-end cross-chain proof hashes published in README.md.
// preflight.js re-resolves each of these on its explorer before you record.
const README_TX_HASHES = [
  {
    step: "0. Bind Vault",
    emitter: deployment.lasna.reactive,
    event: "event DestinationVaultUpdated(address indexed previousVault,address indexed newVault)",
    network: "lasna",
    hash: "0x7002b17e4083fac691620f6807e6074b520ac74ddb8124f4820fb31cfba12860",
  },
  {
    step: "1. Origin Inflow",
    emitter: deployment.sepolia.token,
    event: "event Transfer(address indexed from,address indexed to,uint256 amount)",
    network: "sepolia",
    hash: "0x60c423124030d83e8d8947c4553050e09223d852c09f39664e5df2613fb7a48c",
  },
  {
    step: "2. Reactive Execution",
    emitter: deployment.lasna.reactive,
    event: "event PaycheckTriggered(address indexed recipient,uint256 indexed amount,address indexed destinationVault,uint256 timestamp)",
    network: "lasna",
    hash: "0x6c7b7167826d8569a8f2cb5f9933568ea5d73b855d56f50004f01a04b20be0c6",
  },
  {
    step: "3. Base Settlement",
    emitter: deployment.baseSepolia.vault,
    event: "event MultiBucketAllocated(address indexed recipient,address indexed caller,uint256 totalProcessed,uint256 stableOut,uint256 yieldOut,uint256 retainedIn,uint256 timestamp)",
    network: "baseSepolia",
    hash: "0xa9852b7fa4cfa8474f99891fb9940ec0780ddc6d414ddebd9db4cf2576525220",
  },
];

module.exports = { ADDRESSES, README_TX_HASHES };
