import hardhat from "hardhat";
import { createRequire } from "module";
const { ethers } = hardhat;
const require = createRequire(import.meta.url);
// Single source of truth — addresses never drift between scripts (overridable via .env)
const { ADDRESSES } = require("../addresses.cjs");

async function main() {
  const user = ADDRESSES.sepolia.monitoredRecipient;

  const sepoliaTokenAddr = ADDRESSES.sepolia.token;
  const vaultAddr = ADDRESSES.baseSepolia.vault;
  const baseUsdcAddr = ADDRESSES.baseSepolia.usdc;
  const baseWethAddr = ADDRESSES.baseSepolia.weth;

  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function symbol() view returns (string)"
  ];

  console.log("========================================================");
  console.log("PaycheckVault Multi-Chain Balance Inspector");
  console.log("Your Wallet:", user);
  console.log("Vault Address (Base):", vaultAddr);
  console.log("========================================================\n");

  // 1. Sepolia (Origin)
  try {
    const sepoliaProvider = new ethers.JsonRpcProvider(ADDRESSES.sepolia.rpcUrl);
    const sepoliaEth = await sepoliaProvider.getBalance(user);
    const sepoliaToken = new ethers.Contract(sepoliaTokenAddr, erc20Abi, sepoliaProvider);
    const userSepoliaWeth = await sepoliaToken.balanceOf(user);
    console.log("1. ORIGIN CHAIN: Ethereum Sepolia (11155111)");
    console.log(`   - Wallet SepoliaETH:  ${ethers.formatEther(sepoliaEth)} ETH`);
    console.log(`   - Wallet Origin WETH: ${Number(ethers.formatEther(userSepoliaWeth)).toLocaleString()} WETH`);
  } catch (err) {
    console.log("   - Sepolia error:", err.message);
  }

  // 2. Lasna (Reactive Network)
  try {
    const lasnaProvider = new ethers.JsonRpcProvider("https://lasna-rpc.rnk.dev");
    const lasnaReact = await lasnaProvider.getBalance(user);
    console.log("\n2. EVENT LAYER: Reactive Lasna Testnet (5318007)");
    console.log(`   - Wallet lREACT:      ${ethers.formatEther(lasnaReact)} REACT`);
  } catch (err) {
    console.log("   - Lasna error:", err.message);
  }

  // 3. Base Sepolia (Destination)
  try {
    const baseProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const baseEth = await baseProvider.getBalance(user);
    const vaultEth = await baseProvider.getBalance(vaultAddr);
    const baseUsdc = new ethers.Contract(baseUsdcAddr, erc20Abi, baseProvider);
    const baseWeth = new ethers.Contract(baseWethAddr, erc20Abi, baseProvider);
    const vaultUsdc = await baseUsdc.balanceOf(vaultAddr);
    const vaultWeth = await baseWeth.balanceOf(vaultAddr);

    console.log("\n3. DESTINATION CHAIN: Base Sepolia (84532)");
    console.log(`   - Wallet Base ETH:    ${ethers.formatEther(baseEth)} ETH`);
    console.log(`   - Vault ETH Reserve:  ${ethers.formatEther(vaultEth)} ETH (for relayer gas)`);
    console.log(`   - Vault Liquid USDC:  ${Number(ethers.formatEther(vaultUsdc)).toLocaleString()} USDC`);
    console.log(`   - Vault Accum. WETH:  ${Number(ethers.formatEther(vaultWeth)).toFixed(4)} WETH`);
  } catch (err) {
    console.log("   - Base Sepolia error:", err.message);
  }

  console.log("\n========================================================");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
