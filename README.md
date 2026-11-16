# PaycheckVault v3 — Signal-Driven Cross-Chain Treasury Vault

**Set It and Forget It · Powered by Reactive Network Omni (`5318007`)**

PaycheckVault turns incoming **Ethereum Sepolia WETH transfers** into autonomous treasury triggers on **Base Sepolia**: `PaycheckReactive` filters dust (`< 0.01 WETH`) and enforces a 30-second per-user cooldown on **Reactive Lasna Omni**, then dispatches a callback to **PaycheckVault** on Base Sepolia to split each user's pre-funded Base WETH vault slice across **USDC** reserve, **sUSDC** yield, and retained operating **WETH** — with isolated per-user balances, split rules, deposit, and withdrawal controls.

### It allocates a DeFi portfolio on arrival — it does not just bookkeep
When the Lasna callback lands, `PaycheckVault` executes **real on-chain financial actions atomically**, not internal sub-ledger partitioning:
- **Liquid USDC reserve** — a configurable `stableBps` slice is swapped to USDC via the on-chain DEX router and held for spending/taxes.
- **Yield sUSDC** — a `yieldBps` slice is routed into yield-bearing stablecoin shares.
- **Auto-invest WETH** — the remainder (`10000 - stableBps - yieldBps`) is retained as the accumulating WETH position.

Each slice is a token movement through a DEX swap with a per-user slippage floor and max-allocation cap — a ledger that only moves numbers between sub-balances cannot claim this.

## Measured Cross-Chain Loop Telemetry (5/5 live loops)

End-to-end latency is measured from `block.timestamp` (Sepolia inflow block → Base settlement block), **not** block counts — Base Sepolia mines ~200ms blocks, so block-delta timing is meaningless (per the buildathon's Base Sepolia timing rule).

**Median end-to-end latency: 3s** · min 2s · max 4s · avg Sepolia inflow gas `0.000025 ETH` · avg Base callback gas `0.000005 ETH`. Reproduce with `npx hardhat run scripts/measure-loop.js --network sepolia`.

| # | Origin Inflow (Sepolia) | Reactive (Lasna) | Callback (Base Sepolia) | Latency |
| :-- | :-- | :-- | :-- | :-- |
| 1 | [`0xa73cc6…f61e03`](https://sepolia.etherscan.io/tx/0xa73cc6b0d7b49de5c70363dc6c4a9ab9f62037b2d4f456e190479ef768f61e03) | [`0x07396e…7eec7a`](https://lasna.reactscan.net/tx/0x07396e8f3a4448618d5164a6ddb32d2f176f463ac520dcd60390ebec547eec7a) | [`0x7fd39c…eaa886`](https://sepolia.basescan.org/tx/0x7fd39cb2c3281e718a2864ba5881abefe428e2db19944c0f6a658f3fe1eaa886) | 2s |
| 2 | [`0x5ead0e…460a56`](https://sepolia.etherscan.io/tx/0x5ead0ea128c5c5a7263dc882ba432394a94b1f22f7af7af4ed38d117f6460a56) | [`0x345c4f…763b37`](https://lasna.reactscan.net/tx/0x345c4fde1b44f3684d680cd3f6d63e77564953025ecadad1930fe6ec59763b37) | [`0xe7f838…d54e4f`](https://sepolia.basescan.org/tx/0xe7f838a0d6f80281a38fd4ba5018071233fc8ae3624672eaaa2ea2dd91d54e4f) | 2s |
| 3 | [`0x7d0dbf…332bc5`](https://sepolia.etherscan.io/tx/0x7d0dbfc2ad774e2abe0609c3437fa8e50a7a62047c6fdf2be9f4b23d6a332bc5) | [`0xa5efe6…c5ee01`](https://lasna.reactscan.net/tx/0xa5efe63085bb10cffcfa3c9088b05129190720e57ebd651ea1c243ee20c5ee01) | [`0x91a5c0…d4f1d2`](https://sepolia.basescan.org/tx/0x91a5c0ed5423e16004ccb5277fd574be71cac3854c23b9404660508939d4f1d2) | 3s |
| 4 | [`0x35380e…8d65a3`](https://sepolia.etherscan.io/tx/0x35380eb78b2a5b004c1954bcc4a275a8b615871b6ed8ea07e85b81773b8d65a3) | [`0x1a3afa…9b4187`](https://lasna.reactscan.net/tx/0x1a3afad642801653e5b485c04f1c2d01c932270c699b6085596d9832989b4187) | [`0x9e9bb3…e91be2`](https://sepolia.basescan.org/tx/0x9e9bb3c07662de156dca83f45da5da85b17ade8464d31ab85623757bfbe91be2) | 4s |
| 5 | [`0xb2a249…3e7afd`](https://sepolia.etherscan.io/tx/0xb2a2490ed081e2e18e6dd737695d7314bc54844a69e0fc448fc7c5334c3e7afd) | [`0x8d5de4…9c8521`](https://lasna.reactscan.net/tx/0x8d5de42ebf64958a5856fca0f951aa897e1a23d07e1e4dfcb362e198db9c8521) | [`0x4b5824…df2e53`](https://sepolia.basescan.org/tx/0x4b582459570dc18eb87290258546b905be47fbd7749253f9d0f7b80768df2e53) | 3s |

### Why Reactive? (Zero Keepers, Zero Backend)
- **ERC-20 `Transfer` cannot self-trigger a vault.** A `Transfer(from, to, amount)` call only mutates balances inside the **token** contract — it never invokes code on the recipient. Without `PaycheckReactive` on Lasna subscribing to Sepolia `Transfer` logs (topic0 = `keccak256("Transfer(address,address,uint256)")`, topic2 = recipient), `PaycheckVault` has no way to know an employer or client sent WETH. The reactive contract is load-bearing, not bolted on.
- **Cross-chain observation, not same-chain polling.** The inflow is observed on **Ethereum Sepolia** and execution fires on **Base Sepolia**. A same-chain vault could use a hook or keeper; a vault on Base physically cannot see an event on Sepolia without an external watcher — which is exactly what Reactive Omni provides.
- **No Gelato, no Chainlink Automation, no off-chain server:** the subscription lives natively inside `PaycheckReactive` (`SYSTEM.subscribe` + `onlySystem`).
- **Distinct from the other paycheck entries:** builds that "split a deposit" move numbers between internal sub-ledgers. PaycheckVault performs DEX swaps into USDC/sUSDC/WETH with per-user slippage and cap guardrails — on-chain financial actions, not bookkeeping.

### Production Roadmap (Next Steps)
- **Self-Refueling Gas Loop:** Auto-route a small bps slice of settled inflows/yield into Lasna `REACT` and Base callback `ETH` so contracts never run dry.
- **Cross-Chain Bridge / Intent Settlement:** Pair origin inflows with CCTP or Across intent execution so L1 value bridges alongside the Reactive signal.
- **Cooldown Accumulation Queue:** Queue rapid inflows arriving inside the 30-second cooldown window instead of suppressing them via `InflowSuppressed`.

---

## Architecture (`Sepolia -> Lasna Omni -> Base Sepolia`)

```text
+-------------------------------------------------------------------+
| 1. ORIGIN: Ethereum Sepolia (Chain ID: 11155111)                  |
|    WETH Transfer(from, recipient, amount)                         |
|    -> Wildcard topic2 subscription watches any recipient wallet   |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
| 2. REACTIVE LAYER: Reactive Lasna Omni (Chain ID: 5318007)        |
|    PaycheckReactive (SYSTEM: 0x8888...8888, onlySystem)           |
|    - Anti-Dust Filter: ignores inflows < minInflowThreshold       |
|      (0.01 WETH) via InflowSuppressed                             |
|    - Per-User Cooldown: enforces lastTriggeredAt[recipient]       |
|    - Dispatches: SYSTEM.requestCallbackV_1_0(84532, vault, ...)   |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
| 3. DESTINATION: Base Sepolia (Chain ID: 84532)                    |
|    PaycheckVault (Omni Proxy: 0x476F...3585, onlyServiceProvider) |
|    - Isolated Per-User Storage: balances[user] & policies[user]   |
|    - Permissionless User Controls: setMyBuckets, setMyGuardrails, |
|      deposit, withdraw                                            |
|    - Multi-Bucket Callback Split (e.g. 50% USDC / 30% sUSDC /     |
|      20% WETH kept) + cap & slippage circuit breakers             |
+-------------------------------------------------------------------+
```

---

## Live Deployed Contracts (Testnet v3 Multi-User Omni)

| Chain | Contract / Role | Address | Explorer |
| :--- | :--- | :--- | :--- |
| **Ethereum Sepolia (`11155111`)** | Origin `WETH` (`MockERC20` w/ public `mint`) | `0xC56bffDC6d87222128e60D617221AeC584e9F643` | [Sepolia Etherscan](https://sepolia.etherscan.io/address/0xC56bffDC6d87222128e60D617221AeC584e9F643) |
| **Reactive Lasna (`5318007`)** | `PaycheckReactive` (Wildcard Omni v3) | `0x68FE8Ff67a3bF8bC3AdC78b4282bf79E6cbD0142` | [ReactScan Lasna](https://lasna.reactscan.net/address/0x68FE8Ff67a3bF8bC3AdC78b4282bf79E6cbD0142) |
| **Reactive Lasna (`5318007`)** | Omni `SYSTEM` Contract | `0x8888888888888888888888888888888888888888` | [ReactScan Lasna](https://lasna.reactscan.net/address/0x8888888888888888888888888888888888888888) |
| **Base Sepolia (`84532`)** | `PaycheckVault` (Multi-User Omni v3) | `0x59EaBF6a64d01C4fD544aDcdEe6AB1C3ADe629e0` | [BaseScan](https://sepolia.basescan.org/address/0x59EaBF6a64d01C4fD544aDcdEe6AB1C3ADe629e0) |
| **Base Sepolia (`84532`)** | Omni Callback Proxy | `0x476F44b11F5C942c58f4c8E3d0300E5710743585` | [BaseScan](https://sepolia.basescan.org/address/0x476F44b11F5C942c58f4c8E3d0300E5710743585) |
| **Base Sepolia (`84532`)** | `WETH` (Operating Buffer / Faucet) | `0xbBAD7e94D7E3950da3F365Cc9E715f834A59C35f` | [BaseScan](https://sepolia.basescan.org/address/0xbBAD7e94D7E3950da3F365Cc9E715f834A59C35f) |
| **Base Sepolia (`84532`)** | `USDC` (Core Reserve) | `0x30A2A3AcD2E5118F50E34A0Ee2e464C5EF8614B0` | [BaseScan](https://sepolia.basescan.org/address/0x30A2A3AcD2E5118F50E34A0Ee2e464C5EF8614B0) |
| **Base Sepolia (`84532`)** | `sUSDC` (Yield Vault) | `0x58aB359b4aA491C45dd013B580aE0be50Bf4fE14` | [BaseScan](https://sepolia.basescan.org/address/0x58aB359b4aA491C45dd013B580aE0be50Bf4fE14) |
| **Base Sepolia (`84532`)** | `MockDEX` | `0xE4BF9404aA3A6aE552EaD8F91CCC8b68269c4841` | [BaseScan](https://sepolia.basescan.org/address/0xE4BF9404aA3A6aE552EaD8F91CCC8b68269c4841) |

---

## Annotated Single-Loop Proof (`1.0 WETH` Paycheck — bucket-level detail)

The telemetry table above measures latency across 5 loops; this table breaks down one loop step-by-step, including the exact `MultiBucketAllocated` split, so the on-chain financial actions are auditable.

| Step | Network | Action / Event | Transaction Hash |
| :--- | :--- | :--- | :--- |
| **0. Bind Vault** | Reactive Lasna (`5318007`) | `setDestinationVault(0x59Ea...29e0)` | [`0xd3d91772cd9574378ce06e6b914870f988f9ca387262ceb626ae23501f8348b5`](https://lasna.reactscan.net/tx/0xd3d91772cd9574378ce06e6b914870f988f9ca387262ceb626ae23501f8348b5) |
| **1. Origin Inflow** | Ethereum Sepolia (`11155111`) | `WETH.transfer(..., 1.0 WETH)` | [`0x043025677f893c2367986950c26c1cd0017bda08422adc26cc13d8f69359fc68`](https://sepolia.etherscan.io/tx/0x043025677f893c2367986950c26c1cd0017bda08422adc26cc13d8f69359fc68) |
| **2. Reactive Execution** | Reactive Lasna (`5318007`) | `react()` -> `PaycheckTriggered` (wildcard) | [`0x8fce8c56ed954acc43f12c8ae2fce2d599322a79d42baba890853de841057631`](https://lasna.reactscan.net/tx/0x8fce8c56ed954acc43f12c8ae2fce2d599322a79d42baba890853de841057631) |
| **3. Base Settlement** | Base Sepolia (`84532`) | `MultiBucketAllocated` (`+1,250 USDC`, `+750 sUSDC`, `0.2 WETH` kept) | [`0x3a2ad37d975ca1fae92b412f2ebed8c4c00f146a9d1a60fda2aa9a8f7416d9c6`](https://sepolia.basescan.org/tx/0x3a2ad37d975ca1fae92b412f2ebed8c4c00f146a9d1a60fda2aa9a8f7416d9c6) |

---

## Local Development & Verification

### 1. Run Smart Contract Tests
```bash
npm install
npx hardhat compile
npm test
```

### 2. Run the Web Dashboard
```bash
cd frontend
npm install
npm run dev
```

### 3. Deploy & Reproduce Cross-Chain Flow
```bash
cp .env.example .env
# Fill PRIVATE_KEY and testnet RPCs in .env

# Step 1: Deploy Origin WETH on Ethereum Sepolia
npx hardhat run scripts/deploy-sepolia.js --network sepolia

# Step 2: Deploy Wildcard PaycheckReactive on Reactive Lasna (Omni)
npx hardhat run scripts/deploy-reactive.js --network lasna

# Step 3: Deploy Multi-User PaycheckVault on Base Sepolia (Omni Proxy)
npx hardhat run scripts/deploy-base.js --network baseSepolia

# Step 4: Bind Lasna PaycheckReactive to Base PaycheckVault
npx hardhat run scripts/bind-vault.js --network lasna

# Step 5: Trigger a 1.0 WETH cross-chain paycheck
npx hardhat run scripts/send-paycheck.js --network sepolia
```
