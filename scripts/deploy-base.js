import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No valid private key found in .env");
  console.log("========================================================");
  console.log("Deploying Multi-Bucket PaycheckVault on Base Sepolia (Omni, Chain ID: 84532)");
  console.log("Deployer Address:", deployer.address);
  const deployerBalance = await deployer.provider.getBalance(deployer.address);
  console.log("Balance:", deployerBalance.toString());

  const BASE_SEPOLIA_CALLBACK_PROXY =
    process.env.BASE_SEPOLIA_CALLBACK_PROXY || "0x476F44b11F5C942c58f4c8E3d0300E5710743585";
  const LASNA_REACTIVE_ADDRESS = process.env.LASNA_REACTIVE_ADDRESS;
  if (!LASNA_REACTIVE_ADDRESS) {
    throw new Error("Missing LASNA_REACTIVE_ADDRESS in .env — deploy PaycheckReactive on Lasna first.");
  }

  let wethAddress = process.env.BASE_WETH_ADDRESS;
  let usdcAddress = process.env.BASE_USDC_ADDRESS;
  let susdcAddress = process.env.BASE_SUSDC_ADDRESS;
  let dexAddress = process.env.BASE_DEX_ADDRESS;

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  if (!wethAddress || !usdcAddress || !susdcAddress || !dexAddress) {
    console.log("\n--- Deploying Treasury Assets & MockDEX on Base Sepolia ---");
    const weth = await MockERC20.deploy("Base Wrapped Ether", "WETH");
    await weth.waitForDeployment();
    wethAddress = await weth.getAddress();
    console.log("Base WETH (Input) deployed to:", wethAddress);

    const usdc = await MockERC20.deploy("Base USD Coin", "USDC");
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log("Base USDC (Core Reserve) deployed to:", usdcAddress);

    const susdc = await MockERC20.deploy("Base Savings USD Coin", "sUSDC");
    await susdc.waitForDeployment();
    susdcAddress = await susdc.getAddress();
    console.log("Base sUSDC (Yield Vault) deployed to:", susdcAddress);

    const ethUsdcRate = ethers.parseEther("2500");
    const MockDEX = await ethers.getContractFactory("MockDEX");
    const dex = await MockDEX.deploy(ethUsdcRate);
    await dex.waitForDeployment();
    dexAddress = await dex.getAddress();
    console.log("Base MockDEX deployed to:", dexAddress);

    await (await dex.setPairRate(wethAddress, usdcAddress, ethUsdcRate)).wait();
    await (await dex.setPairRate(wethAddress, susdcAddress, ethUsdcRate)).wait();
    await (await usdc.mint(dexAddress, ethers.parseUnits("5000000", 18))).wait();
    await (await susdc.mint(dexAddress, ethers.parseUnits("5000000", 18))).wait();
    console.log("Seeded MockDEX with 5,000,000 USDC and 5,000,000 sUSDC liquidity");
  } else {
    console.log("Reusing existing Base Sepolia WETH/USDC/sUSDC/MockDEX:", {
      wethAddress,
      usdcAddress,
      susdcAddress,
      dexAddress,
    });
  }

  let vaultFundValue = ethers.parseEther("0.004");
  if (deployerBalance < ethers.parseEther("0.008")) {
    vaultFundValue = ethers.parseEther("0.0005");
  }

  console.log(`\nDeploying PaycheckVault bound to CallbackProxy=${BASE_SEPOLIA_CALLBACK_PROXY} and ReactiveSender=${LASNA_REACTIVE_ADDRESS}`);
  const PaycheckVault = await ethers.getContractFactory("PaycheckVault");
  const vault = await PaycheckVault.deploy(
    BASE_SEPOLIA_CALLBACK_PROXY,
    LASNA_REACTIVE_ADDRESS,
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
  console.log("Multi-User PaycheckVault deployed to:", vaultAddress);

  await (
    await vault.setDefaultGuardrails(ethers.parseUnits("5", 18), ethers.parseUnits("2000", 18))
  ).wait();
  console.log("Configured Default Guardrails: Max 5 WETH/callback, Min 2,000 USDC/WETH floor");

  const wethToken = await ethers.getContractAt("MockERC20", wethAddress);
  await (await wethToken.mint(deployer.address, ethers.parseUnits("10", 18))).wait();
  await (await wethToken.approve(vaultAddress, ethers.parseUnits("10", 18))).wait();
  await (await vault.deposit(ethers.parseUnits("10", 18))).wait();
  console.log("Deposited 10 WETH into deployer vault slice:", deployer.address);

  console.log("\n========================================================");
  console.log("NEXT STEPS:");
  console.log(`BASE_VAULT_ADDRESS=${vaultAddress}`);
  console.log("Now run: npx hardhat run scripts/bind-vault.js --network lasna");
  console.log("========================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
