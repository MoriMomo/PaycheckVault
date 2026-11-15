# PaycheckVault v2 — Autonomous Cross-Chain Stablecoin Runway

**Set It and Forget It · Powered by Reactive Network Omni (`5318007`)**

PaycheckVault turns volatile cross-chain crypto inflows into a structured multi-bucket stablecoin runway with zero user signatures after setup. Whenever your monitored wallet receives **WETH** on **Ethereum Sepolia**, **Reactive Network Omni** verifies on-chain guardrails and automatically dispatches a trustless callback to **Base Sepolia**, splitting the inflow across a **Core USDC Reserve**, a **Yield-Bearing sUSDC Vault**, and an **Operating WETH Buffer**.

---

## Architecture (`Sepolia -> Lasna Omni -> Base Sepolia`)

```text
+-------------------------------------------------------------------+
| 1. ORIGIN: Ethereum Sepolia (Chain ID: 11155111)                  |
|    WETH Transfer(from, monitoredWallet, amount)                   |
|    -> Observed trustlessly by Reactive Network Omni               |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
| 2. REACTIVE LAYER: Reactive Lasna Omni (Chain ID: 5318007)        |
|    PaycheckReactive (SYSTEM: 0x8888...8888, onlySystem)           |
|    - Anti-Dust Filter: ignores inflows < minInflowThreshold       |
|      (default 0.01 WETH) via InflowSuppressed                     |
|    - Cooldown Guardrail: enforces cooldownSeconds between sweeps  |
|    - Dispatches: SYSTEM.requestCallbackV_1_0(84532, vault, ...)   |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
| 3. DESTINATION: Base Sepolia (Chain ID: 84532)                    |
|    PaycheckVault (Omni Proxy: 0x476F...3585, onlyServiceProvider) |
|    - Verifies authorized caller via onlyCallbackSender            |
|    - Circuit Breakers: maxSingleAllocation + minStableOutPerInput |
|    - Executes Multi-Bucket Split:                                 |
|      * 50% -> Core Reserve (USDC) via MockDEX                     |
|      * 30% -> Yield Runway (sUSDC) via MockDEX                    |
|      * 20% -> Operating Buffer (WETH kept)                        |
|      * Emits MultiBucketAllocated(...)                            |
+-------------------------------------------------------------------+
```

---

## Why PaycheckVault v2 Stands Out

- **Reactive Network Omni Native (`0x8888...8888`)**: Built directly on `reactive-lib-omni` (`onlySystem`, `SYSTEM.subscribe`, `SYSTEM.requestCallbackV_1_0`, and Base Sepolia Omni Proxy `0x476F44b11F5C942c58f4c8E3d0300E5710743585`).
- **True Cross-Chain State & Execution**: Watches Sepolia `11155111` `Transfer` logs and automatically settles balances inside a separate vault on Base Sepolia `84532`.
- **3-Bucket Stablecoin Allocation**: Routes volatile inflows into `USDC` (tax/rent/runway), `sUSDC` (yield reserve), and retained `WETH` (operating buffer) in a single atomic callback.
- **Defense-in-Depth On-Chain Guardrails**:
  - **Origin-side (`PaycheckReactive`)**: Dust threshold (`minInflowThreshold`) and execution cooldown (`cooldownSeconds`) suppress spam without reverting inside `react()`.
  - **Destination-side (`PaycheckVault`)**: Allocation cap (`maxSingleAllocation`) and minimum output floor (`minStableOutPerInput`) protect swaps on Base Sepolia.

---

## Live Deployed Contracts (Testnet v2 Omni)

| Chain | Contract / Role | Address | Explorer |
| :--- | :--- | :--- | :--- |
| **Ethereum Sepolia (`11155111`)** | Origin `WETH` (`MockERC20`) | `0xC56bffDC6d87222128e60D617221AeC584e9F643` | [Sepolia Etherscan](https://sepolia.etherscan.io/address/0xC56bffDC6d87222128e60D617221AeC584e9F643) |
| **Ethereum Sepolia (`11155111`)** | Monitored Wallet | `0x18634B5266369a482836328b8954E67918e5255a` | [Sepolia Etherscan](https://sepolia.etherscan.io/address/0x18634B5266369a482836328b8954E67918e5255a) |
| **Reactive Lasna (`5318007`)** | `PaycheckReactive` (Omni) | `0xC56bffDC6d87222128e60D617221AeC584e9F643` | [ReactScan Lasna](https://lasna.reactscan.net/address/0xC56bffDC6d87222128e60D617221AeC584e9F643) |
| **Reactive Lasna (`5318007`)** | Omni `SYSTEM` Contract | `0x8888888888888888888888888888888888888888` | [ReactScan Lasna](https://lasna.reactscan.net/address/0x8888888888888888888888888888888888888888) |
| **Base Sepolia (`84532`)** | `PaycheckVault` (Omni) | `0xf51084Ac7aECC4689bb8d906F6900c8070c489D2` | [BaseScan](https://sepolia.basescan.org/address/0xf51084Ac7aECC4689bb8d906F6900c8070c489D2) |
| **Base Sepolia (`84532`)** | Omni Callback Proxy | `0x476F44b11F5C942c58f4c8E3d0300E5710743585` | [BaseScan](https://sepolia.basescan.org/address/0x476F44b11F5C942c58f4c8E3d0300E5710743585) |
| **Base Sepolia (`84532`)** | `WETH` (Operating Buffer) | `0xbBAD7e94D7E3950da3F365Cc9E715f834A59C35f` | [BaseScan](https://sepolia.basescan.org/address/0xbBAD7e94D7E3950da3F365Cc9E715f834A59C35f) |
| **Base Sepolia (`84532`)** | `USDC` (Core Reserve) | `0x30A2A3AcD2E5118F50E34A0Ee2e464C5EF8614B0` | [BaseScan](https://sepolia.basescan.org/address/0x30A2A3AcD2E5118F50E34A0Ee2e464C5EF8614B0) |
| **Base Sepolia (`84532`)** | `sUSDC` (Yield Vault) | `0x58aB359b4aA491C45dd013B580aE0be50Bf4fE14` | [BaseScan](https://sepolia.basescan.org/address/0x58aB359b4aA491C45dd013B580aE0be50Bf4fE14) |
| **Base Sepolia (`84532`)** | `MockDEX` | `0xE4BF9404aA3A6aE552EaD8F91CCC8b68269c4841` | [BaseScan](https://sepolia.basescan.org/address/0xE4BF9404aA3A6aE552EaD8F91CCC8b68269c4841) |

---

## Verified End-to-End Cross-Chain Proofs (`1.0 WETH` Paycheck)

| Step | Network | Action / Event | Transaction Hash |
| :--- | :--- | :--- | :--- |
| **0. Bind Vault** | Reactive Lasna (`5318007`) | `setDestinationVault(0xf510...89D2)` | [`0xefe7c9b1b214ab04fac9c218204caef8800dc1e98c63502130bb44979bf01c21`](https://lasna.reactscan.net/tx/0xefe7c9b1b214ab04fac9c218204caef8800dc1e98c63502130bb44979bf01c21) |
| **1. Origin Inflow** | Ethereum Sepolia (`11155111`) | `WETH.transfer(..., 1.0 WETH)` | [`0xa1f1431b11f4e4a9dd7a8c845a5d54c06cc9acbb001b741571fe8f0541b75ce8`](https://sepolia.etherscan.io/tx/0xa1f1431b11f4e4a9dd7a8c845a5d54c06cc9acbb001b741571fe8f0541b75ce8) |
| **2. Reactive Execution** | Reactive Lasna (`5318007`) | `react()` -> `PaycheckTriggered` + `Callback` | [`0xd59280937a9ee6641a66f08c3aa7dfb482ede92a32f2c5060ed22cdbfdd867ea`](https://lasna.reactscan.net/tx/0xd59280937a9ee6641a66f08c3aa7dfb482ede92a32f2c5060ed22cdbfdd867ea) |
| **3. Base Settlement** | Base Sepolia (`84532`) | `MultiBucketAllocated` (`+1,250 USDC`, `+750 sUSDC`, `0.2 WETH` kept) | [`0x61d00cabfd65d8c421d30f51432939dedd1d7f1d8e64dcbc377441e60c955746`](https://sepolia.basescan.org/tx/0x61d00cabfd65d8c421d30f51432939dedd1d7f1d8e64dcbc377441e60c955746) |

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

# Step 2: Deploy PaycheckReactive on Reactive Lasna (Omni)
npx hardhat run scripts/deploy-reactive.js --network lasna

# Step 3: Deploy PaycheckVault & MockDEX on Base Sepolia (Omni Proxy)
npx hardhat run scripts/deploy-base.js --network baseSepolia

# Step 4: Bind Lasna PaycheckReactive to Base PaycheckVault
npx hardhat run scripts/bind-vault.js --network lasna

# Step 5: Trigger a 1.0 WETH cross-chain paycheck
npx hardhat run scripts/send-paycheck.js --network sepolia
```
