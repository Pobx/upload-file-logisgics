# Operational Runbook: Document Upload & Search System

> คู่มือการปฏิบัติการดูแลรักษาระบบ, การแก้ไขปัญหาฉุกเฉิน, และการกู้คืนข้อมูล

---

## 1. Quick Start & Daily Operations

### 1.0 บัญชีผู้ใช้งานเริ่มต้น (Default Credentials)

#### ก. บัญชีสำหรับเข้าใช้งานระบบเว็บแอปพลิเคชัน (Web SPA & API)
| บทบาท (Role) | Username | Password | สิทธิ์การใช้งาน |
|---|---|---|---|
| **Admin** | `admin_user` | `Admin1234!` | ผู้ดูแลระบบสูงสุด (จัดการผู้ใช้, Merge ลูกค้า, ลบเอกสาร) |
| **Staff** | `staff_user` | `Staff1234!` | ฝ่ายปฏิบัติการ (อัปโหลดเอกสาร, นำเข้า CSV, สร้าง Job Order) |
| **Viewer** | `viewer_user` | `Viewer1234!` | อ่านอย่างเดียว (ค้นหาเอกสาร, ดาวน์โหลด, ดูรายงาน) |

#### ข. บัญชีผู้ดูแลระบบ Infrastructure & Management
| บริการ | URL / Port | Username | Password |
|---|---|---|---|
| **Keycloak Admin Console** | `http://localhost:8085` หรือ `/auth` | `admin` | `admin_password` |
| **Grafana Dashboards** | `http://localhost:3001` | `admin` | `admin` |
| **PostgreSQL Database** | `localhost:5432` (`docsearch_app`) | `docsearch` | `docsearch_password` |
| **Samba NAS Share (testinfra)** | `localhost:1445` (share: `docstore`) | `docsearch` | `sambapassword` |
| **SFTP Server (testinfra)** | `localhost:2222` | `docsearch` | `sftppassword` |
| **OpenLDAP (testinfra)** | `localhost:389` / `636` | `cn=admin,dc=docsearch,dc=internal` | `adminpassword` |

---

### 1.1 การเริ่มระบบบน Colima
```bash
# 1. Start Colima VM
./deploy/scripts/colima-up.sh

# 2. Start Application Stack (Nginx LB + 3 FE + 3 BE + 1 Worker + DB + Keycloak)
make up

# 3. Start LGTM Observability Stack (Loki, Tempo, Mimir, Alloy, Grafana)
make obs-up
```

### 1.2 การหยุดระบบ
```bash
make down
make obs-down
```

---

## 2. Backup & Disaster Recovery

### 2.1 สำรองข้อมูลประจำวัน (Automated Daily Backup)
- สคริปต์ `deploy/scripts/backup.sh` จะทำ `pg_dump` และบีบอัดลง `./backups/docsearch_backup_<timestamp>.sql.gz`
- มีการล้างไฟล์สำรองที่เก่าเกิน 14 วันอัตโนมัติ

```bash
./deploy/scripts/backup.sh
```

### 2.2 การกู้คืนฐานข้อมูล (Database Restore)
```bash
./deploy/scripts/restore.sh ./backups/docsearch_backup_YYYYMMDD_HHMMSS.sql.gz
```

---

## 3. Troubleshooting & Failure Modes

| ปัญหา | สาเหตุที่พบบ่อย | แนวทางแก้ไข |
|---|---|---|
| **HTTP 503 Code `5030` (`DB_UNAVAILABLE`)** | Database ดับ หรือ Circuit Breaker ตัดการทำงานหลังต่อ DB ล้มเหลว 5 ครั้ง | 1. ตรวจสอบสถานะคอนเทนเนอร์: `docker compose ps postgres`<br>2. ดู Log: `docker compose logs --tail=50 postgres`<br>3. เมื่อ DB กลับมา ระบบจะเชื่อมต่อใหม่เองภายใน 10–30 วินาทีโดยไม่ต้องรีสตาร์ท BE |
| **HTTP 503 Code `5031` (`STORAGE_UNAVAILABLE`)** | Mount โฟลเดอร์ NAS หลุด หรือไม่พบไฟล์ Marker `.docsearch-mount` | 1. ตรวจสอบว่า `/mnt/docstore` มีไฟล์ `.docsearch-mount` หรือไม่<br>2. รันสคริปต์ตรวจสอบ: `./deploy/scripts/mount-docstore.sh`<br>3. ตรวจสอบการเชื่อมต่อ Samba/SFTP Server |
| **HTTP 401 Code `4011` (`TOKEN_REVOKED`)** | ผู้ใช้กด Logout หรือผู้ดูแลระบบระงับสิทธิ์บัญชี | พฤติกรรมปกติของระบบ In-memory Denylist (ซิงก์ผ่าน Postgres `LISTEN/NOTIFY`) แนะนำให้ผู้ใช้ล็อกอินใหม่ |
| **HTTP 409 Code `4091` (`REQUEST_IN_PROGRESS`)** | มีการส่ง Submit หรือ อัปโหลดซ้ำด้วย `Idempotency-Key` เดียวกันขณะที่งานเดิมยังไม่เสร็จ | รอ 2–5 วินาทีแล้วลองส่งใหม่ |

---

## 4. Performance & Load Testing
```bash
# รัน k6 จำลอง 200 Concurrent Users
k6 run load-test/k6/load_test.js
```
