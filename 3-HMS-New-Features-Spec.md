# New Feature Specs — Pharmacy Sales & Lab Billing

**Build these against the SQLite/Prisma schema from Phase 2 — not before.** Both features touch the exact tables rewritten in that migration (`Medicine`, `PurchaseItem`, `Sale`, `Invoice`). Confirm Phase 2 is fully complete and verified before starting anything in this file.

---

## Feature A: Pharmacy Sales — expiry, stock, sale date

### Problem
The Sales module needs to: show expiry date/status before selling, show current stock, auto-deduct stock after sale, block selling expired medicine, and add an editable Sale Date field.

### Analysis
Expiry dates live on `PurchaseItem` (per batch), not on `Medicine` — a single medicine can have multiple batches with different expiry dates. Showing "the" expiry status for a medicine at sale time requires deciding which batch to sell from. Standard approach: **FEFO (First-Expire-First-Out)** — always sell from whichever batch expires soonest.

Status per batch: `expiryDate < today` → **Expired**; within next 30 days → **Expiring Soon**; otherwise **Valid**. "Current stock" for a medicine = sum of remaining quantity across all its batches (purchased − sold/returned from that batch).

**Non-negotiable server-side rule:** never trust the client to say "this isn't expired." The sale-creation action must independently look up the batch being sold from and reject the sale if expired, regardless of what the form submitted.

### Implementation
1. Add a batch-level stock/expiry lookup: given a `medicineId`, return all `PurchaseItem` batches with remaining quantity > 0, sorted by `expiryDate` ascending, each labeled Expired/Expiring Soon/Valid.
2. Update the sales form (`pharmacy/sales/new/form.tsx`) to show stock + nearest batch expiry/status per medicine. Disable selecting a medicine whose only available batches are Expired — not just a warning, actually prevent selection.
3. In `sale.ts`'s `createSale()`, verify server-side (inside the Step 6 transaction from Phase 2) that the batch being sold from isn't expired — reject with a clear error if it is.
4. Add a `saleDate` field to the `Sale` model (defaults to now, editable on the form), distinct from the existing `createdAt` audit timestamp.
5. After a successful sale, refetch and display updated remaining stock rather than relying on stale client state.

### Validation
1. Create a medicine with two batches: one expiring in 5 days, one expiring in 200 days. Confirm the sales form shows the 5-day batch first (FEFO) with "Expiring Soon" status.
2. Create a medicine with only an expired batch. Confirm it cannot be selected in the sales form.
3. Attempt to bypass the UI (e.g., directly call `createSale()` with a batch reference known to be expired). Confirm the server rejects it independently of the UI.
4. Complete a sale and confirm the displayed remaining stock decreases correctly and immediately.
5. Change the Sale Date field to a past date and confirm it saves correctly, distinct from `createdAt`.

### 🤖 Antigravity Execution Prompt

```
Read 0-HMS-Execution-Sequence.md and follow the AI Execution Rules. Confirm
Phase 2 (2-HMS-Offline-Conversion-Guide.md, all 8 steps) is fully complete
and verified before starting this.

TASK, in this exact order, confirming each sub-step before the next:

1. Add a function (in a new or existing lib file) that, given a medicineId,
   queries all PurchaseItem batches for that medicine with remaining quantity
   > 0 (purchased quantity minus quantity already deducted via StockMovement
   for sales/returns tied to that batch), sorted by expiryDate ascending.
   Label each batch Expired (expiryDate < today), Expiring Soon (within 30
   days), or Valid.

2. Update pharmacy/sales/new/form.tsx to show, per selected medicine: total
   current stock (sum across batches) and the nearest batch's expiry date and
   status. Disable selection entirely (not just warn) if the only available
   batches are Expired.

3. In sale.ts's createSale(), inside the existing atomic transaction from
   Phase 2 Step 6, independently look up the batch being sold from and reject
   the sale with a clear error if it is expired - do this regardless of what
   the client submitted.

4. Add a saleDate field to the Sale model in schema.prisma (DateTime,
   defaults to now via @default(now())), migrate it, and add an editable date
   picker to the sales form defaulting to today. Keep createdAt as the
   separate, non-editable audit timestamp.

5. After a successful sale, refetch and display the updated remaining stock
   for the sold medicine(s) - do not assume the pre-sale client state is
   still accurate.

After each numbered item, run the corresponding Validation check from this
document and show me the result before moving to the next item.

Show me the diff after each item.

Wait for my confirmation before moving to Feature B.
```

### Definition of Done
- ✔ FEFO batch lookup returns correctly sorted, correctly labeled batches
- ✔ Expired-only medicines cannot be selected in the sales form
- ✔ Server independently rejects expired-batch sales regardless of client input
- ✔ `saleDate` field added, migrated, editable, distinct from `createdAt`
- ✔ Remaining stock displays correctly and immediately after a sale
- ✔ No regression to existing sale creation, stock movement, or invoice auto-creation
- ✔ Git diff reviewed
- ✔ Waited for confirmation

### Files Expected to Change
- `src/app/actions/sale.ts`
- `src/app/(dashboard)/pharmacy/sales/new/form.tsx`
- `prisma/schema.prisma` (add `saleDate` to `Sale`)
- A new or existing lib file for the batch-lookup function

### Rollback
Backup commit before starting. If the concurrent-sale/expiry test from Phase 2 Step 6 regresses, or if any existing sale flow breaks: `git reset --hard`, report the exact failure, do not proceed to Feature B.

---

## Feature B: Lab Module — Price List + Discounts

### Problem
Need a Price List view for all lab tests, plus customer discounts (fixed amount or percentage) that auto-recalculate the total and show on the invoice/PDF.

### Analysis
`LabTest.price` already exists per test — a Price List page is mostly a new read-only view, low risk. Discounts are the real work: `Invoice` already has `aoDiscountPct` (percentage-only), used only in the general billing flow — lab orders currently hardcode `aoDiscountPct: 0` with no discount input in the UI at all. Don't add two independent always-present fields that could conflict; add a `discountType` field instead so only one interpretation applies at a time.

### Implementation
1. Add a Price List view (new page or tab under `/lab/tests`) listing all `LabTest` rows joined with `LabCategory` — name, code, category, price — editable by roles with `hasAccess(role, 'lab', 'write')`.
2. Add `discountType` (`'percentage' | 'fixed' | null`) and `discountValue` (`Float?`) fields to the `Invoice` model, alongside the existing `discountAmt`.
3. Write **one shared helper function** (not duplicated per file) that computes `discountAmt` and `total` from `subtotal` + `discountType` + `discountValue`:
   ```
   discountAmt = discountType === 'percentage' ? subtotal * (discountValue / 100) : discountValue
   total = subtotal - discountAmt
   ```
   Use this helper in `billing.ts`'s `createInvoice()`, `lab-order.ts`'s `createLabOrder()`, and `sale.ts`'s `createSale()` — all three create Invoice rows but currently only `billing.ts` supports a discount.
4. Add a discount type/value input to the lab order creation form, shown only to roles with `hasAccess(role, 'billing', 'apply_discount')` (this permission already exists in `permissions.ts`).
5. Update `InvoicePDF.tsx` (and `LabReportPDF.tsx` if it shows billing totals) to render Subtotal / Discount / Total as three separate lines instead of just Total.

### Validation
1. Open the Price List page as Admin/Lab role — confirm all tests show with correct prices, editable.
2. Open the Price List page as a role without `lab` write access — confirm it's read-only or inaccessible per that role's permissions.
3. Create a lab order with a 10% discount — confirm the invoice shows Subtotal, Discount (10%), and the correctly recalculated Total.
4. Create a lab order with a fixed Rs. 500 discount — confirm the same, using the fixed amount instead of a percentage.
5. Generate the PDF for both cases — confirm all three lines appear correctly and the math matches the on-screen invoice.
6. Confirm the discount input is hidden/disabled for a role without `apply_discount` permission (e.g. Receptionist, if they reach this flow).

### 🤖 Antigravity Execution Prompt

```
Read 0-HMS-Execution-Sequence.md and follow the AI Execution Rules. Confirm
Feature A in this same file is complete and verified before starting this.

TASK, in this exact order, confirming each sub-step before the next:

1. Add a Price List view (new page, or a new tab on the existing
   lab/tests/page.tsx) listing all LabTest rows joined with LabCategory:
   name, code, category, price. Make it editable only for roles where
   hasAccess(role, 'lab', 'write') is true; read-only or hidden otherwise per
   whatever the existing lab/tests page already does for read-only roles.

2. Add discountType ('percentage' | 'fixed' | null, nullable) and
   discountValue (Float, nullable) fields to the Invoice model in
   schema.prisma, alongside the existing discountAmt field. Migrate this.

3. Write ONE shared helper function - not duplicated - that computes
   discountAmt and total from subtotal + discountType + discountValue using
   this exact formula:
     discountAmt = discountType === 'percentage'
       ? subtotal * (discountValue / 100)
       : discountValue
     total = subtotal - discountAmt
   Use this helper in billing.ts's createInvoice(), lab-order.ts's
   createLabOrder(), and sale.ts's createSale() - replace each of their
   current ad-hoc discount/total calculations with a call to this shared
   function.

4. Add a discount type toggle (fixed/percentage) and value input to the lab
   order creation form, visible only when hasAccess(role, 'billing',
   'apply_discount') is true for the current user.

5. Update InvoicePDF.tsx to render three separate lines - Subtotal, Discount
   (showing the type/value, e.g. "Discount (10%)" or "Discount (Rs. 500)"),
   and Total - instead of a single Total line. If LabReportPDF.tsx shows
   billing totals, apply the same change there.

After each numbered item, run the corresponding Validation check from this
document and show me the result before moving to the next item.

Show me the diff after each item.

Wait for my confirmation before moving to Phase 4
(4-HMS-Electron-Packaging-Guide.md).
```

### Definition of Done
- ✔ Price List page shows correct data, correctly gated by `lab` write access
- ✔ `discountType`/`discountValue` added and migrated
- ✔ Discount calculation happens in exactly one shared function, used by all three invoice-creating flows
- ✔ Lab order discount input gated by `apply_discount` permission
- ✔ Both PDF templates show Subtotal/Discount/Total as separate lines
- ✔ No regression to existing billing.ts or sale.ts discount/invoice behavior
- ✔ Git diff reviewed
- ✔ Waited for confirmation

### Files Expected to Change
- `src/app/(dashboard)/lab/tests/page.tsx` (or a new price-list page)
- `prisma/schema.prisma` (Invoice model fields)
- `src/lib/` — new shared discount-calculation helper
- `src/app/actions/billing.ts`, `lab-order.ts`, `sale.ts`
- `src/app/(dashboard)/lab/orders/new/form.tsx`
- `src/components/pdf/InvoicePDF.tsx`, `LabReportPDF.tsx` (if applicable)

### Rollback
Backup commit before starting. If any existing invoice/discount flow in `billing.ts` regresses (the one that already worked before this feature): `git reset --hard`, report the exact failure, do not proceed to Phase 4.



 must commit every file after every changes every file must be commit induadually 