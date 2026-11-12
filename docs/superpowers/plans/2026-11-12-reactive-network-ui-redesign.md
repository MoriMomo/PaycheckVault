# Reactive Network Design System & UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the PaycheckVault dashboard UI to match the exact visual identity, color system, typography, and interactive aesthetic of the official [Reactive Network](https://reactive.network/) website.

**Architecture:** Update styling tokens, CSS variables, and background grid/spotlight effects to mirror Reactive Network's palette (`#000000`, `#101010`, `#2756fc` royal blue, `#62d0ff` cyan, `#cbb5ff` lavender). Redesign the navigation bar, 3-node topology pipeline, bento cards, and allocation slider into high-tech, glassmorphic developer-grade components with animated telemetry.

**Tech Stack:** React 19, Tailwind CSS v4, Ethers.js v6, Google Fonts (`Inter` + `Roboto Mono` / `JetBrains Mono`), SVG animation, CSS radial spotlight mesh.

**Spec:** The official [Reactive Network](https://reactive.network/) design aesthetic:
- Deep black/obsidian canvas (`#000000` / `#0A0A0C` / `#101010`)
- Subtle 24px dot-matrix background grid
- Reactive Royal Blue (`#2756fc`) and Ice Cyan (`#62d0ff`) ambient spotlight shimmers
- Clean Inter typography with tight tracking (`tracking-[-0.02em]`) and Roboto/JetBrains Mono for on-chain telemetry
- Glassmorphic bento cards with 1px translucent borders (`border-white/10`) and top-border highlights (`border-t-white/20`)
- Pill-shaped buttons (`rounded-full`) with glowing gradient states
- Event-driven live pipeline visualization with animated data pulses between Sepolia, Lasna, and Base Sepolia

## Global Constraints
- Preserve all existing on-chain Web3 functionality: MetaMask wallet connection, multi-chain detection, live 15s RPC balance polling, and live paycheck execution.
- Maintain zero layout shift and sub-second load times.
- Keep Tailwind CSS v4 compatibility with `@import "tailwindcss";` and `@config "../tailwind.config.js";`.
- All contract addresses and explorer links must remain accurate and interactive.

## Review Focus
1. Does the app look like an official, first-party product built on Reactive Network?
2. Does the background grid and radial spotlight glow render smoothly across mobile and desktop without lagging?
3. Do all buttons, sliders, and interactive cards maintain clear contrast, accessible focus rings, and tactile feedback?
4. Is the 3-node cross-chain signal flow (Sepolia -> Lasna -> Base) instantly comprehensible in a 3-minute hackathon judge video?
5. Do live on-chain balances continue to poll and display accurately without console errors?

---

### Task 1: Reactive Network Design Tokens & Background Canvas

**Files:**
- Modify: `frontend/index.html` (import Inter font weights 400-800 & Roboto Mono)
- Modify: `frontend/src/index.css` (add Reactive Network color variables, 24px dot grid, spotlight glow keyframes, and custom range slider)
- Modify: `frontend/tailwind.config.js` (configure Reactive blue `#2756fc`, cyan `#62d0ff`, lavender `#cbb5ff`, obsidian `#0A0A0C`, and surface `#101010`)

**Steps:**
- [ ] **Step 1.1**: Update `frontend/index.html` Google Fonts to import `Inter:wght@400;500;600;700;800` and `Roboto+Mono:wght@400;500;600`.
- [ ] **Step 1.2**: Update `frontend/tailwind.config.js` with the Reactive color hierarchy (`reactive-blue`: `#2756fc`, `reactive-cyan`: `#62d0ff`, `reactive-purple`: `#cbb5ff`, `reactive-dark`: `#0A0A0C`, `reactive-card`: `#121214`).
- [ ] **Step 1.3**: Configure `frontend/src/index.css` with the Reactive Network background dot grid (`radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)` with `background-size: 24px 24px`) and ambient radial blur mesh.
- [ ] **Step 1.4**: Run `cd frontend; npm run build` to verify CSS compiles cleanly without errors.
- [ ] **Step 1.5**: Commit Task 1 changes to git.

---

### Task 2: Reactive Network Navigation & Hero Header

**Files:**
- Modify: `frontend/src/App.jsx:230-360`

**Steps:**
- [ ] **Step 2.1**: Redesign the navigation bar:
  - Add official Reactive Network branding motif (sleek geometric hexagon/network node logo).
  - Use glossy dark translucent backdrop (`bg-[#0A0A0C]/80 backdrop-blur-xl border-b border-white/[0.08]`).
  - Upgrade the Network Badge to a clean pill tag with glowing status dot (`#00c853` / `#62d0ff`).
  - Upgrade the "Connect Wallet" button to a Reactive pill CTA (`rounded-full bg-white text-black font-semibold hover:bg-slate-200 transition shadow-[0_0_20px_rgba(39,86,252,0.3)]`).
- [ ] **Step 2.2**: Redesign the Hero section:
  - Feature a badge: `⚡ BUILT ON REACTIVE NETWORK • OMNI BUILDATHON`.
  - Display high-impact headline with gradient text: `"Autonomous Inflow Rebalancing."` with gradient span `"Powered by Reactive Smart Contracts."`
  - Style the action buttons (`Send $500 Paycheck` and `Test $5 Dust`) with Reactive button styling (pill-shaped, glowing border accents).
- [ ] **Step 2.3**: Build and verify in browser.
- [ ] **Step 2.4**: Commit Task 2 changes to git.

---

### Task 3: Interactive 3-Node Topology Pipeline (The "Reactive Signal Flow")

**Files:**
- Modify: `frontend/src/App.jsx:360-520`

**Steps:**
- [ ] **Step 3.1**: Redesign the 3-step pipeline into a unified high-tech Reactive Network event circuit:
  - Node 1: **Ethereum Sepolia** (`Origin Chain` / `USDC Transfer Event`)
  - Node 2: **Reactive Lasna** (`ReactVM Layer` / `PaycheckReactive.react()`)
  - Node 3: **Base Sepolia** (`Destination Vault` / `Autonomous MockDEX Swap`)
- [ ] **Step 3.2**: Add animated SVG circuit connectors between nodes:
  - Horizontal pathway with moving gradient beam (`#2756fc` $\rightarrow$ `#62d0ff`).
  - Active pulse states when `loopPhase === 'sepolia'`, `'lasna'`, `'base'`, or `'blocked'`.
- [ ] **Step 3.3**: Include verified contract tags and 1-click explorer links inside each node card.
- [ ] **Step 3.4**: Test simulation and live triggers to ensure animation pulses sequentially.
- [ ] **Step 3.5**: Commit Task 3 changes to git.

---

### Task 4: Glassmorphic Bento Cards & Dual-Band Allocation Control

**Files:**
- Modify: `frontend/src/App.jsx:520-750`

**Steps:**
- [ ] **Step 4.1**: Upgrade the Portfolio Balance Cards:
  - Dark glassmorphic panels (`bg-[#121214]/80 border border-white/[0.08] rounded-2xl`).
  - Add top-edge shine effect (`before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent`).
  - Display the "Live on-chain • Updated Xs ago" indicator with an animated radar pulse.
- [ ] **Step 4.2**: Redesign the Allocation Recipe card:
  - Preset percentage pills (`20% Safe`, `50% Split`, `80% DCA`).
  - Dual-band progress track with Reactive Cyan (`#62d0ff`) and Royal Blue (`#2756fc`).
  - Custom glowing slider thumb.
  - Live calculation preview box showing split for a \$1,000 inflow.
  - "Apply Policy On-Chain" button with loading spinner.
- [ ] **Step 4.3**: Redesign the Activity Stream into a cryptographic event ledger with transaction hash links and execution badges.
- [ ] **Step 4.4**: Commit Task 4 changes to git.

---

### Task 5: Standalone Dashboard Sync & Verification

**Files:**
- Modify: `dashboard/index.html` (sync updated Reactive Network styles and markup)
- Test: Build verification (`npm run build`) and live browser check (`http://localhost:5173`)

**Steps:**
- [ ] **Step 5.1**: Synchronize `dashboard/index.html` with the updated Reactive Network design language so both Vite and standalone modes share the identical aesthetic.
- [ ] **Step 5.2**: Run `cd frontend; npm run build` and verify 0 errors, 0 warnings.
- [ ] **Step 5.3**: Verify wallet connection, 15-second RPC polling, and paycheck simulation in browser.
- [ ] **Step 5.4**: Commit Task 5 changes to git and present completed showcase to the user.
