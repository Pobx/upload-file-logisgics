# Vertical Slice Clean Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `apps/web` into a domain-driven **Vertical Slice Clean Architecture** with strict TypeScript, decoupling presentation, use cases, domain models, and API infrastructure while maintaining 100% pass rate on all 59 unit tests and production build.

**References:**
- [Vertical Slice Architecture in React Native / React (Piliar)](https://www.piliar.me/blog/vertical-slice-architecture-react-native/)
- [Folder Structuring Techniques for Modern React Projects (Fpaghar)](https://dev.to/fpaghar/folder-structuring-techniques-for-beginner-to-advanced-react-projects-30d7)

---

## File Structure Map
```text
apps/web/src/
├── app/                           # App Shell & Routing
│   ├── App.tsx
│   └── routes.tsx
├── shared/                        # Cross-Cutting Shared Modules
│   ├── lib/                       # httpClient.ts, tokenStorage.ts, i18n.ts
│   ├── types/                     # api.ts (ApiResponse, ApiError)
│   └── components/                # layout/ (AppLayout, DocFlowHeader, DocFlowSidebar, MobileBottomNav)
└── features/                      # Vertical Domain Slices
    ├── identity/                  # Auth, Users & RBAC
    ├── partners/                  # Customers & Shipping Lines
    ├── document-ingest/           # CSV Import & File Ingest
    └── shipments/                 # Jobs, Triage, Charts, MicroProgressBar, Slideover
```

---

## Tasks

### Task 1: Shared Core Scaffolding (`shared/`)
- [x] Create `apps/web/src/shared/types/api.ts` with generic `ApiResponse<T>`, `ApiError`, and pagination types.
- [x] Create `apps/web/src/shared/lib/tokenStorage.ts` for JWT token access (`getAuthToken`, `setAuthToken`, `getUserInfo`).
- [x] Create `apps/web/src/shared/lib/httpClient.ts` (Axios client with bearer auth interceptor and error formatting).
- [x] Move `apps/web/src/components/layout/` to `apps/web/src/shared/components/layout/` and update references.
- [x] Re-export backwards-compatible helpers in `apps/web/src/lib/api-client.ts` so existing features continue running seamlessly.
- [x] Run `npm test --prefix apps/web` to confirm all 59 tests continue to pass.
- [x] Commit: `git commit -m "refactor(shared): scaffold shared types, httpClient, and layout components"`

---

### Task 2: Identity Vertical Slice (`features/identity/`)
- [ ] Create `apps/web/src/features/identity/types/`: `user.ts`, `auth.ts`, `role.ts`.
- [ ] Create `apps/web/src/features/identity/api/`: `authApi.ts`, `userApi.ts`, `identityDto.ts`.
- [ ] Create `apps/web/src/features/identity/hooks/`: `useAuth.ts`, `useUsers.ts`.
- [ ] Move `features/auth/LoginPage.tsx` and `features/user/UserManagementPage.tsx` into `features/identity/`.
- [ ] Create `apps/web/src/features/identity/index.ts` with public barrel exports (`LoginPage`, `UserManagementPage`, `useAuth`, `getUserInfo`, `canUploadDocuments`).
- [ ] Remove deprecated `features/auth/` and `features/user/` directories.
- [ ] Update `app/App.tsx` imports to use `@/features/identity`.
- [ ] Run `npm test --prefix apps/web` to verify tests pass.
- [ ] Commit: `git commit -m "refactor(identity): migrate auth and user management to identity vertical slice"`

---

### Task 3: Partners Vertical Slice (`features/partners/`)
- [ ] Create `apps/web/src/features/partners/types/`: `customer.ts`.
- [ ] Create `apps/web/src/features/partners/api/`: `customerApi.ts`, `customerDto.ts`.
- [ ] Create `apps/web/src/features/partners/hooks/`: `useCustomers.ts`.
- [ ] Move `features/customer/CustomerManagementPage.tsx` into `features/partners/`.
- [ ] Create `apps/web/src/features/partners/index.ts` with public barrel exports (`CustomerManagementPage`, `customerApi`).
- [ ] Remove deprecated `features/customer/` directory.
- [ ] Update `app/App.tsx` imports to use `@/features/partners`.
- [ ] Run `npm test --prefix apps/web` to verify tests pass.
- [ ] Commit: `git commit -m "refactor(partners): migrate customer management to partners vertical slice"`

---

### Task 4: Document Ingestion Vertical Slice (`features/document-ingest/`)
- [ ] Create `apps/web/src/features/document-ingest/types/`: `import.ts`.
- [ ] Create `apps/web/src/features/document-ingest/api/`: `ingestApi.ts`.
- [ ] Create `apps/web/src/features/document-ingest/hooks/`: `useCSVImport.ts`.
- [ ] Move `features/import/CSVImportPage.tsx` into `features/document-ingest/`.
- [ ] Create `apps/web/src/features/document-ingest/index.ts` with public barrel exports (`CSVImportPage`).
- [ ] Remove deprecated `features/import/` directory.
- [ ] Update `app/App.tsx` imports to use `@/features/document-ingest`.
- [ ] Run `npm test --prefix apps/web` to verify tests pass.
- [ ] Commit: `git commit -m "refactor(ingest): migrate csv import to document-ingest vertical slice"`

---

### Task 5: Shipments & Operations Vertical Slice (`features/shipments/`)
- [ ] Create `apps/web/src/features/shipments/types/`: `shipment.ts`, `triage.ts`, `status.ts`.
- [ ] Create `apps/web/src/features/shipments/api/`: `shipmentApi.ts`, `shipmentDto.ts`, `shipmentMapper.ts`.
- [ ] Create `apps/web/src/features/shipments/utils/`: `partitionMath.ts`, `statusRules.ts`.
- [ ] Create `apps/web/src/features/shipments/hooks/`: `useShipmentSearch.ts`, `useShipmentTriage.ts`.
- [ ] Move `features/search/charts/` and `features/search/JobDetailSlideover.tsx` to `features/shipments/components/` along with their unit tests.
- [ ] Refactor `SearchPage.tsx` into `ShipmentsPage.tsx` utilizing `useShipmentSearch` and clean presentation composition.
- [ ] Move `SearchPage.test.tsx` to `ShipmentsPage.test.tsx` under `features/shipments/`.
- [ ] Create `apps/web/src/features/shipments/index.ts` with public barrel exports (`ShipmentsPage`, `SearchPage` alias, `TopKPIRibbon`, `ActionQueueCards`).
- [ ] Remove deprecated `features/search/` directory.
- [ ] Run full test suite: `npm test --prefix apps/web` to verify all 59 tests pass.
- [ ] Commit: `git commit -m "refactor(shipments): migrate search, charts, and triage to shipments vertical slice"`

---

### Task 6: Application Shell Cleanup & Verification
- [ ] Update `apps/web/src/app/App.tsx` to strictly import from feature slice barrel exports.
- [ ] Clean up redundant shims in `apps/web/src/lib/api-client.ts`.
- [ ] Run full test suite (`npm test --prefix apps/web`) confirming 59/59 tests green.
- [ ] Run production build (`npm run build --prefix apps/web`) confirming zero bundling errors.
- [ ] Capture live screenshots on desktop and mobile confirming visual regression is 0%.
- [ ] Execute whole-branch review with Principal Code Reviewer.
- [ ] Commit: `git commit -m "chore: complete vertical slice clean architecture refactoring"`
