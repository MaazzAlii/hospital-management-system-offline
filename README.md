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

## 🖼️ Application Screenshots & Feature Walkthrough (Verified on Port 3456)

### 01. Clean Production Login (No Test Accounts)
![Clean Login](docs/screenshots/01-login.png)

### 02. Clinic Overview Dashboard & Real-Time Metrics
![Dashboard Overview](docs/screenshots/02-dashboard-overview.png)

### 03. Interactive Notification Bell & Batch Expiry / Low-Stock Alerts
![Notification Dropdown](docs/screenshots/03-dashboard-notifications.png)

### 04. Financial Analytics: Monthly, Daily, Weekly & Yearly Earnings Views
![Monthly Earnings](docs/screenshots/04-dashboard-earnings-monthly.png)
![Daily Earnings](docs/screenshots/05-dashboard-earnings-daily.png)
![Weekly Earnings](docs/screenshots/06-dashboard-earnings-weekly.png)
![Yearly Earnings](docs/screenshots/07-dashboard-earnings-yearly.png)

### 05. Patients Management & Standardized Pakistani Phone Number Input (+92)
![Patients Directory](docs/screenshots/08-patients-list.png)
![Register Patient with Phone Validation](docs/screenshots/09-patient-register-phone-validation.png)
![Patient Profile & Medical History](docs/screenshots/10-patient-details.png)

### 06. Doctors Directory & Registration
![Doctors Directory](docs/screenshots/13-doctors-list.png)
![Add New Doctor](docs/screenshots/14-doctor-new.png)

### 07. Appointments Management & Scheduling
![Appointments Queue](docs/screenshots/16-appointments-list.png)
![Book New Appointment](docs/screenshots/17-appointment-new.png)

### 08. OPD Clinical Consultations & Prescriptions
![OPD Visits Directory](docs/screenshots/19-opd-visits-list.png)
![New OPD Consultation Form](docs/screenshots/20-opd-visit-new.png)

### 09. Pharmacy Inventory, Multi-Batch Stock & Expiry Badges
![Pharmacy Inventory Batches](docs/screenshots/21-pharmacy-medicines-batches.png)
![Add Medicine Form](docs/screenshots/22-pharmacy-medicine-new.png)

### 10. Wholesale Distributor Invoicing / POS (+92 Customer & Salesman Contact)
![Wholesale Distributor Sale POS](docs/screenshots/23-pharmacy-distributor-sale-new.png)
![Sales & Invoices History](docs/screenshots/24-pharmacy-sales-history.png)

### 11. Daily Sale Returns & Batch Stock Restoration
![Daily Returns Report](docs/screenshots/25-pharmacy-daily-returns.png)
![Process Return Form](docs/screenshots/26-pharmacy-return-new.png)

### 12. Medicine Expiry Risk Report & Safety Audit
![Expiry Report](docs/screenshots/27-pharmacy-expiry-report.png)

### 13. Medicine Suppliers & Stock Purchases (GRN)
![Suppliers Directory](docs/screenshots/28-pharmacy-suppliers-list.png)
![Add Supplier with +92 Phone](docs/screenshots/29-pharmacy-supplier-new.png)
![Purchases Directory](docs/screenshots/30-pharmacy-purchases-list.png)
![New Purchase Entry](docs/screenshots/31-pharmacy-purchase-new.png)

### 14. Laboratory Information System (LIS) Tests & Orders
![Lab Tests Directory](docs/screenshots/32-lab-tests-list.png)
![Add Lab Test Form](docs/screenshots/33-lab-test-new.png)
![Lab Orders Processing](docs/screenshots/34-lab-orders-list.png)
![Create Lab Order Form](docs/screenshots/35-lab-order-new.png)

### 15. Hospital Billing & Invoices Management
![Billing Invoices](docs/screenshots/36-billing-invoices-list.png)

### 16. System Settings & Clinic Profile
![Settings & Clinic Profile](docs/screenshots/37-settings-profile.png)

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
