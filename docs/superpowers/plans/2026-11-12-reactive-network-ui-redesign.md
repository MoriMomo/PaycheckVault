# Reactive Network Two-Page UI (Landing Page + Main Vault App) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign PaycheckVault into a two-page Web3 experience—a high-converting **Landing Page** and a live **Main Vault Dashboard**—modeled after the official [Reactive Network](https://reactive.network/) visual design system (`ui-ux-pro-max` Bento Grid Showcase + Minimalist Dark Tech).

**Architecture:** Split the frontend into modular components (`Navbar`, `LandingPage`, `DashboardPage`, and `config/contracts`) managed by `App.jsx`. Both views share Reactive Network's obsidian dot-matrix canvas (`#0A0A0C`), ambient royal blue/cyan spotlight glows (`#2756fc`, `#62d0ff`, `#cbb5ff`), `Space Grotesk` + `Inter` + `JetBrains Mono` typography, and shared live Web3 wallet/RPC state.

**Tech Stack:** React 19, Tailwind CSS v4, Ethers.js v6, Lucide React (SVG icons), Google Fonts (`Space Grotesk`, `Inter`, `JetBrains Mono`).

**Spec:**
1. **Page 1 — Landing Page (`LandingPage.jsx`):**
   - Full-bleed Reactive Network Hero with ambient spotlight shimmer, value proposition, **"Launch App →"** primary CTA, and **"Explore Architecture"** secondary CTA.
   - Interactive Cross-Chain Event Loop preview (Sepolia $\rightarrow$ Lasna $\rightarrow$ Base Sepolia).
   - 4-Card Bento Grid Showcase highlighting: (1) Recipient-Side Inflow Detection, (2) Zero Keepers / Zero Cron Jobs, (3) Lasna Anti-Dust Gas Shield, and (4) Cryptographic RVM ID Security.
   - Live On-Chain Contract Registry with 1-click block explorer links.
2. **Page 2 — Main Vault Dashboard (`DashboardPage.jsx`):**
   - Action Header with **"Send $500 Paycheck (MetaMask)"** and **"Test $5 Dust"** triggers.
   - Live 3-Node Signal Telemetry Circuit (`Sepolia` $\rightarrow$ `Lasna` $\rightarrow$ `Base Sepolia`).
   - On-Chain Portfolio Balance Cards (`Liquid Cash Reserve USDC` & `Accumulated WETH`) with continuous 15s RPC polling and ticking `"Live • Updated Xs ago"` indicator.
   - Allocation Recipe Card with preset pills (`20% Safe`, `50% Split`, `80% DCA`), dual-band slider, \$1,000 inflow preview, and **"Apply Policy On-Chain"** (`setConfig`).
   - Cryptographic Activity Ledger.

## Global Constraints
- Follow `ui-ux-pro-max` accessibility & polish rules: SVG icons only (no raw emojis as structural icons), `cursor-pointer` on all interactive controls, visible focus states, contrast ratio $\ge 4.5:1$, and `prefers-reduced-motion` support.
- Preserve all live Web3 capabilities: MetaMask login, `accountsChanged`/`chainChanged` listeners, 1-click network switching, 15s continuous Base Sepolia & Sepolia RPC polling, and on-chain transactions.
- Maintain Tailwind CSS v4 setup (`@import "tailwindcss";` + `@config "../tailwind.config.js";`).

## Review Focus
1. Can a user or hackathon judge seamlessly switch between the **Landing Page** and the **Main Vault App** via the header navigation and "Launch App" CTAs without losing wallet state?
2. Does the Landing Page immediately communicate *why* Reactive Network is essential (recipient-side event watching across chains without keepers)?
3. Does the Main Dashboard display live on-chain balances with the 15-second background poll and ticking timestamp?
4. Are all interactive elements responsive across mobile (`375px`), tablet (`768px`), and desktop (`1440px`)?
5. Does `npm run build` succeed with zero errors?

---

### File Structure

- **Modify:** `frontend/index.html` — Load `Space Grotesk`, `Inter`, and `JetBrains Mono` fonts.
- **Modify:** `frontend/tailwind.config.js` — Add Reactive Network color palette (`reactive-bg`, `reactive-card`, `reactive-blue`, `reactive-cyan`, `reactive-purple`, `reactive-green`) and font families (`display`, `sans`, `mono`).
- **Modify:** `frontend/src/index.css` — Configure the 24px dot-matrix grid canvas, radial spotlight glows, glassmorphic card utilities, and custom range slider styles.
- **Create:** `frontend/src/config/contracts.js` — Centralize deployed contract addresses (Sepolia USDC, Lasna RSC, Base Vault/DEX/Tokens) and ABIs.
- **Create:** `frontend/src/components/Navbar.jsx` — Sticky glassmorphic navigation bar with Reactive logo, `Overview (Landing)` / `Vault App` tab switcher, network status badge, and MetaMask connect button.
- **Create:** `frontend/src/components/LandingPage.jsx` — The Reactive Network marketing & architecture landing page (Hero, Interactive Circuit Preview, 4-Card Bento Grid, Verified Contract Cards, Bottom CTA).
- **Create:** `frontend/src/components/DashboardPage.jsx` — The live Web3 Vault application (Execution Header, 3-Node Signal Pipeline, Portfolio Cards with liveness indicator, Allocation Recipe Slider, Activity Ledger).
- **Modify:** `frontend/src/App.jsx` — Top-level state container managing `activePage` (`'landing'` | `'app'`), wallet connection, 15s RPC polling, paycheck execution, and toast notifications.
- **Modify:** `dashboard/index.html` — Sync standalone fallback with the two-page switcher and Reactive Network theme.

---

### Task 1: Reactive Network Design System, Fonts & Canvas (`index.html`, `tailwind.config.js`, `index.css`)

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/index.css`

**Steps:**
- [ ] **Step 1.1**: Update `frontend/index.html` to import `Space Grotesk` (`500;600;700`), `Inter` (`400;500;600;700`), and `JetBrains Mono` (`400;500;600;700`).
- [ ] **Step 1.2**: Update `frontend/tailwind.config.js` with Reactive Network colors (`#0A0A0C` canvas, `#121215` card, `#2756fc` royal blue, `#62d0ff` ice cyan, `#cbb5ff` lavender, `#00c853` emerald) and `fontFamily.display` (`Space Grotesk`).
- [ ] **Step 1.3**: Update `frontend/src/index.css` with the 24px dot-matrix background grid, ambient radial spotlight gradients, `.reactive-card` specular top-border utility, and glowing range slider thumb.
- [ ] **Step 1.4**: Run `cd frontend; npm run build` to verify CSS compilation.
- [ ] **Step 1.5**: Commit Task 1 changes.

---

### Task 2: Centralized Contract Config & Shared Navigation (`contracts.js`, `Navbar.jsx`)

**Files:**
- Create: `frontend/src/config/contracts.js`
- Create: `frontend/src/components/Navbar.jsx`

**Steps:**
- [ ] **Step 2.1**: Create `frontend/src/config/contracts.js` exporting `CONFIG` (Sepolia `11155111`, Lasna `5318007`, Base Sepolia `84532` addresses & RPCs), `ERC20_ABI`, and `VAULT_ABI`.
- [ ] **Step 2.2**: Create `frontend/src/components/Navbar.jsx` featuring:
  - Brand logo with glowing Reactive node icon (clicking navigates to `'landing'`).
  - Center pill navigation switcher: **`Overview`** (Landing Page) vs **`Vault App`** (Main Dashboard) with active indicator.
  - Right cluster: Network badge (`Sepolia` / `Base Sepolia` / `Switch Network`), `Contracts` drawer toggle, and glossy pill `Connect Wallet` button.
- [ ] **Step 2.3**: Commit Task 2 changes.

---

### Task 3: Page 1 — Reactive Network Landing Page (`LandingPage.jsx`)

**Files:**
- Create: `frontend/src/components/LandingPage.jsx`

**Steps:**
- [ ] **Step 3.1**: Build the **Hero Section**:
  - Glowing pill badge: `⚡ BUILT ON REACTIVE NETWORK • SET IT AND FORGET IT TRACK`.
  - Display headline (`font-display`): `"Get Paid on Ethereum. Auto-Invest on Base."` with gradient text (`#FFFFFF` $\rightarrow$ `#62d0ff` $\rightarrow$ `#2756fc`).
  - Subtitle explaining autonomous recipient-side USDC-to-WETH rebalancing in ~1s without keepers.
  - Primary CTA button: **"Launch Vault App →"** (calls `onNavigate('app')`) + Secondary CTA: **"Simulate Live Flow"** / **"Read Architecture"**.
- [ ] **Step 3.2**: Build the **Interactive 3-Chain Architecture Diagram**:
  - Visualizes `1. Ethereum Sepolia (Origin Inflow)` $\rightarrow$ `2. Reactive Lasna (EventVM Listener)` $\rightarrow$ `3. Base Sepolia (Destination Vault)` with animated SVG data pulses along the connecting circuit lines.
- [ ] **Step 3.3**: Build the **4-Card Bento Grid Showcase** (`ui-ux-pro-max` `bento-grid-showcase` pattern):
  - **Bento 1 (Span 7):** *Recipient-Side Event Watching* — Why vaults alone can't see external transfers, and how `PaycheckReactive` solves it.
  - **Bento 2 (Span 5):** *Zero Keepers, Zero Subscriptions* — No Gelato, no Chainlink Automation, no off-chain servers.
  - **Bento 3 (Span 5):** *Anti-Dust Gas Shield* — On-chain filtering ($\ge \$10$) blocks spam transfers at the Lasna layer.
  - **Bento 4 (Span 7):** *Cryptographic RVM ID Verification* — Dual-guard `authorizedSenderOnly` and `rvmIdOnly` protection on Base Sepolia.
- [ ] **Step 3.4**: Build the **Verified Deployment Registry & Bottom CTA Banner** with live explorer links and **"Open Vault Dashboard →"** button.
- [ ] **Step 3.5**: Commit Task 3 changes.

---

### Task 4: Page 2 — Main Vault Dashboard (`DashboardPage.jsx`) & App Wiring (`App.jsx`)

**Files:**
- Create: `frontend/src/components/DashboardPage.jsx`
- Modify: `frontend/src/App.jsx`

**Steps:**
- [ ] **Step 4.1**: Create `frontend/src/components/DashboardPage.jsx` containing:
  - Top Action Bar: Title, connected RVM ID indicator, **"Send $500 Paycheck (MetaMask)"** primary button, and **"Test $5 Dust"** secondary button.
  - Live 3-Node Signal Telemetry Circuit lighting up in real time (`idle` | `sepolia` | `lasna` | `base` | `blocked`) with active transaction hash link.
  - **Left 7 Columns:**
    - Liveness bar: `"Base Sepolia Vault Portfolio"` + clickable `"Live • Updated Xs ago ⟳"` badge.
    - High-contrast **Liquid Cash Reserve (USDC)** and **Accumulated WETH** cards with animated odometer numbers.
    - Connected Sepolia Salary Balance bar (`1,000,000.00 USDC`).
    - Cryptographic Activity Ledger with Lasna verification badges.
  - **Right 5 Columns:**
    - **Allocation Recipe Card**: Preset pills (`20% Safe`, `50% Split`, `80% DCA`), dual-band progress bar (`#00c853` + `#2756fc`), custom glowing slider, \$1,000 inflow split preview, and **"Apply Policy On-Chain"** button.
- [ ] **Step 4.2**: Update `frontend/src/App.jsx` to wire `activePage` (`'landing'` | `'app'`), `Navbar`, `LandingPage`, `DashboardPage`, toast alerts, wallet connection, and 15-second continuous RPC polling.
- [ ] **Step 4.3**: Run `cd frontend; npm run build` and verify zero errors.
- [ ] **Step 4.4**: Commit Task 4 changes.

---

### Task 5: Standalone Dashboard Sync & Final Verification

**Files:**
- Modify: `dashboard/index.html`

**Steps:**
- [ ] **Step 5.1**: Update `dashboard/index.html` to include the two-page switcher (`Landing` / `Vault App`) and Reactive Network styling.
- [ ] **Step 5.2**: Verify production build and live dev server at `http://localhost:5173`.
- [ ] **Step 5.3**: Commit Task 5 changes.
