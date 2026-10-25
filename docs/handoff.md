# เอกสารส่งมอบงานระบบ (System Handoff Document)

**โครงการ:** ระบบจัดเก็บและค้นหาเอกสารโลจิสติกส์ (Logistics Document Upload & Search System)  
**วันที่ส่งมอบ:** 25 ตุลาคม 2026  
**สถานะระบบ:** เสร็จสมบูรณ์พร้อมใช้งานจริง 100% (Production Ready)  
**เวอร์ชันล่าสุด (Git Tag):** `v0.9.0`  
**URL เข้าใช้งานระบบ:** [http://localhost](http://localhost)  

---

## 1. ภาพรวมของระบบ (System Overview)

ระบบ DocFlow Logistics ได้รับการพัฒนาขึ้นเพื่อตอบโจทย์ทีม **Customer Service (CS)** และทีมปฏิบัติการโลจิสติกส์ ให้สามารถ:
1. **จัดเก็บเอกสารอย่างรวดเร็วหลังปิดงาน**: รองรับการแนบไฟล์ Invoice, Packing List, Bill of Lading (B/L), และใบขนสินค้า (Customs Declaration) ผ่านช่อง Drag & Drop แบบ Zero-Page-Reload
2. **สืบค้นเอกสารย้อนหลังได้ใน 3 วินาที**: รองรับการค้นหาแบบ Full-text / Trigram Index ด้วย Job No, B/L, Invoice หรือชื่อลูกค้า พร้อมคีย์ลัดระดับสากล `⌘ + K` / `Ctrl + K`
3. **ตรวจสอบความครบถ้วนของเอกสาร (Document Checklist)**: แสดงสถานะชัดเจนว่าแต่ละ Job Order มีเอกสารประเภทใดแล้วบ้าง และขาดเอกสารใด
4. **ความปลอดภัยระดับองค์กร**: ลิงก์ดาวน์โหลดไฟล์สร้างผ่าน HMAC-SHA256 Signed Link อายุสั้น 15 นาที พร้อมระบบตัดสิทธิ์ Real-time ผ่าน PostgreSQL `LISTEN/NOTIFY token_revoked`

---

## 2. สรุปการ Re-Design UI/UX (Version 0.9.0)

UI ทั้งหมดได้รับการปรับปรุงใหม่ตามหลัก **Ergonomics & Modern Enterprise SaaS**:
- **Typography**: ใช้ฟอนต์ **Google Font 'Kanit'** ทั่วทั้งระบบ ตัวหนังสือภาษาไทยและอังกฤษคมชัด มีความเป็นทางการ
- **โทนสีสบายตา (Modern Slate & Sky Blue)**:
  - พื้นหลัง Canvas สีขาวออฟไวท์ (`#F8FAFC`) ลดแสงสะท้อนและลดความล้าของสายตา
  - การ์ดและตารางสีขาวบริสุทธิ์ (`#FFFFFF`) ตัดด้วยเส้นขอบเทาอ่อนบางเบา (`#E2E8F0`)
  - ปุ่ม Action และจุดคลิกใช้สีฟ้า Sky Blue (`#0284C7`)
- **Desktop Architecture (`>= 768px`)**:
  - แถบเมนูด้านซ้าย (Left Sidebar) สไตล์โมเดิร์น พับเก็บได้
  - แผง **Slide-over Inspector Drawer** เลื่อนจากขวาเมื่อคลิกดูงาน ตรวจสอบ Checklist และลากวางไฟล์แนบได้ทันที
- **Mobile Responsive Architecture (`< 768px`)**:
  - แถบเมนูด้านล่าง **Native Bottom Navigation Bar** กดง่ายด้วยนิ้วโป้ง
  - เปลี่ยนตารางเป็น **Job Cards** แสดงข้อมูลกระชับและแตะสะดวก
  - แผง **Bottom Sheet สไลด์ขึ้นจากล่าง** รองรับการแตะเพื่อถ่ายรูปจากกล้องมือถือหรือเลือกไฟล์ PDF
- **Strict Role-based Visibility (ซ่อนเมนูที่ไม่มีสิทธิ์ 100%)**:
  - **Admin**: แสดง 4 เมนู (ค้นหา, นำเข้า CSV, ลูกค้าพร้อมปุ่ม Merge, จัดการผู้ใช้)
  - **Staff / CS**: แสดง 3 เมนู (ค้นหา, นำเข้า CSV, ดูรายชื่อลูกค้า) — *ซ่อนเมนูจัดการผู้ใช้*
  - **Viewer**: แสดง 2 เมนู (ค้นหา, ดูรายชื่อลูกค้า) — *ซ่อนนำเข้า CSV และผู้ใช้ พร้อมซ่อนกล่องอัปโหลดใน Drawer*

---

## 3. ข้อมูลบัญชีผู้ใช้สำหรับเข้าทดสอบ (Default Credentials)

บนหน้า Login (`http://localhost/login`) มีปุ่ม **Quick Presets** ให้คลิกเข้าใช้งานได้ทันที หรือกรอกรหัสผ่านดังนี้:

| Role / บทบาท | Username | Password | สิทธิ์ในระบบ |
| :--- | :--- | :--- | :--- |
| **🛡️ Admin** | `admin_user` | `Admin1234!` | สิทธิ์เต็มทุกระบบ (จัดการผู้ใช้, Merge ลูกค้า, ลบไฟล์) |
| **🎧 Staff / CS** | `staff_user` | `Staff1234!` | ค้นหาเอกสาร, นำเข้า CSV, แนบไฟล์เข้า Job Orders |
| **👁️ Viewer** | `viewer_user` | `Viewer1234!` | อ่านและดาวน์โหลดเอกสารอย่างเดียว (Read-only) |
| **Keycloak Admin** | `admin` | `admin_password` | ผู้ดูแลระบบ Identity Provider (`http://localhost:8085`) |
| **PostgreSQL Database** | `docsearch` | `docsearch_password` | Database: `docsearch_app` (Port 5432) |

---

## 4. แผนผังสถาปัตยกรรมระบบ (System Architecture)

```text
                     [ Desktop Browser (>= 768px) ]      [ Mobile Device (< 768px) ]
                     - Left Sidebar & Slide-over         - Bottom Nav & Bottom Sheet
                                   \                            /
                                    \                          /
                                     v                        v
                            +------------------------------------------+
                            |     NGINX Load Balancer & Proxy (:80)    |
                            +--------------------+---------------------+
                                                 |
                       +-------------------------+-------------------------+
                       |                                                   |
                       v                                                   v
         +----------------------------+                      +----------------------------+
         |     Frontend Cluster       |                      |     Backend API Cluster    |
         |  fe-1, fe-2, fe-3 (React)  |                      |    be-1, be-2, be-3 (Go)   |
         |  - Google Font: Kanit      |                      |  - Echo v4 REST Framework  |
         |  - Slate & Sky Blue Theme  |                      |  - Keyset Pagination       |
         |  - TanStack Table / Query  |                      |  - Signed Download Tokens  |
         +----------------------------+                      +-------------+--------------+
                                                                           |
                                                                           v
                                                 +-------------------------+-------------------------+
                                                 |                         |                         |
                                                 v                         v                         v
                                       +-------------------+     +-------------------+     +-------------------+
                                       |   PostgreSQL 16   |     |    Keycloak 25    |     |   Worker Engine   |
                                       |  - App Metadata   |     |   - OIDC Provider |     |  - Async CSV Jobs |
                                       |  - LISTEN/NOTIFY  |     |   - Apple Silicon |     |  - Reconcile Diff |
                                       +-------------------+     +-------------------+     +-------------------+
                                                 |
                                                 v
                                       +-------------------------------------------------------------+
                                       |              Dual Storage: Local NAS / SFTP                 |
                                       +-------------------------------------------------------------+
```

---

## 5. คำสั่งที่สำคัญสำหรับการดูแลระบบ (Operations & Commands)

### 5.1 การสั่งเริ่ม / หยุดระบบ (Docker Compose)
```bash
# ตรวจสอบสถานะคอนเทนเนอร์ทั้งหมด
docker compose -f deploy/docker-compose.yml ps

# เริ่มการทำงานของระบบทั้งหมดใน Background
docker compose -f deploy/docker-compose.yml up -d

# อัปเดตและ Build คอนเทนเนอร์ใหม่
docker compose -f deploy/docker-compose.yml up -d --build

# หยุดการทำงานของระบบ
docker compose -f deploy/docker-compose.yml down
```

### 5.2 การรันชุดทดสอบ (Automated Test Suites)
```bash
# 1. รันทดสอบ Frontend ทั้งหมด (12 Tests)
cd apps/web && npm test

# 2. ทดสอบ Build Frontend สำหรับ Production
cd apps/web && npm run build

# 3. รันทดสอบ Backend Go ทั้งหมด
cd apps/api && go test ./...

# 4. จับภาพหน้าจอยืนยันผลการทำงานจริง (Playwright E2E Screenshots)
node apps/web/capture_screens.js
```

### 5.3 การสำรองและกู้คืนฐานข้อมูล (Backup & Restore)
```bash
# สำรองข้อมูล PostgreSQL
bash deploy/scripts/backup.sh

# กู้คืนข้อมูลจากไฟล์ Backup ล่าสุด
bash deploy/scripts/restore.sh ./backups/latest.dump
```

---

## 6. สรุปประวัติเวอร์ชันและ Git Tags

- **`v0.0.0`**: วางโครงสร้าง Monorepo, Docker Compose, Nginx LB, PostgreSQL, Keycloak
- **`v0.1.0`**: ระบบยืนยันตัวตน OIDC, Local JWKS, User Profiles Snapshot
- **`v0.2.0`**: ระบบจัดการลูกค้า Customer Directory, Normalization, Merge Customers
- **`v0.3.0`**: ระบบจัดการ Job Orders, Group Assign
- **`v0.4.0`**: ระบบนำเข้า CSV Import, Dry-run Classifier, Batch Commit
- **`v0.5.0`**: ระบบจัดเก็บเอกสาร Dual Storage (NAS/SFTP), HMAC Signed Download Links
- **`v0.6.0`**: ระบบค้นหาประสิทธิภาพสูง 3-Tier Dynamic Query, Keyset Pagination
- **`v0.7.0`**: รายงานเอกสารที่ยังขาด (Missing Documents Report) และ Streaming CSV Export
- **`v0.8.0`**: Observability (Loki/Tempo/Alloy), Load Testing (k6), Nginx Auto-retry
- **`v0.9.0`**: **UI/UX Re-Design ฉบับสมบูรณ์** (Kanit Typography, Modern Slate & Sky Blue Theme, Responsive Desktop/Mobile, Slide-over Drawer, Role-based Visibility)

---

## 7. เอกสารอ้างอิงเพิ่มเติมในโฟลเดอร์ `docs/`

- [docs/SPEC.md](file:///Users/poppy.geidtiphong/Documents/workspace/homework/upload-file-logisgics/docs/SPEC.md): เอกสารข้อกำหนดสเปกระบบฉบับเต็ม
- [docs/ADR.md](file:///Users/poppy.geidtiphong/Documents/workspace/homework/upload-file-logisgics/docs/ADR.md): Architecture Decision Records
- [docs/runbook.md](file:///Users/poppy.geidtiphong/Documents/workspace/homework/upload-file-logisgics/docs/runbook.md): คู่มือ Runbook สำหรับทีม Operation
- [docs/superpowers/specs/2026-10-25-ui-redesign-design.md](file:///Users/poppy.geidtiphong/Documents/workspace/homework/upload-file-logisgics/docs/superpowers/specs/2026-10-25-ui-redesign-design.md): เอกสารข้อกำหนดการออกแบบ UI/UX Re-Design
- [docs/superpowers/plans/2026-10-25-ui-redesign.md](file:///Users/poppy.geidtiphong/Documents/workspace/homework/upload-file-logisgics/docs/superpowers/plans/2026-10-25-ui-redesign.md): Implementation Plan สำหรับการพัฒนา UI/UX
