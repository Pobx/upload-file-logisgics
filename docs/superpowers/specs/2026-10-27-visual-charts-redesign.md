# Design Document: Visual Charts & Bento Triage UI/UX Re-Design

**Date:** 2026-10-27  
**Topic:** Visual Analytics Charts (Donut Readiness & Weekly Volume Flow) with Bento Triage Workspace (Desktop & Mobile)  
**Target:** Frontend (`apps/web`) with existing backend (`apps/api`)  

---

## 1. Intent & The Why

### 1.1 The Operational Context
The primary user group for DocFlow Logistics is the **Customer Service (CS) team** and operational supervisors.
- In high-volume freight forwarding operations, CS officers process dozens of Job Orders daily, communicating constantly with shipping lines (Maersk, Evergreen, ONE), customs brokers, and corporate clients (e.g., Siam Cement Logistics, PTT Global Chemical, CP Foods).
- **Core Operational Pain Point**:
  Previously, operational status was communicated primarily via raw numbers and text tables (e.g., "5 jobs missing documents", "14 completed"). Text and numbers require cognitive effort to interpret under time pressure, especially when answering phone calls or handling urgent customs deadlines.
- **The Solution**:
  Introduce **intuitive visual charts and progress indicators** (Visual Data Ergonomics) that replace or augment plain numbers:
  1. **Donut Readiness Ring Chart**: An instant visual representation of shipment document completion (e.g. `82% พร้อมปล่อย` with green/amber/red color segments and shipping line breakdown).
  2. **Weekly Volume Flow Bar Chart**: 7-day intake and clearance comparison highlighting peak volume days (e.g. Wednesday peak) so the team can allocate staffing and prioritize tasks.
  3. **Micro Segment Progress Bars**: 3-segment visual bars directly on Job Cards (e.g. `[Invoice: Green] [Packing List: Green] [B/L: Red]`), allowing CS officers to spot missing documents at a single glance without reading text.
  4. **Seamless Mobile & Desktop Synergy**: Full responsiveness on both wide-screen desktops (1400px) and smartphones (iPhone 16 Pro / Android) with touch-friendly cards and a slide-up inspector sheet.

---

## 2. Goals, Non-Goals, and Anti-Goals

### 2.1 Goals
1. **Interactive Visual Charts**:
   - **Donut Readiness Chart**: Circular SVG ring showing document readiness rate (`82% พร้อมปล่อย`), categorized into Complete (Green `#10B981`), Missing B/L (Red `#F43F5E`), and In-Review (Amber `#F59E0B`), plus a proportional carrier bar (Maersk, Evergreen, ONE).
   - **Weekly Volume Bar Chart**: 7-day bar chart showing incoming documents vs. cleared shipments with peak workload indicators.
   - **Hybrid View on Desktop**: Ability to display both the Donut Chart and Weekly Bar Chart side-by-side for team leaders and executive users.
2. **Micro Progress Bars on Job Cards**:
   - Replace dense status text with compact 3-segment progress bars on each Job Order card.
3. **Responsive Mobile Architecture**:
   - Touch cards, horizontal scrollable triage pills, native bottom navigation bar, and slide-up Inspector Bottom Sheet with a direct camera document scan button.
4. **Ergonomic Styling & Typography**:
   - Google Font **Kanit** for modern Thai and English typography.
   - Eye-friendly light theme (`#F8FAFC` canvas, crisp `#FFFFFF` cards, `#0284C7` sky-blue accents) preventing glare and eye fatigue during long shifts.
5. **Strict Role-based Visibility**:
   - Admin: 4 menus (Dashboard, Jobs & Docs, Customers, User Management).
   - Staff (CS): 3 menus (Dashboard, Jobs & Docs, Customers). User Management completely hidden.
   - Viewer: 2 menus (Dashboard, Search & Docs). Customers, User Management, and all upload/edit action triggers completely hidden (Read-only).
6. **Zero Performance Regression & Test Integrity**:
   - Lightweight pure SVG charts with zero external charting library bloat (keeps bundle size minimal).
   - Maintain 100% pass rate on all unit and component test suites (`npm test --prefix apps/web`).

### 2.2 Non-Goals
- Changing database schema or backend APIs (the frontend computes chart aggregates from existing job order and document queries).
- Modifying authentication mechanisms (Keycloak JWT and role claims remain unchanged).

### 2.3 Anti-Goals
- Introducing heavy charting libraries (e.g. Chart.js, Highcharts, D3) that bloat the client bundle and slow down initial page loads. All charts are rendered with lightweight, accessible pure SVG components.
- Hiding critical action buttons behind nested submenus. All key actions (Scan, Upload, Share, Inspect) must be accessible within 1 tap/click.

---

## 3. Approaches Considered & Decision

### Approach 1 (Selected): Donut Readiness Rate + Bento Triage Workspace
- Combines the Donut Readiness Ring Chart with Bento triage boxes (Action Required alerts, ETA counts, carrier distribution).
- Micro progress bars embedded directly on Job Cards for instantaneous status recognition.
- **Why Selected**: Directly chosen by the user as the preferred visual direction ("ฉันชอบ Design ที่ 1"). Offers the highest visual clarity and immediate triage capability for Customer Service.

### Approach 2 (Rejected): 3-Pane Master-Detail Console
- High-density 3-pane layout without drawers.
- **Why Rejected**: Excellent for keyboard power-users on desktop, but less visually impactful for overall progress tracking and harder to adapt naturally to mobile screens without heavy context switching.

### Approach 3 (Rejected): Workflow Pipeline Kanban Board
- Multi-column stage board based on shipping lifecycle.
- **Why Rejected**: Requires wide horizontal space on desktop and shows fewer total jobs per viewport compared to the Bento and list views.

---

## 4. Component Architecture & Implementation Details

### 4.1 Component Hierarchy
```
apps/web/src/
├── components/
│   ├── charts/
│   │   ├── DocumentReadinessDonut.tsx   # Pure SVG Donut Chart with Legend & Carrier Bar
│   │   ├── WeeklyVolumeBarChart.tsx     # Pure SVG 7-day Bar Chart with Peak Indicator
│   │   └── MicroProgressBar.tsx         # 3-segment color-coded job card progress bar
│   ├── layout/
│   │   ├── AppLayout.tsx               # Responsive wrapper (Desktop Sidebar + Mobile Bottom Nav)
│   │   ├── DocFlowSidebar.tsx          # Role-adaptive desktop sidebar
│   │   ├── MobileBottomNav.tsx         # Role-adaptive mobile bottom bar
│   │   └── JobDetailSlideover.tsx      # Desktop drawer & Mobile bottom sheet inspector
│   └── jobs/
│       ├── BentoTriageHeader.tsx       # Action Required Hero Box + Chart Selector
│       ├── JobOrderCard.tsx            # Touch-friendly card with MicroProgressBar
│       └── JobOrderTable.tsx           # Desktop alternative view with sortable columns
```

### 4.2 Data Integration & Business Logic (Builder-Checked Decisions)

1. **MicroProgressBar Data Source (Zero N+1 Requests)**:
   - Evaluated directly from the existing search item fields (`bl_no`, `invoice_no`, `document_count`) and `GET /api/v1/dashboard/work-queue` data (`missing_bl`, `missing_invoice`, `verification_status`):
     - **Segment 1 (Commercial Invoice)**: Green (`#10B981`) if `!missing_invoice` or `invoice_no != null`; Red (`#F43F5E`) if missing.
     - **Segment 2 (Packing List)**: Green (`#10B981`) if `document_count >= 2`; Amber (`#F59E0B`) if in review.
     - **Segment 3 (Bill of Lading)**: Green (`#10B981`) if `!missing_bl` or `bl_no != null`; Amber (`#F59E0B`) if `verification_status == "pending_verification"`; Red (`#F43F5E`) if missing.
   - When the user clicks or taps a card, `JobDetailSlideover` / Bottom Sheet fetches `GET /api/v1/job-orders/:id/documents` for the detailed live file list.

2. **Donut Chart Categorization & Readiness Math**:
   - **Formula**: $\text{Readiness \%} = \frac{\text{Complete Jobs}}{\text{Total Active Jobs}} \times 100\%$
   - **Triage Precedence**:
     - `Missing B/L (Red)`: If `missing_bl == true` (highest priority alert).
     - `In-Review (Amber)`: If `verification_status == "pending_verification"` or `missing_invoice == true`.
     - `Complete (Green)`: If all core docs are present (`document_count >= 3` or verified).

3. **Weekly Volume & Carrier Breakdown (Builder's Call)**:
   - **Carrier Detection**: Inferred client-side using industry standard B/L prefix conventions (`MAEU`/`MSKU` $\rightarrow$ Maersk, `EGLV` $\rightarrow$ Evergreen, `ONEY` $\rightarrow$ ONE Line, other $\rightarrow$ Other Carriers).
   - **Weekly Volume Flow**: Aggregates job orders created across the current Monday–Sunday calendar window using `created_at`, paired with baseline operational targets.

---

## 5. Verification & Testing Plan

1. **Unit & Component Testing**:
   - `DocumentReadinessDonut.test.tsx`: Tests SVG segment rendering, math calculations, and empty/zero-job fallbacks.
   - `MicroProgressBar.test.tsx`: Tests segment color assignment for all combinations of missing/present documents.
   - Run `npm test --prefix apps/web` to confirm all 12 existing test suites pass.
2. **Visual & Responsive Verification**:
   - Capture desktop screenshot (1440x900) verifying Donut chart, Weekly Bar chart, and Hybrid view.
   - Capture mobile screenshot (390x844 iPhone 16 Pro) verifying touch cards, bottom navigation, and slide-up sheet.
3. **Role Permission Verification**:
   - Verify `admin_user`, `staff_user`, and `viewer_user` to ensure unauthorized menus and actions are strictly omitted.
