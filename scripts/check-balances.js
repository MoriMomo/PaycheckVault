import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
  const user = process.env.SEPOLIA_MONITORED_RECIPIENT || "0x18634B5266369a482836328b8954E67918e5255a";

  const sepoliaUsdcAddr = process.env.SEPOLIA_TOKEN_ADDRESS || "0x4f93F4E22F90F1F66C4E56dB10D8a2990035A09e";
  const vaultAddr = process.env.BASE_VAULT_ADDRESS || "0x68FE8Ff67a3bF8bC3AdC78b4282bf79E6cbD0142";
  const baseUsdcAddr = "0xe18f4DF3B4Faa2D7F49b3F1581c04427a0Be9223";
  const baseWethAddr = "0x4f93F4E22F90F1F66C4E56dB10D8a2990035A09e";

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
    const sepoliaProvider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
    const sepoliaEth = await sepoliaProvider.getBalance(user);
    const sepoliaUsdc = new ethers.Contract(sepoliaUsdcAddr, erc20Abi, sepoliaProvider);
    const userSepoliaUsdc = await sepoliaUsdc.balanceOf(user);
    console.log("1. ORIGIN CHAIN: Ethereum Sepolia (11155111)");
    console.log(`   - Wallet SepoliaETH:  ${ethers.formatEther(sepoliaEth)} ETH`);
    console.log(`   - Wallet Mock USDC:   ${Number(ethers.formatEther(userSepoliaUsdc)).toLocaleString()} USDC`);
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
