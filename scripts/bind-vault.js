import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
  const reactiveAddress = process.env.LASNA_REACTIVE_ADDRESS;
  const baseVaultAddress = process.env.BASE_VAULT_ADDRESS;
  if (!reactiveAddress || !baseVaultAddress) {
    throw new Error("Missing LASNA_REACTIVE_ADDRESS or BASE_VAULT_ADDRESS in .env");
  }

  const reactive = await ethers.getContractAt("PaycheckReactive", reactiveAddress);
  console.log(`Binding PaycheckReactive (${reactiveAddress}) -> Base PaycheckVault (${baseVaultAddress})...`);
  const tx = await reactive.setDestinationVault(baseVaultAddress);
  console.log("Tx Hash:", tx.hash);
  await tx.wait();
  console.log("Bound successfully! Verified destinationVault():", await reactive.destinationVault());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
