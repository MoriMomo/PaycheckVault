/**
 * SINGLE SOURCE OF TRUTH for the live PaycheckVault v3 testnet deployment.
 *
 * Read-only consumer scripts (check-balances.js, preflight.js) import from here
 * so contract addresses can never drift between scripts again. Every value can
 * still be overridden at runtime via the matching .env variable (useful when
 * inspecting a fresh deployment produced by the deploy-*.js scripts).
 *
 * When you redeploy, update THIS file (and README.md) — nowhere else.
 * Keep this in sync with frontend/src/config/contracts.js (the browser-side copy).
 */

const env = process.env;

const ADDRESSES = {
  sepolia: {
    chainId: 11155111,
    rpcUrl: env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    explorer: "https://sepolia.etherscan.io",
    // Origin WETH (MockERC20 with public mint) — the monitored inflow token
    token: env.SEPOLIA_TOKEN_ADDRESS || "0xC56bffDC6d87222128e60D617221AeC584e9F643",
    // Official Reactive Network Sepolia faucet (send ETH -> receive lREACT on Lasna)
    faucet: env.SEPOLIA_FAUCET_CONTRACT || "0x9b9BB25f1A81078C544C829c5EB7822d747Cf434",
    monitoredRecipient: env.SEPOLIA_MONITORED_RECIPIENT || "0x18634B5266369a482836328b8954E67918e5255a",
  },
  lasna: {
    chainId: 5318007,
    rpcUrl: env.LASNA_RPC_URL || "https://lasna-rpc.rnk.dev",
    explorer: "https://lasna.reactscan.net",
    // PaycheckReactive (Wildcard Omni v3) — pays callback gas in REACT
    reactive: env.LASNA_REACTIVE_ADDRESS || "0x68FE8Ff67a3bF8bC3AdC78b4282bf79E6cbD0142",
    system: "0x8888888888888888888888888888888888888888",
  },
  baseSepolia: {
    chainId: 84532,
    rpcUrl: env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
    // Multi-User PaycheckVault (Omni) — destination execution
    vault: env.BASE_VAULT_ADDRESS || "0x59EaBF6a64d01C4fD544aDcdEe6AB1C3ADe629e0",
    // Omni callback proxy that invokes the vault (must hold ETH for gas)
    callbackProxy: env.BASE_SEPOLIA_CALLBACK_PROXY || "0x476F44b11F5C942c58f4c8E3d0300E5710743585",
    weth: env.BASE_WETH_ADDRESS || "0xbBAD7e94D7E3950da3F365Cc9E715f834A59C35f",
    usdc: env.BASE_USDC_ADDRESS || "0x30A2A3AcD2E5118F50E34A0Ee2e464C5EF8614B0",
    susdc: env.BASE_SUSDC_ADDRESS || "0x58aB359b4aA491C45dd013B580aE0be50Bf4fE14",
    dex: env.BASE_DEX_ADDRESS || "0xE4BF9404aA3A6aE552EaD8F91CCC8b68269c4841",
  },
};

// Verified end-to-end cross-chain proof hashes published in README.md.
// preflight.js re-resolves each of these on its explorer before you record.
const README_TX_HASHES = [
  {
    step: "0. Bind Vault",
    network: "lasna",
    hash: "0xd3d91772cd9574378ce06e6b914870f988f9ca387262ceb626ae23501f8348b5",
  },
  {
    step: "1. Origin Inflow",
    network: "sepolia",
    hash: "0x043025677f893c2367986950c26c1cd0017bda08422adc26cc13d8f69359fc68",
  },
  {
    step: "2. Reactive Execution",
    network: "lasna",
    hash: "0x8fce8c56ed954acc43f12c8ae2fce2d599322a79d42baba890853de841057631",
  },
  {
    step: "3. Base Settlement",
    network: "baseSepolia",
    hash: "0x3a2ad37d975ca1fae92b412f2ebed8c4c00f146a9d1a60fda2aa9a8f7416d9c6",
  },
];

module.exports = { ADDRESSES, README_TX_HASHES };
