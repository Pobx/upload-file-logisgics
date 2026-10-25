# UI/UX Re-Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the entire Logistics Document & Search System into a modern, ergonomic, and responsive (Desktop & Mobile) SaaS experience using Google Font Kanit, Modern Slate & Sky Blue palette, Slide-over Inspector Drawer, and strict role-based menu visibility.

**Architecture:** Refactor the frontend into an adaptive `AppLayout` with a collapsible `DocFlowSidebar` on desktop and native `MobileBottomNav` on mobile. Introduce `JobDetailSlideover` for zero-page-reload document inspection and drag-and-drop filing. Implement minimal backend read endpoints (`GET /api/v1/job-orders/:id/documents` and Viewer read access) to support rich real-time document checklists.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v3, Google Font Kanit, Lucide React, TanStack Query & Table, Go 1.23 Echo v4, PostgreSQL 16.

**Spec:** [docs/superpowers/specs/2026-10-25-ui-redesign-design.md](file:///Users/poppy.geidtiphong/Documents/workspace/homework/upload-file-logisgics/docs/superpowers/specs/2026-10-25-ui-redesign-design.md)

## Global Constraints
- Primary font: Google Font 'Kanit' (`sans-serif`) across all text.
- Palette: Modern Slate & Sky Blue (`bg-slate-50`, `bg-white`, `border-slate-200`, accent `text-sky-600` / `bg-sky-600`).
- Strict Role-based UI: Unauthorized menus and actions must be completely hidden (Admin: 4 tabs, Staff: 3 tabs, Viewer: 2 tabs).
- Zero breaking API changes for existing endpoints.
- All frontend tests must pass (`npm test` / `vitest run`).
- Docker build must compile cleanly (`docker compose build fe-1 fe-2 fe-3 be-1 be-2 be-3`).

## Review Focus
- **Input class 1 (Viewer accessing Customer directory)**: `GET /api/v1/customers` must return 200 OK (not 403 Forbidden) when requested with a Viewer token.
- **Input class 2 (Empty or null Job Documents)**: `JobDetailSlideover` must render a clean empty checklist state without throwing null reference errors when a Job Order has zero documents.
- **Input class 3 (Mobile Viewport `< 768px`)**: Layout must hide Left Sidebar, render Bottom Navigation, and format search results as touch-friendly Job Cards.
- **Input class 4 (Keyboard Shortcut `⌘K` / `Ctrl+K`)**: Pressing `⌘K` from any route focuses the global Omni-Search input without navigating away or causing browser conflict.
- **Input class 5 (Idempotent Document Upload)**: Drag-and-drop upload in the Slide-over Drawer must generate a valid UUID `Idempotency-Key` header for every upload request.

---

### Task 1: Backend Read Support & Role Authorization Adjustments

**Files:**
- Modify: `apps/api/internal/document/service.go`
- Modify: `apps/api/internal/document/handler.go`
- Modify: `apps/api/internal/joborder/handler.go`
- Modify: `apps/api/internal/customer/handler.go`
- Test: `apps/api/internal/document/handler_test.go`
- Test: `apps/api/internal/customer/handler_test.go`

**Interfaces:**
- Produces: `GET /api/v1/job-orders/:id/documents` returning `[]DocumentResponse`.
- Modifies: `RequireRole` on `GET /api/v1/customers` and `GET /api/v1/job-orders/:id` to allow `admin`, `staff`, and `viewer`.

- [ ] **Step 1: Write the failing tests**
  In `apps/api/internal/document/handler_test.go`, add `TestDocumentHandler_ListByJobOrderID`.
  In `apps/api/internal/customer/handler_test.go`, assert that a user with role `viewer` can call `GET /api/v1/customers` successfully.

- [ ] **Step 2: Run tests to verify they fail**
  Run: `cd apps/api && go test ./internal/document/... ./internal/customer/... -v`
  Expected: FAIL (route not registered or forbidden).

- [ ] **Step 3: Implement `ListByJobOrderID` and update route roles**
  - In `internal/document/service.go`: Implement `ListByJobOrderID(ctx context.Context, jobOrderID uuid.UUID) ([]Document, error)`.
  - In `internal/document/handler.go`: Add `ListByJobOrderID` handler and route `GET /api/v1/job-orders/:id/documents` (accessible by `admin`, `staff`, `viewer`).
  - In `internal/customer/handler.go`: Update `GET /api/v1/customers` to allow `RequireRole("admin", "staff", "viewer")`.
  - In `internal/joborder/handler.go`: Update `GET /api/v1/job-orders/:id` to allow `RequireRole("admin", "staff", "viewer")`.

- [ ] **Step 4: Run tests to verify they pass**
  Run: `cd apps/api && go test ./internal/document/... ./internal/customer/... ./internal/joborder/... -v`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add apps/api/
  git commit -m "feat(api): add job documents listing and grant viewer read access"
  ```

---

### Task 2: Typography (Kanit), Theme Tokens & Global Styles

**Files:**
- Modify: `apps/web/index.html`
- Modify: `apps/web/src/index.css`
- Modify: `apps/web/tailwind.config.js`

**Interfaces:**
- Produces: Global CSS font-family `'Kanit', sans-serif` and Tailwind utility classes for Modern Slate & Sky Blue theme.

- [ ] **Step 1: Add Google Font Kanit in `index.html`**
  Add preconnect and stylesheet link:
  `<link href="https://fonts.googleapis.com/css2?family=Kanit:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">`

- [ ] **Step 2: Configure font and colors in `tailwind.config.js` & `index.css`**
  Set `fontFamily: { sans: ['Kanit', 'sans-serif'] }`.
  Ensure `bg-slate-50`, `border-slate-200`, and `sky` color palette are available.

- [ ] **Step 3: Verify build**
  Run: `cd apps/web && npm run build`
  Expected: PASS without styling or font errors.

- [ ] **Step 4: Commit**
  ```bash
  git add apps/web/index.html apps/web/tailwind.config.js apps/web/src/index.css
  git commit -m "feat(web): add Google Font Kanit and configure Slate & Sky theme"
  ```

---

### Task 3: Core Layout (`AppLayout`, `DocFlowSidebar`, `DocFlowHeader`, `MobileBottomNav`)

**Files:**
- Create: `apps/web/src/components/layout/AppLayout.tsx`
- Create: `apps/web/src/components/layout/DocFlowSidebar.tsx`
- Create: `apps/web/src/components/layout/DocFlowHeader.tsx`
- Create: `apps/web/src/components/layout/MobileBottomNav.tsx`
- Modify: `apps/web/src/app/App.tsx`
- Test: `apps/web/src/components/layout/AppLayout.test.tsx`

**Interfaces:**
- Consumes: User auth info from `getAuthToken()` / decoded JWT payload or state (`role`: `admin` | `staff` | `viewer`).
- Produces: Responsive container that conditionally renders:
  - Desktop: `DocFlowSidebar` (collapsible) + `DocFlowHeader` (Omni-search with `⌘K`).
  - Mobile: `MobileBottomNav` (Admin: 4 tabs, Staff: 3 tabs, Viewer: 2 tabs).

- [ ] **Step 1: Write the failing tests**
  Create `AppLayout.test.tsx` asserting:
  - Role `viewer` does not render CSV Import or Users links.
  - Role `staff` does not render Users link.
  - Role `admin` renders all 4 links.

- [ ] **Step 2: Run test to verify it fails**
  Run: `cd apps/web && npx vitest run src/components/layout/AppLayout.test.tsx`
  Expected: FAIL (components do not exist yet).

- [ ] **Step 3: Implement components**
  - Implement `DocFlowSidebar`: Clean white card, brand logo, collapsible toggle, strictly role-filtered nav items.
  - Implement `DocFlowHeader`: Global search bar with `⌘K` shortcut hook, language toggle, degraded health indicator, user profile pill, logout button.
  - Implement `MobileBottomNav`: Bottom tab bar with icons and labels, rendered only on mobile (`md:hidden`).
  - Implement `AppLayout`: Wraps child routes with sidebar, header, and mobile bottom nav.
  - Update `App.tsx` routes to use `AppLayout`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cd apps/web && npx vitest run src/components/layout/AppLayout.test.tsx`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add apps/web/src/components/layout/ apps/web/src/app/App.tsx
  git commit -m "feat(web): add responsive AppLayout with role-based navigation and Kanit typography"
  ```

---

### Task 4: `JobDetailSlideover` (Desktop Slideover & Mobile Bottom Sheet)

**Files:**
- Create: `apps/web/src/features/search/JobDetailSlideover.tsx`
- Test: `apps/web/src/features/search/JobDetailSlideover.test.tsx`

**Interfaces:**
- Consumes: `jobOrderId: string`, `onClose: () => void`, `userRole: string`.
- Queries: `GET /api/v1/job-orders/:id/documents` via TanStack Query.
- Mutations: `POST /api/v1/job-orders/:id/documents` for uploading files with `Idempotency-Key`.
- Produces: Responsive Slide-over Drawer (Desktop) & Bottom Sheet (Mobile) with Checklist and Drag-Drop upload zone.

- [ ] **Step 1: Write the failing test**
  Create `JobDetailSlideover.test.tsx` testing that:
  - When `userRole === 'viewer'`, the file upload dropzone is hidden.
  - When `userRole === 'staff'`, the upload dropzone is visible, but delete buttons are hidden.
  - When `userRole === 'admin'`, both upload and delete buttons are visible.

- [ ] **Step 2: Run test to verify it fails**
  Run: `cd apps/web && npx vitest run src/features/search/JobDetailSlideover.test.tsx`
  Expected: FAIL

- [ ] **Step 3: Implement `JobDetailSlideover`**
  - Desktop: Slide-over panel (460px width) with smooth slide transition.
  - Mobile: Slide-up Bottom Sheet (85vh height) with swipe/close handle.
  - Document checklist (Invoice, Packing List, B/L, Customs Form) with badges (`✓ มีแล้ว`, `⚠️ ขาด`).
  - Drag-and-drop dropzone calling `POST /api/v1/job-orders/:id/documents` with auto-generated UUID idempotency key.
  - File download items triggering `/api/v1/dl/:token`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cd apps/web && npx vitest run src/features/search/JobDetailSlideover.test.tsx`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add apps/web/src/features/search/JobDetailSlideover.tsx apps/web/src/features/search/JobDetailSlideover.test.tsx
  git commit -m "feat(web): add JobDetailSlideover component with checklist and mobile bottom sheet"
  ```

---

### Task 5: `SearchPage` Redesign (Desktop Table + Mobile Job Cards + Quick Filter Tabs)

**Files:**
- Modify: `apps/web/src/features/search/SearchPage.tsx`
- Test: `apps/web/src/features/search/SearchPage.test.tsx`

**Interfaces:**
- Consumes: `/api/v1/search` and `/api/v1/reports/missing-documents`.
- Produces: Search workspace with:
  - Metric summary cards (Total, Complete, Missing Docs, Query latency).
  - Quick filter tabs ("ทั้งหมด", "⚠️ รอเอกสารเพิ่ม", "✅ เอกสารครบ").
  - Desktop table: TanStack Table with row click opening `JobDetailSlideover`.
  - Mobile cards (`md:hidden`): Touch-friendly card stack with status badges and quick action buttons.

- [ ] **Step 1: Write the failing test**
  Assert that clicking a row or action button opens the Slide-over Inspector.

- [ ] **Step 2: Run test to verify it fails**
  Run: `cd apps/web && npx vitest run src/features/search/SearchPage.test.tsx`

- [ ] **Step 3: Implement the new `SearchPage`**
  - Implement metrics summary cards using Modern Slate & Sky Blue palette.
  - Connect quick filter tabs.
  - Render desktop table with clean typography and hover states.
  - Render mobile cards view (`block md:hidden`).
  - Wire up `selectedJobOrder` state to trigger `JobDetailSlideover`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cd apps/web && npx vitest run src/features/search/SearchPage.test.tsx`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add apps/web/src/features/search/SearchPage.tsx apps/web/src/features/search/SearchPage.test.tsx
  git commit -m "feat(web): redesign SearchPage with metrics, mobile cards, and Slideover integration"
  ```

---

### Task 6: Redesign `CSVImportPage`, `CustomerManagementPage`, `UserManagementPage`, and `LoginPage`

**Files:**
- Modify: `apps/web/src/features/import/CSVImportPage.tsx`
- Modify: `apps/web/src/features/customer/CustomerManagementPage.tsx`
- Modify: `apps/web/src/features/user/UserManagementPage.tsx`
- Modify: `apps/web/src/features/auth/LoginPage.tsx`

**Interfaces:**
- Harmonizes all auxiliary pages into the Modern Slate & Sky Blue design system with Kanit font.
- Hides the "Merge Customers" action from non-admins.

- [ ] **Step 1: Refactor `CSVImportPage`**
  Update styling: Drag-and-drop zone, classification pills (New, Update, Conflict, Error), clean preview table.

- [ ] **Step 2: Refactor `CustomerManagementPage`**
  Update styling: Customer directory cards/table, Tax ID formatting. Ensure Merge Customer modal button is only rendered for `admin`.

- [ ] **Step 3: Refactor `UserManagementPage` & `LoginPage`**
  Update styling: User list, role tags, session expired banner, quick preset login buttons.

- [ ] **Step 4: Verify frontend build**
  Run: `cd apps/web && npm run build`
  Expected: PASS with 0 TypeScript and 0 styling errors.

- [ ] **Step 5: Commit**
  ```bash
  git add apps/web/src/features/
  git commit -m "feat(web): update CSV import, customer, user, and login pages to Slate & Sky theme"
  ```

---

### Task 7: Full Container Build, Integration & Multi-Role Screenshot Verification

**Files:**
- Script: `apps/web/capture_screens.js`

**Interfaces:**
- Produces: Live updated containers (`deploy-fe-1..3`, `deploy-be-1..3`) and verified screenshots across Desktop and Mobile for Admin, Staff, and Viewer.

- [ ] **Step 1: Rebuild and deploy containers**
  Run: `docker compose -f deploy/docker-compose.yml up -d --build fe-1 fe-2 fe-3 be-1 be-2 be-3`
  Expected: All containers healthy and serving on port 80.

- [ ] **Step 2: Run automated screenshot capture**
  Execute Playwright capture script capturing:
  - `desktop_admin_overview.png`
  - `desktop_staff_slideover.png`
  - `desktop_viewer_readonly.png`
  - `mobile_staff_cards.png`
  - `mobile_staff_bottom_sheet.png`

- [ ] **Step 3: Verify all test suites**
  Run: `cd apps/web && npm test`
  Run: `cd apps/api && go test ./...`
  Expected: ALL PASS.

- [ ] **Step 4: Commit and tag**
  ```bash
  git add .
  git commit -m "feat: complete UI/UX redesign with Kanit, Slate & Sky theme, and responsive Slideover"
  git tag v0.9.0
  ```
