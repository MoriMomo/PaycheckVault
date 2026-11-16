import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No valid private key found in .env");
  console.log("========================================================");
  console.log("Deploying Sepolia Mock WETH (Volatile Origin Inflow Token)");
  console.log("Deployer Address:", deployer.address);

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const weth = await MockERC20.deploy("Sepolia Wrapped Ether", "WETH");
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();
  console.log("Sepolia WETH deployed to:", wethAddress);

  const mintTx = await weth.mint(deployer.address, ethers.parseUnits("1000", 18));
  await mintTx.wait();
  console.log("Minted 1,000 WETH to deployer on Sepolia");

  console.log("\n========================================================");
  console.log("NEXT STEPS:");
  console.log("Add this to your .env:");
  console.log(`SEPOLIA_TOKEN_ADDRESS=${wethAddress}`);
  console.log("========================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
