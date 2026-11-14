import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    console.error("\nERROR: No valid private key found in .env");
    process.exit(1);
  }
  const sender = signers[0];
  console.log("========================================================");
  console.log("Triggering Live Volatile WETH Inflow on Sepolia");
  console.log("Sender / Deployer:", sender.address);

  const tokenAddress = process.env.SEPOLIA_TOKEN_ADDRESS;
  const recipient = process.env.SEPOLIA_MONITORED_RECIPIENT || sender.address;
  const amountTokens = process.env.PAYCHECK_AMOUNT || "1.0";
  const amount = ethers.parseUnits(amountTokens, 18);

  if (!tokenAddress) {
    throw new Error("Missing SEPOLIA_TOKEN_ADDRESS in .env");
  }

  console.log(`- Token Address:      ${tokenAddress}`);
  console.log(`- Recipient Address:  ${recipient}`);
  console.log(`- Inflow Amount:      ${amountTokens} WETH`);

  const token = await ethers.getContractAt("MockERC20", tokenAddress);

  console.log("\nBroadcasting transaction...");
  const tx = await token.transfer(recipient, amount);
  console.log("Transaction Hash:", tx.hash);
  console.log("Waiting for confirmation on Sepolia...");
  await tx.wait();

  console.log("\n========================================================");
  console.log("SUCCESS! Volatile WETH Transfer emitted on Sepolia.");
  console.log(`View on Sepolia Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
  console.log("--------------------------------------------------------");
  console.log("What happens next (within 5-15 seconds):");
  console.log("1. Reactive Network (Lasna) catches the Transfer event.");
  console.log("2. Lasna enforces anti-dust threshold & cooldown guardrails.");
  console.log("3. Relayer executes Callback on Base Sepolia PaycheckVault.");
  console.log("4. Vault routes into Core USDC Reserve (50%), Yield sUSDC (30%), and Operating WETH (20%).");
  console.log("========================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
