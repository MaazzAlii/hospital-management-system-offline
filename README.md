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

### 2. 🏥 Patient Management, Country Code Selector & Admin Delete Override
- Unique **Medical Record Number (MRN)** generation per patient (`LCC-YYYY-XXXX`).
- Full demographic records, emergency contacts, blood group, and residential address tracking.
- **Enhanced International & National Phone Input**:
  - Country code dropdown with flags: 🇵🇰 Pakistan (`+92`), 🇸🇦 Saudi Arabia (`+966`), 🇦🇪 UAE (`+971`), 🇬🇧 UK (`+44`), 🇺🇸 US/CA (`+1`), 🇮🇳 India (`+91`), 🇦🇫 Afghanistan (`+93`), 🇴🇲 Oman (`+968`), 🇶🇦 Qatar (`+974`), 🇰🇼 Kuwait (`+965`), 🇧🇭 Bahrain (`+973`), and 🌐 International (`+`).
  - Single-source-of-truth digit management with auto-prefixing, backspace safety, and responsive formatting.
- **Admin Delete Override with Cascading Purge**:
  - Non-admin users are safely blocked if a patient has linked clinical or financial history, with clear audit reasons.
  - Administrators are granted a dedicated **Admin Delete Override** modal showing an amber/red cascade breakdown (linked appointments, OPD visits, sales, lab orders, and invoices).
  - Requires explicit confirmation via checkbox (`[x] I understand and confirm force deletion`) before performing an atomic transactional cascade delete.
  - All override actions are permanently recorded in the `AuditLog` table.

### 3. 📅 Doctor Scheduling, Appointments & Safe Deletion
- Doctor profiles with medical specialization, consultation fee, phone, and duty schedules.
- Multi-slot appointment booking with patient queue status tracking (`scheduled`, `completed`, `cancelled`).
- **Safe & Admin Override Appointment Deletion**:
  - Plain appointments without linked clinical visits or invoices can be deleted safely.
  - Linked appointments feature administrative cascade deletion with `AuditLog` tracking.

### 4. 💊 Grouped Pharmacy Module & Wholesale Invoicing
- **Collapsible Sidebar Navigation**:
  - Consolidated sub-modules under an accordion Pharmacy group: Medicines & Inventory, Suppliers, Purchases (GRN), Sales & POS, Daily Returns, and Expiry Risk Reports.
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

### 04. Collapsible Pharmacy Navigation in Sidebar
![Pharmacy Collapsible Nav](docs/screenshots/38-pharmacy-nav-collapsible.png)

### 05. Phone Number Input with Selectable Country Code Dropdown
![Country Code Dropdown](docs/screenshots/39-phone-country-dropdown.png)
![Saudi Arabia International Phone Format](docs/screenshots/40-phone-sa-international-formatting.png)
![Pakistan National Phone Format](docs/screenshots/41-phone-pk-national-formatting.png)

### 06. Patients Management & Registration
![Patients Directory](docs/screenshots/08-patients-list.png)
![Register Patient Profile](docs/screenshots/42-patient-registered-profile.png)

### 07. Admin Delete Override & Cascading Audit Workflow
![Admin Delete Override Modal](docs/screenshots/44-admin-delete-override-modal.png)
![Patient Force Deleted Toast](docs/screenshots/45-patient-force-deleted-toast.png)
![Linked Appointment Cascade Deleted](docs/screenshots/46-appointment-cascade-deleted.png)

### 08. Doctors Directory & Registration
![Doctors Directory](docs/screenshots/13-doctors-list.png)
![Add New Doctor](docs/screenshots/14-doctor-new.png)

### 09. Appointments Management & Scheduling
![Appointments Queue](docs/screenshots/16-appointments-list.png)
![Book New Appointment](docs/screenshots/17-appointment-new.png)

### 10. OPD Clinical Consultations & Prescriptions
![OPD Visits Directory](docs/screenshots/47-opd-visits-directory.png)
![OPD Consultation Form](docs/screenshots/48-opd-consultation-form-filled.png)
![OPD Consultation Details](docs/screenshots/49-opd-visit-details-view.png)
![OPD Edit Consultation](docs/screenshots/50-opd-visit-edit-form.png)

### 11. Pharmacy Inventory, Multi-Batch Stock & Expiry Badges
![Pharmacy Inventory Batches](docs/screenshots/51-pharmacy-medicines-inventory.png)
![Add Medicine Form](docs/screenshots/52-pharmacy-add-medicine-form.png)

### 12. Pharmacy Suppliers & Inward Stock Purchases (GRN)
![Suppliers Directory](docs/screenshots/53-pharmacy-suppliers-list.png)
![Add Supplier Form](docs/screenshots/54-pharmacy-add-supplier-form.png)
![New Purchase Entry](docs/screenshots/55-pharmacy-purchases-grn-new.png)
![Purchases Directory](docs/screenshots/56-pharmacy-purchases-list.png)

### 13. Wholesale Distributor POS & Sales History
![Wholesale Distributor Sale POS](docs/screenshots/57-pharmacy-sales-pos-form.png)
![Sales & Invoices History](docs/screenshots/58-pharmacy-sales-history-list.png)

### 14. Daily Sale Returns & Batch Stock Restoration
![Daily Returns Report](docs/screenshots/59-pharmacy-returns-dashboard.png)
![Process Return Form](docs/screenshots/60-pharmacy-process-return-form.png)

### 15. Medicine Expiry Risk Report & Safety Audit
![Expiry Report](docs/screenshots/61-pharmacy-expiry-risk-report.png)

### 16. Laboratory Information System (LIS) Tests & Orders
![Lab Tests Directory](docs/screenshots/62-lab-tests-directory.png)
![Add Lab Test Form](docs/screenshots/63-lab-add-test-form.png)
![Lab Orders Processing](docs/screenshots/64-lab-orders-list.png)
![Create Lab Order Form](docs/screenshots/65-lab-create-order-form.png)

### 17. Hospital Billing & Invoices Management
![Billing Invoices](docs/screenshots/66-billing-invoices-list.png)

### 18. System Settings & Clinic Profile
![Settings & Clinic Profile](docs/screenshots/67-settings-clinic-profile.png)
![Administrator User Profile](docs/screenshots/68-settings-user-profile.png)

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
