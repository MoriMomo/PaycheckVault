import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    console.error("\nERROR: No valid private key found in .env");
    process.exit(1);
  }
  const deployer = signers[0];
  console.log("========================================================");
  console.log("Deploying PaycheckReactive on Lasna (Chain ID: 5318007)");
  console.log("Deployer Address:", deployer.address);

  const SEPOLIA_TOKEN_ADDRESS = process.env.SEPOLIA_TOKEN_ADDRESS;
  const SEPOLIA_MONITORED_RECIPIENT = process.env.SEPOLIA_MONITORED_RECIPIENT || deployer.address;
  const BASE_VAULT_ADDRESS = process.env.BASE_VAULT_ADDRESS;
  const MIN_THRESHOLD = process.env.MIN_INFLOW_THRESHOLD || ethers.parseUnits("0.01", 18); // 0.01 WETH (~$25)
  const COOLDOWN_SECONDS = BigInt(process.env.COOLDOWN_SECONDS || "30");

  if (!SEPOLIA_TOKEN_ADDRESS || !BASE_VAULT_ADDRESS) {
    throw new Error("Missing SEPOLIA_TOKEN_ADDRESS or BASE_VAULT_ADDRESS in .env");
  }

  console.log(`- Monitored Token on Sepolia:     ${SEPOLIA_TOKEN_ADDRESS}`);
  console.log(`- Monitored Recipient on Sepolia: ${SEPOLIA_MONITORED_RECIPIENT}`);
  console.log(`- Target Vault on Base Sepolia:   ${BASE_VAULT_ADDRESS}`);
  console.log(`- Min Inflow Threshold:           ${MIN_THRESHOLD.toString()}`);
  console.log(`- Cooldown Guardrail (sec):       ${COOLDOWN_SECONDS.toString()}`);

  const PaycheckReactive = await ethers.getContractFactory("PaycheckReactive");
  const reactiveContract = await PaycheckReactive.deploy(
    SEPOLIA_TOKEN_ADDRESS,
    SEPOLIA_MONITORED_RECIPIENT,
    BASE_VAULT_ADDRESS,
    MIN_THRESHOLD,
    COOLDOWN_SECONDS,
    { value: ethers.parseEther("0.1") }
  );

  await reactiveContract.waitForDeployment();
  const reactiveAddress = await reactiveContract.getAddress();
  console.log("\n========================================================");
  console.log("PaycheckReactive deployed to Lasna at:", reactiveAddress);
  console.log("Cross-chain reactive subscription + guardrails are live!");
  console.log("========================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
