# PaycheckVault — Autonomous Inflow Rebalancer

> **Track:** Set It and Forget It  
> **Built for:** DoraHacks × Reactive Network Omni Buildathon  
> **Architecture:** Ethereum Sepolia (Origin) $\rightarrow$ Reactive Network Lasna (Event Layer) $\rightarrow$ Base Sepolia (Destination Vault)

---

## 💡 Overview

**PaycheckVault** is a recipient-side, cross-chain autonomous smart vault powered by **Reactive Network**.

Instead of relying on off-chain keeper bots, centralized cron jobs, or manual transactions, **PaycheckVault** directly connects your incoming income on **Sepolia** (salary, freelance payments, grants) to your long-term wealth portfolio on **Base Sepolia**.

The moment a standard ERC-20 `Transfer` reaches your wallet address on Sepolia:
1. **PaycheckReactive (Lasna Testnet):** Autonomously catches the event in real time (~1s Omni finality) and verifies the inflow exceeds the anti-dust threshold ($\ge \$10$).
2. **Cross-Chain Relay:** Reactive Network dispatches an authenticated callback to **Base Sepolia**.
3. **PaycheckVault (Base Sepolia):** Verifies the relayer proxy and RVM ID, then automatically swaps the user's pre-configured percentage (e.g. 50% USDC $\rightarrow$ WETH) via the on-chain DEX router.

---

## 🔄 Cross-Chain Architecture

```
┌──────────────────────────────────────┐
│     1. Origin Chain (Sepolia)        │
│                                      │
│   Employer / Client transfers USDC   │
│                 │                    │
│                 ▼                    │
│      USDC.transfer(recipient)       │
│                 │                    │
│       emits Transfer(..., user)      │
└─────────────────┬────────────────────┘
                  │
                  │ (Cross-chain Event Subscription)
                  ▼
┌──────────────────────────────────────┐
│     2. Reactive Omni Layer (Lasna)   │
│                                      │
│        PaycheckReactive.react()      │
│                 │                    │
│      Filters minInflowThreshold      │
│                 │                    │
│      emits Callback(Base, payload)   │
└─────────────────┬────────────────────┘
                  │
                  │ (Authenticated Relayer Callback)
                  ▼
┌──────────────────────────────────────┐
│     3. Target Chain (Base Sepolia)   │
│                                      │
│     PaycheckVault.sol                │
│     - authorizedSenderOnly (Proxy)   │
│     - rvmIdOnly (Deployer)           │
│                 │                    │
│                 ▼                    │
│          MockDEX.swap()              │
│       50% USDC auto-swapped to WETH  │
└──────────────────────────────────────┘
```

---

## 🛠️ Contracts & Deployments

- **`PaycheckVault.sol`** (Base Sepolia): Recipient-side vault enforcing strict callback authorization (`rvmIdOnly`).
- **`PaycheckReactive.sol`** (Lasna Testnet): Subscribes to Sepolia `Transfer` events and triggers Base Sepolia execution.
- **`MockDEX.sol` & `MockERC20.sol`**: Deterministic testnet token and swap routers ensuring zero slippage and 100% callback reliability.

---

## 🧪 Testing

Run the full end-to-end integration suite:
```bash
npx hardhat test
```

Expected output:
```
  PaycheckVault Cross-Chain Architecture Suite (Sepolia -> Lasna -> Base Sepolia)
    ✔ Should verify that rvm_id matches deployer wallet address
    ✔ Should emit Callback in PaycheckReactive.react() when valid Sepolia Transfer log arrives
    ✔ Should ignore dust transfers below minInflowThreshold in PaycheckReactive.react()
    ✔ Should process cross-chain callback from Reactive relayer and execute allocation on Base
    ✔ Should reimburse callback proxy gas via pay() from PaycheckVault ETH reserve
    ✔ Should reject invalid allocationBps > 10000 in setConfig
    ✔ Should strictly reject callback from unauthorized relayer
    ✔ Should strictly reject callback with unauthorized RVM ID

  8 passing (880ms)
```

---

## 🖥️ Live Visual Dashboard

A dedicated visual frontend is included in `dashboard/index.html` to clearly demonstrate the 3-chain signal flow during the video demo.

To view:
Double-click `dashboard/index.html` in your browser or run:
```bash
npx serve dashboard
```

---

## 🚀 Deployment Walkthrough

### 1. Setup Environment
```bash
cp .env.example .env
```
Fill in your `PRIVATE_KEY` and RPC URLs.

### 2. Deploy Sepolia Token (Origin)
```bash
npx hardhat run scripts/deploy-sepolia.js --network sepolia
```

### 3. Deploy Base Sepolia Vault & DEX (Destination)
```bash
npx hardhat run scripts/deploy-base.js --network baseSepolia
```

### 4. Deploy PaycheckReactive on Lasna
```bash
npx hardhat run scripts/deploy-reactive.js --network lasna
```

Both contracts share the same deployer address (`rvm_id`), completing the trustless on-chain loop!
