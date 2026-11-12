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
  console.log("Deploying PaycheckReactive on Lasna (Chain ID: 5318007)");
  console.log("Deployer Address:", deployer.address);

  const SEPOLIA_TOKEN_ADDRESS = process.env.SEPOLIA_TOKEN_ADDRESS;
  const SEPOLIA_MONITORED_RECIPIENT = process.env.SEPOLIA_MONITORED_RECIPIENT || deployer.address;
  const BASE_VAULT_ADDRESS = process.env.BASE_VAULT_ADDRESS;
  const MIN_THRESHOLD = process.env.MIN_INFLOW_THRESHOLD || ethers.parseUnits("10", 18); // 10 tokens

  if (!SEPOLIA_TOKEN_ADDRESS || !BASE_VAULT_ADDRESS) {
    throw new Error("Missing SEPOLIA_TOKEN_ADDRESS or BASE_VAULT_ADDRESS in .env");
  }

  console.log(`- Monitored Token on Sepolia:     ${SEPOLIA_TOKEN_ADDRESS}`);
  console.log(`- Monitored Recipient on Sepolia: ${SEPOLIA_MONITORED_RECIPIENT}`);
  console.log(`- Target Vault on Base Sepolia:   ${BASE_VAULT_ADDRESS}`);
  console.log(`- Min Inflow Threshold:           ${MIN_THRESHOLD.toString()}`);

  const PaycheckReactive = await ethers.getContractFactory("PaycheckReactive");
  // Funding with 0.1 lREACT for subscription and relayer callbacks
  const reactiveContract = await PaycheckReactive.deploy(
    SEPOLIA_TOKEN_ADDRESS,
    SEPOLIA_MONITORED_RECIPIENT,
    BASE_VAULT_ADDRESS,
    MIN_THRESHOLD,
    { value: ethers.parseEther("0.1") }
  );

  await reactiveContract.waitForDeployment();
  const reactiveAddress = await reactiveContract.getAddress();
  console.log("\n========================================================");
  console.log("PaycheckReactive deployed to Lasna at:", reactiveAddress);
  console.log("Cross-chain reactive subscription is live!");
  console.log("========================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
