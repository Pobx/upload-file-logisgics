# Design Document: Modern Minimal Dashboard & Operational UI

**Date:** 2026-10-28  
**Topic:** Modern Minimal Dashboard, 1-Click Operations Hub, and Mobile-First Action Queue  
**Target:** Frontend (`apps/web`)  
**Status:** Approved for Implementation  

---

## 1. Intent & Operational Context

The DocSearch Logistics platform is utilized daily by Customer Service (CS) officers, documentation specialists, and logistics supervisors.
- **Pain Point:** Previous screens required multi-step navigation to inspect documents, lacked an executive overview ribbon, and in mobile viewport, dense operational queues overflowed horizontally, cramping text and actions.
- **Core Design Objective:** 
  Implement a **Modern Minimal Dashboard & Operational UI** centered around:
  1. **Maximum Legibility & Calm Visuals:** Generous whitespace, soft slate borders (`border-slate-100`/`200`), minimal color clutter, high typographic contrast using font **Kanit**.
  2. **1-Click Minimum Steps Interaction:** 
     - 1-Click Quick Filter Pills (`ทั้งหมด`, `🚨 ขาด B/L`, `⏳ รอตรวจ`, `✓ พร้อมปล่อย`).
     - 1-Click Action Buttons (`แนบ B/L`, `ยืนยันพิกัด`, `ดูเอกสาร`) accessible directly on every job card/row.
     - Slide-over Drawer for document inspection and file attachment with zero page reloads.
  3. **Mobile-First Action Queue (No Overflow):**
     - Dedicated **Touch Cards** on screen widths `< 768px` (`md:hidden`) with a clear 3-row anatomy: Top ID + Badge, Middle Customer + Invoice, Bottom Micro Progress Dots + 1-Click Action button.
     - Smooth horizontal scrolling filter pills with hidden scrollbars (`no-scrollbar`).
  4. **Integrated Visual Analytics:** Donut Readiness Gauge (target $\ge 80\%$) and 7-Day intake vs. clearance volume flow.

---

## 2. Goals, Non-Goals, and Anti-Goals

### 2.1 Goals
1. **Top KPI Minimalist Ribbon:** 4 compact cards displaying All Today, Missing House B/L, Pending Customs Verification, and Ready to Release.
2. **Action Queue Mobile Touch Cards:** Fix all horizontal overflow on mobile viewports ($\le 390\text{px}$). Ensure text truncates cleanly and touch targets meet $\ge 44\text{px}$.
3. **1-Click Operations:** Immediate slide-over drawer activation for viewing/attaching documents.
4. **Role-Based Least Privilege:** Strictly omit write action buttons from the DOM for Viewer roles.
5. **Zero Library Bloat:** Pure SVG and Tailwind CSS only. Maintain 100% test suite pass rate (`vitest`) and successful production build (`tsc -b && vite build`).

### 2.2 Non-Goals
- Changing database schema or backend APIs (frontend derives KPI and filter counts from search item data).
- Modifying authentication or Keycloak configurations.

### 2.3 Anti-Goals
- Nested modals or multi-click dialog trees that slow down CS officers during live calls.
- Horizontal layout squishing on mobile that forces micro-text or horizontal page scroll.

---

## 3. UI/UX Architecture & Specifications

### 3.1 Top KPI Ribbon Anatomy
- **All Today (งานทั้งหมดวันนี้):** Total count of active job orders.
- **Missing House B/L (ขาด House B/L):** Count of jobs where `bl_no` is null/empty or missing doc type 1 (`text-rose-600 bg-rose-50/20`).
- **Pending Verification (รอตรวจพิกัด):** Count of jobs pending customs HS classification (`text-amber-600 bg-amber-50/20`).
- **Ready for Release (พร้อมปล่อยตู้):** Count of completely documented jobs (`text-emerald-600 bg-emerald-50/20`).

### 3.2 Mobile Touch Card Anatomy (`md:hidden`)
- **Row 1 (Header):** `JOB-2026-XXXX` (mono bold) + Status Badge on the right.
- **Row 2 (Body):** Customer Name (bold, truncate) + `INV-XXXX` • B/L status.
- **Row 3 (Footer):** 3-segment progress indicator (`2/3 เอกสาร`) + 1-Click Action button (`+ แนบ B/L`).

### 3.3 Desktop Row Anatomy (`hidden md:block`)
- Single clean horizontal flex row with generous spacing, hover highlight, micro progress dots, and 1-click action buttons.

---

## 4. Verification & Testing Strategy
- Unit tests for all chart components and search page integration.
- Verification of role-based visibility (Viewer strictly cannot see action buttons).
- Production build validation (`npm run build --prefix apps/web`).
- Live Playwright screenshot capture on desktop (1440px) and mobile (390px).
