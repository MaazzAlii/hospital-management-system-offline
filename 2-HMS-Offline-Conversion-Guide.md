# Converting HMS to a Fully Offline, Single-User Backend

Your current backend is **Supabase** (hosted Postgres + hosted Auth), not Firebase. This guide converts it to a fully local, free, offline stack: **SQLite + Prisma + local auth**, running entirely on one machine with no internet dependency.

This is the single biggest piece of work in the whole project. Execute one step at a time, in order. Do not skip ahead.
 must commit every file after every changes every file must be commit induadually 
## Target stack (read once, applies to every step below)

| Layer | Current (Supabase) | New (Offline) |
|---|---|---|
| Database | Postgres (cloud) | **SQLite** (single file on disk) |
| Data access | `@supabase/supabase-js` `.from()` calls | **Prisma Client** |
| Auth | Supabase Auth (hosted, JWT) | **Local auth**: `User` table with bcrypt password hash + signed session cookie |
| Row-level security | Postgres RLS | **Removed entirely** — a local single-process SQLite file has no network exposure to protect against; `hasAccess()` in Server Actions becomes the sole authorization layer |
| ID generation | Postgres sequences | A `Counter` table (SQLite has no sequence objects) |

Why Prisma over raw SQL or Drizzle: mature SQLite support, automatic migrations, and this team has prior Prisma experience.

---
 must commit every file after every changes every file must be commit induadually 
## Step 1: Install and configure Prisma with SQLite

### Problem
There is currently no local database engine in this project — Prisma was fully removed in an earlier round because it sat unused alongside Supabase.

### Analysis
SQLite needs to live in a writable, persistent location, not inside the app's install directory (which is often read-only or gets wiped on update). For now, develop against a local dev path; the final writable-path wiring happens in Phase 4 (Electron packaging).

### Implementation
```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider sqlite
```
Set `prisma/schema.prisma`'s datasource to `url = "file:./hms.db"` for local development.

### Validation
- `npx prisma studio` opens and shows an empty database with no errors.
- `npx prisma generate` completes without error.

### 🤖 Antigravity Execution Prompt

```
Read 0-HMS-Execution-Sequence.md and follow the AI Execution Rules. Confirm
Phase 1 (1-HMS-Errors-Round3.md) is already complete before starting this.

TASK:
Install prisma and @prisma/client as dependencies. Run `npx prisma init` with
sqlite as the datasource provider. Set the datasource url to "file:./hms.db"
for local development (do not wire up the final Electron userData path yet -
that happens in Phase 4).

Do not yet write any models in schema.prisma - that is Step 2.

Do not remove @supabase/supabase-js or @supabase/ssr yet - they are still in
use until later steps.

Verify `npx prisma generate` runs without error.

Show the diff (package.json, prisma/schema.prisma, prisma/.env or similar).

Wait for my confirmation before continuing to Step 2.
```
 must commit every file after every changes every file must be commit induadually 
### Definition of Done
- ✔ `prisma` and `@prisma/client` installed
- ✔ `prisma/schema.prisma` exists with sqlite datasource
- ✔ `npx prisma generate` succeeds
- ✔ No existing Supabase code touched
- ✔ Git diff reviewed
- ✔ Waited for confirmation

### Files Expected to Change
- `package.json`, `package-lock.json`
- `prisma/schema.prisma` (new)
- `.env` / `.env.example` (add `DATABASE_URL`)

### Rollback
Backup commit before starting. If `prisma generate` fails or conflicts with existing tooling: `git reset --hard`, report the exact error, do not proceed to Step 2.

---

## Step 2: Rebuild the schema from what the app actually uses

### Problem
The Prisma schema needs every model the app currently queries via Supabase, adapted for SQLite's type system.
 must commit every file after every changes every file must be commit induadually 
### Analysis
Build the model list directly from every `.from("TableName")` call across `src/app/actions/*.ts` — this guarantees nothing is missed. Full confirmed list: `Role, Permission, RolePermission, User, Branch, Patient, Doctor, DoctorSchedule, Appointment, OpdVisit, Invoice, InvoiceItem, Payment, Settings, AuditLog, Notification, Medicine, MedicineCategory, Supplier, Purchase, PurchaseItem, StockMovement, Sale, SaleItem, LabTest, LabCategory, LabOrder, LabOrderItem, Sample, LabResult, ReferenceRange`.

Two SQLite-specific adjustments:
- No native UUID type — use `String @id @default(cuid())` instead of UUIDs.
- No `jsonb` — use Prisma's `Json` scalar (stored as text) for fields like `OpdVisit.vitals`.

### Implementation
Write `prisma/schema.prisma` with all models above, preserving every field and relation currently implied by the Supabase queries (join columns like `doctorId`, `patientId`, `roleId`, etc.).

### Validation
- `npx prisma migrate dev --name init` runs cleanly and creates `hms.db`.
- `npx prisma studio` shows all ~30 tables with correct columns.
- Cross-check the model list against every `.from(...)` call in `src/app/actions/*.ts` — nothing missing.

### 🤖 Antigravity Execution Prompt

```
Read 0-HMS-Execution-Sequence.md and follow the AI Execution Rules. Confirm
Step 1 of this phase is complete before starting.

TASK:
Search src/app/actions/*.ts for every supabase.from("X") call and produce a
complete list of distinct table names. Show me this list before writing any
schema - do not proceed until I confirm it matches the expected list:
Role, Permission, RolePermission, User, Branch, Patient, Doctor,
DoctorSchedule, Appointment, OpdVisit, Invoice, InvoiceItem, Payment, Settings,
AuditLog, Notification, Medicine, MedicineCategory, Supplier, Purchase,
PurchaseItem, StockMovement, Sale, SaleItem, LabTest, LabCategory, LabOrder,
LabOrderItem, Sample, LabResult, ReferenceRange.

Once confirmed, write prisma/schema.prisma with a model for each table,
inferring fields and relations from how each table is queried and inserted
into across the action files (select/insert/update calls show you the real
columns). Use String @id @default(cuid()) for all IDs. Use Prisma's Json
scalar for any field currently storing JSON (e.g. OpdVisit.vitals).

Add one additional model not present in Supabase:
model Counter {
  name  String @id
  value Int    @default(0)
}

Run `npx prisma migrate dev --name init` and confirm it completes without error.

Show me the full schema.prisma before running the migration, and wait for my
confirmation before running it.
```

### Definition of Done
- ✔ Table list confirmed against actions files before schema written
- ✔ All ~31 models present (30 + Counter)
- ✔ Migration runs cleanly
- ✔ Prisma Studio shows correct structure
- ✔ Git diff reviewed
- ✔ Waited for confirmation before migrating

### Files Expected to Change
- `prisma/schema.prisma`
- `prisma/migrations/` (new)

### Rollback
Backup commit before writing the schema. If migration fails: delete `prisma/migrations/` and `hms.db`, fix the schema, retry. Do not proceed to Step 3 with a broken or partial migration.
 must commit every file after every changes every file must be commit induadually 
---

## Step 3: Replace ID generation (Postgres sequences → SQLite counter table)

### Problem
`src/lib/id-generator.ts` currently calls a Postgres `nextval()` RPC that doesn't exist in SQLite.

### Analysis
Use the `Counter` model added in Step 2, incremented inside a Prisma transaction so it stays collision-free — this preserves the exact safety property the Postgres sequence fix was built for in Round 2, just implemented against SQLite.

### Implementation
```ts
async function getNextSequenceValue(name: string): Promise<number> {
  const result = await prisma.$transaction(async (tx) => {
    const counter = await tx.counter.upsert({
      where: { name },
      create: { name, value: 1 },
      update: { value: { increment: 1 } },
    });
    return counter.value;
  });
  return result;
}
```
Do not add a silent fallback here — if the transaction fails, throw. (This mirrors the Round 2 fix where a silent `Date.now()` fallback was removed for the same reason.)

### Validation
- Generate 50 IDs in a tight loop (a quick test script) and confirm no duplicates.
- Confirm each of `generateMRN`, `generateInvoiceNo`, `generatePurchaseNo`, `generateSaleNo`, `generateLabOrderNo`, `generateSampleNo` still produces the same `PREFIX-YYYY-XXXX` format as before.

### 🤖 Antigravity Execution Prompt

```
Read 0-HMS-Execution-Sequence.md and follow the AI Execution Rules. Confirm
Step 2 of this phase is complete before starting.

TASK:
Rewrite src/lib/id-generator.ts's getNextSequenceValue() to use the Counter
model via a Prisma $transaction (upsert with increment), instead of the
Postgres nextval() RPC. Do NOT add a silent fallback on failure - if the
transaction fails, throw an explicit error, matching the reasoning already
documented in this project's Round 2 fixes (silent ID fallbacks were
deliberately removed there).

Keep generateMRN, generateInvoiceNo, generatePurchaseNo, generateSaleNo,
generateLabOrderNo, generateSampleNo and their PREFIX-YYYY-XXXX formatting
exactly as they are - only getNextSequenceValue()'s internals change.

Write a small throwaway test script that calls getNextSequenceValue('test')
50 times in a loop and confirms all 50 values are unique and sequential.
Run it and show me the output.

Show the diff for id-generator.ts.

Wait for my confirmation before continuing to Step 4.
```

### Definition of Done
- ✔ No Postgres RPC calls remain in `id-generator.ts`
- ✔ No silent fallback on failure
- ✔ 50-iteration uniqueness test passes
- ✔ ID format unchanged from consumer's perspective
- ✔ Git diff reviewed
- ✔ Waited for confirmation

### Files Expected to Change
- `src/lib/id-generator.ts`

### Rollback
Backup commit before editing. If the uniqueness test fails or throws unexpectedly: `git reset --hard`, report the exact failure, do not proceed to Step 4.
 must commit every file after every changes every file must be commit induadually 
---

## Step 4: Replace Supabase Auth with local auth

### Problem
Supabase Auth requires network access and a hosted identity provider — incompatible with fully offline use.

### Analysis
Single-machine, single-clinic use doesn't need a hosted identity provider. Keep every existing `Role`/`Permission`/`hasAccess()` structure exactly as-is — only *where the identity comes from* changes, not the authorization logic itself.

### Implementation
- Add `bcrypt` and `iron-session` as dependencies.
- Rewrite `getCurrentUserRole()` in `auth-utils.ts` to read a signed session cookie (via `iron-session`) instead of calling `supabase.auth.getUser()`, then look up `User`/`Role` via Prisma.
- Rewrite the login action (`auth.ts`) to `bcrypt.compare()` the submitted password against the stored hash, then set the session cookie.
- Rewrite `createDoctor()` in `doctor.ts` to insert a `User` row directly with a bcrypt-hashed temp password — no external Auth API call needed anymore.

### Validation
- Log in with a seeded local user/password → session persists across page reloads.
- Log out → protected pages redirect to login.
- `getCurrentDoctorId()` still resolves correctly for a Doctor-role session.

### 🤖 Antigravity Execution Prompt

```
Read 0-HMS-Execution-Sequence.md and follow the AI Execution Rules. Confirm
Step 3 of this phase is complete before starting.

TASK:
Install bcrypt and iron-session. Do NOT remove @supabase/supabase-js yet -
other action files still depend on it until Step 5.

Rewrite src/lib/auth-utils.ts's getCurrentUserRole() to:
1. Read and verify a signed iron-session cookie containing a userId.
2. If no valid session, return { user: null, role: null, roleData: null }
   exactly as the current Supabase version does on no-session.
3. If a valid session exists, look up User + Role via Prisma (not Supabase)
   and return the same shape as before: { user, role, roleData }.

Keep hasAccess() (in permissions.ts) and getCurrentDoctorId() logic completely
unchanged except for swapping their Supabase queries for Prisma queries with
identical filtering logic.

Rewrite src/app/actions/auth.ts's login() to bcrypt.compare() against a
password hash stored on the User model (add a `passwordHash` field to the User
model in schema.prisma if it does not exist, migrate it), then set the iron-
session cookie on success. Rewrite logout() to destroy the session.

Rewrite doctor.ts's createDoctor() to insert a User row directly via Prisma
with a bcrypt-hashed temporary password, removing the supabaseAdmin.auth.admin
calls entirely. Keep the same rollback-on-failure behavior (if the Doctor
insert fails after the User insert succeeds, delete the User row).

Show me the diff for auth-utils.ts, auth.ts, doctor.ts, and the schema change.

Wait for my confirmation before continuing to Step 5.
```

### Definition of Done
- ✔ Login/logout work against local Prisma-backed sessions
- ✔ `hasAccess()` and `getCurrentDoctorId()` behavior unchanged
- ✔ `createDoctor()` no longer calls any Supabase Auth API
- ✔ Doctor rollback-on-failure behavior preserved
- ✔ Git diff reviewed
- ✔ Waited for confirmation

### Files Expected to Change
- `src/lib/auth-utils.ts`
- `src/app/actions/auth.ts`
- `src/app/actions/doctor.ts`
- `prisma/schema.prisma` (add `passwordHash` to `User`)
- `package.json`

### Rollback
Backup commit before starting. If login breaks entirely or session doesn't persist: `git reset --hard`, report the exact failure, do not proceed to Step 5 with broken auth — everything downstream depends on this working.


 must commit every file after every changes every file must be commit induadually 
---

## Step 5: Rewrite every action file's data access (Supabase → Prisma)

### Problem
Every file in `src/app/actions/*.ts`, plus `dashboard/page.tsx` and `patients/[id]/page.tsx` (which query Supabase directly), need their queries rewritten to Prisma.

### Analysis
This is the bulk of the mechanical work but low-risk if done one file at a time — the authorization logic (`hasAccess()`, doctor-ownership filters, discount math) doesn't change, only query syntax does. This is also the natural point to fix the "direct Supabase call" gap noted in `1-HMS-Errors-Round3.md`, Error 2 — as each direct-query page gets rewritten, confirm it has the correct permission check at the same time.

### Implementation
Go file by file, in this order: `patient.ts` (simplest) → `doctor.ts` → `appointment.ts` → `opd.ts` → `billing.ts` → `medicine.ts`/`supplier.ts`/`purchase.ts`/`return.ts` → `lab-test.ts`/`lab-order.ts`/`lab-result.ts`/`expiry.ts` → `sale.ts` last (needs the Step 6 transaction rewrite) → then `dashboard/page.tsx` and `patients/[id]/page.tsx`.

### Validation
After each file: the app compiles, the corresponding page(s) load without error, and a manual smoke test of that module's core action (e.g. create a patient, book an appointment) succeeds against SQLite.

### 🤖 Antigravity Execution Prompt (run once per file, in the stated order)

```
Read 0-HMS-Execution-Sequence.md and follow the AI Execution Rules. Confirm
Step 4 of this phase is complete before starting.

TASK:
Rewrite [FILE NAME] to use Prisma Client instead of the Supabase client.

Rules for every file:
1. Every supabase.from(X).select/insert/update/delete call becomes the
   equivalent prisma.x.findMany/findUnique/create/update/delete call.
2. Every existing hasAccess(role, module, action) check stays exactly where
   it is, unchanged.
3. Every doctor-ownership filter (getCurrentDoctorId() comparisons) stays
   exactly as it is, unchanged.
4. Do not change any business logic, validation, or error message text -
   only the data access layer changes.
5. If this file is dashboard/page.tsx or patients/[id]/page.tsx, this is also
   the point to add any missing hasAccess() check per
   1-HMS-Errors-Round3.md Error 2 - confirm the correct permission for each
   query before rewriting it to Prisma, do not defer that to later.

After rewriting, compile the project and manually verify [specific smoke test
for this file, e.g. "create a new patient via the UI and confirm it appears
in the patients list"].

Show me the diff for this file only.

Wait for my confirmation before moving to the next file in the sequence.
```

### Definition of Done (per file)
- ✔ File compiles with no Supabase imports remaining
- ✔ All `hasAccess()`/ownership checks unchanged
- ✔ Corresponding page/smoke test passes against SQLite
- ✔ No regression in that module
- ✔ Git diff reviewed
- ✔ Waited for confirmation before next file

### Files Expected to Change
- One file at a time from: `src/app/actions/patient.ts`, `doctor.ts`, `appointment.ts`, `opd.ts`, `billing.ts`, `medicine.ts`, `supplier.ts`, `purchase.ts`, `return.ts`, `lab-test.ts`, `lab-order.ts`, `lab-result.ts`, `expiry.ts`, `sale.ts`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/patients/[id]/page.tsx`

### Rollback
Backup commit before each file. If a file's smoke test fails after rewriting: `git reset --hard` for that file's commit only, report the failure, do not proceed to the next file in the sequence until it's fixed.
 must commit every file after every changes every file must be commit induadually 
---

## Step 6: Rewrite the two SQL-function-based fixes in application code

### Problem
`create_sale_with_stock_check()` and `nextval()` are Postgres functions (PL/pgSQL) that don't run in SQLite.

### Analysis
`nextval()` is already handled by Step 3. The sale stock-check function needs to become a Prisma `$transaction` in `sale.ts` — SQLite serializes transactions at the file-lock level, which actually makes this simpler to get right than the Postgres row-locking version, not harder.

### Implementation
Inside `sale.ts`'s `createSale()`, wrap the FEFO batch lookup, stock-sum check, expired-batch rejection, `Sale`/`SaleItem` insert, and `StockMovement` insert all inside one `prisma.$transaction(async (tx) => { ... })` block, so nothing can interleave between the check and the write.

### Validation
- Simulate two near-simultaneous sale requests for the last unit of a medicine (a quick script firing two `createSale()` calls in parallel) — confirm only one succeeds and the other gets a clear "insufficient stock" error, never both succeeding.

### 🤖 Antigravity Execution Prompt

```
Read 0-HMS-Execution-Sequence.md and follow the AI Execution Rules. Confirm
Step 5 (including sale.ts) is complete before starting - this step assumes
sale.ts has already been rewritten to Prisma with its business logic intact.

TASK:
Wrap the entire stock-check-and-deduct logic inside sale.ts's createSale()
in a single prisma.$transaction(async (tx) => {...}) block: the stock sum
check, the expired-batch rejection, the Sale insert, the SaleItem insert, and
the StockMovement insert must all happen inside this one transaction so
nothing can read stale stock data between the check and the write.

Write a quick test script that fires two createSale() calls in parallel for
the same medicine with quantity equal to exactly the current stock on hand.
Confirm exactly one succeeds and the other fails with a clear
"insufficient stock" error - never both succeeding (which would indicate
overselling).

Show me the diff for sale.ts and the test script output.

Wait for my confirmation before continuing to Step 7.
```

### Definition of Done
- ✔ Stock check + deduction happen inside one atomic transaction
- ✔ Concurrent-sale test confirms no overselling
- ✔ Existing FEFO/expiry logic (once Phase 3 adds it) will slot into this same transaction
- ✔ Git diff reviewed
- ✔ Waited for confirmation

### Files Expected to Change
- `src/app/actions/sale.ts`

### Rollback
Backup commit before editing. If the concurrent-sale test shows overselling or the transaction deadlocks: `git reset --hard`, report the failure, do not proceed to Step 7.
 must commit every file after every changes every file must be commit induadually 
---

## Step 7: Delete what's no longer needed

### Problem
Supabase-specific files and dependencies remain in the project after the migration, adding confusion and dead weight.

### Analysis
Once every action file compiles and runs against Prisma/SQLite (Steps 1–6 fully verified), the Supabase layer is provably unused and safe to remove.

### Implementation
Delete `supabase-rls-full.sql`, `supabase-sequences.sql`, `supabase-sale-function.sql`, and the entire `src/lib/supabase/` directory. Remove `@supabase/ssr` and `@supabase/supabase-js` from `package.json`.

### Validation
- `grep -r "supabase" src/` returns no remaining imports (aside from comments/docs).
- Full app build and a complete manual click-through of every module succeeds with zero network access.

### 🤖 Antigravity Execution Prompt

```
Read 0-HMS-Execution-Sequence.md and follow the AI Execution Rules. Confirm
Steps 1-6 of this phase are ALL complete and verified before starting this -
this step is destructive and should not run on a partially-migrated codebase.

TASK:
Run `grep -r "supabase" src/ --include=*.ts --include=*.tsx -l` and show me
every file that still references Supabase. Confirm with me that none of them
are still in active use before deleting anything.

Once confirmed, delete: supabase-rls-full.sql, supabase-sequences.sql,
supabase-sale-function.sql, and the entire src/lib/supabase/ directory.
Remove @supabase/ssr and @supabase/supabase-js from package.json and run
npm install to update the lockfile.

Run a full build. Disconnect network access if possible and confirm the app
still runs correctly with no network calls attempted.

Show me the diff.

Wait for my confirmation before continuing to Step 8.
```

### Definition of Done
- ✔ No remaining Supabase imports in `src/`
- ✔ `package.json` no longer lists Supabase packages
- ✔ Full build succeeds
- ✔ App runs correctly with network disconnected
- ✔ Git diff reviewed
- ✔ Waited for confirmation

### Files Expected to Change
- Deletions: `supabase-rls-full.sql`, `supabase-sequences.sql`, `supabase-sale-function.sql`, `src/lib/supabase/*`
- `package.json`, `package-lock.json`

### Rollback
Backup commit before deleting. If deletion breaks the build: `git reset --hard`, identify which file was actually still in use, fix that file's Step 5 rewrite instead of restoring Supabase, then retry this step.


 must commit every file after every changes every file must be commit induadually 
---

## Step 8: Seed data

### Problem
`scripts/create-test-users.ts` and lab/category seed scripts currently call the Supabase admin API.

### Analysis
These are dev/setup conveniences, not production code, but still need to work for local testing and for giving the clinic starter data.

### Implementation
Rewrite these scripts to insert via Prisma directly (bcrypt-hash passwords for seeded users, matching the Step 4 auth model).

### Validation
Running the seed script produces working logins for each seeded role, verified by logging in as each one.

### 🤖 Antigravity Execution Prompt

```
Read 0-HMS-Execution-Sequence.md and follow the AI Execution Rules. Confirm
Step 7 is complete before starting.

TASK:
Rewrite scripts/create-test-users.ts and scripts/seed-categories.js and
scripts/seed-lab.js to insert data via Prisma instead of the Supabase admin
API or Supabase client. Seeded user passwords should be bcrypt-hashed using
the same hashing approach added in Step 4's auth rewrite.

Run the rewritten seed scripts and confirm you can log in as each seeded role
(Super Admin, Receptionist, Doctor, Pharmacist, Lab Technician, Cashier) with
the seeded credentials.

Show me the diff and the login confirmation for each role.

Wait for my confirmation before moving to Phase 3 (3-HMS-New-Features-Spec.md).
```

### Definition of Done
- ✔ Seed scripts run against Prisma/SQLite with no Supabase calls
- ✔ Login confirmed for every seeded role
- ✔ Git diff reviewed
- ✔ Waited for confirmation

### Files Expected to Change
- `scripts/create-test-users.ts`
- `scripts/seed-categories.js`
- `scripts/seed-lab.js`

### Rollback
Backup commit before editing. If any seeded role fails to log in: `git reset --hard`, report which role/step failed, do not proceed to Phase 3 with broken seed data.

 must commit every file after every changes every file must be commit induadually 
---

## What stays exactly the same throughout this whole phase
- All RBAC logic in `permissions.ts`.
- All doctor-ownership filtering logic.
- React-PDF invoice/lab report generation (Electron runs a real Node process, so this keeps working unmodified).
- The entire UI layer — pages call the same action function names; only what's inside those functions changes.
