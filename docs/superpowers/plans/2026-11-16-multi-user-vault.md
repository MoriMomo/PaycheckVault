# Multi-User PaycheckVault (Option A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade PaycheckVault from a single-deployer demo into a multi-user cross-chain app where any connected wallet can mint testnet WETH, fund their Base Sepolia vault slice, configure their own split policy and guardrails, trigger Sepolia → Lasna → Base callbacks, inspect persistent on-chain history, and withdraw funds.

**Architecture:** `PaycheckReactive` on Reactive Lasna Omni (`5318007`) subscribes with a wildcard recipient filter (`topic2 = REACTIVE_IGNORE`) on the origin Sepolia WETH token, tracks cooldown timestamps per recipient address, and includes `recipient` in the `executePaycheckAllocation(address,address,uint256)` payload sent to `PaycheckVault` on Base Sepolia (`84532`). `PaycheckVault` stores isolated per-user `UserLedger` token balances (`weth`, `usdc`, `sUsdc`) and per-user `Policy` settings (`stableBps`, `yieldBps`, `maxSingleAllocation`, `minStableOutPerInput`) so any caller controls only their own slice without hitting `onlyOwner`.

**Tech Stack:** Solidity `0.8.24`, Hardhat (`@nomicfoundation/hardhat-toolbox`), Reactive Omni (`reactive-lib-omni`), React 19 + `ethers` v6 + Vite + Tailwind CSS v4.

---

## Global Constraints

- Reactive Omni architecture (`SYSTEM = 0x8888888888888888888888888888888888888888`, `onlySystem`, `SYSTEM.requestCallbackV_1_0`, Base Sepolia Proxy `0x476F44b11F5C942c58f4c8E3d0300E5710743585`, `onlyServiceProvider`, `onlyCallbackSender`).
- Never revert inside `PaycheckReactive.react()` on non-matching logs or guardrail hits; return silently or emit `InflowSuppressed`.
- Keep existing `#000000` / `#9929EA` / `#FF5FCF` / `#FAEB92` UI palette, `lucide-react` icons (`16px`), sentence-case copy, and zero em dashes.
- Never commit or expose `.env` / `PRIVATE_KEY`.

## Review Focus

1. **Cross-user balance isolation:** User A triggering a Sepolia callback must never touch User B's Base Sepolia WETH, USDC, or sUSDC balances, even if User A sends `100 WETH` on Sepolia with `0` WETH deposited on Base Sepolia (`effectiveInflow` caps to `balances[recipient].weth`).
2. **Per-user cooldown isolation:** User A hitting cooldown on Lasna must not block User B's Sepolia transfer 2 seconds later (`lastTriggeredAt[recipient]`).
3. **Unconfigured user defaults:** A brand-new wallet receiving a Sepolia transfer before calling `setMyBuckets` still routes safely using default `50% / 30% / 20%` policy (or withdraws untouched WETH cleanly).
4. **Wallet chain & account switching:** Switching accounts or chains in MetaMask while on `/treasury` must refresh balances, policies, and event history for the new address cleanly without stale numbers from the previous wallet.
5. **Reused token & DEX liquidity:** Base Sepolia deployment script reuses the live `WETH`, `USDC`, `sUSDC`, and `MockDEX` addresses when set in `.env` and verifies DEX liquidity remains intact.

---

## File Structure

- Modify: `contracts/PaycheckReactive.sol` — Wildcard `topic2` subscription, `mapping(address => uint256) public lastTriggeredAt`, indexed `recipient` in events, `executePaycheckAllocation(address,address,uint256)` callback payload.
- Modify: `contracts/PaycheckVault.sol` — Per-user `Policy` and `UserLedger` mappings, `getPolicy(address)`, `setMyBuckets`, `setMyGuardrails`, `deposit`, `withdraw`, recipient-scoped `executePaycheckAllocation`.
- Modify: `test/PaycheckVault.test.js` — Multi-user isolation, independent cooldowns, default policy fallback, per-user deposit/withdraw, and existing guardrail assertions.
- Modify: `scripts/deploy-reactive.js`, `scripts/deploy-base.js`, `scripts/bind-vault.js` — Deploy v3 Multi-User contracts while preserving token/DEX reuse.
- Modify: `frontend/src/config/contracts.js`, `frontend/src/App.jsx`, `frontend/src/components/DashboardPage.jsx`, `frontend/src/components/LandingPage.jsx` — Updated ABI, live contract addresses, multi-user faucet (`MockERC20.mint`), Base `deposit` & `withdraw`, `accountsChanged`/`chainChanged` sync, and persistent on-chain ledger log reads.

---

### Task 1: Upgrade Contracts to Per-User Isolation (`PaycheckReactive.sol` & `PaycheckVault.sol`)

**Files:**
- Modify: `contracts/PaycheckReactive.sol:15-160`
- Modify: `contracts/PaycheckVault.sol:28-269`
- Test: `test/PaycheckVault.test.js`

**Interfaces:**
- Produces on `PaycheckReactive`:
  - `lastTriggeredAt(address recipient) view returns (uint256)`
  - `event PaycheckTriggered(address indexed recipient, uint256 indexed amount, address indexed destinationVault, uint256 timestamp)`
  - `event InflowSuppressed(address indexed recipient, uint256 indexed amount, string reason, uint256 timestamp)`
  - Calls `executePaycheckAllocation(address(0), recipient, amount)` via `SYSTEM.requestCallbackV_1_0`
- Produces on `PaycheckVault`:
  - `balances(address user) view returns (uint256 weth, uint256 usdc, uint256 sUsdc)`
  - `getPolicy(address user) view returns (uint256 stableBps, uint256 yieldBps, uint256 maxSingleAllocation, uint256 minStableOutPerInput, bool configured)`
  - `setMyBuckets(uint256 _stableBps, uint256 _yieldBps) external`
  - `setMyGuardrails(uint256 _maxSingleAllocation, uint256 _minStableOutPerInput) external`
  - `deposit(uint256 amount) external`
  - `withdraw(address token, uint256 amount) external`
  - `executePaycheckAllocation(address callbackSender, address recipient, uint256 inflowAmount) external`
  - `event MultiBucketAllocated(address indexed recipient, address indexed caller, uint256 totalProcessed, uint256 stableOut, uint256 yieldOut, uint256 retainedIn, uint256 timestamp)`

- [ ] **Step 1: Add failing multi-user isolation & wildcard tests in `test/PaycheckVault.test.js`**
  - Update fixture/events for `PaycheckTriggered(recipient, amount, destinationVault, timestamp)` and `MultiBucketAllocated(recipient, caller, ...)`.
  - Add tests:
    1. `Should route Sepolia transfers for two independent users using separate cooldowns` (User A triggers, User B triggers 2s later and succeeds while User A repeat is suppressed).
    2. `Should isolate Base Sepolia vault balances and custom policies per user` (User A deposits `2 WETH` at `70/20/10`, User B deposits `1 WETH` at `20/70/10`; callback for User A never touches User B's `weth`/`usdc`/`sUsdc`).
    3. `Should allow each user to deposit, withdraw only their own tokens, and reject over-withdrawal`.

- [ ] **Step 2: Run tests to verify they fail**
  - Run: `npm test`
  - Expected: FAIL (`setMyBuckets` / `balances(address)` / 3-arg `executePaycheckAllocation` not defined yet).

- [ ] **Step 3: Update `contracts/PaycheckReactive.sol`**
  - Keep `monitoredRecipient` constructor arg optional (`address(0)` or passed for reference) while subscribing with `REACTIVE_IGNORE` on `topic2` so any Sepolia recipient of `originToken` is observed.
  - Decode `address recipient = address(uint160(log_.topic2))`, skip `address(0)`, track `lastTriggeredAt[recipient]`, enforce `minInflowThreshold` and `cooldownPeriod`, emit `PaycheckTriggered(recipient, amount, destinationVault, block.timestamp)` / `InflowSuppressed(...)`, and encode `executePaycheckAllocation(address(0), recipient, amount)`.

- [ ] **Step 4: Update `contracts/PaycheckVault.sol`**
  - Add `Policy` and `UserLedger` structs keyed by `address`.
  - Add `defaultStableBps`, `defaultYieldBps` (initialized from constructor `_stableBps`, `_yieldBps`) for unconfigured users in `getPolicy(address user)`.
  - Implement permissionless `setMyBuckets`, `setMyGuardrails`, `deposit`, and per-user `withdraw(address token, uint256 amount)` validating against `balances[msg.sender]`.
  - Update `executePaycheckAllocation(address callbackSender, address recipient, uint256 inflowAmount)` to read `balances[recipient].weth` and `getPolicy(recipient)`, swap via `MockDEX` using `address(this)` custody while updating `balances[recipient]` ledger fields atomically.

- [ ] **Step 5: Compile and run full Hardhat suite**
  - Run: `npx hardhat compile; npm test`
  - Expected: All unit & multi-user isolation tests PASS (`0` failures).

---

### Task 2: Deploy Multi-User Omni Contracts Live (`deploy-reactive.js`, `deploy-base.js`, `bind-vault.js`)

**Files:**
- Modify: `scripts/deploy-reactive.js`
- Modify: `scripts/deploy-base.js`
- Modify: `scripts/bind-vault.js`
- Modify: `.env` (local only, never committed)

**Interfaces:**
- Consumes: Updated `PaycheckReactive` & `PaycheckVault` bytecode/ABIs from Task 1.
- Produces: Live Lasna `PaycheckReactive` v3 + Base Sepolia `PaycheckVault` v3 addresses bound together, with existing `SEPOLIA_WETH_ADDRESS` and Base `WETH`/`USDC`/`sUSDC`/`MockDEX` reused.

- [ ] **Step 1: Update `scripts/deploy-reactive.js` and `scripts/deploy-base.js` for v3 signatures**
  - Update `deploy-reactive.js` to pass `ethers.ZeroAddress` (or deployer reference) and fund `0.05 REACT`.
  - Update `deploy-base.js` to reuse `BASE_WETH_ADDRESS`, `BASE_USDC_ADDRESS`, `BASE_SUSDC_ADDRESS`, `BASE_DEX_ADDRESS` from `.env`, deploy new `PaycheckVault`, seed deployer slice via `approve` + `deposit(10 WETH)` (or seed Base `balances[deployer]`), and configure initial guardrails.

- [ ] **Step 2: Deploy Lasna + Base Sepolia + run `bind-vault.js` & verify with `send-paycheck.js`**
  - Run `npx hardhat run scripts/deploy-reactive.js --network lasna`, `npx hardhat run scripts/deploy-base.js --network baseSepolia`, `npx hardhat run scripts/bind-vault.js --network lasna`, and test live Sepolia → Lasna → Base execution via `scripts/send-paycheck.js`.
  - Expected: Live `PaycheckTriggered` on Lasna and `MultiBucketAllocated(recipient, ...)` on Base Sepolia updating `vault.balances(recipient)`.

---

### Task 3: Wire Multi-User Vault & Faucet Actions in Frontend (`contracts.js`, `App.jsx`, `DashboardPage.jsx`)

**Files:**
- Modify: `frontend/src/config/contracts.js`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/DashboardPage.jsx`
- Modify: `frontend/src/components/LandingPage.jsx`

**Interfaces:**
- Consumes: Live v3 contract addresses and updated `VAULT_ABI` + `ERC20_ABI` (`mint(address,uint256)`, `approve(address,uint256)`).
- Produces: Complete multi-user interactive dashboard where any connected wallet owns its own balances, policy, faucet mints, deposits, withdrawals, and persistent event feed.

- [ ] **Step 1: Update `frontend/src/config/contracts.js`**
  - Update `lasna.reactiveAddress`, `baseSepolia.vaultAddress`, add `mint` & `approve` to `ERC20_ABI`, and update `VAULT_ABI` to `balances(address)`, `getPolicy(address)`, `setMyBuckets`, `setMyGuardrails`, `deposit`, `withdraw`, and new `MultiBucketAllocated` event signature.

- [ ] **Step 2: Update `frontend/src/App.jsx` state, RPC queries & handlers**
  - Listen for `window.ethereum` `accountsChanged` and `chainChanged` to switch active wallet state cleanly.
  - Read `vault.balances(targetUser)` and `vault.getPolicy(targetUser)` in `fetchLiveBalances`.
  - Query Base Sepolia `MultiBucketAllocated` logs filtered by `recipient = targetUser` so real runs persist across page refreshes.
  - Add `mintTestWeth(chain)`, `depositToVault(amountWeth)`, and `withdrawFromVault(tokenSymbol, amount)` handlers with clear network switching prompts.
  - Update `savePolicyOnChain` to call `vault.setMyBuckets` + `vault.setMyGuardrails`.

- [ ] **Step 3: Add Wallet Onboarding, Deposit & Withdraw UI to `DashboardPage.jsx` and update proof hashes in `LandingPage.jsx`**
  - Add compact **Wallet actions** bar (`Mint 5 WETH on Sepolia`, `Mint 5 WETH on Base`, `Deposit 2 WETH to vault`) and subtle `Withdraw` action per bucket card (`USDC`, `sUSDC`, `WETH`) inside `DashboardPage.jsx`, preserving the `#000000 / #9929EA / #FF5FCF / #FAEB92` palette and unslop rules.
  - Update `LandingPage.jsx` proof links (`VERIFIED_PROOFS`) with the new v3 live end-to-end transaction hashes.

---

### Task 4: Verification, README Update & GitHub Push

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run full contract & frontend checks**
  - Run: `npm test` and `cd frontend; npm run lint; npm run build`
  - Expected: Hardhat suite passes (`0` failures), `oxlint` reports `0` errors, and `vite build` succeeds cleanly.

- [ ] **Step 2: Update `README.md` with Multi-User v3 contracts + live tx proofs and push to `origin/master`**
  - Verify `git status --short` excludes `.env`, commit changes, and push to `MoriMomo/PaycheckVault`.
