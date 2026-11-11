import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
  const [deployer] = await ethers.getSigners();
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

