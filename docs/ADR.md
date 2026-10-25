# Architecture Decision Records (ADR)

> บันทึกการตัดสินใจเชิงสถาปัตยกรรมของระบบอัปโหลดและค้นหาเอกสาร — ร่างโดย Claude จากการออกแบบร่วมกับเจ้าของระบบ ทีมควรทบทวนก่อนใช้เป็นข้อกำหนดทางการ
> ทุกรายการลงวันที่ **2026-10-13** (วันรวบรวมจากการออกแบบ) · อ้างอิงรายละเอียดใน `SPEC.md` · เป้าหมายอยู่ใน `intent.md`

## วิธีใช้
- 1 การตัดสินใจ = 1 ADR; ห้ามแก้เนื้อหาของ ADR ที่ `Accepted` แล้ว — ถ้าเปลี่ยนใจให้เพิ่ม ADR ใหม่และตั้งของเดิมเป็น `Superseded by ADR-xxx`
- สถานะ: `Proposed` → `Accepted` → `Superseded` / `Deprecated`
- โครงสร้าง: Context · Decision · Alternatives (ที่พิจารณา) · Consequences (ข้อดี/ข้อแลกเปลี่ยน)
- ถ้าเปลี่ยนการตัดสินใจ ต้องอัปเดต `SPEC.md`, `DEVELOPMENT_PLAN.md` และ `CLAUDE.md` ที่เกี่ยวข้องในงานเดียวกัน
- หมายเหตุ: ทางเลือกที่ระบุว่า "ผู้ใช้กำหนด" คือข้อกำหนดตั้งต้น ไม่ได้ผ่านการประเมินทางเลือกอื่นอย่างเป็นทางการ

## สารบัญ

| ID | เรื่อง | สถานะ |
|---|---|---|
| ADR-001 | Modular monolith + แบ่งชั้นตาม feature | Accepted |
| ADR-002 | Tech stack หลัก | Accepted |
| ADR-003 | Keycloak + SPA (OIDC PKCE) ไม่มี BFF | Accepted (ทบทวนถ้านโยบายห้ามเก็บ token ใน browser) |
| ADR-004 | ตรวจ JWT ในเครื่องของแต่ละ node (ไม่ introspect) | Accepted |
| ADR-005 | Logout denylist ด้วย Postgres + in-memory + LISTEN/NOTIFY | Accepted |
| ADR-006 | Local users เก็บใน Keycloak DB | Accepted |
| ADR-007 | LDAP/AD ผ่าน Keycloak User Federation | Accepted (Kerberos ค้าง) |
| ADR-008 | RBAC แบบ role คงที่ 3 ตัว | Accepted |
| ADR-009 | `user_profiles` snapshot สำหรับรายงาน | Accepted |
| ADR-010 | River เป็นคิวงาน + worker แยก 1 node | Accepted |
| ADR-011 | เอกสารเก็บที่ storage ภายนอกผ่าน `FileStorage` (sftp \| shared_folder) | Accepted |
| ADR-012 | ดาวน์โหลดผ่าน signed link | Accepted |
| ADR-013 | Response envelope มาตรฐาน | Accepted |
| ADR-014 | `Idempotency-Key` เฉพาะ import และ upload | Accepted |
| ADR-015 | CSV import: commit แบบ async, reconcile, นโยบาย conflict | Accepted |
| ADR-016 | ฟอร์ม Job Order, assignee และ `provided_by` | Accepted |
| ADR-017 | ค้นหาด้วย Postgres (btree + `pg_trgm`) ไม่ทำ OCR | Accepted |
| ADR-018 | Deployment: Docker Compose บน Colima + Nginx 3 FE/3 BE/1 worker | Accepted |
| ADR-019 | การจัดการความล้มเหลวและ auto recovery | Accepted |
| ADR-020 | Observability ด้วย LGTM + Alloy | Accepted |
| ADR-021 | กลยุทธ์ทดสอบและตัวจำลอง `testinfra` | Accepted |
| ADR-022 | เลื่อน HA ไปเป็นแผนอนาคต | Accepted |
| ADR-023 | Dashboard: Search-first + งานที่ต้องทำ | Accepted |
| ADR-024 | Retention ของเอกสารเป็นค่า config | Accepted |
| ADR-025 | Pagination แบบผสม (offset + keyset) | Accepted |
| ADR-026 | Query builder แบบ dynamic + 3 query ตามชั้นสำหรับ `/search` | **Proposed** |

---

## ADR-001 — Modular monolith + แบ่งชั้นตาม feature
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 5.4

**Context**: ทีมเล็ก ระบบเป็น CRUD + search เป็นหลัก ผู้ใช้ 100–200 คน

**Decision**
- BE เป็น modular monolith แบ่งโฟลเดอร์ตาม feature: `handler → service → repository` (+ `model`, `ports`)
- ใช้ Ports & Adapters เฉพาะ dependency ภายนอก (`FileStorage`, `UserStore`, clock, ID generator)
- FE แบ่งแบบ feature-based; server state ทั้งหมดใช้ TanStack Query

**Alternatives**: microservices (ภาระ deploy/observability เกินความจำเป็น) · DDD เต็มรูปแบบ (ซับซ้อนเกินระบบ) · hexagonal ทุกชั้น (boilerplate มาก)

**Consequences**
- (+) เรียบง่าย ทดสอบง่าย (mock เฉพาะ ports)
- (−) ต้องรักษาวินัย: service ห้าม import feature อื่นตรง ๆ และห้าม import Echo

## ADR-002 — Tech stack หลัก
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 5

**Context**: ผู้ใช้กำหนด FE React + Vite + Tailwind, BE Go + Echo, DB Postgres

**Decision**: Go 1.23 + Echo v4, `pgx` + `sqlc`, `golang-migrate`; React 18 + TS + Vite + Tailwind + shadcn/ui; Postgres 16

**Alternatives**: ผู้ใช้กำหนดหลัก ไม่ได้ประเมินทางเลือกอื่น · ชั้น DB: เลือก `sqlc` (type-safe SQL) แทน ORM เพื่อคุม query และประสิทธิภาพการค้นหาได้ตรง

**Consequences**: (+) type-safe, ไม่มี ORM magic · (−) ต้องเขียน SQL เอง · ควรตรวจเวอร์ชันล่าสุดที่เสถียรตอนเริ่ม Batch 0

## ADR-003 — Keycloak + SPA (OIDC PKCE) ไม่มี BFF
**Status**: Accepted (ทบทวนถ้านโยบายองค์กรห้ามเก็บ token ใน browser) · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 8

**Context**: ต้องมี AuthN/AuthZ ด้วย Keycloak; มี client เดียว (SPA) ใช้ภายใน อยู่โดเมนเดียวกันหลัง Nginx

**Decision**: Authorization Code + PKCE จาก SPA, token อยู่ใน memory เท่านั้น, access token อายุ 5 นาที, ไม่มี BFF

**Alternatives**: BFF ในตัว Go (session cookie, token อยู่ฝั่งเซิร์ฟเวอร์) — เก็บเป็นทางอัปเกรด · BFF เป็น service แยก — hop เพิ่ม ต้องมี session store ร่วม 3 node และ CSRF

**Consequences**
- (+) ซับซ้อนน้อยที่สุด ไม่มี service เพิ่ม
- (−) เสี่ยง XSS มากกว่า → CSP เข้ม ไม่มี inline script, pin dependency, token อายุสั้น + denylist (ADR-005)
- ยังไม่ได้ยืนยันว่าองค์กรมีนโยบายห้ามให้ token อยู่ใน browser หรือไม่

## ADR-004 — ตรวจ JWT ในเครื่องของแต่ละ node (ไม่ introspect)
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 8

**Context**: BE 3 node ต้องตรวจสิทธิ์ทุก request ที่ ~200 RPS; Keycloak มี 1 node บนเครื่องที่ RAM จำกัด

**Decision**: แต่ละ node ตรวจลายเซ็นด้วย JWKS ที่ cache ไว้ + `iss`/`aud`/`exp`, อ่าน role จาก claim; Keycloak ถูกเรียกเฉพาะดึง JWKS และ Admin API

**Alternatives**: token introspection ทุก request (Keycloak กลายเป็นจุดล่มของทุก request, latency เพิ่ม, โหลดสูง) · introspect เฉพาะ endpoint เสี่ยงสูง (ยังไม่ทำ — เพิ่มได้ภายหลัง)

**Consequences**: (+) Keycloak ล่มชั่วคราวผู้ที่ login อยู่ยังใช้ต่อได้จน token หมดอายุ · (−) เปลี่ยน role มีผลเมื่อออก token ใหม่ (≤ 5 นาที) และต้องมีกลไกเพิกถอน (ADR-005)

## ADR-005 — Logout denylist ด้วย Postgres + in-memory + LISTEN/NOTIFY
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 8.4

**Context**: JWT เป็น stateless — หลัง logout token เดิมยังใช้ได้จนหมดอายุ; ผู้ใช้ต้องการ blacklist ตอน logout

**Decision**
- เพิกถอนได้ 3 ชนิด: `sid` (ทั้ง session), `jti` (token เดี่ยว), `sub`+เวลา cutoff (ปิด user/รีเซ็ตรหัสผ่าน)
- เก็บใน `revoked_tokens` (Postgres); แต่ละ node โหลดเข้า memory และอัปเดตด้วย `LISTEN/NOTIFY` (poll ทุก 5 วินาทีเมื่อ connection หลุด)
- เปิด Revoke Refresh Token, ตั้ง Backchannel Logout; ตอบ `401` code `4011`

**Alternatives**: Redis (เพิ่ม infra/RAM/backup) · introspection (ADR-004) · ไม่ทำ (token ใช้ได้จนหมดอายุ)

**Consequences**
- (+) เพิกถอนมีผลทุก node ≤ 2 วินาที, ไม่เพิ่ม infra
- (−) `NOTIFY` ไม่ถูกเก็บ → ตารางคือแหล่งความจริงและต้องโหลดใหม่หลัง reconnect; connection `LISTEN` ต้องต่อตรง Postgres (ไม่ผ่าน PgBouncer แบบ transaction mode) 1 เส้นต่อ node

## ADR-006 — Local users เก็บใน Keycloak DB
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 8.1

**Context**: ต้องมีผู้ใช้ที่สร้างผ่านระบบนอกเหนือจาก LDAP/AD

**Decision**: BE เรียก Keycloak Admin API (service account) สร้าง/แก้/ปิด/กำหนด role; ข้อมูลอยู่ใน Keycloak database (Postgres instance เดียวกัน แยก database/user); ฟิลด์เพิ่มใช้ User Profile attribute

**Alternatives**: เก็บใน app DB + User Storage SPI (Java) — เก็บรายละเอียดไว้ที่ SPEC Appendix A · แก้ตารางของ Keycloak ตรง ๆ — ไม่ทำ (พังตอนอัปเกรด/ข้าม cache)

**Consequences**: (+) ไม่มี Java, อัปเกรด Keycloak ง่าย, login พึ่ง Keycloak ตัวเดียว · (−) join กับเอกสารไม่ได้ → ใช้ ADR-009; Keycloak DB ต้องอยู่ใน backup · ย้ายไป Option B ภายหลังต้อง migrate ผู้ใช้และรีเซ็ตรหัสผ่าน

## ADR-007 — LDAP/AD ผ่าน Keycloak User Federation
**Status**: Accepted (ยังค้าง: Kerberos SSO และข้อมูลเชื่อมต่อจริง) · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 8.2

**Context**: พนักงานมีบัญชีใน LDAP/AD ขององค์กร

**Decision**: Keycloak ทำ User Federation แบบ READ_ONLY ผ่าน LDAPS; map AD group → realm role (role ของผู้ใช้ AD มาจากกลุ่มเท่านั้น — ตัดสินใจแล้ว); มี local break-glass admin; URL/Base DN/bind DN/ชื่อ attribute เป็น config; พัฒนาด้วย OpenLDAP จำลอง (ADR-021)

**Alternatives**: ให้ BE คุยกับ AD เอง — ไม่ทำ (ผูก logic และ credential เข้า BE)

**Consequences**: (+) แอปไม่รู้จัก AD · (−) attribute/nested group/LDAPS ของ AD จริงต่างจากตัวจำลอง → ต้องทดสอบกับ AD จริงช่วง UAT; AD ล่ม → login ใหม่ไม่ได้ ยกเว้น local admin

## ADR-008 — RBAC แบบ role คงที่ 3 ตัว
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 2.1

**Decision**: `admin` / `staff` / `viewer` เป็น realm role; BE บังคับสิทธิ์ใน middleware ต่อ route, FE ซ่อน UI เพื่อ UX เท่านั้น

**Alternatives**: permission-based RBAC (สร้าง role เอง) และจำกัดสิทธิ์รายลูกค้า — อยู่ใน backlog

**Consequences**: (+) เรียบง่าย · (−) เพิ่ม role หรือสิทธิ์ละเอียดต้องแก้โค้ดและ deploy; ยังทำต่อยอดได้เพราะตรวจสิทธิ์รวมอยู่จุดเดียว

## ADR-009 — `user_profiles` snapshot สำหรับรายงาน
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 8.3

**Context**: รายงานต้องใช้ชื่อ สกุล ตำแหน่ง แผนก รหัสพนักงาน แต่ข้อมูลอยู่ที่ Keycloak/AD จึง join ไม่ได้

**Decision**: ตาราง `user_profiles` (key = Keycloak `sub`) อัปเดตจาก claim ตอน login, job รายวัน และ `POST /users/sync`; ผู้ที่หายไปตั้ง `is_active=false` ไม่ลบแถว

**Alternatives**: เรียก Admin API ต่อแถวตอนทำรายงาน (ช้า) · ย้ายผู้ใช้มาไว้ใน app DB (ไม่เลือก — ADR-006)

**Consequences**: (+) join ได้ รายงานย้อนหลังยังแสดงชื่อ · (−) ข้อมูลอาจเก่าสูงสุดตามรอบ sync; รายงานแสดงแผนก/ตำแหน่ง "ปัจจุบัน" (เก็บค่า ณ เวลาทำรายการเป็นตัวเลือก ยังไม่ทำ); ข้อมูลส่วนบุคคล — แสดงรหัสพนักงาน/ตำแหน่งเฉพาะ admin/staff

## ADR-010 — River เป็นคิวงาน + worker แยก 1 node
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 11.1

**Context**: ต้องมีงานเบื้องหลังที่รอด restart และ retry ได้ (import CSV, sync ผู้ใช้, ลบแถวหมดอายุ, retention, เก็บกวาดไฟล์กำพร้า) และ RAM จำกัด

**Decision**: ใช้ River (คิวบน Postgres) รันใน service `worker` แยก 1 node (`cmd/worker`); BE ตั้ง `RUN_WORKERS=false`; คิว `import` concurrency = 1

**Alternatives**: Asynq + Redis (เพิ่ม Redis, enqueue ไม่ atomic กับ DB) · Temporal (หนักเกิน) · broker + โค้ดเอง · goroutine ใน BE (งานหาย, cron รัน 3 ครั้ง) · ตาราง jobs เขียนเอง

**Consequences**: (+) enqueue ใน transaction เดียวกับสถานะ, backup ครั้งเดียว, ไม่เพิ่ม infra · (−) คิวอยู่ใน Postgres เดียวกับแอป (DB ล่ม งานหยุด) และไม่เหมาะกับงานระดับพันต่อวินาที; ตรวจเวอร์ชัน/สถานะ River ก่อนเริ่ม

## ADR-011 — เอกสารเก็บที่ storage ภายนอกผ่าน `FileStorage`
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 4.4

**Context**: ข้อมูลเอกสารคาดการณ์ ~5 TB เกินกว่าเครื่อง Colima; ผู้ใช้กำหนดให้ BE ไม่เก็บไฟล์เอง

**Decision**: port `FileStorage` (Put/Open/Stat/Delete/Link) มี 2 provider เลือกด้วย `STORAGE_PROVIDER=sftp|shared_folder` และเก็บ provider ต่อไฟล์ใน `documents`; เขียน `.part` แล้ว rename; เก็บ sha256; ไฟล์กำพร้าถูกเก็บกวาดด้วย worker; storage ล่ม → `503` code `5031` โดย node ไม่หลุดจาก LB

**Alternatives**: MinIO (ตัดออก — ใช้ RAM/disk/backup เพิ่ม และผู้ใช้ต้องการ storage ภายนอก) · ใช้ shared link ของ NAS ตรง ๆ (คุมสิทธิ์/audit ไม่ได้ ดู ADR-012)

**Consequences**: (+) disk ของ Colima เก็บแค่ Postgres/Keycloak/LGTM · (−) การ backup/ความจุเป็นหน้าที่ผู้ดูแล storage; `shared_folder` ต้อง mount เข้า VM (วิธียังรอยืนยันกับทีมดูแล NAS) และ mount หลุดต้องตรวจด้วยไฟล์ marker

## ADR-012 — ดาวน์โหลดผ่าน signed link
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 4.4, 14

**Context**: ผู้ใช้เห็นว่า URL link พอ (ระบบภายใน) แต่ SFTP ให้ browser เปิดตรงไม่ได้

**Decision**: BE ออก `/api/v1/dl/{token}` (HMAC, อายุ ≤ 60 วินาที, ผูก user + เอกสาร) แล้ว stream จาก storage; เช็กสิทธิ์และ audit ตอนออกลิงก์และตอนใช้; ใช้เหมือนกันทั้งสอง provider

**Alternatives**: presigned URL ตรง (ไม่มี S3/ใช้กับ SFTP ไม่ได้) · คืน shared link ของ NAS (ใครมีลิงก์ก็เปิดได้ คุมสิทธิ์/audit ไม่ได้)

**Consequences**: (+) คุมสิทธิ์และ audit ได้ทั้งสองโหมด, เปิดจาก `<a href>` ได้ · (−) BE ต้อง stream ไฟล์ → จำกัด concurrent transfer ต่อ node

## ADR-013 — Response envelope มาตรฐาน
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 9

**Decision**: ทุก JSON endpoint ตอบ `{ code, message, data }` (+ `meta` นอก `data` เมื่อเป็น list แบ่งหน้า); `code` = HTTP status × 10 + เลขย่อย; `data` เป็น object/list (`[]` เมื่อว่าง)/`null`; validation error เป็น array ของ `{ field, message }`; ไม่ใช้ `204` (DELETE/logout ตอบ `200` + `data: null`); `commit` ตอบ `202`; `message` เป็นอังกฤษ FE แปลตาม `code`; Nginx ตอบ error เป็น envelope เดียวกัน

**Alternatives**: RFC 7807 problem+json · `204` สำหรับ DELETE · `meta` ใน `data` หรือใน header

**Consequences**: (+) FE interceptor เดียวอ่านได้ทุก response · (−) ต้องยกเว้นดาวน์โหลดไฟล์/export, health/metrics และ backchannel logout; สถานะ HTTP ต้องตรงผลลัพธ์เสมอ (ไม่ตอบ 200 ตอน error)

## ADR-014 — `Idempotency-Key` เฉพาะ import และ upload
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 9.1

**Context**: ความเสี่ยงมีแค่ผู้ใช้กดซ้ำและ request หมดเวลาแล้วลองใหม่; Nginx/BE ไม่ retry POST เอง

**Decision**: บังคับ `Idempotency-Key` ที่ `POST /imports` และ upload เอกสาร (ตาราง `idempotency_keys`, lease 10 นาที, อายุ 24 ชม.); การสร้าง Customer/Job Order/User ใช้ unique constraint ตอบ `409`; upload = 1 ไฟล์/request และกันไฟล์ซ้ำด้วย `(job_order_id, sha256, document_type)`

**Alternatives**: idempotent ทุก POST (เกินความจำเป็น) · ไม่ทำเลย (ได้ไฟล์/batch ซ้ำ)

**Consequences**: (+) งานหนักไม่ทำซ้ำ · (−) ต้องมี middleware + ตาราง + worker ลบแถวหมดอายุ; FE ต้องสร้าง key ต่อการกด submit

## ADR-015 — CSV import: commit แบบ async, reconcile, นโยบาย conflict
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 2.4, 7

**Context**: ข้อมูลหลักมาจาก CSV แต่พนักงานกรอกด้วยมือก่อนได้ จึงต้องตรวจเทียบเมื่อ CSV มาทีหลัง

**Decision**
- commit เปลี่ยนสถานะเป็น `queued` และ enqueue ใน transaction เดียวกัน ตอบ `202`; ทำทีละ batch (คิว `import` concurrency 1); chunk 1,000 แถว/transaction; retry/resume ได้
- dry-run จำแนก `new` / `matched` / `fills_blank` / `conflict` / `error`; `conflict` ไม่ทับข้อมูลเดิม (`keep_existing` เป็นค่าเริ่มต้น หรือเลือก `use_csv`) และมีหน้า "ข้อมูลขัดแย้ง"
- ยังไม่รองรับการยกเลิก batch ที่กำลัง `processing`

**Alternatives**: upsert ทับเสมอ (เสี่ยงทับข้อมูลที่กรอกเอง) · import ใน request เดียว (timeout, กิน CPU ของ BE)

**Consequences**: (+) ไม่ทับข้อมูลเงียบ ๆ, ย้อนดูผลได้ · (−) ต้องมีตาราง `import_conflicts` และหน้าจอเพิ่ม (เพิ่มงานราว 3–4 วัน)

## ADR-016 — ฟอร์ม Job Order, assignee และ `provided_by`
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 2.4

**Decision**: มีฟอร์มสร้าง/แก้ Job Order + B/L + Invoice + Customer โดยไม่ต้องรอ CSV (`data_source=manual`, `verification_status=unverified`); `assignee_id` ใช้จัดงานและเป็นตัวกรอง ไม่ใช่สิทธิ์ (admin/staff อัปโหลดให้ Job Order ใดก็ได้); เอกสารมี `provided_by_name/type` (ผู้ส่งเป็นใครก็ได้) แยกจาก `uploaded_by`; เจ้าหน้าที่อัปโหลดแทนทุกกรณี

**Alternatives**: ลิงก์อัปโหลดให้คนภายนอก/portal (ไม่อยู่ใน scope — backlog)

**Consequences**: (+) ทำงานได้โดยไม่รอ CSV, ระบุแหล่งที่มาของไฟล์ได้ · (−) ต้องจัดการสถานะ `verification_status` และ `provided_by` เป็นข้อมูลอิสระ (พิมพ์เอง ไม่มีการ master data)

## ADR-017 — ค้นหาด้วย Postgres (btree + `pg_trgm`) ไม่ทำ OCR
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 6.1, 10

**Context**: ฟิลด์ค้นหาหลัก 3 ตัวคือ Job Order, B/L, Invoice; ไม่ต้องค้นในเนื้อหาเอกสาร

**Decision**: คอลัมน์ `*_norm` (trim + upper) พร้อม btree (`text_pattern_ops`) สำหรับ exact/prefix และ trigram สำหรับ contains; ลำดับ exact → prefix → contains; keyset pagination; bulk search ≤ 200 เลข; ไม่ทำ OCR/ค้นเนื้อหา

**Alternatives**: OpenSearch/Elasticsearch (หนักเกินสำหรับ RAM จำกัด) · full-text ในเนื้อหาเอกสาร (ไม่ต้องการ)

**Consequences**: (+) ไม่เพิ่มระบบค้นหา, ทำเป้า p95 ได้ด้วย index · (−) ความเสี่ยงที่ยังไม่ได้ตรวจ: `pg_trgm` กับข้อความไทยที่ไม่มีเว้นวรรค (ชื่อลูกค้า/ชื่อไฟล์) มีงาน spike B2-00 (ต้น Batch 2) ตรวจ encoding/locale ของ DB, การ normalize และผลการค้นหา แล้วบันทึกผลเป็น ADR ใหม่

## ADR-018 — Deployment: Docker Compose บน Colima + Nginx 3 FE/3 BE/1 worker
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 11

**Context**: ผู้ใช้กำหนดระบบภายในบน Colima, Nginx เป็น load balancer ไป FE/BE อย่างละ 3 node; host ประมาณ 4–6 CPU / 8–12 GB RAM

**Decision**: Compose service แยกชื่อ `fe-1..3`, `be-1..3`, `worker`, `migrate` (one-shot) เพื่อให้ Nginx upstream ชัดเจนและตรวจรายตัวได้; Colima VM 4 vCPU / 8 GB / 100+ GB; Standard profile ≈ 5.5 GB, Lite ≈ 4.5 GB; Keycloak ใช้ Postgres instance เดียวกับแอป (แยก database/user)

**Alternatives**: Kubernetes/Swarm (นอกขอบเขต ไม่ได้ประเมิน)

**Consequences**: (+) เรียบง่ายสำหรับทีมเล็ก · (−) หลาย node บนเครื่องเดียวกันไม่ช่วยกรณีเครื่องล่ม; host RAM 8 GB ตึง ถ้าผู้ใช้พร้อมกัน 200 คนจริงแนะนำ RAM 12 GB ขึ้นไป

## ADR-019 — การจัดการความล้มเหลวและ auto recovery
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 11.3, 11.7

**Context**: DB อาจล่มตอน start หรือระหว่างทำงาน; compose `restart` ไม่ฟื้นเมื่อ container ยังรันแต่ unhealthy

**Decision**: `/healthz` (liveness) แยกจาก `/readyz` (เช็ก DB) — autoheal/compose ใช้ `/healthz` เท่านั้น; timeout ทุกชั้น (connect 3s / acquire 2s / query 5s); DB ล่ม → `503` code `5030` + `Retry-After`, circuit breaker; start แบบ retry+backoff ~2 นาทีแล้ว exit; migration ผ่าน service `migrate` ตัวเดียว; Nginx ไม่ retry `503` และไม่ retry POST; ซ้อมด้วย chaos test

**Alternatives**: ผูก healthcheck/autoheal กับ `/readyz` (DB ล่ม → restart ทุก node วน เกิด restart storm โดยไม่ช่วยอะไร)

**Consequences**: (+) ระบบกลับมาเองโดยไม่ restart BE · (−) ต้องออกแบบ timeout/breaker/ข้อความ error ให้ครบทุกชั้น และ FE ต้องจัดการแบนเนอร์ "ระบบไม่พร้อมชั่วคราว"

## ADR-020 — Observability ด้วย LGTM + Alloy
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 12

**Decision**: Loki (logs), Mimir (metrics), Tempo (traces), Grafana + Grafana Alloy เป็น collector; OpenTelemetry ใน BE; dashboard และ alert เป็นไฟล์ใน repo; มี Standard/Lite profile ตาม Resource Budget

**Alternatives**: ผู้ใช้กำหนด LGTM ไม่ได้ประเมินทางเลือกอื่น

**Consequences**: (+) ครบ 3 signals · (−) ใช้ RAM ส่วนใหญ่ของ budget (Mimir/Loki/Tempo) บนเครื่องที่จำกัด → ลด retention/sampling ใน Lite profile

## ADR-021 — กลยุทธ์ทดสอบและตัวจำลอง `testinfra`
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 13, 11.8

**Decision**: unit / integration (testcontainers-go) / E2E (Playwright ผ่าน Nginx) ทั้ง FE และ BE, k6 สำหรับโหลด; coverage BE ≥ 80% FE ≥ 70%; compose profile `testinfra` (OpenLDAP, Samba, `atmoz/sftp`) สำหรับพัฒนา/เดโมโดยไม่ต้องรอ AD/NAS จริง; URL/Base DN/attribute/provider เป็น config

**Alternatives**: mock ทุกอย่าง (ไม่เจอปัญหา mount/LDAP จริง) · รอข้อมูลจากทีม IT/NAS ก่อนเริ่ม (บล็อกงาน)

**Consequences**: (+) Batch 1b และ 4 ไม่ต้องรอข้อมูลภายนอก · (−) ตัวจำลองไม่ครอบคลุม UID mapping ของ NAS จริง, ความหน่วงเครือข่าย, SMB dialect, nested group/LDAPS ของ AD จริง → ต้องทดสอบของจริงใน UAT (Batch 8)

## ADR-022 — เลื่อน HA ไปเป็นแผนอนาคต
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 11.5

**Decision**: Postgres, Keycloak, worker รัน 1 node + auto restart + backup (`pg_dump` รายวัน); เตรียมให้ต่อยอดได้ (BE stateless, host/port มาจาก env, รองรับ PgBouncer); เก็บแผน HA (Patroni, Keycloak 2+ node, Nginx + keepalived) ไว้ใน roadmap; WAL archiving + PITR (pgBackRest) เป็นข้อเสนอเสริมที่ยังไม่ได้ยืนยัน

**Alternatives**: ทำ HA บนเครื่องเดียว (ไม่ช่วยเมื่อเครื่องล่ม)

**Consequences**: (−) เครื่อง/Postgres ล่ม = ระบบหยุดจนกว่าจะกู้คืน; ต้องกำหนด RPO/RTO (ยังไม่ได้กำหนด) · ทบทวนเมื่อย้ายไปหลายเครื่อง

## ADR-023 — Dashboard: Search-first + งานที่ต้องทำ
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 2.3

**Decision**: หน้าแรกของทุก role คือช่องค้นหา + เอกสารล่าสุด; admin/staff เห็นการ์ด "งานที่ต้องทำ" (Job Order ที่ขาดเอกสาร B/L หรือ Invoice, `mine`/`unassigned`/`conflict`/`unverified`), สถานะ import, กิจกรรม; มีแถบแจ้งเตือนสถานะระบบจาก `/system/status`; หน้า KPI overview เป็น backlog

**Alternatives**: KPI overview เป็นหน้าแรก · work queue เป็นหน้าแรกอย่างเดียว (ภาพออกแบบ 3 แนวทางใน Dashboard Concepts)

**Consequences**: (+) ตรงกับงานหลัก (ค้นหา) และใช้ข้อมูลที่มีอยู่แล้ว · (−) เพิ่มงาน ~3–4 วันใน Batch 5 และ endpoint ใหม่ 4 ตัว

## ADR-024 — Retention ของเอกสารเป็นค่า config
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 3

**Context**: องค์กรยังไม่มีนโยบายเก็บรักษาเอกสาร

**Decision**: `DOCUMENT_RETENTION_DAYS` (ค่าเริ่มต้น `0` = เก็บถาวร ไม่ลบอัตโนมัติ) และ `PURGE_GRACE_DAYS` (ค่าเริ่มต้น 30); job ของ worker ลบแบบ soft delete ก่อน แล้ว purge หลัง grace period พร้อม audit

**Alternatives**: กำหนดจำนวนปีตายตัว (ยังไม่มีนโยบายรองรับ)

**Consequences**: (+) เปลี่ยนนโยบายได้โดยไม่แก้โค้ด · (−) ต้องระวังการตั้งค่าผิดที่ลบเอกสารจริง → ค่าเริ่มต้นปลอดภัย (ไม่ลบ) และต้องมี audit

## ADR-025 — Pagination แบบผสม (offset + keyset)
**Status**: Accepted · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 9.2

**Context**: spec เดิมปน `meta` แบบ offset (`page/size/total`) กับ keyset ของ `/search`; Job Orders และเอกสารคาดการณ์ ~1M แถวขึ้นไป

**Decision**: **offset** กับ list เล็ก/กลาง (Users, Customers, import batches, conflicts, work queue, เอกสารต่อ Job Order, รายงานสรุป) — `meta { page, size, total }`, ลึกสุด 10,000 แถว; **keyset** กับ list ใหญ่หรือโตต่อเนื่อง (`/search`, `/job-orders`, `/audit-logs`, `import_rows`) — `cursor` แบบสตริงทึบ, `meta { size, next_cursor, has_next }`, ไม่คืน `total`; `size` สูงสุด 100

**Alternatives**: offset ทุก list (หน้าลึกช้าและผลคลาดเคลื่อนเมื่อมีข้อมูลเพิ่ม) · keyset ทุก list (กระโดดไปหน้า N ไม่ได้ ซับซ้อนเกินสำหรับ list เล็ก)

**Consequences**: (+) เร็วคงที่กับข้อมูลใหญ่ ผลไม่คลาดเมื่อมีข้อมูลเพิ่มระหว่างเลื่อน · (−) มี `meta` 2 รูป (OpenAPI `PageMeta`/`CursorMeta`), FE มี 2 รูปแบบ UI, ต้องกำหนดคีย์เรียงที่เสถียร และ keyset ไม่มีจำนวนทั้งหมด

## ADR-026 — Query builder แบบ dynamic + 3 query ตามชั้นสำหรับ `/search`
**Status**: **Proposed** (รอวัดผลด้วย EXPLAIN ที่ 1M แถวใน B5-03 ก่อนอนุมัติ) · **Date**: 2026-10-13 · **อ้างอิง**: SPEC 10, ADR-017, ADR-025

**Context**: `/search` มีเงื่อนไขไม่บังคับหลายตัว (customer, ประเภท, วันที่, assignee, `verification_status`, `provided_by_name`) และต้องเรียงผล exact → prefix → contains; รูป `(col = $1 OR $1 IS NULL)` กับ prepared statement อาจทำให้ plan ไม่ใช้ index; rank ไม่ได้เรียงจาก index โดยตรง; กติกาเดิมคือ SQL ทั้งหมดอยู่ใน sqlc

**Decision (เสนอ)**
- เฉพาะ `/search` ใช้ query builder แบบ dynamic (ประกอบเฉพาะเงื่อนไขที่มีค่า, bind parameter เสมอ, ห้ามต่อสตริงจากข้อมูลผู้ใช้) เป็นข้อยกเว้นของกติกา sqlc
- แยกเป็น 3 query ตามชั้น exact → prefix → contains แต่ละชั้นใช้ index ของตัวเอง แล้วต่อผลในแอปโดยตัดรายการซ้ำ; cursor เก็บ `(ชั้น, id)`; ดึง `size + 1` แถวเพื่อหา `has_next`
- ใช้ `LIKE` บนคอลัมน์ `*_norm` (ไม่ใช้ `ILIKE` บนคอลัมน์ดิบ)

**Alternatives**: query ชุดเดียวด้วย `OR $n IS NULL` (plan เสี่ยงไม่ใช้ index) · sqlc หลาย query ตามชุดเงื่อนไข (จำนวนชุดเงื่อนไขมากเกินไป) · เอนจินค้นหาแยก (ดู ADR-017)

**Consequences**: (+) ใช้ index ได้ตรงตามชั้น · (−) มี SQL แบบ dynamic นอก sqlc ต้อง review และทดสอบ SQL injection เข้ม; ต้องจัดการตัดซ้ำข้ามชั้นและ cursor ที่ซับซ้อนขึ้น; เปลี่ยนเป็น `Accepted` เมื่อวัดผลผ่านเป้า p95 ใน SPEC หัวข้อ 3
