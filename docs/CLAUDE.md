# CLAUDE.md

คำแนะนำสำหรับ Claude (Claude Code) ที่ทำงานใน repo นี้: **ระบบอัปโหลดและค้นหาเอกสารภายในองค์กร** (Job Order, B/L, Invoice, Customer)

## สถานะโปรเจกต์
- ตอนนี้อยู่ในช่วง **วางแผน — ยังไม่มีโค้ด** คำสั่งและโครงสร้างด้านล่างเป็นเป้าหมายที่จะสร้างใน Batch 0
- **อย่าเริ่มสร้างโค้ดหรือโครง repo เอง** จนกว่าผู้ใช้จะสั่งให้เริ่ม

## เอกสารที่ต้องอ่านก่อนทำงาน
| ไฟล์ | ใช้เมื่อ |
|---|---|
| `intent.md` | เข้าใจเป้าหมาย ผู้ใช้ ขอบเขต และสิ่งที่ไม่ทำ |
| `SPEC.md` | ข้อกำหนดทั้งหมด (API, data model, auth, deploy, resilience) |
| `ADR.md` | เหตุผลของการตัดสินใจเชิงสถาปัตยกรรม |
| `DEVELOPMENT_PLAN.md` | แผน Batch 0–8, DoD, ความเสี่ยง |
| `JIRA_BACKLOG.md` | การ์ดงานรายใบ (เช่น `B3-05`) |

ถ้าเอกสารขัดแย้งกัน: `ADR.md` (ฉบับใหม่กว่า) > `SPEC.md` > `DEVELOPMENT_PLAN.md` — **แจ้งผู้ใช้ถึงความขัดแย้งก่อนทำต่อ** อย่าเดาเอง

## Tech stack (สรุป)
- **FE**: React 18 + TypeScript + Vite, Tailwind + shadcn/ui, React Router, TanStack Query/Table, React Hook Form + Zod, `react-oidc-context`, axios, react-i18next (TH/EN)
- **BE**: Go 1.23 + Echo v4, `pgx` + `sqlc`, `golang-migrate`, `slog`, OpenTelemetry, River (job queue), OpenAPI (swaggo)
- **DB**: Postgres 16 (`pg_trgm`) · **Auth**: Keycloak (OIDC PKCE) + LDAP/AD · **Storage**: ภายนอก (SFTP หรือ shared folder ของ NAS)
- **Infra**: Docker Compose บน Colima, Nginx (FE×3, BE×3, worker×1), LGTM (Loki/Grafana/Tempo/Mimir + Alloy)

## โครง repo (เป้าหมาย — SPEC หัวข้อ 15)
```
apps/web        # React + Vite  (src/{app,pages,features,components,lib})
apps/api        # Go            (cmd/{server,worker}, internal/<feature>, db/{migrations,queries})
deploy/         # compose, nginx, keycloak, observability, scripts
load-test/k6/   # k6
docs/           # runbook ฯลฯ
```

## คำสั่ง (กำหนดไว้ใน Batch 0)
```
make up | down | test | lint | migrate
docker compose --profile testinfra up -d     # OpenLDAP + Samba + SFTP จำลอง
deploy/scripts/{seed-testinfra,mount-docstore,backup,restore,colima-up}.sh
```

## กติกาสถาปัตยกรรม — Backend
- แยกตาม feature: `internal/<feature>/{handler,service,repository,model,ports}.go`; ทิศทาง `handler → service → repository`
- service **ไม่ import Echo** และ **ไม่ import feature อื่นตรง ๆ** (คุยผ่าน interface ที่ประกาศฝั่งผู้ใช้)
- ใช้ ports เฉพาะ dependency ภายนอก: `FileStorage` (sftp|shared_folder), `UserStore` (Keycloak Admin API), clock, ID generator
- transaction เริ่มที่ service; SQL อยู่ใน `db/queries` (sqlc) — ไม่ใช้ ORM (ข้อยกเว้นที่เสนอ: `/search` ใช้ query builder แบบ dynamic — ADR-026 สถานะ `Proposed` ยังไม่อนุมัติ)
- `cmd/server` (RUN_WORKERS=false) และ `cmd/worker` ใช้โค้ดชุดเดียวกัน; งานเบื้องหลังทั้งหมดผ่าน River
- cross-cutting (config, logger, OTel, DB pool, middleware) อยู่ใน `platform/`

## กติกาสถาปัตยกรรม — Frontend
- `features/<name>/{api,components,hooks,schemas}`; `pages/` ประกอบ feature เท่านั้น; feature ไม่ import กันตรง ๆ
- server state ใช้ TanStack Query ทั้งหมด; filter/pagination ของ Search เก็บใน URL; ไม่มี global store ใหญ่
- สิทธิ์ใน FE (route guard, `<Can>`) เพื่อ UX เท่านั้น — **BE เป็นตัวบังคับสิทธิ์จริง**
- API client สร้างจาก OpenAPI (ห้ามเขียน type ของ API ซ้ำด้วยมือ)

## API conventions (SPEC หัวข้อ 9)
- JSON ทุก endpoint ตอบ `{ code, message, data }` (+ `meta` นอก `data` เมื่อเป็น list แบ่งหน้า); `code` = HTTP status × 10 + เลขย่อย
- สถานะ HTTP ต้องตรงกับผลลัพธ์เสมอ; **ไม่ใช้ `204`** — DELETE/logout ตอบ `200` + `data: null`; สั่งงานเบื้องหลังตอบ `202`
- `data`: object / list (ว่าง = `[]`) / `null`; validation error = array ของ `{ field, message }`
- ยกเว้น envelope: ดาวน์โหลดไฟล์/export CSV, `/healthz` `/readyz` `/metrics`, backchannel logout
- `POST /imports` และ `POST /job-orders/{id}/documents` **ต้องมี `Idempotency-Key`**; upload = 1 ไฟล์/request
- Pagination แบบผสม (SPEC 9.2): list เล็กใช้ offset (`page`,`size`; `meta` = `{page,size,total}`, ลึกสุด 10,000 แถว); list ใหญ่ (`/search`, `/job-orders`, `/audit-logs`, `import_rows`) ใช้ keyset (`cursor`,`size`; `meta` = `{size,next_cursor,has_next}`, **ไม่มี `total`**); `size` สูงสุด 100
- ทุก request มี `X-Request-ID` และ propagate `traceparent`; error ใหม่ต้องเพิ่มในตาราง code ของ SPEC ก่อน

## Auth & ความปลอดภัย
- BE ตรวจ JWT เองด้วย JWKS cache + เช็ก denylist (`sid`/`jti`/`sub` cutoff); **ไม่ใช้ token introspection**
- connection ของ `LISTEN/NOTIFY` ต้องต่อตรง Postgres (ไม่ผ่าน PgBouncer แบบ transaction mode)
- token เก็บใน memory ของ browser เท่านั้น (ห้าม localStorage/sessionStorage); CSP เข้ม ไม่มี inline script
- **ห้าม log** token, รหัสผ่าน, รหัสพนักงาน/ข้อมูลส่วนบุคคล; secrets ผ่าน Docker secrets/env ที่ไม่ commit
- **ห้ามแก้ตารางของ Keycloak ตรง ๆ** (ใช้ User Profile attribute / Admin API)
- ดาวน์โหลดเอกสารผ่าน signed link `/api/v1/dl/{token}` (อายุ ≤ 60 วินาที) พร้อมเช็กสิทธิ์และ audit ทุกครั้ง

## ข้อมูลและ DB
- migration ด้วย `golang-migrate`; **ห้ามแก้ migration ที่ถูก apply แล้ว** — เพิ่มไฟล์ใหม่; BE ไม่ migrate เอง (ใช้ service `migrate` แบบ one-shot)
- ค้นหาใช้คอลัมน์ `*_norm` (trim + upper) พร้อม index btree (`text_pattern_ops`) และ trigram
- **ห้ามใช้รูป `(col = $1 OR $1 IS NULL)`** ใน query ที่ต้องพึ่ง index (prepared statement อาจไม่ใช้ index) — ตรวจด้วย `EXPLAIN`; ค้นด้วย `LIKE` บนคอลัมน์ `*_norm` ไม่ใช่ `ILIKE` บนคอลัมน์ดิบ
- keyset ดึง `size + 1` แถวเพื่อหา `has_next` (ไม่ใช้ `COUNT`); offset: `page` เริ่มที่ 1 → `OFFSET = (page-1) × size`; อย่าอ้างว่าเป็น Index-Only Scan ถ้ายังไม่วัดจริง; เปิด `pg_stat_statements`
- ข้อความไทยใน Customer/ชื่อไฟล์: อย่าสรุป index ของ `pg_trgm` ก่อนผล spike B2-00 และระบุ encoding/locale ของ DB อย่างชัดเจน
- `job_no` unique; B/L และ Invoice **ไม่ unique** (เตือนเมื่อซ้ำ ไม่บล็อก)
- role ของผู้ใช้ AD มาจาก AD group เท่านั้น (ไม่กำหนดในระบบ); ผู้ใช้ local กำหนด role ในระบบ
- CSV import: คิว `import` concurrency = 1, chunk 1,000 แถว/transaction; reconcile 4 ผล (`new`/`matched`/`fills_blank`/`conflict`), `keep_existing` เป็นค่าเริ่มต้น — ห้ามทับข้อมูลที่ขัดแย้งโดยไม่ผ่านนโยบาย
- ไฟล์เอกสาร: เขียน `.part` → rename → INSERT + audit ใน transaction; DB ล้มเหลวต้องลบไฟล์; ไฟล์กำพร้าถูกเก็บกวาดโดย worker

## Resilience
- `/healthz` = process ตอบได้ (ใช้กับ compose healthcheck/autoheal) · `/readyz` = เช็ก DB (ใช้เป็น metric/alert เท่านั้น) — **ห้ามผูก restart กับ `/readyz`**
- timeout ทุกชั้น (connect 3s, acquire 2s, query 5s); DB/storage ล่ม → `503` code `5030`/`5031` + `Retry-After`; Nginx ไม่ retry 503 และไม่ retry POST
- storage ล่มไม่ทำให้ node หลุดจาก LB (กระทบเฉพาะ upload/download)

## การทดสอบ (ต้องมีในทุก feature)
- **BE**: unit ที่ service (mock ports), integration ด้วย testcontainers-go; coverage ≥ 80%
- **FE**: Vitest + React Testing Library + MSW; coverage ≥ 70%
- **E2E**: Playwright ผ่าน Nginx; โหลด: k6; ตัวจำลองพัฒนา/เดโม: compose profile `testinfra`
- เขียน test พร้อมโค้ดใน PR เดียวกัน; E2E ต้องไม่ใช้ `sleep` (seed ข้อมูลคงที่)

## Git, PR และ Definition of Done
- trunk-based + feature branch สั้น; Conventional Commits; อ้างรหัสการ์ด เช่น `feat(import): reconcile classifier (B3-04)`
- PR ต้องผ่าน CI (lint → unit → integration → build) ก่อน merge
- DoD: โค้ด review แล้ว · test ผ่าน · coverage ถึงเกณฑ์ · lint/type check ผ่าน · มี log + metric พื้นฐาน · เอกสารอัปเดต · deploy ผ่าน `docker compose up -d`

## ห้ามทำ (ตัดสินใจแล้ว — เปลี่ยนต้องเขียน ADR ใหม่)
- ห้ามเพิ่ม Redis, MinIO, microservices, BFF, token introspection, OCR/การค้นหาในเนื้อหาเอกสาร
- ห้ามให้ BE เก็บไฟล์เอกสารบน disk ของตัวเอง (ใช้ `FileStorage`)
- ห้าม retry POST อัตโนมัติ (ยกเว้น FE retry เฉพาะที่ส่ง `Idempotency-Key`)
- ห้ามสร้าง role ใหม่นอก `admin`/`staff`/`viewer` และห้ามใช้ assignee เป็นตัวควบคุมสิทธิ์
- ห้ามใช้ `204` หรือ response ที่ไม่ใช่ envelope กับ JSON API (ยกเว้นที่ระบุไว้)

## เมื่อไม่แน่ใจ
1. อ่านเอกสารในตารางด้านบนก่อน — ส่วนใหญ่มีคำตอบอยู่แล้ว
2. ถ้าต้องเปลี่ยนการตัดสินใจเชิงสถาปัตยกรรม: เสนอเป็น ADR ใหม่ (สถานะ `Proposed`) ให้ผู้ใช้ยืนยันก่อน และ **อัปเดต SPEC กับแผนให้ตรงกันในงานเดียวกัน**
3. คำถามที่ยังเปิดอยู่ (LDAP/AD, วิธี mount NAS, Kerberos) อยู่ใน `SPEC.md` หัวข้อ 18 — ใช้ตัวจำลองไปก่อน อย่าเดาค่าจริง
4. อย่าสร้างข้อมูลหรือตัวเลขที่ไม่มีในเอกสารแล้วนำเสนอเหมือนเป็นข้อกำหนด
5. ถ้าเป้าหมายขัดกัน ใช้ลำดับใน `intent.md` หัวข้อ 7: ถูกต้อง/ปลอดภัย > ค้นหาและดาวน์โหลดใช้ได้ > เรียบง่าย > ความเร็วนำเข้า > ฟีเจอร์เสริม

## ภาษา
- สื่อสารกับผู้ใช้ **เป็นภาษาไทย** (ศัพท์เทคนิคใช้อังกฤษได้)
- โค้ด, identifier, comment, commit message, ชื่อ branch เป็น **ภาษาอังกฤษ**
- ข้อความใน UI อยู่ใน i18n (TH/EN) — ห้าม hard-code; `message` ใน API เป็นอังกฤษสำหรับนักพัฒนา และ FE แสดงข้อความตาม `code`

## หมายเหตุคำศัพท์
- **Batch** ในแผน = รอบการพัฒนา (Batch 0–8) ส่วน **import batch** = การนำเข้า CSV หนึ่งครั้ง — ต่างกัน
- **B/L** = Bill of Lading · 1 Job Order : 1 B/L : 1 Invoice · **Customer** ไม่ใช่ผู้ใช้ระบบ
