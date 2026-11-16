# PaycheckVault v3 — Signal-Driven Cross-Chain Treasury Vault

**Set It and Forget It · Powered by Reactive Network Omni (`5318007`)**

PaycheckVault turns incoming **Ethereum Sepolia WETH transfers** into autonomous treasury triggers on **Base Sepolia**: `PaycheckReactive` filters dust (`< 0.01 WETH`) and enforces a 30-second per-user cooldown on **Reactive Lasna Omni**, then dispatches a callback to **PaycheckVault** on Base Sepolia to split each user's pre-funded Base WETH vault slice across **USDC** reserve, **sUSDC** yield, and retained operating **WETH** — with isolated per-user balances, split rules, deposit, and withdrawal controls.

### Why Reactive? (Zero Keepers, Zero Backend)
- **No Gelato, no Chainlink Automation, no off-chain server:** Origin ERC-20 `Transfer` subscriptions live natively inside `PaycheckReactive` (`SYSTEM.subscribe` + `onlySystem`).
- **Distinct from single-chain vaults & rate monitors:** `PaycheckVault` on Base Sepolia cannot observe an inbound WETH transfer arriving at a user's Ethereum Sepolia address on its own. Reactive Network bridges that external event into deterministic destination execution.

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

## Verified End-to-End Cross-Chain Proofs (`1.0 WETH` Paycheck — v3 Multi-User)

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
