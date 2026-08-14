# Hospital Management System (Offline)

A production-grade, offline-first Hospital Management System (HMS) designed and built for private clinics and wholesale pharmacy distributors in Pakistan. Built as a secure, standalone Electron desktop application powered by Next.js 16, React 19, Prisma v7 ORM, and SQLite (`better-sqlite3`), running 100% locally with zero internet or cloud dependencies.

---

## 🛠️ Tech Stack

- **Desktop Shell**: Electron 43 (Windows NSIS Installer & standalone desktop runtime)
- **Framework**: Next.js 16 (App Router, Turbopack, Server Actions, React 19)
- **Database Engine**: SQLite with `better-sqlite3` driver
- **ORM & Data Layer**: Prisma v7 ORM (`@prisma/adapter-better-sqlite3`)
- **PDF Generation**: `@react-pdf/renderer` (Stream-based invoice & lab report generation)
- **Language**: TypeScript 5
- **Styling**: TailwindCSS & Lucide Icons
- **Authentication & Security**: `iron-session` encrypted session cookies + `bcrypt` password hashing + Role-Based Access Control (RBAC)

---

## 🌟 Core Modules & Capabilities

### 1. 📊 Interactive Earnings Dashboard with Time Filters
- Real-time financial analytics widget with time period switches:
  - **Daily**: Earnings for any specific selected day.
  - **Weekly**: Earnings aggregated across the week (Monday to Sunday).
  - **Monthly**: Current and historical monthly revenue summaries.
  - **Yearly**: Annual fiscal totals.
- Synchronized metric cards: **Total Revenue**, **Pharmacy Sales Revenue** (with sales transaction count), and **Clinic Invoices Revenue** (with paid/partial count).

### 2. 🏥 Patient Management, EHR & Safe Deletion
- Unique **Medical Record Number (MRN)** generation per patient (`LCC-YYYY-XXXX`).
- Full demographic records, emergency contacts, blood group, phone, and residential address tracking.
- OPD Visit logs with vital signs, clinical symptoms, diagnosis, doctor prescription notes, and appointment history.
- **Scoped Safe Deletion**:
  - Unlinked test/temporary patients can be deleted immediately.
  - Deletion is strictly blocked if the patient has linked medical or financial records (Appointments, OPD Visits, Sales, Lab Orders, or Invoices) with a clear explanation of linked counts.
  - All deletions are recorded in the `AuditLog` database table.

### 3. 📅 Doctor Scheduling, Appointments & Safe Deletion
- Doctor profiles with medical specialization, consultation fee, phone, and duty schedules.
- Multi-slot appointment booking with patient queue status tracking (`scheduled`, `completed`, `cancelled`).
- **Safe Appointment Deletion**:
  - Plain appointments without linked clinical visits or invoices can be safely deleted.
  - Deletion is blocked if an OPD visit or invoice has already been generated from the appointment.
  - Successful appointment deletions are tracked in `AuditLog`.

### 4. 💊 Pharmacy Sales & Wholesale Distributor Invoicing
- **Wholesale Distributor Invoice Format**:
  - Full B2B distributor headers: Account Code, Customer / Consignee Address, Drug License No., NTN No., Summary / PRS No., Order Booker / Booked By, Salesman Mobile, Supplied By, and Territory.
  - Multi-batch line-item pricing: Product Code, Batch No, Expiry Date, Billed Qty, Free Qty, Trade Price, Gross Amount, Discount % & Amount, S.Tax, GST, and Net Invoice Amount.
  - Comprehensive invoice footer with item count, total billed & free quantities, gross/discount/tax subtotals, net invoice total, and legal warranty text under Section 23(1)(i) of Drugs Act 1976.
- **FEFO Batch Management & Stock Safety**:
  - Dedicated `Batch` database model tracking `quantityReceived` and `quantityRemaining`.
  - First-Expired, First-Out (FEFO) automated batch allocation for sales.
  - Expiry status visual indicators: `Valid` (Green), `Expiring Soon` (Amber, within 90 days), and `Expired` (Red).
  - Strict server-side validation rejecting any attempt to sell expired medicines or exceed batch stock.
- **Daily Sale Returns**:
  - Dedicated daily return report with date filtering, return breakdown, refund values, and stock restoration to original batches.

### 5. 🧪 Laboratory Information System (LIS)
- Test directory with test code, sample type (Blood, Serum, Urine), price, and category.
- Reference ranges per parameter customized by gender and age group.
- Lab order processing, barcoded sample collection tracking, and test result entry.

### 6. 💳 Billing, Invoices & PDF Printing
- Integrated point-of-sale and clinic billing module.
- Atomically generated invoices linked to OPD consultations, lab tests, and pharmacy sales.
- Professional, high-resolution PDF invoice generation formatted to wholesale distributor standards.

### 7. 🔒 Role-Based Access Control (RBAC) & Audit Logging
- Role definitions: `Admin`, `Doctor`, `Receptionist`, `Pharmacist`, `Lab Technician`, and `Cashier`.
- Enforced module-level permissions for Read, Write, Update, Delete, and Discount application.
- Dedicated `AuditLog` logging user, entity, action, and timestamp for all clinical and administrative deletions.

---

## 🖼️ Application Screenshots

### 01. Secure Login & Role Authentication
![Login](docs/screenshots/01-login.png)

### 02. Clinic Overview Dashboard & Earnings Analytics (Monthly)
![Dashboard](docs/screenshots/12-dashboard-earnings-monthly.png)

### 03. Earnings Analytics (Daily & Weekly Views)
![Daily Earnings](docs/screenshots/13-dashboard-earnings-daily.png)
![Weekly Earnings](docs/screenshots/14-dashboard-earnings-weekly.png)

### 04. Patient Directory & Medical Records
![Patients](docs/screenshots/03-patients.png)

### 05. Safe Patient Deletion Modal & Safety Validation Block
![Patient Delete Modal](docs/screenshots/16-patient-delete-modal.png)
![Patient Delete Blocked](docs/screenshots/17-patient-delete-blocked.png)

### 06. Doctor Appointments & Safe Deletion
![Appointments](docs/screenshots/04-appointments.png)
![Appointment Delete Modal](docs/screenshots/18-appointment-delete-modal.png)

### 07. Pharmacy Medicines Inventory & Batch Stock
![Pharmacy](docs/screenshots/05-pharmacy.png)

### 08. Wholesale Distributor Invoice & Sale Form
![Distributor Sale Form](docs/screenshots/06-distributor-sale-new.png)

### 09. Sales History & Invoices Directory
![Sales History](docs/screenshots/07-sales-history.png)

### 10. Daily Sale Returns & Stock Restorations
![Daily Returns](docs/screenshots/08-daily-returns.png)

### 11. Expiry Report & Stock Safety Audit
![Expiry Report](docs/screenshots/09-expiry-report.png)

### 12. Laboratory Tests & Diagnostic Orders
![Lab Module](docs/screenshots/10-lab.png)

### 13. Clinic Billing & Payment Invoicing
![Billing](docs/screenshots/11-billing.png)

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Windows**: (for native `.exe` desktop installer build)

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Sync SQLite database schema
npx prisma db push

# 3. Generate Prisma client
npx prisma generate

# 4. (Optional) Run batch migration & reconciliation
npx tsx scripts/migrate-batches.ts

# 5. Run development server
npm run dev
```

### Building Desktop Electron App
```bash
# Build standalone offline desktop executable (.exe)
npm run electron:build
```

---

> **Note**: This repository contains offline desktop healthcare management software for private medical clinics.
