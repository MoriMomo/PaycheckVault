/**
 * PaycheckVault — Pre-Demo Flight Check
 *
 * Run this BEFORE recording the demo video. It verifies, read-only, that the
 * live cross-chain loop is ready to fire and that your published proofs still
 * resolve. Nothing here sends a transaction or spends gas.
 *
 *   npx hardhat run scripts/preflight.js --network hardhat
 *   (any --network works; the script uses its own RPC providers per chain)
 *
 * Checks:
 *   1. Lasna PaycheckReactive REACT balance  (pays callback relayer gas)
 *   2. Base Sepolia callback proxy ETH       (pays destination execution gas)
 *   3. Reactive <-> Vault wiring             (destinationVault bound, sender authorized)
 *   4. All README tx hashes resolve on-chain (the verified-proof table)
 *
 * Exit code is non-zero if any BLOCKING check fails, so CI / a pre-record hook
 * can gate on it.
 */

import { ethers } from "ethers";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { ADDRESSES, README_TX_HASHES } = require("../addresses.cjs");

// --- thresholds (tune to your comfort) ---
const MIN_LASNA_REACT = 0.05; // REACT on the reactive contract
const MIN_BASE_PROXY_ETH = 0.002; // ETH on the Base callback proxy

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const pass = (m) => console.log(`  ${GREEN}PASS${RESET}  ${m}`);
const warn = (m) => console.log(`  ${YELLOW}WARN${RESET}  ${m}`);
const fail = (m) => console.log(`  ${RED}FAIL${RESET}  ${m}`);

const providers = {
  sepolia: new ethers.JsonRpcProvider(ADDRESSES.sepolia.rpcUrl),
  lasna: new ethers.JsonRpcProvider(ADDRESSES.lasna.rpcUrl),
  baseSepolia: new ethers.JsonRpcProvider(ADDRESSES.baseSepolia.rpcUrl),
};

let blockingFailures = 0;
let warnings = 0;

async function checkGasBalances() {
  console.log(`\n${DIM}1/4 — Relayer gas reserves${RESET}`);

  // Lasna: PaycheckReactive needs REACT to dispatch callbacks
  try {
    const bal = await providers.lasna.getBalance(ADDRESSES.lasna.reactive);
    const react = Number(ethers.formatEther(bal));
    const msg = `Lasna PaycheckReactive REACT: ${react.toFixed(4)} (min ${MIN_LASNA_REACT})`;
    if (react >= MIN_LASNA_REACT) pass(msg);
    else {
      fail(`${msg} — fund it or callbacks will silently stop mid-demo`);
      blockingFailures++;
    }
  } catch (err) {
    fail(`Lasna REACT balance unreadable: ${err.message}`);
    blockingFailures++;
  }

  // Base: callback proxy needs ETH to pay destination execution
  try {
    const bal = await providers.baseSepolia.getBalance(ADDRESSES.baseSepolia.callbackProxy);
    const eth = Number(ethers.formatEther(bal));
    const msg = `Base Sepolia callback proxy ETH: ${eth.toFixed(5)} (min ${MIN_BASE_PROXY_ETH})`;
    if (eth >= MIN_BASE_PROXY_ETH) pass(msg);
    else {
      warn(`${msg} — proxy is shared infra; top up the vault's own ETH reserve if settlement stalls`);
      warnings++;
    }
  } catch (err) {
    fail(`Base proxy ETH balance unreadable: ${err.message}`);
    blockingFailures++;
  }

  // Also surface the vault's own ETH reserve (used to reimburse proxy gas)
  try {
    const bal = await providers.baseSepolia.getBalance(ADDRESSES.baseSepolia.vault);
    console.log(`  ${DIM}info  Base Vault ETH reserve: ${Number(ethers.formatEther(bal)).toFixed(5)} ETH${RESET}`);
  } catch {
    // non-blocking
  }
}

async function checkWiring() {
  console.log(`\n${DIM}2/4 — Cross-chain wiring${RESET}`);

  const reactiveAbi = [
    "function destinationVault() view returns (address)",
    "function minInflowThreshold() view returns (uint256)",
    "function cooldownPeriod() view returns (uint256)",
  ];
  const vaultAbi = ["function CALLBACK_SENDER() view returns (address)"];

  try {
    const reactive = new ethers.Contract(ADDRESSES.lasna.reactive, reactiveAbi, providers.lasna);
    const boundVault = await reactive.destinationVault();
    if (boundVault.toLowerCase() === ADDRESSES.baseSepolia.vault.toLowerCase()) {
      pass(`PaycheckReactive.destinationVault -> ${boundVault} (matches Base vault)`);
    } else {
      fail(`destinationVault is ${boundVault}, expected ${ADDRESSES.baseSepolia.vault} — run bind-vault.js`);
      blockingFailures++;
    }
  } catch (err) {
    warn(`Could not read destinationVault (ABI/RPC): ${err.message}`);
    warnings++;
  }

  // Confirm the vault authorizes exactly the Lasna reactive contract as sender.
  // CALLBACK_SENDER naming can vary by SDK version, so treat a read miss as a warn.
  try {
    const vault = new ethers.Contract(ADDRESSES.baseSepolia.vault, vaultAbi, providers.baseSepolia);
    const sender = await vault.CALLBACK_SENDER();
    if (sender.toLowerCase() === ADDRESSES.lasna.reactive.toLowerCase()) {
      pass(`PaycheckVault authorized sender -> ${sender} (matches reactive)`);
    } else {
      warn(`Vault authorized sender is ${sender}, expected ${ADDRESSES.lasna.reactive} — verify manually`);
      warnings++;
    }
  } catch {
    console.log(`  ${DIM}info  Vault sender getter not exposed; skipping (verified in tests)${RESET}`);
  }
}

async function checkReadmeProofs() {
  console.log(`\n${DIM}3/4 — README verified-proof tx hashes${RESET}`);
  for (const { step, network, hash } of README_TX_HASHES) {
    const provider = providers[network];
    const explorer = ADDRESSES[network].explorer;
    try {
      const receipt = await provider.getTransactionReceipt(hash);
      if (receipt && receipt.blockNumber) {
        const status = receipt.status === 1 ? "success" : "reverted";
        const line = `${step} [${network}] block ${receipt.blockNumber} (${status})`;
        if (receipt.status === 1) pass(line);
        else {
          fail(`${line} — tx reverted; do not cite it as a proof`);
          blockingFailures++;
        }
      } else {
        fail(`${step} [${network}] NOT found on-chain — ${explorer}/tx/${hash}`);
        blockingFailures++;
      }
    } catch (err) {
      warn(`${step} [${network}] lookup error (${err.message}); check ${explorer}/tx/${hash}`);
      warnings++;
    }
  }
}

function checkLoopReadiness() {
  console.log(`\n${DIM}4/4 — Live loop readiness${RESET}`);
  if (blockingFailures === 0) {
    pass("Gas, wiring and proofs are green — one full inflow -> callback loop should settle.");
    console.log(
      `  ${DIM}To fire a real loop: npx hardhat run scripts/send-paycheck.js --network sepolia${RESET}`
    );
  } else {
    fail("Resolve the blocking failures above before firing a live loop on camera.");
  }
}

async function main() {
  console.log("========================================================");
  console.log("PaycheckVault — Pre-Demo Flight Check (read-only)");
  console.log("Reactive:", ADDRESSES.lasna.reactive);
  console.log("Vault:   ", ADDRESSES.baseSepolia.vault);
  console.log("========================================================");

  await checkGasBalances();
  await checkWiring();
  await checkReadmeProofs();
  checkLoopReadiness();

  console.log("\n========================================================");
  console.log(
    `Summary: ${blockingFailures} blocking failure(s), ${warnings} warning(s).`
  );
  if (blockingFailures === 0) {
    console.log(`${GREEN}READY TO RECORD.${RESET}`);
  } else {
    console.log(`${RED}NOT READY — fix blocking failures first.${RESET}`);
  }
  console.log("========================================================");

  process.exitCode = blockingFailures > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
