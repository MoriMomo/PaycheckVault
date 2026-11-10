import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Official Reactive Callback Proxy on Sepolia (Chain ID: 11155111)
  const REACTIVE_CALLBACK_SENDER = process.env.REACTIVE_CALLBACK_SENDER || "0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA";

  // 1. Deploy Mocks
  console.log("\n--- Deploying Mocks ---");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("USD Coin", "USDC");
  await usdc.waitForDeployment();
  console.log("Mock USDC deployed to:", await usdc.getAddress());

  const weth = await MockERC20.deploy("Wrapped Ether", "WETH");
  await weth.waitForDeployment();
  console.log("Mock WETH deployed to:", await weth.getAddress());

  const MockDEX = await ethers.getContractFactory("MockDEX");
  const dex = await MockDEX.deploy(ethers.parseEther("0.5")); // 1 USDC = 0.5 WETH
  await dex.waitForDeployment();
  console.log("Mock DEX deployed to:", await dex.getAddress());

  // Fund DEX with WETH liquidity
  const fundTx = await weth.mint(await dex.getAddress(), ethers.parseEther("1000000"));
  await fundTx.wait();
  console.log("Funded DEX with 1,000,000 WETH liquidity");

  // 2. Deploy InflowVault
  console.log("\n--- Deploying InflowVault ---");
  const InflowVault = await ethers.getContractFactory("InflowVault");
  const vault = await InflowVault.deploy(
    REACTIVE_CALLBACK_SENDER,
    await dex.getAddress(),
    await usdc.getAddress(),
    await weth.getAddress(),
    5000 // 50% DCA allocation
  );
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("InflowVault deployed to:", vaultAddress);

  console.log("\n========================================================");
  console.log("NEXT STEPS FOR REACTIVE NETWORK (LASNA TESTNET):");
  console.log("Deploy InflowDCAReactive.sol on Lasna (Chain ID: 2611) with parameters:");
  console.log(`- Origin Chain ID:      ${(await ethers.provider.getNetwork()).chainId}`);
  console.log(`- Destination Chain ID: ${(await ethers.provider.getNetwork()).chainId}`);
  console.log(`- Origin Vault:         ${vaultAddress}`);
  console.log(`- Destination Vault:    ${vaultAddress}`);
  console.log("========================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

