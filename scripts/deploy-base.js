import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    console.error("\nERROR: No valid private key found in .env");
    process.exit(1);
  }
  const deployer = signers[0];
  console.log("========================================================");
  console.log("Deploying Multi-Bucket PaycheckVault on Base Sepolia (Chain ID: 84532)");
  console.log("Deployer Address:", deployer.address);
  console.log("Balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  const BASE_SEPOLIA_CALLBACK_PROXY =
    process.env.BASE_SEPOLIA_CALLBACK_PROXY || "0xa6eA49Ed671B8a4dfCDd34E36b7a75Ac79B8A5a6";

  // 1. Deploy Mocks on Base Sepolia
  console.log("\n--- Deploying Treasury Assets & MockDEX on Base Sepolia ---");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const weth = await MockERC20.deploy("Base Wrapped Ether", "WETH");
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();
  console.log("Base WETH (Input) deployed to:", wethAddress);

  const usdc = await MockERC20.deploy("Base USD Coin", "USDC");
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("Base USDC (Core Reserve) deployed to:", usdcAddress);

  const susdc = await MockERC20.deploy("Base Savings USD Coin", "sUSDC");
  await susdc.waitForDeployment();
  const susdcAddress = await susdc.getAddress();
  console.log("Base sUSDC (Yield Vault) deployed to:", susdcAddress);

  const ethUsdcRate = ethers.parseEther("2500"); // 1 WETH = 2,500 USDC / sUSDC
  const MockDEX = await ethers.getContractFactory("MockDEX");
  const dex = await MockDEX.deploy(ethUsdcRate);
  await dex.waitForDeployment();
  const dexAddress = await dex.getAddress();
  console.log("Base MockDEX deployed to:", dexAddress);

  await (await dex.setPairRate(wethAddress, usdcAddress, ethUsdcRate)).wait();
  await (await dex.setPairRate(wethAddress, susdcAddress, ethUsdcRate)).wait();
  await (await usdc.mint(dexAddress, ethers.parseUnits("5000000", 18))).wait();
  await (await susdc.mint(dexAddress, ethers.parseUnits("5000000", 18))).wait();
  console.log("Seeded MockDEX with 5,000,000 USDC and 5,000,000 sUSDC liquidity");

  // 2. Deploy Multi-Bucket PaycheckVault
  const deployerBalance = await deployer.provider.getBalance(deployer.address);
  let vaultFundValue = ethers.parseEther("0.004");
  if (deployerBalance < ethers.parseEther("0.008")) {
    vaultFundValue = ethers.parseEther("0.002");
  }

  const PaycheckVault = await ethers.getContractFactory("PaycheckVault");
  const vault = await PaycheckVault.deploy(
    BASE_SEPOLIA_CALLBACK_PROXY,
    dexAddress,
    wethAddress,
    usdcAddress,
    susdcAddress,
    5000, // 50% Core USDC Reserve
    3000, // 30% Yield sUSDC
    { value: vaultFundValue }
  );
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("Multi-Bucket PaycheckVault deployed to:", vaultAddress);

  // Set default guardrails: 5 WETH single-callback cap, 2000 USDC/WETH slippage floor
  await (
    await vault.setGuardrails(ethers.parseUnits("5", 18), ethers.parseUnits("2000", 18))
  ).wait();
  console.log("Configured Guardrails: Max 5 WETH/callback, Min 2,000 USDC/WETH floor");

  // Seed initial vault reserves (10 WETH operating + 2,500 USDC reserve + 1,500 sUSDC yield)
  await (await weth.mint(vaultAddress, ethers.parseUnits("10", 18))).wait();
  await (await usdc.mint(vaultAddress, ethers.parseUnits("2500", 18))).wait();
  await (await susdc.mint(vaultAddress, ethers.parseUnits("1500", 18))).wait();
  console.log("Seeded Vault initial buckets: 10 WETH, 2,500 USDC, 1,500 sUSDC");

  console.log("\n========================================================");
  console.log("NEXT STEPS:");
  console.log("Update .env & frontend/src/config/contracts.js:");
  console.log(`BASE_VAULT_ADDRESS=${vaultAddress}`);
  console.log(`BASE_WETH_ADDRESS=${wethAddress}`);
  console.log(`BASE_USDC_ADDRESS=${usdcAddress}`);
  console.log(`BASE_SUSDC_ADDRESS=${susdcAddress}`);
  console.log(`BASE_DEX_ADDRESS=${dexAddress}`);
  console.log("Then run: npx hardhat run scripts/deploy-reactive.js --network lasna");
  console.log("========================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
