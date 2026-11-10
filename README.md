# Inflow DCA Executor — Reactive Omni Buildathon

> **Track:** Set It and Forget It  
> **Built for:** DoraHacks × Reactive Network Omni Buildathon

---

## 💡 Overview

**Inflow DCA** is an autonomous, event-driven Dollar-Cost Averaging executor powered by **Reactive Network**.

Instead of relying on off-chain keepers, centralized bot infrastructure, or synthetic cron jobs, **Inflow DCA** directly listens to on-chain capital inflow events (`InflowReceived` / ERC-20 `Transfer`) on an origin chain.

The moment funds (such as payroll, grant distributions, or customer payments) arrive in the user's vault:
1. The **Reactive Smart Contract** on **Lasna Testnet** detects the inflow event in real time.
2. It calculates the user's pre-configured DCA allocation policy (e.g., 50% USDC $\rightarrow$ WETH).
3. It emits an authenticated cross-chain callback to the **Destination Vault**, triggering an automatic DEX swap with zero human intervention or manual transactions.

---

## 🔄 The Full Reactive Loop

```
┌─────────────────────────────────┐
│     Origin Chain (e.g. Sepolia) │
│                                 │
│  Employer / User transfers USDC │
│               │                 │
│               ▼                 │
│     InflowVault.deposit()       │
│               │                 │
│     emits InflowReceived        │
└───────────────┬─────────────────┘
                │
                │ (Event Subscription)
                ▼
┌─────────────────────────────────┐
│     Reactive Network (Lasna)    │
│                                 │
│     InflowDCAReactive.react()   │
│               │                 │
│     Calculates DCA Tranche      │
│               │                 │
│     emits Callback(...)         │
└───────────────┬─────────────────┘
                │
                │ (Authenticated Callback)
                ▼
┌─────────────────────────────────┐
│  Destination Chain (Sepolia/Base)│
│                                 │
│   InflowVault.executeInflowDCA()│
│               │                 │
│      MockDEX.swap()             │
│               │                 │
│   USDC swapped to WETH          │
└─────────────────────────────────┘
```

---

## 🛠️ Smart Contracts

1. **`InflowVault.sol`** (Origin & Destination Target)
   - Holds the user's funds.
   - Emits `InflowReceived` on any deposit.
   - Inherits `AbstractCallback` from `@reactive-network/reactive-lib` to strictly enforce authorized caller authentication (`rvmIdOnly`).
   - Automatically executes the swap via the DEX router when triggered by the Reactive Network relayer.

2. **`InflowDCAReactive.sol`** (Lasna Testnet)
   - Inherits `AbstractReactive` from `@reactive-network/reactive-lib`.
   - Subscribes directly to `InflowReceived` events from the designated origin vault.
   - Emits an authenticated callback containing the dynamic swap slice payload to the destination vault.

3. **`MockDEX.sol` & `MockERC20.sol`**
   - Deterministic testnet token and router contracts ensuring 100% callback reliability with zero slippage or testnet liquidity drought.

---

## 🧪 Testing

The repository includes a comprehensive end-to-end test suite:

```bash
npx hardhat test
```

Expected output:
```
  Inflow DCA End-to-End Suite
    ✔ Should deposit inflow and emit InflowReceived event
    ✔ Should process Reactive callback and execute DCA swap on destination
    ✔ Should reject unauthorized callback sender or wrong RVM ID

  3 passing (612ms)
```

---

## 🚀 Deployment Guide

### 1. Setup Environment
Copy `.env.example` to `.env` and fill in your private key and RPC URLs:
```bash
cp .env.example .env
```

### 2. Deploy L1/Origin Vault & Mocks
Deploy the tokens, mock DEX, and `InflowVault` on Sepolia:
```bash
npx hardhat run scripts/deploy-l1.js --network sepolia
```

Save the printed `InflowVault` address in your `.env`:
```
ORIGIN_VAULT_ADDRESS=0x...
```

### 3. Deploy Reactive Contract to Lasna
Deploy `InflowDCAReactive` to the Lasna Testnet:
```bash
npx hardhat run scripts/deploy-reactive.js --network lasna
```

### 4. Trigger Inflow and Observe Callback
Transfer mock-USDC to `InflowVault` on Sepolia:
The Reactive contract on Lasna will automatically pick up the event and dispatch the callback swap!
