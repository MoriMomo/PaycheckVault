import hardhat from "hardhat";
const { ethers } = hardhat;

// Official Reactive Network Sepolia Faucet Contract
const SEPOLIA_FAUCET_CONTRACT = "0x9b9BB25f1A81078C544C829c5EB7822d747Cf434";

async function main() {
  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    console.error("\n❌ ERROR: No valid private key found in .env!");
    console.error("1. Make sure you open the file '.env' (NOT .env.example).");
    console.error("2. Paste your 64-character private key from MetaMask on line 1: PRIVATE_KEY=...");
    console.error("3. Save the file with Ctrl + S.\n");
    process.exit(1);
  }
  const signer = signers[0];
  console.log("========================================================");
  console.log("Requesting lREACT from Reactive Network Lasna Faucet");
  console.log("Your Wallet:", signer.address);

  const balance = await signer.provider.getBalance(signer.address);
  console.log("Current Sepolia ETH Balance:", ethers.formatEther(balance));

  // Send 0.005 Sepolia ETH -> yields 0.5 lREACT on Lasna (rate: 1 ETH = 100 lREACT)
  const sendAmount = ethers.parseEther("0.005");
  console.log(`Sending 0.005 Sepolia ETH to Faucet (${SEPOLIA_FAUCET_CONTRACT})...`);

  const tx = await signer.sendTransaction({
    to: SEPOLIA_FAUCET_CONTRACT,
    value: sendAmount,
  });

  console.log("Transaction Hash:", tx.hash);
  console.log("Waiting for confirmation on Sepolia...");
  await tx.wait();

  console.log("\n========================================================");
  console.log("SUCCESS! Faucet transaction confirmed.");
  console.log("The Reactive Network relayer is now crediting ~0.5 lREACT");
  console.log(`to your address (${signer.address}) on Lasna!`);
  console.log("Check balance on Lasna explorer: https://lasna.reactivescan.net/address/" + signer.address);
  console.log("========================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

