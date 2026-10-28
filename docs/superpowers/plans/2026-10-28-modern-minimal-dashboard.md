# Modern Minimal Dashboard & Operational UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Modern Minimal Dashboard & Operational UI with Top KPI Ribbon, 1-Click Quick Actions, and zero-overflow Mobile Touch Cards in `apps/web`.

**Architecture:**
- Create `TopKPIRibbon.tsx` for minimalist top KPI cards (Total, Missing B/L, Pending Verification, Ready to Release).
- Create `ActionQueueCards.tsx` with dedicated mobile-first touch cards (`md:hidden`) and sleek desktop rows (`hidden md:block`).
- Integrate into `SearchPage.tsx` and connect with existing slideover drawer and SVG charts.
- Verify 100% test pass rate, build success, and capture live verification screenshots.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide icons, Vitest, Playwright.

---

## File Structure Map
- `apps/web/src/features/search/charts/TopKPIRibbon.tsx` (New component)
- `apps/web/src/features/search/charts/TopKPIRibbon.test.tsx` (New test suite)
- `apps/web/src/features/search/charts/ActionQueueCards.tsx` (New component)
- `apps/web/src/features/search/charts/ActionQueueCards.test.tsx` (New test suite)
- `apps/web/src/features/search/SearchPage.tsx` (Integration of TopKPIRibbon & ActionQueueCards)
- `apps/web/src/features/search/SearchPage.test.tsx` (Integration assertions)

---

## Tasks

### Task 1: TopKPIRibbon Component with TDD

- [x] Write failing test suite in `apps/web/src/features/search/charts/TopKPIRibbon.test.tsx`:
  - Renders 4 KPI cards with correct labels in Thai.
  - Formats numbers and calculates readiness percentage.
  - Applies semantic colors (Sky for total, Rose for missing B/L, Amber for pending, Emerald for ready).
- [x] Run `npm test --prefix apps/web TopKPIRibbon.test.tsx` to verify test fails.
- [x] Implement `apps/web/src/features/search/charts/TopKPIRibbon.tsx`:
  - Accept `totalCount`, `missingBLCount`, `pendingCount`, `readyCount`.
  - Render 4 responsive cards (`grid grid-cols-2 md:grid-cols-4 gap-2.5`).
- [x] Run `npm test --prefix apps/web TopKPIRibbon.test.tsx` to verify all tests pass.
- [x] Commit changes: `git commit -m "feat(ui): add TopKPIRibbon component with unit tests"`

---

### Task 2: ActionQueueCards Component with TDD

- [x] Write failing test suite in `apps/web/src/features/search/charts/ActionQueueCards.test.tsx`:
  - Renders list of jobs as mobile cards (`md:hidden`) and desktop rows (`hidden md:block`).
  - Displays job number, customer name, invoice, and status badge.
  - Displays micro progress dots for 3 document types.
  - Omit 1-Click Action buttons when `allowUpload === false` (Viewer role).
  - Triggers `onSelectJob` when card or button is clicked.
- [x] Run `npm test --prefix apps/web ActionQueueCards.test.tsx` to verify test fails.
- [x] Implement `apps/web/src/features/search/charts/ActionQueueCards.tsx`:
  - Dedicated mobile card layout with `truncate` on text to guarantee zero horizontal overflow.
  - Desktop table row layout with hover transitions.
  - 1-Click buttons (`แนบ B/L`, `ยืนยันพิกัด`, `ดูเอกสาร`) respecting `allowUpload`.
- [x] Run `npm test --prefix apps/web ActionQueueCards.test.tsx` to verify all tests pass.
- [x] Commit changes: `git commit -m "feat(ui): add ActionQueueCards component with zero-overflow mobile cards"`

---

### Task 3: Integration into SearchPage & Updated Tests

- [x] Update `apps/web/src/features/search/SearchPage.tsx`:
  - Import and mount `TopKPIRibbon` above the triage header.
  - Replace legacy card/table mapping with `ActionQueueCards`.
  - Add `no-scrollbar` style to quick filter pills for smooth horizontal scrolling.
  - Connect `onSelectJob` to `setSelectedJob` for 1-click slideover activation.
- [x] Update and run `apps/web/src/features/search/SearchPage.test.tsx`:
  - Assert `TopKPIRibbon` renders with calculated counts.
  - Assert `ActionQueueCards` renders items.
  - Assert viewer role hides action buttons across both ribbon and action queue.
- [x] Run full test suite: `npm test --prefix apps/web`
- [x] Commit changes: `git commit -m "feat(search): integrate TopKPIRibbon and ActionQueueCards into SearchPage"`

---

### Task 4: Full Verification & Live Screenshots

- [ ] Run production build: `npm run build --prefix apps/web` to confirm zero TypeScript / build regressions.
- [ ] Capture live verification screenshots on desktop (1440px) and mobile (390px) confirming zero overflow and beautiful layout.
- [ ] Commit any test / visual artifacts: `git commit -m "chore: verify live layout and build integrity"`
