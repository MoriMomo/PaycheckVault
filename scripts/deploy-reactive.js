import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Reactive contract on Lasna with account:", deployer.address);

  const ORIGIN_CHAIN_ID = process.env.ORIGIN_CHAIN_ID || 11155111; // Sepolia
  const DESTINATION_CHAIN_ID = process.env.DESTINATION_CHAIN_ID || 11155111; // Sepolia or Base Sepolia
  const ORIGIN_TOKEN = process.env.ORIGIN_TOKEN_ADDRESS;
  const ORIGIN_VAULT = process.env.ORIGIN_VAULT_ADDRESS;
  const DESTINATION_VAULT = process.env.DESTINATION_VAULT_ADDRESS || ORIGIN_VAULT;
  const MIN_THRESHOLD = process.env.MIN_INFLOW_THRESHOLD || ethers.parseUnits("10", 18); // Default 10 tokens

  if (!ORIGIN_VAULT || !ORIGIN_TOKEN) {
    throw new Error("Missing ORIGIN_VAULT_ADDRESS or ORIGIN_TOKEN_ADDRESS in environment variables");
  }

  console.log(`- Subscribing to ERC20: ${ORIGIN_TOKEN}`);
  console.log(`- Monitored Vault:      ${ORIGIN_VAULT} on Chain ${ORIGIN_CHAIN_ID}`);
  console.log(`- Target Vault:         ${DESTINATION_VAULT} on Chain ${DESTINATION_CHAIN_ID}`);
  console.log(`- Min Inflow Threshold: ${MIN_THRESHOLD.toString()}`);

  const InflowDCAReactive = await ethers.getContractFactory("InflowDCAReactive");
  // Funding with 0.1 lREACT for subscription and relayer callbacks
  const reactiveContract = await InflowDCAReactive.deploy(
    ORIGIN_CHAIN_ID,
    DESTINATION_CHAIN_ID,
    ORIGIN_TOKEN,
    ORIGIN_VAULT,
    DESTINATION_VAULT,
    MIN_THRESHOLD,
    { value: ethers.parseEther("0.1") }
  );

  await reactiveContract.waitForDeployment();
  const reactiveAddress = await reactiveContract.getAddress();
  console.log("\n========================================================");
  console.log("InflowDCAReactive successfully deployed to Lasna at:", reactiveAddress);
  console.log("Both InflowVault and InflowDCAReactive share the same deployer wallet address (rvm_id).");
  console.log("No extra authorization transaction needed — the reactive loop is live!");
  console.log("========================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
