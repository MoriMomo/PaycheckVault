import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
  const deployment = (await import("../frontend/src/config/deployment.json", { with: { type: "json" } })).default;
  const reactiveAddress = process.env.LASNA_REACTIVE_ADDRESS || deployment.lasna.reactive;
  const baseVaultAddress = process.env.BASE_VAULT_ADDRESS || deployment.baseSepolia.vault;
  const baseWethAddress = process.env.BASE_WETH_ADDRESS || deployment.baseSepolia.weth;
  const baseDexAddress = process.env.BASE_DEX_ADDRESS || deployment.baseSepolia.dex;
  if (!reactiveAddress || !baseVaultAddress) {
    throw new Error("Missing LASNA_REACTIVE_ADDRESS or BASE_VAULT_ADDRESS");
  }

  const reactive = await ethers.getContractAt("PaycheckReactive", reactiveAddress);
  console.log(`Binding PaycheckReactive (${reactiveAddress}) -> Base PaycheckVault (${baseVaultAddress})...`);
  const tx = await reactive.setDestinationVault(baseVaultAddress);
  console.log("Bind Tx Hash:", tx.hash);
  await tx.wait();
  console.log("Bound successfully! Verified destinationVault():", await reactive.destinationVault());

  if (baseWethAddress) {
    const autoTx = await reactive.enableBaseAutoSplit(baseWethAddress, baseDexAddress || ethers.ZeroAddress);
    console.log("Base Auto-Split Tx Hash:", autoTx.hash);
    await autoTx.wait();
    console.log("Base Auto-Split enabled for:", await reactive.baseOriginToken());
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
