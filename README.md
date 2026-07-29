# Life Care Hospital Management System (HMS)

A modern, full-featured **Hospital Management System (HMS)** built for clinics and small-to-medium hospitals. Designed for high performance, ease of use, robust security, and seamless workflow automation across clinical, administrative, pharmacy, laboratory, and billing departments.

---

## 🌟 Key Features & Modules

- 🏥 **Patient Management**: Centralized records with auto-generated atomic MRNs (`LCC-YYYY-XXXX`), demographics, visit logs, and medical history.
- 👨‍⚕️ **Doctor & Schedule Management**: Doctor profiles, specialization tracking, fee management, availability schedules, and matching Supabase Auth integration.
- 📅 **Appointments & OPD Visits**: Appointment scheduling, status tracking, OPD clinical encounter notes, diagnosis, and vitals recording.
- 💊 **Pharmacy & Inventory**: Medicine catalog, categories, supplier management, stock purchase orders, sales POS, return processing, and atomic TOCTOU-safe stock movements.
- 🔬 **Laboratory**: Test categories, customizable reference ranges, lab order placement, sample collection (`SMP-YYYY-XXXX`), result entry, verification workflows, and PDF report generation.
- 💳 **Billing & Invoicing**: Automated invoice generation (`LCC-YYYY-XXXX`), payment processing, discount calculations, and downloadable PDF invoices.
- 🛡️ **Defense-in-Depth Security**: Role-Based Access Control (RBAC) in Server Actions combined with PostgreSQL Row Level Security (RLS) and Doctor Row-Level Ownership filtering.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) with React 19
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, RLS)
- **Data Access Layer**: `@supabase/supabase-js` (100% standardized, 0% Prisma)
- **Styling**: Tailwind CSS v4 with [shadcn/ui](https://ui.shadcn.com/)
- **PDF Generation**: `@react-pdf/renderer`
- **Forms & Validation**: `react-hook-form` + `Zod`
- **Language**: TypeScript

---

## 🔒 Security & Permission Model

This application enforces a strict **Defense-in-Depth** security model:

1. **Application Layer (Server Actions)**: All data queries and mutations run via Next.js Server Actions using `hasAccess(role, module, action)` and doctor row-level filtering (`getCurrentDoctorId()`).
2. **Database Layer (Row Level Security)**: Comprehensive Supabase RLS policies are enabled across all 32 database tables (`supabase-rls-full.sql`).
3. **Protected PDF Routes**: API PDF endpoints (`/api/pdf/invoice/[id]` & `/api/pdf/lab-report/[id]`) enforce authenticated user session checks and module-level read permissions.

### RBAC Roles

- **Super Admin / Hospital Admin**: Full system read/write access across all modules.
- **Receptionist**: Patient registration, appointment scheduling, OPD check-ins, invoice generation.
- **Doctor**: Row-level access to view and update only their own assigned appointments, OPD visits, and lab orders.
- **Pharmacist**: Complete management of medicines, suppliers, stock purchases, sales, and returns.
- **Lab Technician / Pathologist**: Lab order processing, sample collection, result entry, and result verification.
- **Cashier**: Invoice payment processing and financial receipts.
- **Manager / Accountant**: Read-only & reporting access to operational/financial data.

---

## 🆔 Standardized Atomic ID Generation

All system identifiers follow the audit-friendly, standardized pattern: **`{PREFIX}-{YYYY}-{XXXX}`** powered by PostgreSQL sequences (`supabase-sequences.sql`):

- **Patient MRN**: `LCC-2026-0042`
- **Invoice No**: `LCC-2026-0043`
- **Purchase Order**: `PUR-2026-0044`
- **Pharmacy Sale**: `SALE-2026-0045`
- **Lab Order**: `LAB-2026-0046`
- **Lab Sample**: `SMP-2026-0047`

---

## 🚀 Getting Started & Setup Instructions

### 1. Prerequisites
- Node.js (v20+ recommended)
- A Supabase Project (PostgreSQL instance with Supabase Auth enabled)

### 2. Installation
```bash
git clone https://github.com/aiwithhammad2026-arch/life-care-clinic-hms.git
cd life-care-clinic-hms
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env` (or `.env.local`) and configure your Supabase credentials:

```bash
cp .env.example .env.local
```

Required variables:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 4. Database Setup & Migrations
Execute the SQL migration scripts in your **Supabase SQL Editor**:
1. **Sequences**: Run `supabase-sequences.sql` (Creates atomic sequences & `nextval` function).
2. **Stock Check Function**: Run `supabase-sale-function.sql` (Creates TOCTOU-safe atomic sale transaction function).
3. **RLS Policies**: Run `supabase-rls-full.sql` (Enables database RLS across all tables).

### 5. Seed Test Users (Optional)
```bash
npx tsx scripts/create-test-users.ts
```

### 6. Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Project Structure Overview

```text
├── src/
│   ├── app/
│   │   ├── (dashboard)/        # Next.js App Router dashboard pages
│   │   ├── actions/            # Server Actions (Patients, Billing, OPD, Lab, Pharmacy)
│   │   ├── api/pdf/            # Authenticated PDF generation route handlers
│   │   └── login/              # Login authentication page
│   ├── components/             # UI Components (shadcn/ui & PDF templates)
│   ├── lib/
│   │   ├── supabase/           # Server, Client, and Admin Supabase factories
│   │   ├── types/              # TypeScript database model definitions
│   │   ├── auth-utils.ts       # User role & doctor ID helpers
│   │   ├── permissions.ts      # Fine-grained RBAC matrix (hasAccess)
│   │   └── id-generator.ts     # Atomic ID generator helpers
├── scripts/                    # Maintenance, setup, and test utilities
├── supabase-sequences.sql      # PostgreSQL sequence definitions
├── supabase-sale-function.sql  # Atomic sale & stock locking DB function
├── supabase-rls-full.sql       # Full database Row Level Security policies
└── README.md
```

---

## 💻 Deployment

This project is fully ready for zero-downtime deployment on **[Vercel](https://vercel.com/)** or any Node.js host. Ensure `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured in your deployment environment settings.
