# Design Document: Vertical Slice Clean Architecture Refactoring

**Date:** 2026-10-28  
**Topic:** Frontend Architecture Modernization: Vertical Slice Clean Architecture with Strict TypeScript  
**Target:** `apps/web`  
**Reference Standards:**
- [Vertical Slice Architecture in React Native / React (Piliar)](https://www.piliar.me/blog/vertical-slice-architecture-react-native/)
- [Folder Structuring Techniques for Modern React Projects (Fpaghar)](https://dev.to/fpaghar/folder-structuring-techniques-for-beginner-to-advanced-react-projects-30d7)

---

## 1. Intent & Context

### 1.1 The Problem
The current frontend in `apps/web` has evolved rapidly to include rich visual charts, 1-click triage operations, role-based visibility, and slideover drawers. While all files are written in TypeScript, the codebase currently suffers from **horizontal layer coupling** and **monolithic page files**:
- `SearchPage.tsx` mixes HTTP fetching, local search state, URL query syncing, business logic (partition math for missing B/L, pending verification status), role permissions, and view composition in a single 300+ line file.
- `api-client.ts` acts as a global "catch-all" file containing API calls, types, and token helpers for unrelated domains (auth, search, customers, users, CSV import).
- Tests are co-located in ad-hoc locations without clear slice ownership boundaries.

### 1.2 The Goal
Refactor the frontend into **Vertical Slice Clean Architecture**, where the codebase is organized around **cohesive business domains** rather than technical roles. Each feature slice is self-contained with its own internal Clean Architecture layers:
- **Presentation (`components/`)**: Visual UI and user interaction components.
- **Application (`hooks/`)**: State management, queries, mutations, and orchestration (Use Cases).
- **Domain (`types/`, `utils/`)**: Pure domain models, entities, and business calculation rules.
- **Infrastructure (`api/`)**: DTOs, endpoint queries, and response mappers.

---

## 2. Target Domain Slices & Directory Map

```text
apps/web/src/
├── app/                           # Application Shell & Bootstrap
│   ├── App.tsx                    # Root routing & layout setup
│   ├── routes.tsx                 # Route definitions & guards
│   └── providers.tsx              # React Query, Router, Theme providers
│
├── features/                      # Vertical Domain Slices
│   │
│   ├── shipments/                 # [Domain 1: Job Orders, Triage & Documents]
│   │   ├── api/                   # shipmentApi.ts, shipmentDto.ts, shipmentMapper.ts
│   │   ├── components/            # TopKPIRibbon, ActionQueueCards, Charts, Slideover
│   │   ├── hooks/                 # useShipmentSearch.ts, useShipmentTriage.ts
│   │   ├── types/                 # shipment.ts, triage.ts, status.ts
│   │   ├── utils/                 # partitionMath.ts, statusRules.ts
│   │   ├── ShipmentsPage.tsx      # Main operational container view
│   │   └── index.ts               # Public slice exports (API surface)
│   │
│   ├── document-ingest/           # [Domain 2: CSV Import & Document Upload]
│   │   ├── api/                   # ingestApi.ts, ingestDto.ts
│   │   ├── components/            # CSVImportDropzone, ColumnMapper
│   │   ├── hooks/                 # useCSVImport.ts
│   │   ├── types/                 # import.ts
│   │   ├── CSVImportPage.tsx      # Main import container view
│   │   └── index.ts               # Public slice exports
│   │
│   ├── partners/                  # [Domain 3: Customers & Shipping Lines]
│   │   ├── api/                   # customerApi.ts
│   │   ├── components/            # CustomerTable, CustomerModal
│   │   ├── hooks/                 # useCustomers.ts
│   │   ├── types/                 # customer.ts
│   │   ├── CustomersPage.tsx      # Main customer container view
│   │   └── index.ts               # Public slice exports
│   │
│   └── identity/                  # [Domain 4: Auth, Users, Roles & Permissions]
│       ├── api/                   # authApi.ts, userApi.ts
│       ├── components/            # LoginForm, UserTable, RoleBadge
│       ├── hooks/                 # useAuth.ts, useUsers.ts
│       ├── types/                 # user.ts, auth.ts, role.ts
│       ├── LoginPage.tsx          # Login container view
│       ├── UsersPage.tsx          # User management container view
│       └── index.ts               # Public slice exports
│
└── shared/                        # Cross-Cutting Shared Modules
    ├── components/
    │   ├── layout/                # AppLayout, DocFlowHeader, DocFlowSidebar, MobileBottomNav
    │   └── ui/                    # Shared UI primitives (MicroProgressBar, Button, Card)
    ├── lib/                       # httpClient.ts (Axios instance), tokenStorage.ts, i18n.ts
    └── types/                     # api.ts (ApiResponse<T>, PaginatedResponse)
```

---

## 3. Key Architectural Rules & Constraints

### 3.1 Public Surface Rule (Barrel Exports)
- Every feature slice MUST expose its public interfaces through an `index.ts`.
- Files outside `features/shipments` can ONLY import from `@/features/shipments` or `../shipments`, never reach deep into internal files (e.g. `import { ... } from '@/features/shipments/components/internal/...'` is forbidden).

### 3.2 Clean Architecture Decoupling (DTO vs. Domain Model)
- API responses are typed as `DTOs` in `features/<feature>/api/<feature>Dto.ts`.
- The API layer maps DTOs into clean **Domain Entities** (`features/<feature>/types/`) using pure mapper functions (`mapper.ts`).
- UI components and hooks consume only Domain Entities, insulating the frontend from unexpected backend payload shape changes.

### 3.3 Strict TypeScript & Zero Any
- All types, props, and functions must be explicitly typed.
- Type definitions are placed in `types/` within each slice, with shared generic models in `shared/types/`.

### 3.4 Zero Regression Safety Net
- Existing 59 unit and integration tests across 10 test suites must remain green throughout each refactoring step.
- Test files will be co-located with their respective components and hooks inside the vertical slices.

---

## 4. Phased Implementation Roadmap

1. **Phase 1: Shared Core Scaffolding (`shared/`)**
   - Extract `httpClient` and `tokenStorage` from `lib/api-client.ts` to `shared/lib/`.
   - Organize shared layout components into `shared/components/layout/`.
2. **Phase 2: Identity Slice (`features/identity/`)**
   - Migrate `features/auth` and `features/user` into `features/identity/`.
   - Implement DTOs, mappers, domain types, and useAuth hook.
3. **Phase 3: Partners Slice (`features/partners/`)**
   - Migrate `features/customer` into `features/partners/`.
   - Structure `api/`, `types/`, and `components/`.
4. **Phase 4: Document Ingestion Slice (`features/document-ingest/`)**
   - Migrate `features/import` into `features/document-ingest/`.
5. **Phase 5: Shipments & Operations Slice (`features/shipments/`)**
   - Migrate `features/search` into `features/shipments/`.
   - Split `SearchPage.tsx` into `useShipmentSearch` hook, `useShipmentTriage` hook, and clean view composition.
   - Co-locate `TopKPIRibbon`, `ActionQueueCards`, `BentoTriageHeader`, charts, and `JobDetailSlideover`.
6. **Phase 6: Application Shell & Route Cleanup (`app/`)**
   - Update `app/App.tsx` and routing to consume public barrel exports from each slice.
   - Run full test suite (`npm test --prefix apps/web`) and production build (`npm run build --prefix apps/web`).
