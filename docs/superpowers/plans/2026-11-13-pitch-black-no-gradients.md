# Pitch Black & Zero-Gradient UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the entire PaycheckVault application into a true pitch-black (`#000000`) high-contrast interface and eliminate every multi-stop linear/radial gradient across CSS, SVGs, and components in favor of bold, flat, single-color primitives.

**Architecture:** Replace all dark charcoal/navy tints (`#0A0A0C`, `#02040A`, `#121215`, `#18181D`) with pure OLED pitch black (`#000000`). Strip out all radial background gradients, SVG linear/radial gradients, and Tailwind gradient utility classes (`bg-gradient-to-*`, `bg-linear-to-*`), replacing them with crisp solid fills and flat accent colors (`#2756FC` Royal Blue, `#62D0FF` Electric Cyan, `#00C853` Green, `#FFFFFF` White). Structure and visual depth will be defined purely by 1px solid borders (`border-white/10`).

**Tech Stack:** React 19, Tailwind CSS v4, Lucide React, Ethers.js v6, Vite.

**Spec:** User request: *"make the whole website pitch black, crate a design plan first, and remove every gradient, keep it single color no gradient for now"*

## Global Constraints
- **Color Palette Constraint:** Baseline canvas and all container surfaces MUST be pure `#000000`. No `#0A0A0C`, no `#02040A`, no `#121215`.
- **Zero-Gradient Constraint:** Zero occurrences of `linear-gradient`, `radial-gradient`, `<linearGradient>`, `<radialGradient>`, or `bg-gradient-to-*` in active styling. All fills must be single flat solid colors.
- **Contrast & Legibility:** Maintain strict WCAG AA contrast by pairing `#000000` backgrounds with white (`#FFFFFF`) or bright accent text (`#62D0FF`, `#00C853`, `#F5F5F7`) and `1px` solid borders (`rgba(255, 255, 255, 0.1)`).
- **Zero Broken Features:** Retain all Web3 functionalities: wallet connection, Sepolia/Base balance polling, simulation loop, contract inspector drawer, and two-page routing.

## Review Focus
1. **OLED Black Verification:** Ensure no leftover charcoal or navy panels give an uneven patchy appearance.
2. **SVG Vector Integrity:** Confirm SVG paths without `<linearGradient>` render solid crisp strokes/fills without disappearing or clipping.
3. **SplitFlapText Mechanics:** Ensure removing glare gradients does not affect 3D perspective flip animations or character readability.
4. **Interactive States:** Sliders, buttons, and switches must remain visually distinct on hover/active states against `#000000`.
5. **Mobile Viewport:** Ensure mobile navigation drawer and dropdowns adopt `#000000` with clean borders.

---

### Task 1: Global Design Tokens & Base CSS Monochroming
**Files:**
- Modify: `frontend/src/index.css:1-99`

- [ ] **Step 1.1**: Update CSS custom properties in `:root`:
  - `--bg-app: #000000;`
  - `--bg-surface: #000000;`
  - `--bg-surface-elevated: #000000;`
- [ ] **Step 1.2**: Update `body` styles:
  - Remove all 4 `radial-gradient(...)` layers (the dot matrix and ambient color spotlights).
  - Set `background-color: #000000;` and `background-image: none;`.
- [ ] **Step 1.3**: Update `.reactive-card`:
  - Set `background: #000000;` with `border: 1px solid rgba(255, 255, 255, 0.12);`.
  - Remove `.reactive-card::before` gradient top border rule.
- [ ] **Step 1.4**: Update `.beam-active::after`:
  - Replace `background: linear-gradient(...)` with solid single color `background: #62D0FF;`.
- [ ] **Step 1.5**: Update range slider thumb:
  - Set `border: 3px solid #000000;` and flat `background: #62D0FF;`.
- [ ] **Step 1.6**: Verify with `npm run build` in `frontend/`.

---

### Task 2: Navbar Solidification & SVG De-gradienting
**Files:**
- Modify: `frontend/src/components/Navbar.jsx:1-350`

- [ ] **Step 2.1**: Remove all SVG `<defs>` containing `<linearGradient id="navIconGrad">` and `<linearGradient id="appNavGrad">`.
- [ ] **Step 2.2**: Change circular logo ring path fill to flat single color `fill="#62D0FF"` (or `fill="#FFFFFF"`), keeping the inner lightning bolt `fill="white"`.
- [ ] **Step 2.3**: Update scrolled floating capsule pill background:
  - Replace `bg-[#0A0A0C]/85` with solid pitch black `bg-[#000000]` (or `bg-black/95`).
  - Ensure border is flat `border border-white/12`.
- [ ] **Step 2.4**: Update App Mode header and drawer:
  - Change `header` background from `bg-[#0A0A0C]/90` to `bg-black`.
  - Change contracts drawer background from `bg-[#0A0A0C]/95` to `bg-black`.
- [ ] **Step 2.5**: Update mobile dropdown menu:
  - Change `bg-[#0A0A0C]/95` to `bg-black border border-white/12`.
- [ ] **Step 2.6**: Verify build passes cleanly.

---

### Task 3: Landing Page Flattening & Fluid SVG Single-Color Conversion
**Files:**
- Modify: `frontend/src/components/LandingPage.jsx:1-550`

- [ ] **Step 3.1**: Fluid Banner Card Container:
  - Change background from `bg-[#02040A]` to `bg-black` (`#000000`).
  - Remove inline style `backgroundImage: 'radial-gradient(...)'`.
  - Replace gradient border/glow `border-blue-900/30 shadow-[0_0_50px_rgba(20,50,160,0.22)]` with crisp flat `border border-white/12`.
- [ ] **Step 3.2**: Fluid Wave SVG Graphics:
  - Remove `<defs>` holding `<linearGradient id="leftRimGrad">`, `<linearGradient id="leftBodyGrad">`, and `<radialGradient id="leftCenterGlow">`.
  - Replace background rect: remove or set `fill="#000000"`.
  - Replace shadow contour: set `fill="#000000"`.
  - Set Wave Body path stroke to flat single color: `stroke="#2756FC"`.
  - Set Crest Line path stroke to flat single color: `stroke="#62D0FF"`.
  - Set Inner Void Arc to `fill="#000000"`.
- [ ] **Step 3.3**: Featured Buildathon Card & Input Row:
  - Change `bg-[#121215]` to `bg-black border border-white/10`.
  - Change email input field from `bg-[#121215] border-zinc-800` to `bg-black border border-white/15 text-white`.
- [ ] **Step 3.4**: SplitFlapText Departure Board:
  - Update `tileColor` prop from `"#121215"` to `"#000000"`.
  - Set `glare={0}` to disable lighting gradients.
- [ ] **Step 3.5**: Telemetry, News & Interactive Circuit Sections:
  - Replace all `bg-[#121215]`, `bg-[#18181D]/60`, and `bg-[#0A0A0C]` cards with `bg-black border border-white/10`.
  - Ensure all code blocks and badges use pure `#000000`.
- [ ] **Step 3.6**: Verify with `npm run build`.

---

### Task 4: Dashboard Page Flattening & Strategy Bar Solidification
**Files:**
- Modify: `frontend/src/components/DashboardPage.jsx:1-405`

- [ ] **Step 4.1**: Allocation Strategy Slider Track:
  - Line 347: Replace `className="bg-gradient-to-r from-[#2756FC] to-[#62D0FF]"` with single flat color `className="bg-[#2756FC]"`.
  - Change track container background from `bg-[#0A0A0C]` to `bg-black border border-white/10`.
- [ ] **Step 4.2**: Dashboard Telemetry & Action Cards:
  - Change all `bg-[#121215]`, `bg-[#18181D]`, and `bg-[#0A0A0C]` instances to `bg-black`.
  - Change Dust button background from `bg-[#121215] hover:bg-[#18181D]` to `bg-black hover:bg-zinc-950 border border-white/10`.
  - Change preview calculation box from `bg-[#0A0A0C]/90` to `bg-black border border-white/10`.
  - Change slider thumb base border to `#000000`.
- [ ] **Step 4.3**: Activity Feed Table:
  - Ensure table rows and transaction badges use pure `#000000` with clean `1px` dividers.
- [ ] **Step 4.4**: Verify with `npm run build`.

---

### Task 5: Component Styles & Footer Pitch Black Integration
**Files:**
- Modify: `frontend/src/components/ui/SplitFlapText.css`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/ui/meadow-rise-footer.tsx` (or adjust palette props in `App.jsx`)

- [ ] **Step 5.1**: `SplitFlapText.css`:
  - Replace frame background: remove `radial-gradient` and `linear-gradient`, set `background: #000000; border: 1px solid rgba(255, 255, 255, 0.12);`.
  - Remove lighting gradients on top/bottom flaps (`linear-gradient(180deg, ...)`), setting clean `background-color: var(--split-flap-tile-color, #000000);`.
  - Remove glare and hinge shadow cast gradients (set to `none` or `transparent`).
- [ ] **Step 5.2**: `App.jsx`:
  - Set root wrapper class to `min-h-screen bg-black text-white selection:bg-[#2756FC] selection:text-white`.
  - Update Toast popups from `bg-[#121215]/95` to `bg-black border border-white/20`.
  - Pass monochromatic pitch-black palette to `MeadowRiseFooter` (or flat sky/ground `#000000` without linear/radial gradients).
- [ ] **Step 5.3**: Verify clean compilation.

---

### Task 6: Visual Verification & DevTools Audit
**Files:**
- All modified files

- [ ] **Step 6.1**: Run `npm run build` in `frontend/` to confirm zero build or lint warnings.
- [ ] **Step 6.2**: Run `git grep -in "gradient" frontend/src` to assert that zero active background/stroke gradients remain.
- [ ] **Step 6.3**: Navigate `http://localhost:5173/` in Chrome DevTools:
  - Capture desktop screenshot of Landing Page at scroll position 0.
  - Capture screenshot scrolled at 400px (verifying floating capsule pill against pitch black `#000000`).
  - Capture screenshot of Dashboard Page (verifying the solid allocation bar and black cards).
- [ ] **Step 6.4**: Commit all changes to git with a descriptive commit message.

