# Development Plan — Document Upload & Search System

> อ้างอิง: `SPEC.md` (หัวข้อ 16) · สถานะ: แผนเท่านั้น ยังไม่เริ่มพัฒนา · เริ่มเมื่อมีคำสั่งเริ่ม

---

## 1. สมมติฐานของแผน

| หัวข้อ | สมมติฐาน (ปรับได้) |
|-------|-------------------|
| ทีม | FE 1, BE 1–2, DevOps/QA 0.5 (ทำพร้อมกันได้ ระยะเวลาด้านล่างคิดจากทีมนี้) |
| ระยะเวลา | ประมาณ **18 สัปดาห์** (~4 เดือนครึ่ง; ฟีเจอร์ assignee/ฟอร์ม/reconcile เพิ่มประมาณ 1 สัปดาห์) รวม UAT — เป็นค่าประมาณคร่าว ๆ |
| รอบการพัฒนา | 1 Batch = 1 รอบ (1–2 สัปดาห์) จบด้วย demo + deploy ลง compose ได้ |
| ระบบที่ตัดสินใจแล้ว | Local users เก็บใน Keycloak DB (Option A) · ไม่ทำ OCR · B/L และ Invoice ไม่ unique · HA เป็นแผนอนาคต · retention เป็นค่า config |
| สิ่งที่ยังรอจากทีม IT | ข้อมูล LDAP/AD, การ map AD group → role, Kerberos SSO หรือไม่ (SPEC หัวข้อ 18) |

---

## 2. ภาพรวม Batch และไทม์ไลน์

| Batch | ชื่อ | สัปดาห์ (โดยประมาณ) | ขึ้นกับ | ทำขนานได้ |
|:----:|------|:------------------:|---------|-----------|
| 0 | Foundation | W1 | — | — |
| 1a | Auth & Local Users | W2–W3 | B0 | — |
| 1b | LDAP/AD Federation | W4 | B1a (ใช้ OpenLDAP จำลอง; ข้อมูล AD จริงใช้ตอน UAT) | B2 (เริ่มต้น) |
| 2 | Customer & Master Data | W4–W5 | B1a | 1b |
| 3 | CSV Import | W6–W7 | B2 | — |
| 4 | Document Upload | W8–W9 | B2 | B3 (ส่วน FE) |
| 5 | Search & Report | W10–W11 | B3, B4 | B7 (เริ่มต้น) |
| 6 | Scale & Deploy | W12–W13 | B0 (ทำ infra ต่อเนื่อง) | B5 |
| 7 | Observability | W13–W14 | B6 | — |
| 8 | Hardening & UAT | W15–W17 | ทุก Batch | — |

> ความเสี่ยงเรื่องรอข้อมูลจากทีม IT/ทีมดูแล NAS ลดลง: พัฒนาและเดโมด้วยตัวจำลอง (SPEC 11.8) แต่ควรขอข้อมูลจริงตั้งแต่ Batch 0 เพื่อใช้ทดสอบตอน UAT

---

## 3. วิธีทำงานในแต่ละ Batch

| ขั้นตอน | รายละเอียด |
|--------|-----------|
| 1. Planning (วันแรก) | ยืนยันขอบเขต, แตกงานเป็น ticket ≤ 2 วัน, ระบุ acceptance criteria |
| 2. Build | เขียนโค้ดพร้อม unit test; migration/seed ทุกครั้งผ่าน PR |
| 3. Integration | integration test (testcontainers) + FE ต่อ API จริงหรือ MSW |
| 4. Verify | CI ผ่านทั้งหมด + E2E ของ flow ใหม่ + deploy ลง compose บน Colima |
| 5. Demo & Review | demo ตาม Definition of Done, รับ feedback |
| 6. Release | tag `v0.<batch>.0`, อัปเดต `docs/runbook.md` และ `SPEC.md` ถ้ามีการเปลี่ยน |
| 7. Retro (สั้น) | ปรับแผน Batch ถัดไป |

**Definition of Ready**: มี acceptance criteria, API contract (OpenAPI) ตกลงแล้ว, ข้อมูลทดสอบพร้อม
**Definition of Done**: โค้ด review แล้ว · unit/integration/E2E ผ่าน · coverage ไม่ต่ำกว่าเกณฑ์ (BE ≥ 80%, FE ≥ 70%) · lint/type check ผ่าน · มี log + metric พื้นฐาน · เอกสารอัปเดต · deploy ผ่าน `docker compose up -d`

**Git/CI**: trunk-based + feature branch สั้น, PR ต้องผ่าน CI (lint → unit → integration → build) · E2E รันบน main และก่อน release · Conventional Commits

---

## 4. รายละเอียดแต่ละ Batch

### Batch 0 — Foundation (W1)
**เป้าหมาย**: โครงโปรเจกต์และสภาพแวดล้อมพร้อมให้ทีมทำงานต่อเนื่อง

| งาน | รายละเอียด |
|----|-----------|
| Repo | monorepo ตามโครงใน SPEC หัวข้อ 15, Makefile (`up`, `down`, `test`, `lint`, `migrate`) |
| BE | Go module, Echo skeleton, config (env), slog JSON, `/healthz` (liveness) `/readyz` (เช็ก DB), DB connect retry + backoff, timeout ทุกชั้น, error `DB_UNAVAILABLE` (503 + Retry-After), circuit breaker, service `migrate` แบบ one-shot, response envelope `{code, message, data, meta}` (SPEC 9; helper กลาง + error mapping จุดเดียว), pagination 2 แบบ offset/keyset ตาม SPEC 9.2, Nginx `error_page` เป็น JSON envelope, `X-Request-ID` |
| Architecture | วางโครง feature-based ตาม SPEC 5.4 (BE: handler/service/repository/ports, FE: features/*), swaggo → OpenAPI → generate TypeScript client |
| FE | Vite + React + TS + Tailwind + shadcn/ui, router, TanStack Query, i18n (TH/EN), layout เปล่า |
| FE | axios interceptor: unwrap envelope (`data`/`meta`), แปลง `code` → ข้อความ i18n (TH/EN), `4010`/`4011` → หน้า login, `5030`/`5031` → แบนเนอร์ระบบไม่พร้อม; ทดสอบด้วย MSW |
| DB | golang-migrate + sqlc, migration แรก (extension `pg_trgm`, ตาราง base), extension `pg_stat_statements` (ตั้ง `shared_preload_libraries`) |
| Infra | `docker-compose.yml` dev (postgres, keycloak, SFTP server จำลอง, worker 1 node), Keycloak realm import (`docsearch`, clients, roles) |
| Test infra | compose profile `testinfra`: OpenLDAP + Samba + SFTP จำลอง, สคริปต์ `seed-testinfra.sh` (ผู้ใช้/กลุ่ม/ไฟล์ตัวอย่าง) และ `mount-docstore.sh` (SPEC 11.8) |
| CI | pipeline: lint → unit → integration → build image |
| อื่นๆ | ขอข้อมูล LDAP/AD จากทีม IT และข้อมูล NAS จากทีมดูแล (ใช้ตอน UAT ไม่บล็อกการพัฒนา), ตรวจเครือข่าย Colima → AD/NAS, ตรวจสเปคเครื่อง Colima จริง |

**DoD**: `make up` แล้วเข้า Keycloak ได้ · BE/FE รันได้ · CI รันผ่านด้วย test ตัวอย่าง
**Test**: unit ตัวอย่างทั้ง BE/FE · integration ทดสอบเชื่อม Postgres ผ่าน testcontainers

---

### Batch 1a — Auth & Local Users (W2–W3)
**เป้าหมาย**: ล็อกอินและจัดการผู้ใช้แบบ Local (เก็บใน Keycloak DB)

| งาน | รายละเอียด |
|----|-----------|
| BE | JWT middleware (JWKS cache), RBAC ต่อ route (`admin`/`staff`/`viewer`), `/me` |
| BE | `UserStore` interface + `keycloakstore` (Admin API: create/update/reset password/enable-disable/assign role) |
| BE | `/users` CRUD, `/users/{id}/roles`, ตรวจชื่อผู้ใช้/`employee_id` ซ้ำ |
| BE | `user_profiles` + upsert จาก claim ตอน login + job sync รายวัน + `POST /users/sync` |
| Keycloak | User Profile attribute (`position`, `department`, `employeeId`), protocol mapper → claims, password policy, brute-force |
| FE | `react-oidc-context` login/logout/refresh, route guard ตาม role, หน้า User (list/create/edit/reset password/role) |
| Audit | `audit_logs` พื้นฐาน + middleware บันทึก action |
| Logout & Revocation | `revoked_tokens` + denylist ในหน่วยความจำ (LISTEN/NOTIFY + poll fallback), `/auth/logout`, backchannel logout, `sub` cutoff เมื่อปิด user/รีเซ็ตรหัสผ่าน, job ลบแถวหมดอายุ (SPEC 8.4) |

**DoD**: Login ได้ครบ 3 role · admin สร้าง/แก้/ปิด user ได้ · user ใหม่ถูกบังคับเปลี่ยนรหัสผ่านครั้งแรก · `user_profiles` มีข้อมูลหลัง login · logout แล้ว token เดิมใช้ไม่ได้ทุก node ≤ 2 วินาที
**Test**: unit (middleware, role check) · integration (testcontainers Keycloak: login, สร้าง user, role) · E2E (Playwright: login ทุก role, สร้าง user, สิทธิ์ถูกบล็อก, logout แล้วแท็บอื่นและการ replay token ได้ 401)

---

### Batch 1b — LDAP/AD Federation (W4)
**เป้าหมาย**: ผู้ใช้จาก LDAP/AD ล็อกอินได้ผ่าน Keycloak **(พัฒนาด้วย OpenLDAP จำลอง ทดสอบกับ AD จริงตอน UAT)**

| งาน | รายละเอียด |
|----|-----------|
| Keycloak | User Federation (LDAP, READ_ONLY, LDAPS 636), CA cert ใน truststore, attribute mapper (`givenName`, `sn`, `title`, `department`, `employeeID`, `mail`) |
| Keycloak | AD group → realm role mapper, periodic sync 1 ชม., local break-glass admin |
| BE | แสดงผู้ใช้ LDAP ใน `/users` แบบ read-only (คอลัมน์ source), เปิด/ปิดสิทธิ์, sync ทันที |
| Test infra | ใช้ OpenLDAP จาก profile `testinfra` (SPEC 11.8) สำหรับ integration/E2E/เดโม; URL, Base DN, bind DN, ชื่อ attribute เป็น config ใน realm/env เพื่อสลับไป AD จริงได้ |
| Ops | alert เมื่อ LDAP bind ล้มเหลว (เตรียมไว้ใช้ Batch 7) |

**DoD**: ผู้ใช้ AD ล็อกอินได้และได้ role ตาม group · ผู้ใช้ที่ถูกปิดที่ AD เข้าไม่ได้ · AD ล่มแล้ว local admin ยังเข้าได้
**Test**: integration/E2E กับ OpenLDAP · ทดสอบ AD จริงบน environment ภายใน (smoke)
**ความเสี่ยง**: attribute/nested group/LDAPS ของ AD จริงต่างจากตัวจำลอง → ทดสอบกับ AD จริงช่วง UAT (Batch 8) และเว้นเวลาแก้ mapper

---

### Batch 2 — Customer & Master Data (W4–W5)
**เป้าหมาย**: จัดการ Customer, Job Order (B/L, Invoice) ด้วยมือและดูข้อมูลหลัก

| งาน | รายละเอียด |
|----|-----------|
| DB | `customers` (ฟิลด์เพิ่ม: รหัส, tax id, ผู้ติดต่อ, หมายเหตุ), `job_orders` (+ คอลัมน์ `*_norm` generated), index btree + trigram |
| Spike | B2-00: ตรวจการค้นหาข้อความไทยด้วย `pg_trgm` + encoding/locale ของ DB + การ normalize (ทำก่อนสรุป index; เพิ่มงานประมาณ 1.5 วัน; สรุปผลเป็น ADR ใหม่) |
| BE | `/customers` CRUD + merge, `/job-orders` CRUD, validation, audit |
| FE | หน้า Customer (list/filter/form/merge), หน้า Job Order (list/detail/form), ตาราง TanStack + pagination |
| Rule | `job_no` unique, B/L/Invoice ไม่ unique (เตือนเมื่อซ้ำ), customer name normalize |
| Form | ฟอร์มสร้าง/แก้ Job Order + B/L + Invoice + Customer (เลือกหรือสร้างใหม่ในฟอร์ม) + assignee, `data_source` / `verification_status`, มอบหมายแบบกลุ่ม (SPEC 2.4) — เพิ่มงานประมาณ 2 วัน |

**DoD**: CRUD ครบพร้อมสิทธิ์ตาม role · merge Customer ย้าย Job Order ถูกต้อง · audit บันทึกทุกการเปลี่ยนแปลง · สร้าง Job Order ด้วยฟอร์ม (Job/B/L/Invoice/assignee) ได้โดยไม่ต้องมี CSV
**Test**: unit (normalize, validation) · integration (repository, API, merge) · E2E (สร้าง Customer → Job Order → แก้ไข → merge)

---

### Batch 3 — CSV Import (W6–W7)
**เป้าหมาย**: นำเข้าข้อมูลหลักจาก CSV เป็น batch อย่างถูกต้องและย้อนดูผลได้

| งาน | รายละเอียด |
|----|-----------|
| BE | upload CSV → storage ภายนอก (prefix `imports/`), `import_batches` / `import_rows`, validate (dry-run + preview), commit |
| BE | middleware `Idempotency-Key` + ตาราง `idempotency_keys` (lease 10 นาที, อายุ 24 ชม.), ใช้กับ `POST /imports`; FE สร้าง key ต่อการกด submit และปิดปุ่มระหว่างส่ง (SPEC 9.1) |
| BE | commit: เปลี่ยนสถานะ `queued` + enqueue ใน transaction เดียวกัน, ตอบ `202`, commit ซ้ำคืน batch เดิม |
| BE | River worker อ่านเป็น stream, chunk 1,000 แถว/transaction, upsert customers → job_orders, retry 3 ครั้ง, resume; คิว `import` concurrency = 1 (batch ถัดไปรอใน `queued`) |
| BE | error report (`errors.csv`), สถานะ `pending → … → completed_with_errors` |
| BE | reconcile ตอน dry-run (new / matched / fills_blank / conflict), `conflict_policy` (`keep_existing` / `use_csv`), ตาราง `import_conflicts`, หน้าข้อมูลขัดแย้ง (resolve รายการ/กลุ่ม), รายงานเทียบ CSV — เพิ่มงานประมาณ 3–4 วัน |
| FE | หน้า Import: upload, preview, error รายแถว, progress, ประวัติ import |
| Perf | ทดสอบไฟล์ 100k แถว, คิว `import` concurrency 1 (คิวอื่นแยก) |

**DoD**: import 100k แถว ≤ 2 นาที · แถวผิดไม่ทำให้ทั้งไฟล์ล้ม · import ซ้ำไม่เกิดข้อมูลซ้ำ · worker ถูก kill กลางทางแล้ว resume ได้ · commit 2 batch พร้อมกันแล้วรันทีละอัน · import หลังสร้างด้วยมือจำแนกผลถูกต้องและ conflict ไม่ทับข้อมูลเดิมโดยปริยาย
**Test**: unit (parser, validator, BOM/encoding, reconcile classifier) · integration (worker + testcontainers, kill/resume, commit ซ้ำ, commit 2 batch พร้อมกัน, ส่ง POST ซ้ำด้วย Idempotency-Key เดิม) · E2E (upload → preview → commit → ดูผล)

---

### Batch 4 — Document Upload (W8–W9)
**เป้าหมาย**: อัปโหลด/ดาวน์โหลดเอกสารผูก Job Order

| งาน | รายละเอียด |
|----|-----------|
| DB | `documents`, `document_types`, `search_vector`, index |
| BE | multipart streaming → `FileStorage` (SFTP/shared folder), sha256, ตรวจ MIME จริง/ขนาด/ชนิดไฟล์, ชื่อไฟล์ปลายทางเป็น UUID, เขียน `.part` แล้ว rename |
| BE | 1 ไฟล์ต่อ request + `Idempotency-Key`, กันไฟล์ซ้ำ `(job_order_id, sha256, document_type)` ตอบ `duplicate: true`; FE ส่งไฟล์ขนาน ≤ 3 |
| BE/FE | ฟิลด์ `provided_by_name` / `provided_by_type` (ผู้ส่งไฟล์เป็นใครก็ได้) แยกจาก `uploaded_by`, ช่อง "ผู้ส่ง" + autocomplete ในฟอร์ม upload; admin/staff อัปโหลดให้ Job Order ใดก็ได้ ไม่ผูกกับ assignee |
| BE | download link (signed link `/dl/{token}` ทั้ง SFTP และ shared folder) พร้อมเช็กสิทธิ์และ audit, soft delete (admin) |
| Worker | job เก็บกวาดไฟล์กำพร้า (อยู่ใน storage แต่ไม่มีแถวใน DB เกิน 24 ชม.) |
| Provider | พัฒนา `sftp` และ `shared_folder` ด้วย interface เดียวกัน + storage contract tests ชุดเดียว (shared_folder: temp dir, sftp: testcontainers); เลือกด้วย `STORAGE_PROVIDER`; health check (marker ของ mount) + alert |
| Test infra | ทดสอบ `shared_folder` ผ่าน Samba (mount ใน Colima VM ด้วย `mount-docstore.sh`) และ `sftp` ผ่าน `atmoz/sftp`; ซ้อมหยุด/เปิด Samba/SFTP ดู health check, code `5031` และ alert |
| BE | job retention: `DOCUMENT_RETENTION_DAYS` (ค่าเริ่มต้น 0 = ไม่ลบ), `PURGE_GRACE_DAYS` |
| FE | หน้า Job Order → แท็บเอกสาร: react-dropzone, หลายไฟล์, progress, เลือกประเภท, preview/download |
| Option | ClamAV scan (เปิด/ปิดด้วย config) |

**DoD**: อัปโหลดหลายไฟล์ถึง 50 MB ได้ · ไฟล์ผิดชนิด/ใหญ่เกินถูกปฏิเสธ · viewer ดาวน์โหลดได้แต่อัปโหลด/ลบไม่ได้
**Test**: unit (validator, key generator) · integration (SFTP server จริงผ่าน testcontainers, สิทธิ์, ลำดับเขียนไฟล์/DB, ไฟล์กำพร้า, upload ซ้ำด้วย Idempotency-Key เดิม, ไฟล์ซ้ำ) · E2E (อัปโหลด → ดาวน์โหลด → ลบ ตาม role)

---

### Batch 5 — Search & Report (W10–W11)
**เป้าหมาย**: ค้นหาเร็วด้วย Job Order / B/L / Invoice และรายงาน

| งาน | รายละเอียด |
|----|-----------|
| Data | script สร้างข้อมูลทดสอบ 1M Job Order + metadata เอกสาร |
| BE | `/search` (exact → prefix → contains, filter, keyset pagination), bulk search 200 เลข, quick lookup; query builder แบบ dynamic + 3 query ตามชั้น (ADR-026 สถานะ Proposed — วัดผลก่อนอนุมัติ; เพิ่มงาน ~0.5 วัน) |
| BE | `/reports/job-orders-summary`, `/missing-documents`, `/uploads-by-user` (join `user_profiles`), export CSV แบบ stream |
| DB | ปรับ index จาก `EXPLAIN ANALYZE`; composite index ตาม `ORDER BY` + `id` (`job_orders`, `audit_logs`); ตรวจ Seq Scan/query ช้าจาก `pg_stat_statements` |
| FE | หน้า Search (ช่องเดียว + เลือกฟิลด์ + Advanced filter + bulk), หน้า Report + export, สิทธิ์การแสดงข้อมูลผู้ใช้ตาม role |
| Dashboard | หน้าแรก (SPEC 2.3): ช่องค้นหา, เอกสารล่าสุด, งานที่ต้องทำ (admin/staff), สถานะ import/กิจกรรม, แถบแจ้งเตือนสถานะระบบ; endpoints `/dashboard/*` และ `/system/status` (เพิ่มงานประมาณ 3–4 วันทำการ — ขยาย Batch 5 หรือเลื่อน widget กิจกรรมไป backlog) |
| Report/Search | `uploads-by-user` เพิ่ม group by `provided_by`; กรองด้วย assignee (`mine`/`unassigned`), `verification_status`, `provided_by_name`; filter `conflict`/`unverified` ใน work queue |

**DoD**: exact/prefix ของ 3 ฟิลด์ p95 < 150 ms · contains/filter รวม p95 < 500 ms ที่ 1M แถว · แผนใช้ Index Scan · dashboard p95 < 300 ms และ viewer ไม่เห็น widget ของ admin/staff
**Test**: unit (query builder) · integration (ผลลัพธ์/ลำดับ/สิทธิ์) · E2E (search ทุกฟิลด์, bulk, export, dashboard ตาม role) · k6 smoke บน search

---

### Batch 6 — Scale & Deploy (W12–W13)
**เป้าหมาย**: รันแบบ production-like บน Colima พร้อม auto recovery

| งาน | รายละเอียด |
|----|-----------|
| Compose | Nginx LB → fe-1..3, be-1..3, worker (1 node, BE ตั้ง `RUN_WORKERS=false`), `max_fails`/`proxy_next_upstream`, TLS (internal CA), rate limit, upload streaming |
| Reliability | `restart: unless-stopped`, healthcheck ทุก service (BE/worker ใช้ `/healthz` เพื่อกัน restart storm), `depends_on: service_healthy`, autoheal, graceful shutdown, `mem_limit`/`GOMEMLIMIT` ตาม Resource Budget |
| Backup | `pg_dump` รายวัน (app + keycloak) เก็บ 14 วัน, ยืนยันการ backup ของ NAS/SFTP กับผู้ดูแล storage, สคริปต์ `backup.sh` / `restore.sh` และทดสอบ restore |
| Colima | script `colima-up.sh`, ตั้ง start อัตโนมัติหลัง reboot (brew services/launchd); รัน `mount-docstore.sh` ทุกครั้งที่ VM start (หรือกำหนดใน fstab ของ VM) เมื่อใช้ `shared_folder` |
| Docs | `runbook.md` (start/stop/restore/แก้ปัญหาที่พบบ่อย) |

**DoD**: `docker kill` FE/BE node ใดก็ได้ → ผู้ใช้ไม่กระทบ และ node กลับมาเองภายใน 60 วินาที · reboot เครื่องแล้วระบบกลับมาเอง · restore สำเร็จ · หยุด Postgres 2 นาทีแล้วเปิดใหม่ → ระบบกลับมาเองโดยไม่ต้อง restart BE และไม่เกิด restart storm
**Test**: resilience test (kill node, หยุด/เปิด Postgres และ storage ระหว่างโหลด), E2E ผ่าน Nginx 3/3 node

---

### Batch 7 — Observability (W13–W14)
**เป้าหมาย**: เห็น logs/metrics/traces ครบด้วย LGTM

| งาน | รายละเอียด |
|----|-----------|
| Collect | Grafana Alloy: logs (Docker → Loki), metrics (BE, nginx, postgres, cAdvisor, Keycloak, worker → Mimir), traces (OTLP → Tempo); postgres-exporter รวม `pg_stat_statements` (ดู query ช้า/Seq Scan) |
| BE | OpenTelemetry (HTTP → DB → storage), `trace_id`/`request_id`/`user_id` ใน log, metric ของ import job และ upload |
| Dashboards | Overview, Backend, Postgres, Nginx upstream, Import jobs, Container resources (provisioning ผ่านไฟล์ใน repo) |
| Alerts | 5xx > 2%, p95 > 1 s, DB pool > 80%, DB เข้าไม่ได้ > 1 นาที, import failed, container unhealthy/restart, disk > 80%, Keycloak down, LDAP bind fail |
| Profile | Standard / Lite ตาม Resource Budget (SPEC 11.6) |

**DoD**: ตาม request จาก Nginx เห็น trace ครบถึง DB · alert ทดสอบยิงได้จริง · ใช้ RAM ไม่เกิน budget
**Test**: ตรวจ dashboard/alert ด้วยสคริปต์ทดสอบ, ตรวจ log ไม่มีข้อมูลลับ (token/รหัสผ่าน/ข้อมูลส่วนบุคคล)

---

### Batch 8 — Hardening & UAT (W15–W17)
**เป้าหมาย**: พร้อมใช้งานจริง

| งาน | รายละเอียด |
|----|-----------|
| Performance | k6 200 VUs (login, search, upload, download), หา bottleneck และปรับ (pool, index, Nginx, resource limit) |
| Test | E2E ครบทุก role และทุก flow, regression, ตรวจ coverage |
| Security | review: CORS, headers, rate limit, ตรวจไฟล์, secrets, สิทธิ์รายงานข้อมูลผู้ใช้, audit |
| Data | ซ้อม restore, ซ้อม migration, ซ้อม reboot |
| UAT | ผู้ใช้จริงทดลองด้วยข้อมูลจริง รับ feedback แก้ไข |
| Handover | runbook, คู่มือผู้ใช้/ผู้ดูแล, checklist go-live |

**DoD**: ผ่าน Acceptance Criteria ใน SPEC หัวข้อ 17 ทั้งหมด

---

## 5. Milestones

| Milestone | เมื่อสิ้นสุด | สิ่งที่ได้ |
|-----------|:----------:|-----------|
| M1 Auth ready | Batch 1b | ล็อกอินด้วย local + AD ได้ |
| M2 Data ready | Batch 3 | มีข้อมูลหลักในระบบ (CSV + manual) |
| M3 Feature complete | Batch 5 | อัปโหลด ค้นหา รายงาน ครบ |
| M4 Production-like | Batch 7 | 3 FE/3 BE, auto recovery, observability |
| M5 Go-live | Batch 8 | ผ่าน UAT และ acceptance |

---

## 6. ความเสี่ยงและแนวทางรับมือ

| ความเสี่ยง | ผลกระทบ | แนวทางรับมือ |
|-----------|---------|--------------|
| AD จริงต่างจากตัวจำลอง | เจอปัญหาตอน UAT | พัฒนาด้วย OpenLDAP, ทำ attribute/Base DN เป็น config, ขอข้อมูล AD จริงตั้งแต่ Batch 0 เพื่อทดสอบช่วง UAT |
| RAM เครื่อง Colima ตึง (8–12 GB) | ระบบช้า/OOM | ใช้ Lite profile, `mem_limit`, วัดจริงใน Batch 6–7, แนะนำ RAM 12 GB ขึ้นไป |
| CSV ใหญ่/ข้อมูลสกปรก | import ช้า/ผิดพลาด | stream + chunk, validate ก่อน commit, error report รายแถว, ทดสอบไฟล์ใหญ่ตั้งแต่ Batch 3 |
| ค้นหาช้าเมื่อข้อมูล 1M แถว | ไม่ผ่านเป้า | สร้างข้อมูลทดสอบใน Batch 5, ปรับ index ตาม `EXPLAIN ANALYZE` |
| Upload ไฟล์ใหญ่กิน memory | BE ล่ม | streaming + `proxy_request_buffering off`, จำกัด concurrency ของ upload |
| ค้นหาข้อความไทยด้วย `pg_trgm` อาจไม่ตรงที่คาด | ค้นชื่อลูกค้า/ไฟล์ภาษาไทยไม่เจอหรือไม่ครบ | spike B2-00 ต้น Batch 2, ตรวจ locale/normalize, เตรียมทางเลือกสำรองก่อนผูก index |
| วิธี mount NAS (shared folder) ยังไม่ยืนยัน | ใช้งานจริงล่าช้า / mount หลุดระหว่างใช้งาน | พัฒนา/ทดสอบด้วย Samba จำลอง (SPEC 11.8), สอบถามทีมดูแล NAS และตรวจ mount ใน Colima VM ตั้งแต่ Batch 0, มี health check + alert เมื่อ mount หลุด, ใช้ `sftp` ได้เป็นทางเลือก |
| Keycloak ใช้ CPU/RAM สูงตอนเริ่ม | start ช้า | healthcheck + `start_period`, จำกัด heap |
| E2E ไม่เสถียร | CI ช้า/ไม่น่าเชื่อถือ | seed ข้อมูลคงที่, หลีกเลี่ยง sleep, retry เฉพาะจุด, แยก smoke กับ full |
| ขอบเขตขยาย (scope creep) | แผนเลื่อน | จัดเข้า backlog Phase 2 (เช่น OCR, HA, Customer Portal) |

---

## 7. Checklist ก่อนเริ่มพัฒนา

- [ ] ยืนยัน SPEC เวอร์ชันสุดท้าย
- [ ] (ไม่บล็อกการเริ่ม — ใช้ตัวจำลองก่อน) ได้ข้อมูล LDAP/AD จากทีม IT และตรวจเครือข่ายจาก Colima VM แล้ว
- [ ] ยืนยันเรื่อง Kerberos SSO และขอให้ทีม IT สร้าง AD group ทั้ง 3 กลุ่ม (admin/staff/viewer)
- [ ] (ไม่บล็อกการเริ่ม — ใช้ตัวจำลองก่อน) ยืนยันวิธี mount โฟลเดอร์ NAS (SMB/NFS) เข้า Colima VM, สิทธิ์เขียน และความจุของ NAS/SFTP
- [ ] เตรียมตัวจำลอง (profile `testinfra`) และข้อมูลตัวอย่าง (CSV/เอกสาร/ผู้ใช้)
- [ ] ยืนยันสเปกเครื่อง Colima จริง และเลือก Standard/Lite profile
- [ ] มีตัวอย่างไฟล์ CSV จริง (ปกปิดข้อมูลสำคัญ)
- [ ] ยืนยันทีมและช่วงเวลาที่จะเริ่ม
- [ ] เตรียม Git repo, CI runner, และที่เก็บ backup (host/NAS)

---

## 8. Backlog (Phase 2 / อนาคต)

- OCR และค้นหาในเนื้อหาเอกสาร (ตอนนี้ไม่ทำ)
- HA ของ Postgres/Keycloak/worker/Nginx (SPEC 11.5) และ PITR (pgBackRest)
- ยกเลิก import batch ที่กำลัง `processing`
- หน้า "ภาพรวม" KPI สำหรับ admin (แบบ B)
- Permission-based RBAC (สร้าง role เอง, ตาราง `role_permissions`) — ตอนนี้ใช้ role คงที่ 3 ตัว
- Customer Portal / จำกัดสิทธิ์รายลูกค้า
- ลิงก์อัปโหลดสำหรับผู้ส่งภายนอก (ลูกค้า/ตัวแทนอัปโหลดเอง) — ตอนนี้เจ้าหน้าที่อัปโหลดแทน
- เก็บ snapshot ผู้ใช้ (แผนก/ตำแหน่ง) ณ เวลาทำรายการ
- Kerberos SSO (ถ้าจำเป็น)
