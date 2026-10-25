# Jira Backlog — Document Upload & Search System

> แตกจาก `DEVELOPMENT_PLAN.md` · อ้างอิง `SPEC.md` · ประมาณการเป็น **วันทำงาน (person-days)** เบื้องต้น — ควรประเมินใหม่ (story points/planning poker) ในวัน Planning ของแต่ละ Batch

## 1. โครงสร้างใน Jira

| ระดับ | ใช้แทน | หมายเหตุ |
|---|---|---|
| **Epic** | 1 Batch | key `B0`…`B8` (`B1a`, `B1b` แยกกัน) |
| **Story / Task** | 1 งานที่ส่งมอบได้ ≤ 2–3 วัน | Task = งานที่ไม่ใช่โค้ด (เอกสาร/ติดต่อภายนอก) |
| **Sub-task** | ขั้นตอนย่อยของ Story | ตั้งชื่อขึ้นต้นด้วย `[BE]` `[FE]` `[Infra]` `[QA]` `[Docs]` |
| **Sprint** | 1 Batch = 1–2 Sprint | ตามคอลัมน์ Sprint ด้านล่าง |
| **Fix Version** | tag release | `v0.<batch>.0` (1b = `v0.1.1`) |
| **Labels** | `be` `fe` `infra` `qa` `ops` `docs` + feature (`auth` `import` `storage` `search` `dashboard` `obs` `platform`) | |
| **Link** | `is blocked by` | ตามคอลัมน์ "Blocked by" ในแต่ละ Story |

**Definition of Ready** (ก่อนเข้า Sprint): มี Acceptance Criteria · API contract (OpenAPI) ตกลงแล้ว · ข้อมูลทดสอบพร้อม

**Definition of Done** (ใส่เป็น checklist ใน Story ทุกใบ): โค้ด review แล้ว · unit/integration/E2E ที่เกี่ยวข้องผ่าน · coverage ไม่ต่ำกว่า BE 80% / FE 70% · lint/type check ผ่าน · มี log + metric พื้นฐาน · เอกสารอัปเดต · deploy ผ่าน `docker compose up -d`

## 2. สรุป Epic

| Epic | ชื่อ | สัปดาห์ | Sprint | Fix Version | Stories | วัน |
|---|---|---|---|---|---:|---:|
| B0 | Foundation | W1 | Sprint 0 | v0.0.0 | 12 | 20 |
| B1a | Auth & Local Users | W2–W3 | Sprint 1 | v0.1.0 | 13 | 26.5 |
| B1b | LDAP/AD Federation | W4 | Sprint 2 | v0.1.1 | 6 | 9 |
| B2 | Customer & Master Data | W4–W5 | Sprint 2–3 | v0.2.0 | 9 | 19 |
| B3 | CSV Import | W6–W7 | Sprint 3–4 | v0.3.0 | 11 | 25 |
| B4 | Document Upload | W8–W9 | Sprint 4–5 | v0.4.0 | 12 | 22.5 |
| B5 | Search & Report | W10–W11 | Sprint 5–6 | v0.5.0 | 9 | 22 |
| B6 | Scale & Deploy | W12–W13 | Sprint 6–7 | v0.6.0 | 7 | 14 |
| B7 | Observability | W13–W14 | Sprint 7 | v0.7.0 | 6 | 12.5 |
| B8 | Hardening & UAT | W15–W17 | Sprint 8–9 | v0.8.0 | 7 | 23 |
| | **รวม** | | | | **92** | **193.5** |

Sub-task รวม 343 รายการ · ตัวเลขนี้ไม่รวมงาน Backlog/Phase 2 (OCR, HA, Customer Portal ฯลฯ) และไม่รวมเวลา review/ประชุม

## 3. Backlog

---

## Epic B0 — Foundation

**เป้าหมาย**: โครงโปรเจกต์และสภาพแวดล้อมพร้อมให้ทีมทำงานต่อเนื่อง · **Sprint**: Sprint 0 (W1) · **Fix Version**: v0.0.0

### B0-01 · Repo, monorepo และ Makefile

`infra` · Story · **1 วัน** · Blocked by: -

**Acceptance Criteria**
- [ ] โครงโฟลเดอร์ตาม SPEC 15
- [ ] `make up/down/test/lint/migrate` ทำงานได้

**Sub-tasks**: สร้างโครง monorepo · เขียน Makefile · README เริ่มต้น + วิธีรัน

### B0-02 · BE skeleton: Echo, config, logging, health endpoints

`be` · Story · **2 วัน** · Blocked by: B0-01

**Acceptance Criteria**
- [ ] `/healthz` ตอบเสมอ, `/readyz` เช็ก DB
- [ ] log เป็น JSON พร้อม `X-Request-ID`
- [ ] config อ่านจาก env

**Sub-tasks**: Go module + Echo · config (env) · slog + request-id middleware · `/healthz` `/readyz` · unit test

### B0-03 · BE resilience: DB connect retry, timeout ทุกชั้น, circuit breaker

`be` · Story · **2 วัน** · Blocked by: B0-02

**Acceptance Criteria**
- [ ] retry+backoff ~2 นาทีแล้ว exit ให้ compose restart
- [ ] timeout: connect 3 วิ / acquire 2 วิ / query 5 วิ
- [ ] DB ล่ม → HTTP 503 code `5030` + `Retry-After`; breaker เปิดหลังล้ม 5 ครั้ง/10 วิ

**Sub-tasks**: connect retry + backoff · pool timeouts · circuit breaker · metric `db_up` · integration test (pause DB)

### B0-04 · BE response envelope + pagination helper + error mapping (SPEC 9)

`be` · Story · **2.5 วัน** · Blocked by: B0-02

**Acceptance Criteria**
- [ ] ทุก endpoint ตอบ `{code,message,data}` (+`meta` ใน list)
- [ ] error ถูก map เป็น code ตามตาราง; list ว่างคืน `[]`; DELETE/logout ตอบ 200 + null
- [ ] pagination 2 แบบตาม SPEC 9.2: offset (`page/size/total`, ลึกสุด 10,000 แถว) และ keyset (`cursor`, `next_cursor/has_next`, ไม่มี `total`; cursor ผิด → `4000`)
- [ ] keyset ดึง `size+1` แถวเพื่อหา `has_next` แล้วตัดแถวเกินออก (ไม่ใช้ COUNT)

**Sub-tasks**: helper กลาง · error mapping จุดเดียว · helper pagination (offset/keyset, cursor opaque) · schema `PageMeta`/`CursorMeta` ใน OpenAPI · unit test

### B0-05 · วางโครง feature-based + generate TypeScript client จาก OpenAPI

`be,fe` · Story · **2 วัน** · Blocked by: B0-04

**Acceptance Criteria**
- [ ] BE: handler/service/repository/ports ตาม SPEC 5.4
- [ ] swaggo → OpenAPI → TS client สร้างใน CI

**Sub-tasks**: โครง BE features · โครง FE features/* · swaggo + generator · step ใน CI

### B0-06 · FE skeleton: Vite, React, TS, Tailwind, shadcn/ui

`fe` · Story · **2 วัน** · Blocked by: B0-01

**Acceptance Criteria**
- [ ] router, TanStack Query, i18n (TH/EN), layout เปล่า
- [ ] build และ lint ผ่าน

**Sub-tasks**: Vite + TS · Tailwind + shadcn/ui · router + Query · i18n · layout

### B0-07 · FE axios interceptor + error UX

`fe` · Story · **1.5 วัน** · Blocked by: B0-04, B0-06

**Acceptance Criteria**
- [ ] unwrap `data`/`meta`
- [ ] `code` → ข้อความ i18n
- [ ] `4010`/`4011` → หน้า login, `5030`/`5031` → แบนเนอร์

**Sub-tasks**: interceptor · mapping code → i18n · แบนเนอร์ระบบไม่พร้อม · MSW test

### B0-08 · DB: golang-migrate + sqlc + migration แรก

`be` · Story · **1 วัน** · Blocked by: B0-02

**Acceptance Criteria**
- [ ] migration แรกมี extension `pg_trgm`, `pg_stat_statements` และตาราง base
- [ ] sqlc generate ใน CI

**Sub-tasks**: ตั้ง golang-migrate · ตั้ง sqlc · migration แรก

### B0-09 · Compose dev + Keycloak realm import

`infra` · Story · **2 วัน** · Blocked by: B0-01

**Acceptance Criteria**
- [ ] `make up` เข้า Keycloak ได้
- [ ] services: postgres (ระบุ encoding UTF8 และ locale/collation ชัดเจน ปรับตามผล B2-00; ตั้ง `shared_preload_libraries=pg_stat_statements`), keycloak, SFTP จำลอง, worker, `migrate` (one-shot)
- [ ] realm `docsearch` + clients + roles import ได้

**Sub-tasks**: docker-compose.yml dev · realm export/import · service migrate · service worker (placeholder)

### B0-10 · Test infra: compose profile `testinfra`

`infra,qa` · Story · **2 วัน** · Blocked by: B0-09

**Acceptance Criteria**
- [ ] OpenLDAP + Samba + SFTP ขึ้นด้วย `--profile testinfra`
- [ ] `seed-testinfra.sh` สร้างผู้ใช้/กลุ่ม/CSV/เอกสารตัวอย่าง
- [ ] `mount-docstore.sh` mount SMB ใน Colima VM ได้

**Sub-tasks**: OpenLDAP + LDIF · Samba + share · SFTP · seed script · mount script

### B0-11 · CI pipeline

`infra` · Story · **1.5 วัน** · Blocked by: B0-02, B0-06

**Acceptance Criteria**
- [ ] lint → unit → integration → build image
- [ ] CI ผ่านด้วย test ตัวอย่างทั้ง BE/FE

**Sub-tasks**: pipeline · cache · test ตัวอย่าง BE/FE · integration ตัวอย่าง (testcontainers + Postgres)

### B0-12 · ขอข้อมูลภายนอกและตรวจสภาพแวดล้อม

`ops` · Task · **0.5 วัน** · Blocked by: -

**Acceptance Criteria**
- [ ] ส่งคำขอข้อมูล LDAP/AD ถึงทีม IT และข้อมูล NAS ถึงทีมดูแล (ใช้ตอน UAT ไม่บล็อกการพัฒนา)
- [ ] ตรวจเครือข่าย Colima → AD/NAS และสเปคเครื่อง Colima จริง

**Sub-tasks**: ส่งอีเมล/คำขอ · ตรวจเครือข่าย · บันทึกสเปคเครื่อง

---

## Epic B1a — Auth & Local Users

**เป้าหมาย**: ล็อกอินและจัดการผู้ใช้แบบ Local (Keycloak DB), logout พร้อม denylist · **Sprint**: Sprint 1 (W2–W3) · **Fix Version**: v0.1.0

### B1a-01 · BE: JWT middleware + RBAC + `/me`

`be,auth` · Story · **2 วัน** · Blocked by: B0-02, B0-09

**Acceptance Criteria**
- [ ] ตรวจลายเซ็น (JWKS cache), `iss`, `aud`, `exp`
- [ ] RBAC ต่อ route (admin/staff/viewer): ไม่ผ่าน → `4010`/`4030`

**Sub-tasks**: JWKS cache · middleware ตรวจ token · RBAC ต่อ route · `/me` · unit test

### B1a-02 · BE: `UserStore` interface + `keycloakstore`

`be,auth` · Story · **2 วัน** · Blocked by: B1a-01

**Acceptance Criteria**
- [ ] Admin API: create/update/reset password/enable-disable/assign role
- [ ] เปลี่ยน implementation ได้โดยไม่แตะ handler

**Sub-tasks**: interface · gocloak client + service account · implementation · integration test (Keycloak)

### B1a-03 · BE: `/users` CRUD, roles, ตรวจชื่อ/`employee_id` ซ้ำ

`be,auth` · Story · **2 วัน** · Blocked by: B1a-02, B0-04

**Acceptance Criteria**
- [ ] ซ้ำ → `409` code `4090` พร้อม id เดิม
- [ ] user ใหม่ถูกบังคับเปลี่ยนรหัสผ่านครั้งแรก

**Sub-tasks**: endpoints · validation + duplicate check · required action UPDATE_PASSWORD · test

### B1a-04 · Keycloak: User Profile attribute, mappers, password policy, brute-force

`infra,auth` · Story · **1.5 วัน** · Blocked by: B0-09

**Acceptance Criteria**
- [ ] attribute `position`, `department`, `employeeId` (แก้ได้เฉพาะ admin)
- [ ] claim ใน token, นโยบายรหัสผ่าน ≥ 12 ตัว, brute-force เปิด

**Sub-tasks**: User Profile · protocol mappers · password policy · brute-force · อัปเดต realm export

### B1a-05 · Worker: River setup + periodic job scaffold

`be` · Story · **1.5 วัน** · Blocked by: B0-09

**Acceptance Criteria**
- [ ] `cmd/worker` ทำงาน, คิว `import` และคิวอื่นแยกกัน
- [ ] periodic job ตัวอย่างรันได้, BE ตั้ง `RUN_WORKERS=false`

**Sub-tasks**: เพิ่ม River + migration · worker binary · คิว/concurrency config · `/healthz` ของ worker

### B1a-06 · BE: `user_profiles` + upsert จาก claim + sync รายวัน + `POST /users/sync`

`be,auth` · Story · **2 วัน** · Blocked by: B1a-01, B1a-04, B1a-05

**Acceptance Criteria**
- [ ] upsert ตอน login (ไม่ถี่เกิน 1 ครั้ง/5 นาที/user)
- [ ] job sync 02:00 ผ่าน Admin API; ผู้ใช้ที่หายไป → `is_active=false` ไม่ลบแถว

**Sub-tasks**: ตาราง + upsert · periodic job · sync endpoint · test

### B1a-07 · FE: login/logout/refresh + route guard

`fe,auth` · Story · **2.5 วัน** · Blocked by: B0-06, B1a-01

**Acceptance Criteria**
- [ ] `react-oidc-context` (PKCE), token อยู่ใน memory เท่านั้น
- [ ] guard ตาม role; refresh อัตโนมัติ

**Sub-tasks**: oidc setup · login/callback · refresh · route guard + `<Can>` · MSW test

### B1a-08 · FE: หน้า User (list/create/edit/reset password/role)

`fe,auth` · Story · **3 วัน** · Blocked by: B1a-03, B1a-07

**Acceptance Criteria**
- [ ] admin จัดการผู้ใช้ได้ครบ; staff/viewer เข้าไม่ได้
- [ ] แสดงคอลัมน์ source (`local`/`ldap`)

**Sub-tasks**: list + filter · form create/edit · reset password · assign role · test

### B1a-09 · BE: `audit_logs` + middleware บันทึก action

`be` · Story · **1.5 วัน** · Blocked by: B1a-01

**Acceptance Criteria**
- [ ] บันทึก login/logout/CRUD สำคัญ ไม่มี token/รหัสผ่านใน log

**Sub-tasks**: ตาราง · middleware · helper สำหรับ service · test

### B1a-10 · BE: denylist — `revoked_tokens` + in-memory + LISTEN/NOTIFY + poll

`be,auth` · Story · **3 วัน** · Blocked by: B1a-01, B1a-05

**Acceptance Criteria**
- [ ] เพิกถอน `sid`/`jti`/`sub` cutoff มีผลทุก node ≤ 2 วินาที
- [ ] connection LISTEN ต่อตรง Postgres; หลุด → reconnect + โหลดใหม่ + poll 5 วิ

**Sub-tasks**: ตาราง + index · loader ตอน start · LISTEN/NOTIFY listener · middleware เช็ก denylist · integration test 3 node

### B1a-11 · BE: logout, backchannel logout, `sub` cutoff, job ลบแถวหมดอายุ

`be,auth` · Story · **2 วัน** · Blocked by: B1a-10, B1a-02

**Acceptance Criteria**
- [ ] `POST /auth/logout` เพิกถอน + ปิด session; ตอบ 200 + `data:null`
- [ ] backchannel endpoint ภายในเท่านั้น; ปิด user/รีเซ็ตรหัสผ่าน → cutoff อัตโนมัติ

**Sub-tasks**: logout endpoint · backchannel (ตรวจ logout_token) · cutoff ตอนปิด user/reset · job cleanup · test

### B1a-12 · FE: logout flow

`fe,auth` · Story · **1 วัน** · Blocked by: B1a-07, B1a-11

**Acceptance Criteria**
- [ ] `signoutRedirect` + ล้าง Query cache
- [ ] ทุกแท็บ logout (BroadcastChannel); `4011` → หน้า login

**Sub-tasks**: ปุ่ม logout · BroadcastChannel · handle 4011/4010

### B1a-13 · Test: auth integration + E2E

`qa,auth` · Story · **2.5 วัน** · Blocked by: B1a-08, B1a-11, B1a-12

**Acceptance Criteria**
- [ ] login ทุก role; สิทธิ์ถูกบล็อก; replay token หลัง logout ได้ `401`
- [ ] สร้าง user/เปลี่ยน role/ปิด user ผ่าน E2E

**Sub-tasks**: integration (Keycloak) · E2E Playwright · เคส 3 node denylist

---

## Epic B1b — LDAP/AD Federation

**เป้าหมาย**: ผู้ใช้ LDAP/AD ล็อกอินผ่าน Keycloak (พัฒนาด้วย OpenLDAP จำลอง) · **Sprint**: Sprint 2 (W4) · **Fix Version**: v0.1.1

### B1b-01 · Keycloak: LDAP federation (READ_ONLY, LDAPS) + attribute mapper

`infra,auth` · Story · **2 วัน** · Blocked by: B1a-04, B0-10

**Acceptance Criteria**
- [ ] URL/Base DN/bind DN/ชื่อ attribute เป็น config (env)
- [ ] map `givenName` `sn` `title` `department` `employeeID` `mail`

**Sub-tasks**: provider config · truststore/CA · attribute mappers · อัปเดต realm export

### B1b-02 · Keycloak: AD group → role mapper, periodic sync, break-glass admin

`infra,auth` · Story · **1.5 วัน** · Blocked by: B1b-01

**Acceptance Criteria**
- [ ] กลุ่ม `docs-admin/staff/viewer` → role
- [ ] ไม่อยู่ในกลุ่มใด → เข้าระบบไม่ได้; sync ทุก 1 ชม.; local admin 1–2 บัญชี

**Sub-tasks**: group mapper · periodic sync · break-glass account

### B1b-03 · BE: ผู้ใช้ LDAP ใน `/users` แบบ read-only + เปิด/ปิดสิทธิ์ + sync ทันที

`be,auth` · Story · **1.5 วัน** · Blocked by: B1b-01, B1a-03

**Acceptance Criteria**
- [ ] คอลัมน์ source; แก้ข้อมูล/รหัสผ่านไม่ได้
- [ ] ปิดใช้งานแล้ว token ถูกเพิกถอน (cutoff)

**Sub-tasks**: list รวม local+ldap · enable/disable · sync now · test

### B1b-04 · FE: แสดง source + UI read-only สำหรับผู้ใช้ LDAP

`fe,auth` · Story · **1 วัน** · Blocked by: B1b-03, B1a-08

**Acceptance Criteria**
- [ ] ซ่อน/ปิดปุ่มแก้รหัสผ่านและข้อมูลสำหรับ LDAP

**Sub-tasks**: badge source · disable controls

### B1b-05 · Config สลับไป AD จริง + เตรียม alert LDAP bind fail

`infra,ops` · Story · **1 วัน** · Blocked by: B1b-01

**Acceptance Criteria**
- [ ] เอกสารค่า config ที่ต้องเปลี่ยนเมื่อต่อ AD จริง
- [ ] metric/health ของ LDAP bind

**Sub-tasks**: เอกสาร config · metric bind

### B1b-06 · Test: integration/E2E กับ OpenLDAP

`qa,auth` · Story · **2 วัน** · Blocked by: B1b-02, B1b-03

**Acceptance Criteria**
- [ ] ผู้ใช้ตามกลุ่มได้ role ถูก; ผู้ใช้ที่ถูกปิดเข้าไม่ได้
- [ ] หยุด LDAP แล้ว local admin ยังเข้าได้

**Sub-tasks**: integration · E2E · drill หยุด LDAP

---

## Epic B2 — Customer & Master Data

**เป้าหมาย**: จัดการ Customer, Job Order (B/L, Invoice) ด้วยมือและฟอร์ม · **Sprint**: Sprint 2–3 (W4–W5) · **Fix Version**: v0.2.0

### B2-00 · Spike: ตรวจการค้นหาข้อความไทยด้วย `pg_trgm` + locale ของ DB

`be,search` · Task · **1.5 วัน** · Blocked by: B0-08, B0-09

**Acceptance Criteria**
- [ ] ผลทดสอบกับชุดข้อมูลชื่อลูกค้า/ชื่อไฟล์ภาษาไทย (ไม่เว้นวรรค, วรรณยุกต์, ผสมไทย/อังกฤษ) ว่า exact/prefix/contains ได้ผลตามที่คาด
- [ ] ตรวจ encoding/locale ของฐานข้อมูล (pg_trgm อาศัย locale ในการนับตัวอักษร) และการ normalize (NFC, ตัดช่องว่าง/zero-width) แล้วสรุปเป็นข้อกำหนดของ DB + ADR ใหม่
- [ ] ถ้าไม่ผ่าน: เสนอทางเลือกสำรองพร้อมผลกระทบต่อ B2-01

**Sub-tasks**: สร้างชุดข้อมูลทดสอบภาษาไทย · ทดสอบ pg_trgm กับ locale/collation ที่เป็นไปได้ · ตรวจการ normalize · วัดผล + EXPLAIN · สรุปผลเป็น ADR

### B2-01 · DB: customers, job_orders, คอลัมน์ `*_norm`, index

`be` · Story · **1.5 วัน** · Blocked by: B0-08, B2-00

**Acceptance Criteria**
- [ ] `job_no` unique; index btree + trigram ของ Job/BL/Invoice
- [ ] ฟิลด์ใหม่: assignee, `data_source`, `verification_status`
- [ ] index ตาม `ORDER BY` + `id` ท้ายสุด: `job_orders (created_at DESC, id DESC)` (ปรับตามผล EXPLAIN)

**Sub-tasks**: migration · index · sqlc queries

### B2-02 · BE: Customers CRUD + merge

`be` · Story · **2 วัน** · Blocked by: B2-01, B1a-01

**Acceptance Criteria**
- [ ] ฟิลด์: ชื่อ รหัส tax id ผู้ติดต่อ หมายเหตุ
- [ ] merge ย้าย Job Order ทั้งหมดไปรายการหลัก
- [ ] list แบบ offset (`page/size/total`)

**Sub-tasks**: CRUD · normalize ชื่อ · merge (transaction) · audit · test

### B2-03 · BE: Job Orders CRUD + validation

`be` · Story · **2 วัน** · Blocked by: B2-01

**Acceptance Criteria**
- [ ] B/L, Invoice ซ้ำ → เตือนไม่บล็อก; `job_no` ซ้ำ → `4090`
- [ ] list Job Orders แบบ keyset (`cursor`, ไม่มี `total`) ตาม SPEC 9.2; มี detail

**Sub-tasks**: CRUD · rules · pagination · audit · test

### B2-04 · BE: ฟอร์ม Job Order (inline customer, assignee, bulk assign)

`be` · Story · **2 วัน** · Blocked by: B2-02, B2-03

**Acceptance Criteria**
- [ ] สร้างด้วยมือ: `data_source=manual`, `unverified`
- [ ] แก้หลัง `verified` → กลับ `unverified`; `POST /job-orders/assign`

**Sub-tasks**: create พร้อม customer ใหม่ใน tx · assignee validation · bulk assign · test

### B2-05 · FE: หน้า Customer (list/filter/form/merge)

`fe` · Story · **2.5 วัน** · Blocked by: B2-02, B1a-07

**Acceptance Criteria**
- [ ] TanStack Table + pagination; merge มีขั้นตอนยืนยัน

**Sub-tasks**: list · form · merge dialog · test

### B2-06 · FE: หน้า Job Order (list/detail)

`fe` · Story · **2.5 วัน** · Blocked by: B2-03

**Acceptance Criteria**
- [ ] กรองด้วย `verification_status`/assignee; badge conflict/unverified

**Sub-tasks**: list + filter · detail · badges · test

### B2-07 · FE: ฟอร์ม Job Order

`fe` · Story · **2.5 วัน** · Blocked by: B2-04, B2-06

**Acceptance Criteria**
- [ ] กรอก Job/B/L/Invoice/Customer (เลือกหรือสร้างใหม่)/assignee
- [ ] มอบหมายแบบกลุ่มจากรายการ

**Sub-tasks**: form + validation (Zod) · customer picker + create inline · bulk assign UI · test

### B2-08 · Test: unit/integration/E2E ของข้อมูลหลัก

`qa` · Story · **2.5 วัน** · Blocked by: B2-05, B2-07

**Acceptance Criteria**
- [ ] สร้าง Customer → Job Order → แก้ไข → merge ผ่าน E2E; สิทธิ์ตาม role

**Sub-tasks**: unit (normalize, validation) · integration (API, merge) · E2E

---

## Epic B3 — CSV Import

**เป้าหมาย**: นำเข้า CSV เป็น batch, ตรวจเทียบกับข้อมูลเดิม, ย้อนดูผลได้ · **Sprint**: Sprint 3–4 (W6–W7) · **Fix Version**: v0.3.0

### B3-01 · BE: upload CSV + `import_batches`/`import_rows`

`be,import` · Story · **2 วัน** · Blocked by: B2-01

**Acceptance Criteria**
- [ ] เก็บไฟล์ต้นฉบับใน storage ภายนอก (prefix `imports/`)
- [ ] สร้าง batch สถานะ `pending`

**Sub-tasks**: ตาราง · upload endpoint · เก็บไฟล์ผ่าน FileStorage (ชั่วคราวใช้ local จนกว่า B4) · test

### B3-02 · BE: middleware `Idempotency-Key` + `idempotency_keys`

`be,platform` · Story · **2 วัน** · Blocked by: B0-04

**Acceptance Criteria**
- [ ] lease 10 นาที, อายุ 24 ชม.; key เดิมคืน response เดิม
- [ ] request ต่าง → `4220`; กำลังรัน → `4091`; ขาด header → `4001`

**Sub-tasks**: ตาราง · middleware · job ลบแถวหมดอายุ · test

### B3-03 · BE: validate (dry-run) + preview + parser

`be,import` · Story · **2 วัน** · Blocked by: B3-01

**Acceptance Criteria**
- [ ] ตรวจ header/required/`JobOrder` ซ้ำในไฟล์; รองรับ BOM และ encoding
- [ ] preview + error รายแถว

**Sub-tasks**: CSV parser (stream) · validator · preview endpoint · test (BOM/encoding)

### B3-04 · BE: reconcile classifier (new/matched/fills_blank/conflict)

`be,import` · Story · **3 วัน** · Blocked by: B3-03, B2-01

**Acceptance Criteria**
- [ ] เทียบด้วย `job_no` แบบ normalize ตามตารางใน SPEC 2.4
- [ ] preview แสดงจำนวนแต่ละผล + รายงานเทียบ (CSV)

**Sub-tasks**: classifier · endpoint `/imports/{id}/reconcile` · รายงานเทียบ · unit test ครบ 4 ผล

### B3-05 · BE: commit (`queued` + enqueue ใน tx, `202`, `conflict_policy`)

`be,import` · Story · **1.5 วัน** · Blocked by: B3-04, B3-02, B1a-05

**Acceptance Criteria**
- [ ] สถานะและ job เกิดพร้อมกัน; ตอบ `202` code `2020`
- [ ] commit ซ้ำคืน batch เดิม

**Sub-tasks**: endpoint · enqueue ใน tx เดียวกัน · conflict_policy · test

### B3-06 · BE: import worker (stream, chunk 1,000, retry/resume)

`be,import` · Story · **3 วัน** · Blocked by: B3-05

**Acceptance Criteria**
- [ ] upsert ตามผล reconcile; ผลสถานะ `processing → completed*`
- [ ] คิว `import` concurrency 1; kill แล้ว resume จาก chunk ล่าสุด

**Sub-tasks**: worker job · chunk transaction · retry/resume · metric progress · test

### B3-07 · BE: `errors.csv` + endpoints สถานะ/ประวัติ

`be,import` · Story · **1.5 วัน** · Blocked by: B3-06

**Acceptance Criteria**
- [ ] `GET /imports`, `/imports/{id}`, `/errors.csv`
- [ ] `processed_rows/success_rows/error_rows` สำหรับ progress

**Sub-tasks**: endpoints · errors.csv stream · test

### B3-08 · BE: `import_conflicts` + resolve API

`be,import` · Story · **2 วัน** · Blocked by: B3-06

**Acceptance Criteria**
- [ ] `use_csv`/`keep_existing` รายการเดียวหรือเป็นกลุ่ม; ตั้ง `verified`
- [ ] ไม่สร้าง conflict ซ้ำเมื่อ import ซ้ำ; audit ค่าเดิม

**Sub-tasks**: ตาราง · list/resolve endpoints · ย้าย Customer เมื่อ use_csv · test

### B3-09 · FE: หน้า Import (upload, preview, error, progress, ประวัติ)

`fe,import` · Story · **3 วัน** · Blocked by: B3-07, B3-02

**Acceptance Criteria**
- [ ] สร้าง `Idempotency-Key` ต่อการกด + ปิดปุ่มระหว่างส่ง
- [ ] poll progress ทุก ~2 วินาที; เลือก `conflict_policy` ก่อน commit

**Sub-tasks**: upload + preview · reconcile summary · progress · history · test

### B3-10 · FE: หน้าข้อมูลขัดแย้ง

`fe,import` · Story · **2 วัน** · Blocked by: B3-08

**Acceptance Criteria**
- [ ] เลือกหลายรายการแล้ว resolve; badge ใน Job Order

**Sub-tasks**: list + filter · bulk resolve · test

### B3-11 · Test: import performance + resilience + E2E

`qa,import` · Story · **3 วัน** · Blocked by: B3-09, B3-10

**Acceptance Criteria**
- [ ] 100k แถว ≤ 2 นาที; แถวผิดไม่ทำให้ทั้งไฟล์ล้ม
- [ ] commit ซ้ำ/2 batch พร้อมกัน/POST ซ้ำด้วย key เดิม/kill worker ผ่านทั้งหมด

**Sub-tasks**: ชุดข้อมูล 100k · integration (kill/resume, concurrent) · E2E

---

## Epic B4 — Document Upload

**เป้าหมาย**: อัปโหลด/ดาวน์โหลดเอกสารผูก Job Order ผ่าน storage ภายนอก · **Sprint**: Sprint 4–5 (W8–W9) · **Fix Version**: v0.4.0

### B4-01 · DB: documents, document_types, `search_vector`, index, unique กันซ้ำ

`be,storage` · Story · **1 วัน** · Blocked by: B2-01

**Acceptance Criteria**
- [ ] unique `(job_order_id, sha256, document_type_id)` (ยังไม่ถูกลบ)
- [ ] ฟิลด์ `provided_by_*`, `storage_provider`, `storage_ref`

**Sub-tasks**: migration · index · sqlc

### B4-02 · BE: `FileStorage` port + storage contract tests

`be,storage` · Story · **1.5 วัน** · Blocked by: B0-05

**Acceptance Criteria**
- [ ] interface: Put/Open/Stat/Delete/Link; contract test ชุดเดียว

**Sub-tasks**: interface · contract test suite · fake in-memory

### B4-03 · BE: SFTP adapter

`be,storage` · Story · **2 วัน** · Blocked by: B4-02, B0-10

**Acceptance Criteria**
- [ ] SSH key + pin host key; เขียน `.part` แล้ว rename; pool/timeout/retry (idempotent เท่านั้น)

**Sub-tasks**: adapter · connection pool · config/secret · ผ่าน contract test

### B4-04 · BE: shared_folder adapter + health check (marker)

`be,storage` · Story · **2 วัน** · Blocked by: B4-02, B0-10

**Acceptance Criteria**
- [ ] file I/O + `.part` rename; ตรวจ marker `.docsearch-mount` กัน mount หลุด
- [ ] mount หลุด → code `5031`

**Sub-tasks**: adapter · marker health check · config `SHARED_FOLDER_PATH` · ผ่าน contract test

### B4-05 · BE: upload endpoint (streaming, sha256, MIME, Idempotency-Key, กันซ้ำ)

`be,storage` · Story · **3 วัน** · Blocked by: B4-01, B4-03, B3-02

**Acceptance Criteria**
- [ ] 1 ไฟล์/request; ตรวจ MIME จริง/ขนาด ≤ 50 MB/ชนิดไฟล์
- [ ] ลำดับ: `.part` → rename → INSERT+audit ใน tx; DB พลาด → ลบไฟล์
- [ ] ไฟล์ซ้ำ → `200` + `duplicate:true`

**Sub-tasks**: multipart streaming · validation · tx + compensation · dedup · test

### B4-06 · BE: `provided_by` + สิทธิ์อัปโหลดไม่ผูก assignee

`be` · Story · **1 วัน** · Blocked by: B4-05

**Acceptance Criteria**
- [ ] `provided_by_name/type` ไม่บังคับ; admin/staff อัปโหลดให้ Job Order ใดก็ได้

**Sub-tasks**: fields · validation · audit

### B4-07 · BE: download link (signed `/dl/{token}`) + soft delete

`be,storage` · Story · **2 วัน** · Blocked by: B4-05

**Acceptance Criteria**
- [ ] เช็กสิทธิ์+audit ตอนออกลิงก์และตอนใช้; อายุ ≤ 60 วินาที ผูก user+เอกสาร
- [ ] viewer ดาวน์โหลดได้แต่อัปโหลด/ลบไม่ได้; admin soft delete

**Sub-tasks**: link endpoint · HMAC token · stream endpoint · soft delete · test

### B4-08 · Worker: ไฟล์กำพร้า + retention purge

`be,storage` · Story · **1.5 วัน** · Blocked by: B4-05, B1a-05

**Acceptance Criteria**
- [ ] ไฟล์ไม่มีแถวใน DB เกิน 24 ชม. ถูกลบ
- [ ] `DOCUMENT_RETENTION_DAYS` (ค่าเริ่มต้น 0) + `PURGE_GRACE_DAYS`

**Sub-tasks**: orphan job · retention job · audit · test

### B4-09 · FE: แท็บเอกสารใน Job Order

`fe,storage` · Story · **3.5 วัน** · Blocked by: B4-05, B4-07, B2-06

**Acceptance Criteria**
- [ ] dropzone หลายไฟล์ (ส่งขนาน ≤ 3), progress, เลือกประเภท, ช่อง 'ผู้ส่ง' + autocomplete
- [ ] preview/download; แสดง `duplicate`; ซ่อนปุ่มตาม role

**Sub-tasks**: dropzone + queue · progress · ฟอร์มผู้ส่ง · preview/download · test

### B4-10 · Test infra: ซ้อมหยุด/เปิด Samba/SFTP

`qa,storage` · Story · **1.5 วัน** · Blocked by: B4-03, B4-04

**Acceptance Criteria**
- [ ] health check เจอ marker หาย, upload/download `5031`, alert ขึ้น, search ยังใช้ได้

**Sub-tasks**: drill script · ตรวจ alert/UX

### B4-11 · Test: unit/integration/E2E ของเอกสาร

`qa,storage` · Story · **2.5 วัน** · Blocked by: B4-09

**Acceptance Criteria**
- [ ] upload→download→ลบ ตาม role; upload ซ้ำ key เดิม; ไฟล์ซ้ำ; ไฟล์กำพร้า

**Sub-tasks**: unit · integration (SFTP testcontainers) · E2E

### B4-12 · (ตัวเลือก) ClamAV scan ด้วย config

`be,storage` · Story · **1 วัน** · Blocked by: B4-05

**Acceptance Criteria**
- [ ] เปิด/ปิดด้วย config; ไฟล์ติดไวรัสถูกปฏิเสธ

**Sub-tasks**: integration scan · config

---

## Epic B5 — Search & Report

**เป้าหมาย**: ค้นหาเร็วด้วย Job Order/B/L/Invoice, รายงาน และ dashboard · **Sprint**: Sprint 5–6 (W10–W11) · **Fix Version**: v0.5.0

### B5-01 · Data: generator ข้อมูลทดสอบ 1M Job Order + metadata เอกสาร

`be,qa` · Story · **1.5 วัน** · Blocked by: B4-01

**Acceptance Criteria**
- [ ] สร้างข้อมูลซ้ำได้ (seeded) ในเวลาที่ยอมรับได้

**Sub-tasks**: script · seed โหลดเข้า DB

### B5-02 · BE: `/search` (exact→prefix→contains, filter, keyset, bulk 200, quick lookup)

`be,search` · Story · **3.5 วัน** · Blocked by: B5-01, B2-01

**Acceptance Criteria**
- [ ] ลำดับผลตามคะแนน; bulk แสดงเลขที่ไม่พบ; exact → ไปหน้ารายละเอียด
- [ ] filter: customer/type/วันที่/assignee/`verification_status`/`provided_by_name`
- [ ] query builder แบบ dynamic (ข้อยกเว้นของ sqlc — ADR-026 สถานะ Proposed) แยก 3 query ตามชั้น exact→prefix→contains, cursor เก็บ `(ชั้น, id)`, ใช้ `LIKE` บนคอลัมน์ `*_norm`, ห้ามรูป `(col = $1 OR $1 IS NULL)`

**Sub-tasks**: query builder (bind parameter เสมอ) · 3 query ตามชั้น + dedupe · keyset pagination (size+1) · bulk · test + ทดสอบ SQL injection · สรุปผลเสนอ ADR-026 เป็น Accepted

### B5-03 · DB: ปรับ index จาก `EXPLAIN ANALYZE`

`be,search` · Story · **1.5 วัน** · Blocked by: B5-02

**Acceptance Criteria**
- [ ] exact/prefix p95 < 150 ms; contains/filter p95 < 500 ms ที่ 1M แถว; Index Scan
- [ ] ตรวจ Seq Scan/query ช้าจาก `pg_stat_statements`; ไม่อ้างว่าเป็น Index-Only Scan จนกว่าจะวัดจริง; เพิ่ม index `audit_logs (created_at DESC, id DESC)`

**Sub-tasks**: วัดผล · ปรับ index · บันทึกผล

### B5-04 · BE: reports + export CSV แบบ stream

`be,search` · Story · **3 วัน** · Blocked by: B5-01, B1a-06

**Acceptance Criteria**
- [ ] `job-orders-summary`, `missing-documents`, `uploads-by-user` (group by `provided_by`)
- [ ] export stream; ข้อมูลผู้ใช้ตาม role

**Sub-tasks**: endpoints · stream export · สิทธิ์ข้อมูลผู้ใช้ · test

### B5-05 · FE: หน้า Search

`fe,search` · Story · **3 วัน** · Blocked by: B5-02

**Acceptance Criteria**
- [ ] ช่องเดียว+เลือกฟิลด์+Advanced filter+bulk; filter เก็บใน URL

**Sub-tasks**: search box · advanced filter · bulk · results table · test

### B5-06 · FE: หน้า Report + export

`fe,search` · Story · **2 วัน** · Blocked by: B5-04

**Acceptance Criteria**
- [ ] เลือกช่วงเวลา/แผนก/ผู้ส่ง; export; แสดงข้อมูลตาม role

**Sub-tasks**: report pages · export · role-based columns

### B5-07 · BE: dashboard APIs + `/system/status`

`be,dashboard` · Story · **2 วัน** · Blocked by: B5-01, B4-04

**Acceptance Criteria**
- [ ] `recent-documents`, `work-queue` (filter all/missing_bl/missing_invoice/mine/unassigned/conflict/unverified), `activity`
- [ ] cache 30–60 วินาที; p95 < 300 ms

**Sub-tasks**: endpoints · queries + index · cache · test

### B5-08 · FE: Dashboard (search-first + work queue + แถบสถานะ)

`fe,dashboard` · Story · **3 วัน** · Blocked by: B5-07, B5-05

**Acceptance Criteria**
- [ ] admin/staff เห็นงานที่ต้องทำ/สถานะ import/กิจกรรม; viewer เห็นเฉพาะค้นหา+เอกสารล่าสุด
- [ ] แถบแจ้งเตือนจาก `/system/status` (poll 30 วิ)

**Sub-tasks**: layout · widgets ตาม role · banner · test

### B5-09 · Test: search/report/dashboard + k6 smoke

`qa,search` · Story · **2.5 วัน** · Blocked by: B5-06, B5-08

**Acceptance Criteria**
- [ ] E2E ค้นทุกฟิลด์/bulk/export/dashboard ตาม role; k6 smoke บน search

**Sub-tasks**: integration · E2E · k6 script

---

## Epic B6 — Scale & Deploy

**เป้าหมาย**: รัน production-like บน Colima พร้อม auto recovery · **Sprint**: Sprint 6–7 (W12–W13) · **Fix Version**: v0.6.0

### B6-01 · Nginx LB + TLS + rate limit + upload streaming + JSON error_page

`infra` · Story · **2 วัน** · Blocked by: B0-09, B0-04

**Acceptance Criteria**
- [ ] upstream FE×3/BE×3, `max_fails`, `proxy_next_upstream` ไม่รวม `http_503`
- [ ] `429/502/503/504` ตอบ JSON envelope; `proxy_request_buffering off`

**Sub-tasks**: nginx.conf · TLS (internal CA) · rate limit · error_page

### B6-02 · Compose production-like: fe-1..3, be-1..3, worker, mem limits

`infra` · Story · **2 วัน** · Blocked by: B6-01

**Acceptance Criteria**
- [ ] BE ตั้ง `RUN_WORKERS=false`; `mem_limit`/`GOMEMLIMIT` ตาม Resource Budget

**Sub-tasks**: services · limits · env/secrets

### B6-03 · Reliability: restart, healthcheck, autoheal, graceful shutdown

`infra,be` · Story · **2 วัน** · Blocked by: B6-02

**Acceptance Criteria**
- [ ] BE/worker healthcheck ใช้ `/healthz`; `depends_on: service_healthy`
- [ ] SIGTERM drain 30 วินาที; ไม่เกิด restart storm ตอน DB ล่ม

**Sub-tasks**: healthchecks · autoheal · graceful shutdown · ทดสอบ

### B6-04 · Backup/restore: `pg_dump` รายวัน + สคริปต์ + ทดสอบ restore

`infra` · Story · **2 วัน** · Blocked by: B6-02

**Acceptance Criteria**
- [ ] dump app + keycloak เก็บ 14 วัน; restore สำเร็จจริง
- [ ] ยืนยันการ backup ของ NAS/SFTP กับผู้ดูแล storage

**Sub-tasks**: backup.sh · restore.sh · cron · ทดสอบ restore · ยืนยันกับผู้ดูแล storage

### B6-05 · Colima startup automation + mount

`infra` · Story · **1.5 วัน** · Blocked by: B6-02, B0-10

**Acceptance Criteria**
- [ ] VM start หลัง reboot อัตโนมัติ; `mount-docstore.sh` รันทุกครั้งที่ VM start (หรือ fstab)

**Sub-tasks**: colima-up.sh · launchd/brew services · mount automation

### B6-06 · Runbook

`docs` · Task · **1.5 วัน** · Blocked by: B6-04

**Acceptance Criteria**
- [ ] start/stop/restore/แก้ปัญหาที่พบบ่อย ครบใน `runbook.md`

**Sub-tasks**: เขียน runbook · ทบทวนกับทีม

### B6-07 · Test: resilience + E2E ผ่าน Nginx 3/3 node

`qa,infra` · Story · **3 วัน** · Blocked by: B6-03

**Acceptance Criteria**
- [ ] `docker kill` node ใด ๆ แล้วผู้ใช้ไม่กระทบ และกลับมาภายใน 60 วินาที
- [ ] หยุด Postgres 2 นาที/หยุด storage ระหว่างโหลด → 503 แล้วกลับมาเอง ไม่ restart วน; reboot แล้วระบบกลับมาเอง

**Sub-tasks**: script chaos · E2E ผ่าน Nginx · รายงานผล

---

## Epic B7 — Observability

**เป้าหมาย**: เห็น logs/metrics/traces ครบด้วย LGTM · **Sprint**: Sprint 7 (W13–W14) · **Fix Version**: v0.7.0

### B7-01 · Alloy: เก็บ logs, metrics, traces

`infra,obs` · Story · **2.5 วัน** · Blocked by: B6-02

**Acceptance Criteria**
- [ ] logs → Loki, metrics (BE, nginx, postgres รวม `pg_stat_statements`, cAdvisor, Keycloak, worker) → Mimir, traces → Tempo

**Sub-tasks**: alloy config · exporters · ตรวจข้อมูลเข้า

### B7-02 · BE: OpenTelemetry + log fields + custom metrics

`be,obs` · Story · **2.5 วัน** · Blocked by: B7-01

**Acceptance Criteria**
- [ ] trace HTTP→DB→storage; log มี `trace_id`/`request_id`/`user_id`
- [ ] metric: import job, upload, `db_up`, pool, denylist, idempotency

**Sub-tasks**: OTel SDK · log fields · custom metrics · test

### B7-03 · Grafana dashboards (provisioning ใน repo)

`infra,obs` · Story · **2.5 วัน** · Blocked by: B7-01, B7-02

**Acceptance Criteria**
- [ ] Overview, Backend, Postgres (รวม top queries/Seq Scan), Nginx upstream, Import jobs, Container resources

**Sub-tasks**: แต่ละ dashboard · provisioning files

### B7-04 · Alerts

`infra,obs` · Story · **2 วัน** · Blocked by: B7-03

**Acceptance Criteria**
- [ ] 5xx > 2%, p95 > 1 s, DB pool > 80%, `db_up=0` > 1 นาที, import failed, container unhealthy/restart, disk > 80%, Keycloak down, LDAP bind fail

**Sub-tasks**: กฎ alert · ช่องทางแจ้งเตือน · ทดสอบยิง

### B7-05 · Standard / Lite profile + ตรวจ RAM budget

`infra,obs` · Story · **1.5 วัน** · Blocked by: B7-01

**Acceptance Criteria**
- [ ] ใช้ RAM ไม่เกิน budget (Standard ≈ 5.5 GB, Lite ≈ 4.5 GB)

**Sub-tasks**: profiles · วัด RAM

### B7-06 · Test: alert/dashboard + log redaction

`qa,obs` · Story · **1.5 วัน** · Blocked by: B7-04

**Acceptance Criteria**
- [ ] alert ยิงได้จริง; log ไม่มี token/รหัสผ่าน/ข้อมูลส่วนบุคคล

**Sub-tasks**: สคริปต์ตรวจ · ตรวจ log

---

## Epic B8 — Hardening & UAT

**เป้าหมาย**: พร้อมใช้งานจริง — ผ่าน Acceptance Criteria ใน SPEC หัวข้อ 17 · **Sprint**: Sprint 8–9 (W15–W17) · **Fix Version**: v0.8.0

### B8-01 · Load test k6 200 VUs + ปรับจูน

`qa,be,infra` · Story · **4 วัน** · Blocked by: B7-04

**Acceptance Criteria**
- [ ] login/search/upload/download ที่ 200 VUs: error < 1%, p95 ตามเป้า
- [ ] แก้ bottleneck ที่พบ (pool, index, Nginx, limits)

**Sub-tasks**: k6 scenarios · วิเคราะห์ผล · ปรับจูน · รายงาน

### B8-02 · E2E ครบทุก role/flow + regression + coverage

`qa` · Story · **4 วัน** · Blocked by: B7-04

**Acceptance Criteria**
- [ ] BE ≥ 80%, FE ≥ 70%; ผ่านใน CI

**Sub-tasks**: เติม E2E · regression suite · ตรวจ coverage

### B8-03 · Security review

`be,infra` · Story · **3 วัน** · Blocked by: B7-04

**Acceptance Criteria**
- [ ] CORS, headers (CSP), rate limit, ตรวจไฟล์, secrets, สิทธิ์รายงานข้อมูลผู้ใช้, audit

**Sub-tasks**: checklist · แก้ข้อพบ · dependency scan

### B8-04 · ซ้อม restore, migration, reboot

`infra` · Story · **2 วัน** · Blocked by: B6-07

**Acceptance Criteria**
- [ ] กู้คืนได้ภายใน RTO ที่ตกลง; migration และ reboot ไม่กระทบข้อมูล

**Sub-tasks**: restore drill · migration drill · reboot drill

### B8-05 · Smoke test กับ AD และ NAS จริง

`qa,infra` · Story · **2 วัน** · Blocked by: B1b-06, B4-11

**Acceptance Criteria**
- [ ] attribute/nested group/LDAPS ของ AD จริงทำงาน; mount/สิทธิ์/ความช้าของ NAS จริงยอมรับได้

**Sub-tasks**: ทดสอบ AD จริง · ทดสอบ NAS จริง · แก้ mapper/config

### B8-06 · UAT ด้วยผู้ใช้จริงและข้อมูลจริง + แก้ไข

`all` · Story · **5 วัน** · Blocked by: B8-01, B8-02

**Acceptance Criteria**
- [ ] ผู้ใช้ลงนามรับ; ข้อบกพร่อง severity สูงถูกแก้

**Sub-tasks**: เตรียม UAT · จัดรอบทดลอง · แก้ feedback

### B8-07 · Handover: คู่มือ + go-live checklist

`docs` · Task · **3 วัน** · Blocked by: B8-06

**Acceptance Criteria**
- [ ] runbook, คู่มือผู้ใช้/ผู้ดูแล, checklist go-live ครบ

**Sub-tasks**: คู่มือผู้ใช้ · คู่มือผู้ดูแล · checklist

---

## 4. หมายเหตุ

- **เส้นทางวิกฤต**: B0 → B1a → B2 → B3 → B5 → B8 (B4 ขนานกับ B3 ได้บางส่วน; B6–B7 เริ่มทับกับ B5 ได้เมื่อมี BE พร้อม)
- งานที่ไม่ต้องรอข้อมูลภายนอก: B1b และ B4 ใช้ตัวจำลอง (`testinfra`) — ส่วนทดสอบกับ AD/NAS จริงอยู่ที่ B8-05
- B3-01 ใช้ storage ชั่วคราวจนกว่า B4-02/03/04 เสร็จ แล้วสลับไปใช้ `FileStorage`
- ถ้าเวลาไม่พอ ตัวเลือกที่ตัดได้ตามแผน: B4-12 (ClamAV), widget กิจกรรมใน dashboard (B5-07/08), ปุ่ม bulk assign
