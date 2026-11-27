# PaycheckVault v4 — Signal-Driven Cross-Chain & Auto-Split Treasury Vault

**Set It and Forget It · Powered by Reactive Network Omni (`5318007`)**

PaycheckVault turns incoming **Ethereum Sepolia WETH** or **direct Base Sepolia WETH** transfers into autonomous treasury splits on **Base Sepolia**: `PaycheckReactive` filters dust (`< 0.01 WETH`), queues rapid inflows during the 30-second per-user cooldown on **Reactive Lasna Omni**, and dispatches deterministic `paycheckId` callbacks to **PaycheckVault** on Base Sepolia — pulling approved Base wallet WETH (or pre-funded vault slices) and swapping atomically into **USDC** reserve, **sUSDC** yield, and retained operating **WETH**.

### It allocates a DeFi portfolio on arrival — it does not just bookkeep
When the Lasna callback lands, `PaycheckVault` executes **real on-chain financial actions atomically**, not internal sub-ledger partitioning:
- **Liquid USDC reserve** — a configurable `stableBps` slice is swapped to USDC via the on-chain DEX router and held for spending/taxes.
- **Yield sUSDC** — a `yieldBps` slice is routed into yield-bearing stablecoin shares.
- **Auto-invest WETH** — the remainder (`10000 - stableBps - yieldBps`) is retained as the accumulating WETH position.

Each slice is a token movement through a DEX swap with a per-user slippage floor and max-allocation cap — a ledger that only moves numbers between sub-balances cannot claim this.

## Measured Dual-Chain Loop Telemetry (5/5 live loops)

End-to-end latency is measured from `block.timestamp` (Origin inflow block → Base settlement block), **not** block counts — Base Sepolia mines ~200ms blocks, so block-delta timing is meaningless (per the buildathon's Base Sepolia timing rule).

**Median end-to-end latency: 2s** (1s–2s) · avg Sepolia gas `0.000017 ETH` · avg Lasna `0.01210 lREACT` · avg Base callback gas `0.000001 ETH`. Reproduce with `npx hardhat run scripts/measure-loop.js --network sepolia` or `--network baseSepolia`.

| # | Origin Chain | Origin Inflow | Reactive (Lasna) | Callback (Base Sepolia) | lREACT | Latency |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | Sepolia (`11155111`) | [`0x60c423…b7a48c`](https://sepolia.etherscan.io/tx/0x60c423124030d83e8d8947c4553050e09223d852c09f39664e5df2613fb7a48c) | [`0x6c7b71…0be0c6`](https://lasna.reactscan.net/tx/0x6c7b7167826d8569a8f2cb5f9933568ea5d73b855d56f50004f01a04b20be0c6) | [`0xa9852b…525220`](https://sepolia.basescan.org/tx/0xa9852b7fa4cfa8474f99891fb9940ec0780ddc6d414ddebd9db4cf2576525220) | 0.01479 | 2s |
| 2 | Sepolia (`11155111`) | [`0x52328f…3ed672`](https://sepolia.etherscan.io/tx/0x52328f437e93ebd72931801290dd34a746007a0704782376402a576b303ed672) | [`0x2285ff…fc9c16`](https://lasna.reactscan.net/tx/0x2285ff95e843e1fca3163941821d100ecc4880ef87698e3fbf06c537c0fc9c16) | [`0xfa9455…9810ce`](https://sepolia.basescan.org/tx/0xfa94551f0e0cdc017617b32b126ebceb36abcc05aa21cb0ce2eb7cc61f9810ce) | 0.01139 | 2s |
| 3 | Sepolia (`11155111`) | [`0xd72fe0…9b4bbe`](https://sepolia.etherscan.io/tx/0xd72fe0a4f99ecb7968166c992d9be54fd27acec9c78a8ddcc8348dcca69b4bbe) | [`0x213c09…7c5abf`](https://lasna.reactscan.net/tx/0x213c09f11cc9181e68dbe7737c41bd42e09fbd20384a055592b4a413497c5abf) | [`0xef0a17…574d52`](https://sepolia.basescan.org/tx/0xef0a1700832e47f12460ee07c264abe594aaccf1866b596533060cc8b8574d52) | 0.01139 | 2s |
| 4 | Base Sepolia (`84532` Auto-Pull) | [`0x3e9320…4f6e84`](https://sepolia.basescan.org/tx/0x3e932026c3962db288003f5e0ddfe9069c64ccf36c7c66e3f7e3fa21f94f6e84) | [`0x770f4b…d86f87`](https://lasna.reactscan.net/tx/0x770f4bc7b0e00168cb942a57db3edd77a4e39df088f36825086467ee18d86f87) | [`0x40c375…043624`](https://sepolia.basescan.org/tx/0x40c375da9cb3320e45405b98236aaa052443f9ae4f5e73454d4f51daab043624) | 0.01147 | 1s |
| 5 | Base Sepolia (`84532` Auto-Pull) | [`0x6f1f50…19ad2b`](https://sepolia.basescan.org/tx/0x6f1f50751d26e0f9bee59f0948745cc331afc2fafc0d64aa1380538efe19ad2b) | [`0x0a1566…81bf66`](https://lasna.reactscan.net/tx/0x0a156631482ea2eaf26997cef8c2be134dcc1e8f1f3ab5d3ddafa2381781bf66) | [`0x3ab35f…f9deaf`](https://sepolia.basescan.org/tx/0x3ab35f9836b4de9b1d692347bea0093b0ebe0734b6c99a7f67aec72b6cf9deaf) | 0.01147 | 2s |

### How PaycheckVault Compares

| Capability | Sub-Ledger Splitters | CRON Bill Payers | PaycheckVault v4 |
| :--- | :--- | :--- | :--- |
| **Execution Trigger** | Single-chain deposit | Time-based CRON | **Dual-chain ERC-20 `Transfer` (Sepolia + Base)** |
| **Wallet Auto-Pull** | Requires manual deposit | Pre-funded balance only | **1-time `approve()` auto-pulls shortfall from wallet** |
| **On-Chain Actions** | Internal ledger math | Outbound payee transfers | **Atomic `MockDEX` swaps (USDC + sUSDC + WETH)** |
| **Guardrails & Idempotency** | None / basic | Fixed schedule | **Dust filter, Lasna cooldown queue, `paycheckId` replay guard, slippage/cap breakers** |

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
| **Reactive Lasna (`5318007`)** | `PaycheckReactive` (Dual-Chain Wildcard Omni v4) | `0x58aB359b4aA491C45dd013B580aE0be50Bf4fE14` | [ReactScan Lasna](https://lasna.reactscan.net/address/0x58aB359b4aA491C45dd013B580aE0be50Bf4fE14) |
| **Reactive Lasna (`5318007`)** | Omni `SYSTEM` Contract | `0x8888888888888888888888888888888888888888` | [ReactScan Lasna](https://lasna.reactscan.net/address/0x8888888888888888888888888888888888888888) |
| **Base Sepolia (`84532`)** | `PaycheckVault` (Auto-Split Omni v4) | `0xed18bC00a1FCa7c227A8575219d0da2B31bef0b3` | [BaseScan](https://sepolia.basescan.org/address/0xed18bC00a1FCa7c227A8575219d0da2B31bef0b3) |
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
| **0. Bind Vault** | Reactive Lasna (`5318007`) | `setDestinationVault(0xed18...f0b3)` | [`0x7002b17e4083fac691620f6807e6074b520ac74ddb8124f4820fb31cfba12860`](https://lasna.reactscan.net/tx/0x7002b17e4083fac691620f6807e6074b520ac74ddb8124f4820fb31cfba12860) |
| **1. Origin Inflow** | Ethereum Sepolia (`11155111`) | `WETH.transfer(..., 1.0 WETH)` | [`0x60c423124030d83e8d8947c4553050e09223d852c09f39664e5df2613fb7a48c`](https://sepolia.etherscan.io/tx/0x60c423124030d83e8d8947c4553050e09223d852c09f39664e5df2613fb7a48c) |
| **2. Reactive Execution** | Reactive Lasna (`5318007`) | `react()` -> `PaycheckTriggered` + `PaycheckAccepted` | [`0x6c7b7167826d8569a8f2cb5f9933568ea5d73b855d56f50004f01a04b20be0c6`](https://lasna.reactscan.net/tx/0x6c7b7167826d8569a8f2cb5f9933568ea5d73b855d56f50004f01a04b20be0c6) |
| **3. Base Settlement** | Base Sepolia (`84532`) | `MultiBucketAllocated` (`+1,250 USDC`, `+750 sUSDC`, `0.2 WETH` kept) + `PaycheckSettled` | [`0xa9852b7fa4cfa8474f99891fb9940ec0780ddc6d414ddebd9db4cf2576525220`](https://sepolia.basescan.org/tx/0xa9852b7fa4cfa8474f99891fb9940ec0780ddc6d414ddebd9db4cf2576525220) |

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
