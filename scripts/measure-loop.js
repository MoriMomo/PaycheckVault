/**
 * PaycheckVault — Cross-Chain Loop Telemetry Harness
 *
 * Fires N real paychecks end-to-end and measures the full reactive loop:
 *   Sepolia WETH.transfer(self)  ->  Lasna react() PaycheckTriggered  ->  Base MultiBucketAllocated
 *
 * For each loop it records all three tx hashes, the three block timestamps,
 * end-to-end latency, and the on-chain gas cost (Sepolia ETH + Base ETH), then
 * prints a markdown table ready to paste at the top of README.md.
 *
 *   npx hardhat run scripts/measure-loop.js --network sepolia
 *
 * NOTE — spends real testnet gas. Requires a funded deployer in .env and the
 * reactive loop to be live (run scripts/preflight.js first; it must say READY).
 *
 * Latency is derived from block.timestamp (seconds), NOT block counts — Base
 * Sepolia mines ~200ms blocks, so block-delta timing is meaningless there
 * (per the buildathon's Base Sepolia timing rule).
 *
 * Tunables via env:
 *   LOOP_COUNT       number of loops (default 5)
 *   PAYCHECK_AMOUNT  WETH per loop (default 0.5; must exceed the 0.01 dust floor)
 *   LOOP_TIMEOUT_MS  max wait for Base settlement per loop (default 120000)
 */

import hardhat from "hardhat";
import { createRequire } from "module";
const { ethers } = hardhat;
const require = createRequire(import.meta.url);
const { ADDRESSES } = require("../addresses.cjs");

const LOOP_COUNT = Number(process.env.LOOP_COUNT || 5);
const PAYCHECK_AMOUNT = process.env.PAYCHECK_AMOUNT || "0.5";
const LOOP_TIMEOUT_MS = Number(process.env.LOOP_TIMEOUT_MS || 120000);
const COOLDOWN_BUFFER_MS = 32000; // reactive contract enforces 30s/recipient

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
];
const REACTIVE_ABI = [
  "event PaycheckTriggered(address indexed recipient, uint256 indexed amount, address indexed destinationVault, uint256 timestamp)",
  "event InflowSuppressed(address indexed recipient, uint256 indexed amount, string reason, uint256 timestamp)",
];
const VAULT_ABI = [
  "event MultiBucketAllocated(address indexed recipient, address indexed caller, uint256 totalProcessed, uint256 stableOut, uint256 yieldOut, uint256 retainedIn, uint256 timestamp)",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const short = (h) => `${h.slice(0, 8)}…${h.slice(-6)}`;

async function blockTs(provider, blockNumber) {
  const b = await provider.getBlock(blockNumber);
  return b ? Number(b.timestamp) : null;
}

/**
 * Poll a contract for the next matching event emitted at/after `fromBlock`.
 * Returns { log, tsFromBlock } or null on timeout.
 */
async function waitForEvent(contract, provider, filter, fromBlock, deadline) {
  while (Date.now() < deadline) {
    const latest = await provider.getBlockNumber().catch(() => null);
    if (latest !== null && latest >= fromBlock) {
      // Base public RPC caps getLogs ranges; keep the window small.
      const span = Math.min(latest - fromBlock, 180);
      const logs = await contract
        .queryFilter(filter, Math.max(fromBlock, latest - span), latest)
        .catch(() => []);
      if (logs.length > 0) {
        const log = logs[logs.length - 1];
        return { log, blockTimestamp: await blockTs(provider, log.blockNumber) };
      }
    }
    await sleep(2500);
  }
  return null;
}

async function main() {
  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error("No PRIVATE_KEY in .env — fund a deployer wallet first.");
  }
  const sepoliaSigner = signers[0];
  const me = sepoliaSigner.address;

  const sepoliaProvider = sepoliaSigner.provider;
  const lasnaProvider = new ethers.JsonRpcProvider(ADDRESSES.lasna.rpcUrl);
  const baseProvider = new ethers.JsonRpcProvider(ADDRESSES.baseSepolia.rpcUrl);

  const originToken = new ethers.Contract(ADDRESSES.sepolia.token, ERC20_ABI, sepoliaSigner);
  const reactive = new ethers.Contract(ADDRESSES.lasna.reactive, REACTIVE_ABI, lasnaProvider);
  const vault = new ethers.Contract(ADDRESSES.baseSepolia.vault, VAULT_ABI, baseProvider);

  console.log("========================================================");
  console.log("PaycheckVault — Cross-Chain Loop Telemetry");
  console.log(`Wallet:   ${me}`);
  console.log(`Loops:    ${LOOP_COUNT} x ${PAYCHECK_AMOUNT} WETH`);
  console.log(`Vault:    ${ADDRESSES.baseSepolia.vault}`);
  console.log("========================================================");

  const bal = await originToken.balanceOf(me);
  const need = ethers.parseUnits(PAYCHECK_AMOUNT, 18) * BigInt(LOOP_COUNT);
  if (bal < need) {
    throw new Error(
      `Insufficient origin WETH: have ${ethers.formatEther(bal)}, need ${ethers.formatEther(need)}. Mint more on Sepolia first.`
    );
  }

  const results = [];

  for (let i = 1; i <= LOOP_COUNT; i++) {
    console.log(`\n--- Loop ${i}/${LOOP_COUNT} ---`);
    const amount = ethers.parseUnits(PAYCHECK_AMOUNT, 18);

    const lasnaFrom = await lasnaProvider.getBlockNumber().catch(() => 0);
    const baseFrom = await baseProvider.getBlockNumber().catch(() => 0);

    // 1. Origin inflow on Sepolia
    const tx = await originToken.transfer(me, amount);
    console.log(`  origin tx:   ${short(tx.hash)}  (waiting…)`);
    const originReceipt = await tx.wait();
    const originTs = await blockTs(sepoliaProvider, originReceipt.blockNumber);
    const originGasEth = Number(
      ethers.formatEther(originReceipt.gasUsed * originReceipt.gasPrice)
    );

    const deadline = Date.now() + LOOP_TIMEOUT_MS;

    // 2. Lasna react() — PaycheckTriggered (or InflowSuppressed)
    const triggered = await waitForEvent(
      reactive,
      lasnaProvider,
      reactive.filters.PaycheckTriggered(me),
      lasnaFrom,
      deadline
    );
    if (!triggered) {
      // Check whether it was suppressed (dust/cooldown) vs just slow
      const supp = await reactive
        .queryFilter(reactive.filters.InflowSuppressed(me), lasnaFrom, await lasnaProvider.getBlockNumber())
        .catch(() => []);
      const reason = supp.length ? supp[supp.length - 1].args.reason : "timeout";
      console.log(`  ${"\x1b[33m"}lasna:       no PaycheckTriggered (${reason})\x1b[0m`);
      results.push({ i, status: `skipped (${reason})`, originTx: tx.hash });
      if (i < LOOP_COUNT) await sleep(COOLDOWN_BUFFER_MS);
      continue;
    }
    const lasnaTx = triggered.log.transactionHash;
    console.log(`  lasna tx:    ${short(lasnaTx)}  @ts ${triggered.blockTimestamp}`);

    // 3. Base callback — MultiBucketAllocated
    const settled = await waitForEvent(
      vault,
      baseProvider,
      vault.filters.MultiBucketAllocated(me),
      baseFrom,
      deadline
    );
    if (!settled) {
      console.log(`  ${"\x1b[33m"}base:        no settlement within ${LOOP_TIMEOUT_MS / 1000}s\x1b[0m`);
      results.push({ i, status: "no settlement", originTx: tx.hash, lasnaTx });
      if (i < LOOP_COUNT) await sleep(COOLDOWN_BUFFER_MS);
      continue;
    }
    const baseTx = settled.log.transactionHash;
    const baseReceipt = await baseProvider.getTransactionReceipt(baseTx);
    const baseGasEth =
      baseReceipt && baseReceipt.gasUsed && baseReceipt.gasPrice
        ? Number(ethers.formatEther(baseReceipt.gasUsed * baseReceipt.gasPrice))
        : null;

    const latencyS = settled.blockTimestamp - originTs; // seconds, timestamp-based
    console.log(`  base tx:     ${short(baseTx)}  @ts ${settled.blockTimestamp}`);
    console.log(`  \x1b[32mlatency:     ${latencyS}s  (origin->callback, timestamp-based)\x1b[0m`);

    results.push({
      i,
      status: "ok",
      originTx: tx.hash,
      lasnaTx,
      baseTx,
      originTs,
      lasnaTs: triggered.blockTimestamp,
      baseTs: settled.blockTimestamp,
      latencyS,
      originGasEth,
      baseGasEth,
    });

    if (i < LOOP_COUNT) {
      console.log(`  cooldown ${COOLDOWN_BUFFER_MS / 1000}s before next loop…`);
      await sleep(COOLDOWN_BUFFER_MS);
    }
  }

  // --- Summary + markdown table ---
  const ok = results.filter((r) => r.status === "ok");
  const latencies = ok.map((r) => r.latencyS).sort((a, b) => a - b);
  const median = latencies.length
    ? latencies[Math.floor((latencies.length - 1) / 2)]
    : null;
  const avgOriginGas = ok.length
    ? ok.reduce((s, r) => s + r.originGasEth, 0) / ok.length
    : null;
  const avgBaseGas = ok.filter((r) => r.baseGasEth != null).length
    ? ok.reduce((s, r) => s + (r.baseGasEth || 0), 0) /
      ok.filter((r) => r.baseGasEth != null).length
    : null;

  const sx = ADDRESSES.sepolia.explorer;
  const lx = ADDRESSES.lasna.explorer;
  const bx = ADDRESSES.baseSepolia.explorer;

  console.log("\n\n========================================================");
  console.log("MARKDOWN — paste at the top of README.md");
  console.log("========================================================\n");

  console.log(`## Measured Cross-Chain Loop Telemetry (${ok.length}/${LOOP_COUNT} live loops)\n`);
  console.log(
    `End-to-end latency is measured from \`block.timestamp\` (Sepolia inflow block -> Base settlement block), not block counts, per the Base Sepolia ~200ms timing rule.\n`
  );
  if (median != null) {
    console.log(
      `**Median end-to-end latency: ${median}s** · min ${latencies[0]}s · max ${latencies[latencies.length - 1]}s` +
        (avgOriginGas != null ? ` · avg Sepolia gas ${avgOriginGas.toFixed(6)} ETH` : "") +
        (avgBaseGas != null ? ` · avg Base callback gas ${avgBaseGas.toFixed(6)} ETH` : "") +
        "\n"
    );
  }
  console.log(`| # | Origin Inflow (Sepolia) | Reactive (Lasna) | Callback (Base Sepolia) | Latency |`);
  console.log(`| :-- | :-- | :-- | :-- | :-- |`);
  for (const r of results) {
    if (r.status === "ok") {
      console.log(
        `| ${r.i} | [\`${short(r.originTx)}\`](${sx}/tx/${r.originTx}) | [\`${short(r.lasnaTx)}\`](${lx}/tx/${r.lasnaTx}) | [\`${short(r.baseTx)}\`](${bx}/tx/${r.baseTx}) | ${r.latencyS}s |`
      );
    } else {
      console.log(`| ${r.i} | ${r.originTx ? short(r.originTx) : "-"} | ${r.status} | - | - |`);
    }
  }

  console.log("\n========================================================");
  console.log(`Done: ${ok.length}/${LOOP_COUNT} loops settled.` + (median != null ? ` Median ${median}s.` : ""));
  console.log("========================================================");

  process.exitCode = ok.length > 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
