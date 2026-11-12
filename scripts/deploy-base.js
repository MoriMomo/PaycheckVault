import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    console.error("\n❌ ERROR: No valid private key found in .env!");
    console.error("1. Make sure you open the file '.env' (NOT .env.example).");
    console.error("2. Paste your 64-character private key from MetaMask on line 1: PRIVATE_KEY=...");
    console.error("3. Save the file with Ctrl + S.\n");
    process.exit(1);
  }
  const deployer = signers[0];
  console.log("========================================================");
  console.log("Deploying PaycheckVault on Base Sepolia (Chain ID: 84532)");
  console.log("Deployer Address:", deployer.address);
  console.log("Balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Official Reactive Callback Proxy on Base Sepolia
  const BASE_SEPOLIA_CALLBACK_PROXY = 
    process.env.BASE_SEPOLIA_CALLBACK_PROXY || "0xa6eA49Ed671B8a4dfCDd34E36b7a75Ac79B8A5a6";

  // 1. Deploy Mocks on Base Sepolia
  console.log("\n--- Deploying Mocks on Base Sepolia ---");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("Base USD Coin", "USDC");
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("Base USDC deployed to:", usdcAddress);

  const weth = await MockERC20.deploy("Base Wrapped Ether", "WETH");
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();
  console.log("Base WETH deployed to:", wethAddress);

  const MockDEX = await ethers.getContractFactory("MockDEX");
  const dex = await MockDEX.deploy(ethers.parseEther("0.5")); // 1 USDC = 0.5 WETH
  await dex.waitForDeployment();
  const dexAddress = await dex.getAddress();
  console.log("Base MockDEX deployed to:", dexAddress);

  // Fund DEX with WETH liquidity
  const fundTx = await weth.mint(dexAddress, ethers.parseEther("1000000"));
  await fundTx.wait();
  console.log("Funded DEX with 1,000,000 WETH liquidity");

  // 2. Deploy PaycheckVault (funded with ETH reserve to cover Reactive callback proxy gas)
  console.log("\n--- Deploying PaycheckVault ---");
  const deployerBalance = await deployer.provider.getBalance(deployer.address);
  let vaultFundValue = ethers.parseEther("0.004");
  if (deployerBalance < ethers.parseEther("0.008")) {
    vaultFundValue = ethers.parseEther("0.002");
  }
  console.log(`Funding PaycheckVault with ${ethers.formatEther(vaultFundValue)} ETH for relayer proxy gas...`);

  const PaycheckVault = await ethers.getContractFactory("PaycheckVault");
  const vault = await PaycheckVault.deploy(
    BASE_SEPOLIA_CALLBACK_PROXY,
    dexAddress,
    usdcAddress,
    wethAddress,
    5000, // 50% automatic allocation
    { value: vaultFundValue }
  );
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("PaycheckVault deployed to:", vaultAddress);

  // Fund Vault with initial USDC
  const fundVaultTx = await usdc.mint(vaultAddress, ethers.parseUnits("5000", 18));
  await fundVaultTx.wait();
  console.log("Pre-funded Vault with 5,000 USDC balance");

  console.log("\n========================================================");
  console.log("NEXT STEPS:");
  console.log("Add this to your .env:");
  console.log(`BASE_VAULT_ADDRESS=${vaultAddress}`);
  console.log("Then run: npx hardhat run scripts/deploy-reactive.js --network lasna");
  console.log("========================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

