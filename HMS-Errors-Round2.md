# HMS Code Audit — Follow-Up (Round 2)

Compared against the previous audit. Good news first: **almost everything from Group 1–3 of the fix prompt actually landed correctly.** But this round introduced **one new critical bug** that will break the entire app in production, plus two smaller regressions. Read the 🔴 section before deploying anything.

---

## ✅ Confirmed fixed (verified by re-reading the code)

| # | Issue | Status |
|---|---|---|
| 1 | PDF routes (`/api/pdf/invoice`, `/api/pdf/lab-report`) had no auth | **Fixed.** Both now call `getCurrentUserRole()` + `hasAccess()`, return 401/403 correctly. |
| 2 | Most server actions had no authorization check | **Fixed.** `appointment.ts`, `doctor.ts`, `opd.ts`, `lab-order.ts`, `lab-result.ts`, `lab-test.ts`, `purchase.ts`, `sale.ts`, `return.ts`, `supplier.ts` all now call `hasAccess()`. |
| 3 | Doctor role could see/edit all doctors' data, not just their own | **Fixed.** New `getCurrentDoctorId()` helper in `auth-utils.ts`, applied consistently in `appointment.ts`, `opd.ts`, `lab-order.ts`, `lab-result.ts`. |
| 4 | Admin credentials printed on public login page | **Fixed.** Now wrapped in `{process.env.NODE_ENV === 'development' && (...)}` — correctly stripped from production builds. |
| 5 | RLS was decorative (`USING (true)` everywhere, only 3 tables covered) | **Partially fixed** — see 🔴 below, the fix itself has a bug. |
| 6 | Race conditions in MRN/invoice/order number generation | **Fixed** — real Postgres sequences (`supabase-sequences.sql`) + atomic `nextval()` RPC via `src/lib/id-generator.ts`. See ⚠️ below for one caveat. |
| 7 | Pharmacy sale stock check had a TOCTOU race (overselling) | **Fixed** — `create_sale_with_stock_check()` Postgres function does `FOR UPDATE` row locking before checking stock. This is done correctly. |
| 9 | `createDoctor()` never created a real login | **Fixed**, and fixed well — generates a temp password, creates the Supabase Auth user first, rolls back (deletes the Auth user) if the `User`/`Doctor` insert fails afterward. |
| 10 | Debug `console.log` in lab-report PDF route | **Fixed** — removed. |
| 13 | Dead mock data files (`mock-patients.ts` etc.) | **Fixed** — deleted entirely. |
| 11/12 | Prisma vs Supabase — mixed data access | **Fixed, decisively** — Prisma is gone completely (no `schema.prisma`, no `@prisma/client`, no `prisma.config.ts`). Fully standardized on Supabase-js. |
| 15 | Root full of scratch/debug scripts | **Fixed** — root is clean, only `/scripts` remains with legitimate seed/test utilities. |
| 16 | README was unedited boilerplate | **Fixed, well** — now documents the stack, RBAC roles, ID scheme, and setup steps including which SQL files to run. |

Genuinely good work on this pass. Now the part that needs attention before you deploy.

---

## 🔴 CRITICAL — new bug, will break every write operation in the app

### The new RLS script's role-matching is broken — no role name it checks for actually exists

`supabase-rls-full.sql` defines:
```sql
CREATE OR REPLACE FUNCTION user_has_role(role_name TEXT)
RETURNS BOOLEAN
...
  SELECT EXISTS (
    SELECT 1 FROM "User" u
    JOIN "Role" r ON u."roleId" = r.id
    WHERE u.id = auth.uid() AND r.name = role_name
  );
```
This does an **exact, case-sensitive string match** against `Role.name`. But every policy in this file calls it with lowercase, generic names:
```sql
USING (user_has_role('admin') OR user_has_role('receptionist') OR ...)
USING (user_has_role('admin') OR user_has_role('pharmacist'))
USING (user_has_role('admin') OR user_has_role('lab'))
```
The actual seeded role names (from your `Role` table, and matching what `src/lib/permissions.ts` checks against) are: **`Super Admin`, `Hospital Admin`, `Receptionist`, `Doctor`, `Lab Technician`, `Pathologist`, `Pharmacist`, `Cashier`**.

None of these match `'admin'`, `'receptionist'` (wrong case), `'doctor'` (wrong case), `'pharmacist'` (wrong case), or `'lab'` (doesn't exist at all — the closest roles are `Lab Technician` and `Pathologist`). Every single one of these `user_has_role()` calls will **always return false**, for every user, including Super Admin.

**Consequence:** the app's Supabase client connects using the anon key + the logged-in user's session (`src/lib/supabase/server.ts`), which means Postgres RLS is fully enforced on every query — nothing bypasses it. If this SQL file is run as your README's own setup instructions say to do (`supabase-rls-full.sql` — step 3 of "Getting Started"), **every INSERT/UPDATE/DELETE across every table in the entire app will start failing** with a Postgres RLS policy violation, for every role, including admins. Creating a patient, an appointment, an invoice, a medicine — all of it breaks, immediately, the moment someone follows your own README.

This is the single most important thing to fix before you deploy anywhere.

**Fix:** `user_has_role()` needs to normalize case and handle the multi-name roles, e.g.:
```sql
CREATE OR REPLACE FUNCTION user_has_role(role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "User" u
    JOIN "Role" r ON u."roleId" = r.id
    WHERE u.id = auth.uid()
      AND (
        (role_name = 'admin' AND r.name IN ('Super Admin', 'Hospital Admin'))
        OR (role_name = 'lab' AND r.name IN ('Lab Technician', 'Pathologist'))
        OR LOWER(r.name) = LOWER(role_name)
      )
  );
$$;
```
Test every role against every module after this change — don't just fix the function and assume it's right; actually log in as a Pharmacist and try to create a medicine, log in as Doctor and try to update an appointment, etc.

### There are now two different, conflicting RLS scripts in the repo
`supabase-rls.sql` (the old one) is **still present** alongside the new `supabase-rls-full.sql`, and they define different policies, under different names, with different (and incompatible) role-matching logic — the old one actually matches roles correctly (`get_user_role_name() IN ('Receptionist', 'Doctor', 'Cashier')`, matched via JWT email), the new one doesn't (see above).

Since they use different policy names, running both doesn't cleanly replace one with the other — you can end up with both sets of policies layered on the same tables, and because Postgres RLS policies of the same command type are OR'd together permissively, the *actual* behavior of your database right now depends entirely on which scripts have been run, in which order, on which environment. That's not something you want to be uncertain about for a hospital's data.

**Fix:** pick one file as canonical (fix and keep `supabase-rls-full.sql` since it covers all 29 tables, not just 3), delete `supabase-rls.sql` entirely, and re-run the fixed script on a clean/test database to confirm the actual resulting policy set before touching production data.

---

## 🟠 High — two regressions worth fixing before this ships

### The atomic ID generator silently falls back to the old, broken behavior on any error
`src/lib/id-generator.ts`:
```ts
async function getNextSequenceValue(seqName: string): Promise<number> {
  const { data, error } = await supabase.rpc('nextval', { seq_name: seqName });
  if (error || data === null || data === undefined) {
    console.warn(`Fallback for sequence ${seqName}: ${error?.message || 'No data returned'}`);
    return Math.floor(Date.now() % 10000);
  }
  return Number(data);
}
```
The whole point of moving to Postgres sequences was to eliminate the race condition from the old read-max-then-insert approach. But if the `nextval` RPC call ever fails for *any* reason (network blip, the sequence not yet created because someone forgot to run `supabase-sequences.sql`, a typo in the sequence name), this silently falls back to `Date.now() % 10000` — which is exactly the collision-prone pattern you were fixing, just with an extra step, and it does so **silently** (a `console.warn` nobody will see, not a user-facing error). Two receptionists registering patients seconds apart during a fallback event could get the same MRN with no indication anything went wrong.

**Fix:** don't fall back at all — if the RPC fails, throw and let the caller show "failed to generate ID, please retry" rather than quietly handing out a weak ID. A hospital's audit trail should never contain a silently-degraded ID scheme.

### The Supabase admin client silently falls back to the anon key
`src/lib/supabase/admin.ts`:
```ts
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
```
If `SUPABASE_SERVICE_ROLE_KEY` isn't set (e.g., forgotten in a new deployment environment), this doesn't fail loudly — it quietly uses the anon key instead. Since `createDoctor()` uses this client specifically for `supabaseAdmin.auth.admin.createUser()` (an admin-only API), the anon key doesn't have permission for that call, so it'll fail — but it'll fail with a confusing Supabase permissions error instead of a clear "you forgot to set SUPABASE_SERVICE_ROLE_KEY" error at startup.

**Fix:**
```ts
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set — required for admin operations.");
}
```

---

## 🟡 Medium — remaining/leftover items, not urgent but worth doing

- **RLS `SELECT` policies are still `USING (true)`** across `Invoice`, `Payment`, `Medicine`, `Purchase`, `Sale`, `LabTest`, `LabOrder`, `LabResult`, etc. in the new `supabase-rls-full.sql`. Once you fix the role-matching bug above, writes will be properly restricted, but **any authenticated user can still read all of this data at the DB level** regardless of role. Your README calls this "comprehensive RLS across all 32 tables" — that's true for enabling RLS, but the actual read restriction is still effectively off. Decide if that's acceptable (defense-in-depth for writes only) or if reads should also be scoped.
- **`LabOrderItem`'s write policy doesn't check doctor ownership**, unlike `LabOrder`'s policy which does (`EXISTS (... d.id = "doctorId")`). Minor inconsistency — a Doctor could, at the DB layer, still write `LabOrderItem` rows tied to a lab order that isn't theirs, even though `LabOrder` itself is protected.
- Several read-only actions still have no `hasAccess()` check at all: `getInvoices`, `getInvoiceById`, `getExpiringItems`, `getMedicines`, `getMedicineCategories`, `getLabTests`, `getLabCategories`. Not urgent now that RLS is (mostly) in place as a backstop, but worth adding for consistency with the rest of the codebase.
- `src/lib/types/database.ts`'s `Medicine` interface lists `supplierId`, `batchNo`, `expiryDate`, `minStockAlert` — none of which match how `Medicine` is actually used elsewhere (the real code uses `reorderLevel`, and `batchNo`/`expiryDate` actually live on `PurchaseItem`, not `Medicine`). These are misleading types that don't reflect the real schema — worth correcting so future-you doesn't get confused six months from now.
- `.env.example` still asks for `DATABASE_URL` and `DIRECT_URL`, and `pg` is still listed in `package.json` dependencies — both are leftovers from the Prisma era and nothing in the code uses them anymore. Remove both to avoid confusing whoever sets this up next.

---

## 🟢 Low — cosmetic

- `logout()` in `auth.ts` still has two leftover `console.log` statements (`"logout() server action triggered"`, `"Supabase signOut successful"`). Harmless, but clutter — remove before shipping.

---

## What to do next

1. Fix `user_has_role()` in `supabase-rls-full.sql` (the exact-match bug) — **do this before you run it against any real database.**
2. Delete `supabase-rls.sql` once the fixed `supabase-rls-full.sql` is confirmed working, so there's only one canonical RLS file.
3. Fix the two silent fallbacks (`id-generator.ts`, `supabase/admin.ts`) so failures are loud, not quiet.
4. Then — and only then — you're in genuinely good shape to deploy. Everything from the first audit that actually mattered for patient-data safety is fixed correctly.

---

