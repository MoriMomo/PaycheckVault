import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Reactive contract on Lasna with account:", deployer.address);

  const ORIGIN_CHAIN_ID = process.env.ORIGIN_CHAIN_ID || 11155111; // Sepolia
  const DESTINATION_CHAIN_ID = process.env.DESTINATION_CHAIN_ID || 11155111; // Sepolia or Base Sepolia
  const ORIGIN_VAULT = process.env.ORIGIN_VAULT_ADDRESS;
  const DESTINATION_VAULT = process.env.DESTINATION_VAULT_ADDRESS || ORIGIN_VAULT;

  if (!ORIGIN_VAULT) {
    throw new Error("Missing ORIGIN_VAULT_ADDRESS in environment variables");
  }

  console.log(`Subscribing to Vault: ${ORIGIN_VAULT} on Chain ${ORIGIN_CHAIN_ID}`);
  console.log(`Targeting Callback:   ${DESTINATION_VAULT} on Chain ${DESTINATION_CHAIN_ID}`);

  const InflowDCAReactive = await ethers.getContractFactory("InflowDCAReactive");
  // Funding with 0.1 REACT for subscription and callback gas
  const reactiveContract = await InflowDCAReactive.deploy(
    ORIGIN_CHAIN_ID,
    DESTINATION_CHAIN_ID,
    ORIGIN_VAULT,
    DESTINATION_VAULT,
    { value: ethers.parseEther("0.1") }
  );

  await reactiveContract.waitForDeployment();
  console.log("InflowDCAReactive deployed to Lasna at:", await reactiveContract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
