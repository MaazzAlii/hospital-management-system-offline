# HMS Errors — Round 3

Everything from Rounds 1 and 2 is confirmed fixed and verified in the latest upload (PDF auth, action-level permission checks, RLS role-matching, LabOrderItem ownership, sequence generation, admin key fallback, console.logs, Prisma removal, mock files, `.env.example`, `package.json`). One item is still open.
 must commit every file after every changes every file must be commit induadually 
---

## Error 1: Patient detail page shows invoice data to roles without billing access

### Problem
Doctors (and any other role without billing access) can currently see a patient's full invoice history — invoice numbers, amounts, payment status — when they open that patient's chart.

### Analysis
`src/app/(dashboard)/patients/[id]/page.tsx` queries the `Invoice` table directly (`supabase.from("Invoice").select(...)`) with no permission check at all. It does not go through the guarded `getInvoices()`/`getInvoiceById()` functions in `billing.ts` — it bypasses them entirely. Doctor has `patients` read access (so reaches this page) but zero `billing` access per `permissions.ts`. This was flagged in Round 2 and did not get fixed — verify this time that it actually lands.

### Implementation
- Fetch the current user's role before running the Invoice query (`getCurrentUserRole()` from `auth-utils.ts`).
- Only run the `supabase.from("Invoice")...` query if `hasAccess(role, 'billing', 'read')` is true. Do not fetch-then-hide — skip the fetch entirely for roles without access.
- Only render the "Recent Invoices" panel if `invoices` is non-null/non-empty as a result of that gated fetch.
- Do not solve this with CSS `display: none` or a conditional render around already-fetched data — the data must never leave the server for an unauthorized role.

### Validation
1. Log in as Doctor → open any patient's detail page → confirm the "Recent Invoices" panel does not appear and no invoice data is present in the page's server response (check network tab / server logs, not just the visible UI).
2. Log in as Admin → open the same patient → confirm invoices still appear correctly.
3. Log in as Cashier → open the same patient → confirm invoices still appear (Cashier has billing access).
4. Log in as Receptionist → confirm invoices still appear (Receptionist has read-only billing access).

### 🤖 Antigravity Execution Prompt

```
You are modifying an enterprise healthcare application.

Before writing code:
1. Read 0-HMS-Execution-Sequence.md and follow the AI Execution Rules at the top.
2. Do not assume anything about this file's current structure - open and read
   it fully first.
3. Search the repository for every other place Invoice is queried directly
   (not through billing.ts) so you know if this pattern exists elsewhere, but
   do NOT fix those other locations now - only report them.

TASK:
Locate src/app/(dashboard)/patients/[id]/page.tsx.

Find the Invoice query in this file.

Implement a billing permission check using hasAccess(role, 'billing', 'read')
from src/lib/permissions.ts, using getCurrentUserRole() from
src/lib/auth-utils.ts to get the current role.

Only execute the Invoice query if hasAccess() returns true. Do not fetch the
data and then hide it with conditional rendering or CSS - prevent the fetch
itself from happening for unauthorized roles.

Do not modify any other query on this page (Patient, Appointment, OpdVisit
queries stay exactly as they are).

Do not modify billing.ts, auth-utils.ts, or permissions.ts unless you find a
genuine bug in hasAccess() itself while doing this - if so, stop and report it
instead of fixing it silently.

Compile. Fix any TypeScript or lint issues introduced by this change only.

Show the complete diff.

Wait for my confirmation before continuing to any other task.
```

### Definition of Done
- ✔ Project builds
- ✔ No TypeScript errors
- ✔ No ESLint errors
- ✔ Doctor session: Invoice data not fetched, panel not shown
- ✔ Admin/Cashier/Receptionist sessions: Invoice data still shown correctly
- ✔ No regression on Patient/Appointment/OPD sections of the same page
- ✔ Git diff reviewed
- ✔ Waited for confirmation before continuing

### Files Expected to Change
- `src/app/(dashboard)/patients/[id]/page.tsx`

Do NOT modify any other file unless required to fix a compile error directly caused by this change.

### Rollback
Before editing: create a backup commit (`git add -A && git commit -m "backup: before patients/[id] billing gate fix"`).
If implementation fails or breaks the Patient/Appointment/OPD sections of the page: `git reset --hard HEAD~1` to restore the previous state, explain what failed, and do not continue to Error 2 or Phase 2 until this is resolved.
 must commit every file after every changes every file must be commit induadually 
---

## Error 2: The "direct Supabase call" audit across all pages was never completed

### Problem
Both `dashboard/page.tsx` and the patient detail page bypass the guarded action functions and query Supabase directly. Three rounds of hardening `src/app/actions/*.ts` never touched either page. Any other page doing the same thing has the identical blind spot, and nobody has gone looking yet.

### Analysis
This is a real gap, but fixing it exhaustively right now is wasted effort: Phase 2 of this project rewrites the entire data layer from Supabase to Prisma/SQLite. Every direct `.from()` call will be touched during that migration anyway. Auditing and re-fixing this on the Supabase codebase now means doing the same review twice.

### Implementation
No implementation for this round. Defer this entirely to Phase 2 (`2-HMS-Offline-Conversion-Guide.md`, Step 5), where each direct Supabase call gets rewritten to Prisma and is naturally re-reviewed for the correct permission check at that time.

### Validation
Not applicable this round — validation happens as part of Phase 2's per-file verification.

### 🤖 Antigravity Execution Prompt

```
No execution prompt for this round. Do not attempt to fix this now.

When you reach Phase 2, Step 5 in 2-HMS-Offline-Conversion-Guide.md, treat
every page you find querying Supabase/Prisma directly (outside src/app/actions/)
as a checkpoint: before rewriting its query to Prisma, first confirm what
permission that page's data actually requires, and add the missing hasAccess()
check as part of that same rewrite - do not rewrite the query and defer the
permission check to "later."
```
 must commit every file after every changes every file must be commit induadually 
### Definition of Done
- ✔ Acknowledged as deferred, not skipped
- ✔ Cross-referenced into Phase 2 Step 5's checklist

### Files Expected to Change
None this round.

### Rollback
Not applicable — no changes made in this item.
