# Inflow DCA Executor — Reactive Omni Buildathon

> **Track:** Set It and Forget It  
> **Built for:** DoraHacks × Reactive Network Omni Buildathon

---

## 💡 Overview

**Inflow DCA** is an autonomous, recipient-side smart vault powered by **Reactive Network**.

Instead of relying on off-chain keepers, centralized bot infrastructure, or synthetic cron jobs, **Inflow DCA** directly listens to on-chain capital inflow events (ERC-20 `Transfer` targeting the vault) on an origin chain.

The moment funds (such as payroll, grant distributions, or customer payments) arrive in the user's vault:
1. The **Reactive Smart Contract** on **Lasna Testnet** detects the ERC-20 `Transfer` event in real time.
2. It verifies the inflow exceeds the configured anti-spam threshold (`minInflowThreshold`).
3. It emits an authenticated cross-chain callback to the **Destination Vault**, triggering an automatic DEX swap (e.g. 50% USDC $\rightarrow$ WETH) with zero human intervention or manual transactions.

---

## 🔄 The Full Reactive Loop

```
┌─────────────────────────────────┐
│     Origin Chain (e.g. Sepolia) │
│                                 │
│  Employer / User transfers USDC │
│               │                 │
│               ▼                 │
│    USDC.transfer(vault, amount) │
│               │                 │
│     emits Transfer(..., vault)  │
└───────────────┬─────────────────┘
                │
                │ (Event Subscription)
                ▼
┌─────────────────────────────────┐
│     Reactive Network (Lasna)    │
│                                 │
│     InflowDCAReactive.react()   │
│               │                 │
│     Checks amount >= threshold  │
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
│   (Checks: msg.sender==proxy    │
│            sender == rvm_id)    │
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
   - Accepts both direct ERC-20 transfers and helper `deposit()` calls.
   - Inherits `AbstractCallback` from `@reactive-network/reactive-lib` to strictly enforce authorized caller authentication (`rvmIdOnly(sender)` where `rvm_id = deployer_address`).
   - Automatically executes the swap via the DEX router when triggered by the Reactive Network relayer callback.

2. **`InflowDCAReactive.sol`** (Lasna Testnet)
   - Inherits `AbstractReactive` from `@reactive-network/reactive-lib`.
   - Subscribes directly to ERC-20 `Transfer(from, to, amount)` events where `to == originVault`.
   - Filters out spam/dust transfers below `minInflowThreshold`.
   - Emits an authenticated callback payload to the destination vault.

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
  Inflow DCA Hardened Architecture Suite
    ✔ Should set deployer address as authorized rvm_id at construction time
    ✔ Should accept direct ERC20 transfer to vault address and execute swap on callback
    ✔ Should reject callbacks with unauthorized RVM ID

  3 passing (1s)
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

Save the printed `InflowVault` and `MockERC20` addresses in your `.env`:
```
ORIGIN_TOKEN_ADDRESS=0x...
ORIGIN_VAULT_ADDRESS=0x...
```

### 3. Deploy Reactive Contract to Lasna
Deploy `InflowDCAReactive` to the Lasna Testnet (using the same deployer wallet):
```bash
npx hardhat run scripts/deploy-reactive.js --network lasna
```

Because both contracts are deployed by the same wallet, `rvm_id` is automatically matched and authorized!

### 4. Trigger Inflow and Observe Callback
Transfer mock-USDC directly to `InflowVault` on Sepolia:
The Reactive contract on Lasna will automatically pick up the event and dispatch the callback swap!
