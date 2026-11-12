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
  console.log("Deploying Sepolia Mock USDC (Origin Inflow Token)");
  console.log("Deployer Address:", deployer.address);

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("Sepolia USD Coin", "USDC");
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("Sepolia USDC deployed to:", usdcAddress);

  console.log("\n========================================================");
  console.log("NEXT STEPS:");
  console.log("Add this to your .env:");
  console.log(`SEPOLIA_TOKEN_ADDRESS=${usdcAddress}`);
  console.log("========================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

