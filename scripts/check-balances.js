import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
  const user = process.env.SEPOLIA_MONITORED_RECIPIENT || "0x18634B5266369a482836328b8954E67918e5255a";

  // Defaults mirror the live v3 deployment documented in README.md.
  // Override any of these via .env when inspecting a fresh deployment.
  const sepoliaTokenAddr = process.env.SEPOLIA_TOKEN_ADDRESS || "0xC56bffDC6d87222128e60D617221AeC584e9F643";
  const vaultAddr = process.env.BASE_VAULT_ADDRESS || "0x59EaBF6a64d01C4fD544aDcdEe6AB1C3ADe629e0";
  const baseUsdcAddr = process.env.BASE_USDC_ADDRESS || "0x30A2A3AcD2E5118F50E34A0Ee2e464C5EF8614B0";
  const baseWethAddr = process.env.BASE_WETH_ADDRESS || "0xbBAD7e94D7E3950da3F365Cc9E715f834A59C35f";

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
