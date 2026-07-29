# Hospital Management System — Code Audit
**Stack found:** Next.js 16.2.10 (App Router) · React 19.2.4 · Prisma 7.8 (with `@prisma/adapter-pg`) · Supabase (Auth + Postgres + `@supabase/ssr`) · shadcn/ui + Tailwind v4 · React-PDF · Zod/react-hook-form

**Scope:** Patients, Doctors, Appointments, OPD visits, Pharmacy (medicines/purchases/sales/returns/suppliers), Lab (tests/orders/results), Billing/Invoicing, Settings, RBAC (8 roles), PDF generation (invoices, lab reports).

This is a real, fairly complete system — not a toy. But it has several **critical security holes** that must be fixed before this touches real patient data, plus a number of correctness and architecture problems. Below is everything, ranked by severity.

---

## 🔴 CRITICAL — Fix before this ever goes near real patients

### 1. PDF endpoints have zero authentication
`src/proxy.ts` (your middleware) explicitly skips every route starting with `/api`:
```ts
if (pathname.startsWith("/api")) return NextResponse.next();
```
But `src/app/api/pdf/invoice/[id]/route.tsx` and `src/app/api/pdf/lab-report/[id]/route.tsx` serve full invoices and **lab results** (diagnoses, test values, patient DOB/gender) with **no login check at all**. Anyone with (or guessing/leaking) a URL like `/api/pdf/invoice/<id>` gets the PDF — logged in or not. This is a PHI/financial-data leak and, depending on where this hospital is, a real compliance problem.

**Fix:** Either move these routes so the middleware matcher covers them (don't blanket-exclude `/api`), or explicitly call `supabase.auth.getUser()` + `hasAccess()` inside each route handler before rendering the PDF.

### 2. Most server actions have no authorization check at all
`hasAccess()` / `getCurrentUserRole()` exist and are used properly in **some** files (`medicine.ts`, `patient.ts`, `billing.ts`) — but are completely absent in others:

- `appointment.ts` — `createAppointment`, `updateAppointmentStatus` — no check
- `doctor.ts` — `createDoctor`, `toggleDoctorStatus` — no check
- `opd.ts` — `createOpdVisit`, `updateOpdVisit` — no check
- `lab-order.ts` — `createLabOrder` — no check
- `lab-result.ts` — `saveResult`, `collectSample` — no check
- `lab-test.ts` — `createLabTest`, `createLabCategory` — no check
- `purchase.ts` — `createPurchase` — no check
- `sale.ts` — `createSale` — no check
- `return.ts` — `processReturn` — no check
- `supplier.ts` — `createSupplier` — no check

Your `src/proxy.ts` middleware only guards **page navigation** (and only checks `"read"` access on the URL prefix). Server Actions (`"use server"` functions) are directly callable — a logged-in Pharmacist could, in principle, call `createDoctor()` or `updateAppointmentStatus()` even though the UI never shows them that option, because nothing on the server stops it. This is a classic broken-access-control bug (OWASP A01), and it's inconsistent rather than absent, which is actually worse — it looks protected because *some* files do it right.

**Fix:** Every mutating action needs the same two lines `billing.ts`/`patient.ts` already use:
```ts
const { role } = await getCurrentUserRole();
if (!hasAccess(role, 'module', 'write')) throw new Error("Unauthorized");
```
Consider wrapping this in a helper (`requireAccess(module, action)`) so it's one line and impossible to forget.

### 3. Doctor role's "own data only" restriction was never implemented
`permissions.ts` says:
```ts
// full access to own appointments/opd/lab orders (enforced further in action)
if (module === 'appointments' || module === 'opd' || module === 'lab') return true;
```
The comment promises row-level filtering "further in action" — but `getAppointmentsWithDetails()`, OPD queries, etc. never filter by the logged-in doctor's own `doctorId`. Any Doctor account can currently see and modify **every** doctor's appointments and every patient's OPD visit, not just their own.

### 4. Admin credentials are printed on the public login page
`src/app/login/page.tsx`:
```
Test Accounts (Password: password123):
admin@lifecare.com
reception@lifecare.com
doctor@lifecare.com
```
This is fine for a local dev demo, dangerous if this ever gets deployed as-is — it hands out the admin login to anyone who visits the site. **Must be removed or hidden behind `process.env.NODE_ENV !== 'production'`** before any real deployment.

### 5. Supabase RLS is effectively decorative
`supabase-rls.sql` only covers `Patient`, `Doctor`, `Appointment` — nothing for `Invoice`, `Payment`, `Medicine`, `Sale`, `LabResult`, `User`, etc. And the policies that do exist are wide open:
```sql
CREATE POLICY "Allow authenticated read on Patient" ON "Patient" FOR SELECT TO authenticated USING (true);
```
`USING (true)` means *any* authenticated user can read *any* row — RLS isn't actually restricting anything; all your real access control lives in app code (which, per #2, is inconsistently applied). Since the app talks to Supabase using the **anon key** (`src/lib/supabase/client.ts`, `server.ts`), and a browser client exists, RLS is your last line of defense if any client-side query is ever added or a server action is bypassed — right now that line of defense doesn't exist for most tables.

**Fix:** Either commit to RLS as the real enforcement layer (write real policies per role, per table) or clearly document that RLS is decorative and 100% of enforcement must happen in Server Actions — and then actually do #2.

---

## 🟠 High — correctness / data integrity bugs

### 6. Race conditions in every sequence-number generator
`patient.ts` (MRN), `billing.ts` (`invoiceNo`), `lab-order.ts` (`orderNo`... actually uses `Date.now()`, see #8) all do **read-max-then-insert**:
```ts
const { data: last } = await supabase.from("Invoice").select("invoiceNo").order("createdAt", { ascending: false }).limit(1);
// ...compute next number...
await supabase.from("Invoice").insert({ invoiceNo, ... });
```
Two concurrent requests (two receptionists creating patients at the same moment, which will happen in a real clinic) can read the same "last" value and try to insert the same MRN/invoice number. Your `@unique` constraint will catch it as a DB error, but the user just sees a generic failure with no retry — a real usability/reliability bug at the front desk.

**Fix:** Use a Postgres sequence, or an atomic `INSERT ... ON CONFLICT` retry loop, or generate MRNs via a DB function/trigger instead of app-level read-then-write.

### 7. Pharmacy sale stock-check has a TOCTOU race that allows overselling
`sale.ts`'s `createSale()` loads **every** `StockMovement` row for **every** medicine into memory, sums it in JS, validates quantity, then inserts. Two cashiers selling the last unit of the same medicine at the same time can both pass the check before either insert lands — the pharmacy can go negative on stock with no error. This is exactly the kind of bug that causes real inventory discrepancies.

**Fix:** Compute available stock inside a single DB transaction/RPC with a row lock (or a Postgres function that checks-and-decrements atomically), not two round trips from the app.

### 8. Inconsistent ID/number schemes across modules
- Invoices: `LCC-0001` (sequential, zero-padded)
- Patients: `LCC-2026-0001` (year + sequential)
- Lab orders: `LAB-${Date.now()}`
- Purchases: `PUR-${Date.now()}`
- Sales: `SALE-${Date.now()}`
- Samples: `SMP-${Date.now().toString().slice(-6)}`

Mixing sequential IDs and timestamp IDs is inconsistent (and `Date.now()`-based IDs aren't guaranteed unique under concurrency either — two requests in the same millisecond will collide). Pick one scheme and apply it everywhere; a real hospital's paper trail (and printed receipts) should look consistent.

### 9. `createDoctor()` never creates a Supabase Auth account
```ts
// doctor.ts — createDoctor()
const { data: user } = await supabase.from("User").insert({ name, email, roleId, isActive }).select().single();
```
This only inserts a row into the `User` table. It never calls `supabase.auth.admin.createUser()` (like `prisma/seed.ts` does for the three test accounts). Result: a newly created doctor has a profile in the app but **no way to actually log in** — there's no matching Supabase Auth identity. This will look like it works in the UI and then quietly fail the moment someone tries to onboard a real doctor.

### 10. Debug `console.log` left in a production PDF route
`src/app/api/pdf/lab-report/[id]/route.tsx`:
```ts
console.log("=== DEBUG LAB REPORT VERIFIER QUERY ===");
console.log("verifierIds:", verifierIds);
console.log("users:", users);
```
This logs user IDs/verifier data to server logs on every lab report generated. Harmless in dev, but it's PII in your logs in production, and it's leftover debugging cruft that should be removed.

---

## 🟡 Medium — architecture / consistency problems

### 11. Prisma schema is out of sync with what the app actually uses
`prisma/schema.prisma` only defines: `Role, Permission, RolePermission, User, Branch, Patient, Doctor, DoctorSchedule, Appointment, OpdVisit, Invoice, InvoiceItem, Payment, Settings, AuditLog, Notification`.

But the app code queries tables that **don't exist in the schema at all**: `Medicine`, `MedicineCategory`, `Supplier`, `Purchase`, `PurchaseItem`, `StockMovement`, `Sale`, `SaleItem`, `LabTest`, `LabCategory`, `LabOrder`, `LabOrderItem`, `Sample`, `LabResult`, `ReferenceRange`. Since the app talks to those tables through raw Supabase calls (`.from("Medicine")`) rather than Prisma, it "works" — but it means:
- `npx prisma generate` / `prisma studio` / type-safe Prisma queries are useless for over half your data model.
- There's no single source of truth for your schema, which is exactly the kind of thing that causes silent bugs (typo a column name in a `.from()` call and you only find out at runtime).
- Anyone new to the project (including you, checking your friend's part) will look at `schema.prisma` and think the app is far smaller than it is.

**Fix:** Either finish the Prisma schema to cover everything and standardize on Prisma, or standardize on Supabase-js everywhere and delete Prisma/the adapter/`prisma.ts` entirely. Right now you're paying the maintenance cost of two ORMs for the benefit of neither.

### 12. Two different DB access patterns mixed throughout
`src/lib/prisma.ts` is fully configured (with `PrismaPg` adapter) but barely used — almost every action file uses `createClient()` from `lib/supabase/server.ts` instead. Mixing raw Supabase queries (no compile-time safety, `any`-typed responses everywhere — see all the `(a: any)`, `(m: any)` casts in the actions) with a properly typed Prisma client sitting unused is wasted safety. Pick one.

### 13. Dead mock data still in the codebase
`src/lib/mock-appointments.ts`, `mock-doctors.ts`, `mock-patients.ts` — full of fake data with hardcoded future dates (`"2026-07-20"` etc.) and fake doctor emails. These look like early-prototype scaffolding that was never removed once real Supabase-backed pages were built. If anything still imports these, you're silently serving fake data somewhere; if nothing imports them, they're dead weight.

**Action for you:** `grep -r "mock-doctors\|mock-patients\|mock-appointments" src/` — if there are no real imports left, delete them along with `src/types/appointment.ts` / `doctor.ts` / `patient.ts` if those were only for the mock layer.

### 14. Non-standard `components.json`
```json
"style": "base-nova",
"menuColor": "default",
"menuAccent": "subtle",
```
Standard shadcn/ui `components.json` uses `"style": "new-york"` or `"default"`, and doesn't have `menuColor`/`menuAccent` fields at all. This suggests either a customized/forked shadcn CLI or config that was hand-edited/hallucinated by the AI tool. Worth double-checking this actually works with `npx shadcn add <component>` before you rely on it — if it silently falls back to defaults, fine; if it errors, you'll want to know now rather than mid-feature.

---

## 🟢 Low — hygiene / repo cleanliness

### 15. Root directory is littered with scratch/debug scripts
At the repo root (not in a `scripts/` or `tests/` folder): `test-db.ts`, `test-db.js`, `test-login.js`, `test-prisma.js`, `test-rbac.js`, `test-rbac-puppeteer.js`, `test-supabase.js`, `check-db.js`. Several of these **duplicate** files already in `/scripts` (`check-db.js` exists in both root and `scripts/`, plus a third `scripts/check-db.ts`). One of them (`test-rbac-puppeteer.js`) hardcodes a Windows path from what looks like the AI tool's own scratch directory:
```js
const outDir = 'C:\\Users\\hamma\\.gemini\\antigravity-ide\\brain\\...\\scratch';
```
That's a dead giveaway this was AI-agent scratch work that got committed by accident. None of this belongs in a repo you're about to show to anyone. Move real, reusable scripts into `/scripts`, delete the rest, and add a `.gitignore` rule if you want to keep local debug scripts untracked going forward.

### 16. README is still the unedited `create-next-app` default
Literally the stock "This is a Next.js project..." boilerplate — no mention of what this project *is*, no setup instructions for Prisma/Supabase env vars, no seeding instructions, nothing about the RBAC roles or module structure. This is priority #1 for the "make it professional" pass.

### 17. `AGENTS.md` / `CLAUDE.md` committed to the repo
Not a bug, but worth a conscious decision: these are AI-coding-agent instruction files (`CLAUDE.md` just imports `AGENTS.md`). Fine to keep if you're continuing to use AI tools on this project, but they're a signal to anyone browsing the repo (recruiters, professors, teammates) that it was AI-scaffolded — decide if you want that visible or in `.gitignore`.

### 18. Broad `catch (error: any)` and inconsistent error typing
Some files type errors as `unknown` and narrow properly (`error instanceof Error ? error.message : String(error)`), others just use `any` (`medicine.ts`, `supplier.ts`: `catch (error: any)`). Pick one convention — the `unknown` + narrow pattern is the correct one under strict TypeScript; sweep the `any` ones to match.

### 19. `dob`/date handling has no timezone strategy
Dates are passed as plain strings (`"YYYY-MM-DD"`) and converted with `new Date(...).toISOString()` in several places without an explicit timezone. For a hospital in Pakistan, this can silently shift a patient's date of birth or a lab sample's collection time by a day depending on server timezone vs. clinic timezone. Worth deciding explicitly (store as `date` not `timestamptz` where time doesn't matter, e.g. `dob`) rather than letting JS Date coercion decide.

---

## Summary — what to tackle first

1. **PDF route auth** (#1) and **missing action-level authorization** (#2, #3) — these are the ones that actually expose patient data to people who shouldn't see it. Do these before anything else.
2. Remove the admin credentials from the login page (#4) and the debug console.logs (#10).
3. Decide Prisma vs. Supabase (#11, #12) — this is a bigger refactor, but the longer you leave two data-access patterns running in parallel, the more it costs you every time you touch the schema.
4. Fix the sale stock race (#7) — this is the one bug most likely to cause a real, visible problem (overselling medicine) once actual receptionists/pharmacists use this concurrently.
5. Clean up repo hygiene (#13, #15, #16) once the above is done — this is what "professional" mostly comes down to for anyone reviewing the code.

---

## A prompt you can hand to your AI tool (Integravity, Claude Code, whatever) to actually do the fixes

```
I'm working on a Next.js 16 + Prisma 7 + Supabase hospital management system
(patients, doctors, appointments, OPD, pharmacy, lab, billing, RBAC with 8 roles).
I have a code audit with the following prioritized issues. Fix them in this order,
and after each group, show me a diff summary before moving to the next:

GROUP 1 - Security (do first):
1. Add auth to /api/pdf/invoice/[id]/route.tsx and /api/pdf/lab-report/[id]/route.tsx
   using supabase.auth.getUser() + hasAccess() from src/lib/permissions.ts, matching
   the pattern already used in src/app/actions/billing.ts.
2. Add getCurrentUserRole() + hasAccess() checks to every mutating Server Action that's
   currently missing them: appointment.ts, doctor.ts, opd.ts, lab-order.ts,
   lab-result.ts, lab-test.ts, purchase.ts, sale.ts, return.ts, supplier.ts.
   Use the exact pattern already correct in patient.ts and medicine.ts.
3. Enforce "Doctor" role can only see/edit their OWN appointments/OPD visits/lab
   orders (filter by doctorId matching the logged-in doctor), per the comment
   already in src/lib/permissions.ts.
4. Remove the hardcoded test-account credentials block from src/app/login/page.tsx
   (or gate it behind process.env.NODE_ENV !== 'production').
5. Remove the debug console.log statements in
   src/app/api/pdf/lab-report/[id]/route.tsx.
6. Extend supabase-rls.sql to cover Invoice, Payment, Medicine, Sale, LabResult,
   and User with real role-aware policies, not USING (true).

GROUP 2 - Correctness bugs:
7. Fix the race condition in MRN/invoice/order number generation (patient.ts,
   billing.ts, lab-order.ts) - use a Postgres sequence or atomic insert-with-retry
   instead of read-max-then-insert.
8. Fix the stock overselling race in sale.ts's createSale() - the stock check and
   insert need to happen atomically (DB function/RPC with row locking), not as two
   separate round trips.
9. Fix createDoctor() in doctor.ts to also create a Supabase Auth account via
   supabase.auth.admin.createUser(), matching the pattern in prisma/seed.ts -
   right now new doctors can't log in.
10. Standardize all generated IDs (invoices, orders, purchases, sales, samples) on
    one consistent scheme instead of mixing sequential numbers and Date.now().

GROUP 3 - Architecture cleanup:
11. Decide: either extend prisma/schema.prisma to include Medicine, Supplier,
    Purchase, PurchaseItem, StockMovement, Sale, SaleItem, LabTest, LabCategory,
    LabOrder, LabOrderItem, Sample, LabResult, ReferenceRange (matching what the
    Supabase queries already assume), OR remove Prisma entirely and standardize on
    Supabase-js. Tell me the tradeoffs, then implement whichever I choose.
12. Delete src/lib/mock-appointments.ts, mock-doctors.ts, mock-patients.ts and
    any types that only supported them, after confirming nothing still imports them.
13. Clean up root-level debug scripts (test-db.ts, test-db.js, test-login.js,
    test-prisma.js, test-rbac.js, test-rbac-puppeteer.js, test-supabase.js,
    check-db.js) - keep useful ones in /scripts, delete duplicates and anything
    referencing local machine paths.

GROUP 4 - Professional polish:
14. Rewrite README.md to actually describe this project: what it is, the RBAC role
    list, required env vars (DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY), setup steps
    (npm install, prisma migrate, db:seed), and folder structure overview.

After each group, run `npm run lint` and `npx tsc --noEmit` and fix anything that
breaks before moving on.
```

Paste this into whatever tool you're using (or hand it to me in chunks — group by group is safer than all at once for something touching auth and billing).
