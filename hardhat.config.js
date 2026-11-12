import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

// Sanitize and validate private key from .env
const rawKey = (process.env.PRIVATE_KEY || "").trim().replace(/^["']|["']$/g, "");
const cleanKey = rawKey.startsWith("0x") ? rawKey.slice(2) : rawKey;
const isValidKey = cleanKey.length === 64 && /^[0-9a-fA-F]{64}$/.test(cleanKey);
const accounts = isValidKey ? [`0x${cleanKey}`] : [];

if (rawKey && !isValidKey && rawKey !== "your_private_key_here") {
  console.warn("\n⚠️  WARNING: PRIVATE_KEY in .env is not a valid 64-hex character private key.");
  console.warn(`   Length is ${rawKey.length} characters. Expected 64 characters (or 66 with 0x).\n`);
}

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      accounts,
      chainId: 11155111,
    },
    lasna: {
      url: process.env.LASNA_RPC_URL || "https://lasna-rpc.rnk.dev/",
      accounts,
      chainId: 5318007,
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts,
      chainId: 84532,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
