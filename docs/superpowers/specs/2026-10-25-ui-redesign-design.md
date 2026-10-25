# Design Document: UI/UX Re-Design for Logistics Document & Search System

**Date:** 2026-10-25  
**Topic:** UI/UX Re-Design & Ergonomics (Desktop & Mobile Responsive, Role-based Visibility)  
**Target:** Frontend (`apps/web`) with minimal read-only backend adjustments (`apps/api`)  

---

## 1. Intent & The Why

### 1.1 The Operational Context
The primary user group for this Logistics Document Upload & Search system is the **Customer Service (CS) team**.
- **Daily Routine**: CS officers are in constant communication throughout the day with customers, freight forwarders, shipping lines, customs brokers, and internal transport teams.
- **Primary Job to be Done (JTBD)**:
  1. **Fast Post-Task Document Filing**: Immediately after completing a shipment or operational task, CS must effortlessly archive/attach documents (Invoices, Packing Lists, Bill of Lading, Customs entries) into the corresponding Job Order without friction.
  2. **Lightning-Fast Retrospective Search**: When customers or internal teams inquire weeks or months later, CS must locate, verify completeness, and retrieve/download signed document links within 3 seconds, even while speaking on the telephone.
- **Problem with Current UI**:
  - The initial interface was functional but utilitarian, using generic top navigation, harsh plain borders, and missing operational context (no completion tracking, no drawer to inspect documents without full page shifts).
  - Lack of eye-friendly ergonomics for users staring at screens for 8+ hours a day.
  - Mobile responsiveness was limited to basic desktop down-scaling rather than touch-optimized patterns.

---

## 2. Goals, Non-Goals, and Anti-Goals

### 2.1 Goals
1. **Ergonomic Palette**: Implement **Modern Slate & Sky Blue** theme with off-white (`#F8FAFC`) canvas, crisp white (`#FFFFFF`) cards, soft borders (`#E2E8F0`), and clear sky-blue (`#0284C7`) interactive accents to prevent eye fatigue.
2. **Typography**: Adopt Google Font **Kanit** across both Thai and English content, ensuring modern and highly legible rendering.
3. **Desktop Architecture**:
   - Collapsible Left Sidebar navigation.
   - Global Omni-Search bar with keyboard shortcut (`⌘ + K` / `Ctrl + K`) focusing the search input.
   - Slide-over Inspector Drawer from the right: inspect document checklists and drag-and-drop new files without losing the list context or search filters.
4. **Mobile Architecture (Adaptive Responsive Patterns)**:
   - On screens `< 768px`, replace data tables with touch-friendly **Job Cards**.
   - Left Sidebar transforms into a native-like **Bottom Navigation Bar** within easy thumb reach.
   - Slide-over Drawer transforms into a **Slide-up Bottom Sheet** with quick camera/photo or PDF file picker.
5. **Strict Role-based Visibility**:
   - Unauthorized navigation items are **completely hidden** (not shown as disabled or locked).
   - Unauthorized actions (e.g. upload dropzones or delete buttons for Viewers) are not rendered.
6. **Backend Enhancements for Read Support**:
   - Add `GET /api/v1/job-orders/:id/documents` to return the real list of uploaded documents for the Slide-over Inspector.
   - Update `RequireRole` on read endpoints (`GET /api/v1/customers`, `GET /api/v1/job-orders/:id`, `GET /api/v1/job-orders/:id/documents`) to allow `viewer` read-only access.

### 2.2 Non-Goals
- Changing database schema or core domain entities.
- Changing authentication mechanisms (Keycloak JWT, local JWKS verification, and session lifecycle remain as-is).

### 2.3 Anti-Goals
- Introducing heavy UI component libraries (e.g., Ant Design, Material UI) that bloat bundle size. All components will be built cleanly using existing Tailwind CSS v3 and Lucide React icons.
- Cluttering the interface with unnecessary charts or animations that slow down the fast-paced search experience.

---

## 3. Approaches Considered

### Approach 1 (Selected): Modular In-Place Refactoring with Tailwind Design Tokens & Slide-over Drawer
- Re-architect layout into `AppLayout` with `DocFlowSidebar`, `DocFlowHeader`, `MobileBottomNav`, and `JobDetailSlideover`.
- Refactor all 4 core pages (`SearchPage`, `CSVImportPage`, `CustomerManagementPage`, `UserManagementPage`) to adopt the Modern Slate & Sky Blue palette and Kanit font.
- Implement strict conditional rendering of menu tabs and action buttons based on user role (`admin`, `staff`, `viewer`).
- *Trade-off*: Touches all frontend pages, but provides 100% UI consistency and leverages existing tested queries/stores with zero bundle overhead.

### Approach 2 (Rejected): Single CS-Only Command Center Route
- Keep old pages intact and create a single `/workspace` route for CS.
- *Why rejected*: Causes visual fragmentation; when CS users click on Customers or Import, they would be jarred by the old design.

### Approach 3 (Rejected): Component Library Migration (e.g. Radix / shadcn / AntD)
- *Why rejected*: Unnecessary dependency overhead; existing Tailwind CSS and Lucide React icons already provide full styling flexibility without bundle bloat.

---

## 4. Detailed Design Specification

### 4.1 Design Tokens & Typography
- **Font Family**: `'Kanit', sans-serif` loaded via Google Fonts CDN (`https://fonts.googleapis.com/css2?family=Kanit:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap`).
- **Canvas Background**: `bg-slate-50` (`#F8FAFC`).
- **Surface / Card Background**: `bg-white` (`#FFFFFF`).
- **Borders & Dividers**: `border-slate-200` (`#E2E8F0`) with subtle dividers `divide-slate-100`.
- **Text Primary**: `text-slate-900` (`#0F172A`).
- **Text Secondary / Muted**: `text-slate-500` (`#64748B`) / `text-slate-400` (`#94A3B8`).
- **Accent Primary**: `sky-600` (`#0284C7`), hover `sky-700` (`#0369A1`), focus ring `sky-100` (`#E0F2FE`).
- **Status Badges**:
  - Complete / Healthy: `bg-emerald-50 text-emerald-700 border-emerald-200`.
  - Pending / Missing Docs: `bg-amber-50 text-amber-700 border-amber-200`.
  - Error / Degraded: `bg-rose-50 text-rose-700 border-rose-200`.

### 4.2 Role-Based Navigation Matrix (Strict Hide for Unauthorized Menus)

| Navigation Item | Admin (`ROLE_ADMIN`) | Staff (`ROLE_STAFF`) | Viewer (`ROLE_VIEWER`) |
| :--- | :---: | :---: | :---: |
| 🔍 **Search & Documents** | Visible | Visible | Visible |
| 📥 **CSV Batch Import** | Visible | Visible | **Completely Hidden** |
| 🏢 **Customer Directory** | Visible (with Merge) | Visible (View Only) | Visible (View Only) |
| 👥 **User Management** | Visible | **Completely Hidden** | **Completely Hidden** |
| **Drawer Upload Zone** | Enabled (Upload & Delete) | Enabled (Upload Only) | **Completely Hidden (Read-only view)** |

### 4.3 Component Breakdown & Interactions

1. **`AppLayout` (`apps/web/src/components/layout/AppLayout.tsx`)**:
   - Houses `DocFlowSidebar` on desktop (collapsible) and `MobileBottomNav` on mobile (`< 768px`).
   - Sticky top bar with Omni-Search input (`⌘K` hotkey), Language Switcher (TH/EN), System Degraded Alert banner, and User Avatar with role pill.
2. **`JobDetailSlideover` (`apps/web/src/features/search/JobDetailSlideover.tsx`)**:
   - Desktop: Slides in from right (460px width) with backdrop overlay.
   - Mobile: Slides up from bottom (85vh height) as a Bottom Sheet with drag handle.
   - Contents:
     - Job Order #, Customer Name, B/L #, Created Date.
     - Document Checklist (Invoice, Packing List, B/L, Customs) with visual status tags.
     - Quick Drag & Drop dropzone for file upload (hidden for Viewer).
     - File download list triggering existing signed link endpoint `/api/v1/dl/:token`.
3. **`SearchPage` (`apps/web/src/features/search/SearchPage.tsx`)**:
   - Quick Filter Tabs:
     - "All Jobs": Queries `/api/v1/search`.
     - "Missing Documents": Queries `/api/v1/reports/missing-documents`.
   - Desktop view: Data Table using `@tanstack/react-table` with row click to trigger Slide-over.
   - Mobile view: Vertical stack of `JobCard` components with prominent action buttons.
4. **`CSVImportPage` (`apps/web/src/features/import/CSVImportPage.tsx`)**:
   - Clean drag-and-drop zone for `.csv` file.
   - Reconcile classification summary pills (New, Exists, Conflict, Format Error).
   - Preview diff table and Commit Batch button.
5. **`CustomerManagementPage` (`apps/web/src/features/customer/CustomerManagementPage.tsx`)**:
   - Customer table with Code, Name TH/EN, Tax ID, Status.
   - Merge button and modal (only rendered if user has Admin role).
6. **`UserManagementPage` (`apps/web/src/features/user/UserManagementPage.tsx`)**:
   - Rendered only for Admin. User list, role toggles, token denylist actions.

---

## 5. Builder Calls (Settled Technical Decisions)
1. **Slideover Document Retrieval**: Add `GET /api/v1/job-orders/:id/documents` returning `[]Document` so the Slide-over Drawer retrieves real document records and download tokens directly.
2. **Role Viewer Read Access**: Update backend `RequireRole` middleware on `GET /api/v1/customers` and `GET /api/v1/job-orders/:id` to include `"viewer"`, ensuring Viewers can view the Customer directory and open read-only Job details without 403 errors.
3. **Omni-Search (`⌘K`)**: Implemented as a global keyboard listener that focuses the header search bar on desktop.
4. **Sidebar Items**: Confined strictly to the 4 approved core pages (Search, CSV Import, Customers, Users).
