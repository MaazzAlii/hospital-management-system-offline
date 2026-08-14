# Task: Pharmacy Sales Module — Distributor Invoice Format + Expiry/Stock Safety

## Context
The client has requested the Pharmacy Sales module be upgraded to match a real wholesale distributor invoice format (sample: Fazal Enterprises sales invoice, image attached separately). This is a genuine scope expansion beyond the current retail-style Sale/SaleItem model — implement it as a proper extension, not a quick patch.

Also confirm before starting: check whether "Daily sale return" simply means a **report page listing existing returns filtered by date** — sale returns already exist at `src/app/(dashboard)/pharmacy/returns/new` with `getSaleBySaleNo` / `processReturn` in `src/app/actions/return.ts`. Do not rebuild return functionality from scratch without first confirming what's actually missing.

## Part A — Original requested fixes (smaller, do first)

1. **Show expiry status before selling.** In the sale form's medicine/batch picker, display expiry date and a status badge: `Expired` (red) / `Expiring Soon` (amber, e.g. within 90 days — confirm threshold with client) / `Valid` (green).
2. **Prevent selling expired medicines.** Server-side validation in the sale action — reject the sale item if the selected batch's `expiryDate < today`. Don't rely on client-side UI alone.
3. **Auto-deduct stock after sale, show remaining quantity.** After a sale completes, decrement the batch's remaining quantity and reflect it immediately in the UI (both the sale confirmation and the medicine/batch list).
4. **Sale Date field** — add to the sale form, default to today, editable.
5. **Show current stock before sale** — display available quantity per batch in the picker before the user selects quantity, so they can't oversell.

## Part B — Distributor invoice format (larger scope — schema changes required)

### B.1 — Introduce a proper `Batch` model
Currently `PurchaseItem` has `batchNo`/`expiryDate` as plain fields with no aggregated remaining-quantity tracking, and `SaleItem.batchNo` is just a string with no FK — this makes reliable stock deduction and expiry checks fragile. Add:

```prisma
model Batch {
  id                String        @id @default(cuid())
  medicineId        String
  medicine          Medicine      @relation(fields: [medicineId], references: [id])
  purchaseItemId    String?
  purchaseItem      PurchaseItem? @relation(fields: [purchaseItemId], references: [id])
  batchNo           String
  expiryDate        DateTime
  quantityReceived  Int
  quantityRemaining Int
  createdAt         DateTime      @default(now())
  saleItems         SaleItem[]
}
```
Backfill: write a migration script that creates a `Batch` row for every existing `PurchaseItem` with a `batchNo`, setting `quantityRemaining` based on current stock minus sales already recorded against that batch (best-effort reconciliation — flag any negative/mismatched results for manual review rather than silently guessing).

On sale, select the batch with the **earliest expiryDate first** (FEFO — already your stated approach elsewhere in the app) and deduct from `quantityRemaining`. Link `SaleItem.batchId` to the specific `Batch` used, not just a string.

### B.2 — Add invoice header fields to `Sale`
```prisma
model Sale {
  // existing fields unchanged, add:
  accountCode     String?
  customerAddress String?
  licenseNo       String?
  ntn             String?
  summaryPrsNo    String?
  bookedBy        String?
  salesmanMobile  String?
  suppliedBy      String?
  territory       String?
}
```

### B.3 — Add line-item invoice fields to `SaleItem`
```prisma
model SaleItem {
  // existing fields unchanged, add:
  batchId         String?
  batch           Batch?   @relation(fields: [batchId], references: [id])
  expiryDate      DateTime?   // snapshot at time of sale, for record-keeping even if batch data changes later
  freeQty         Int      @default(0)
  tradePrice      Float?   // may differ from sellingPrice — confirm with client whether these are the same concept or genuinely distinct
  grossAmount     Float?
  discountPercent Float?   @default(0)
  discountAmount  Float?   @default(0)
  sTax            Float?   @default(0)
  gst             Float?   @default(0)
  netAmount       Float?
}
```

### B.4 — Update the sale form UI
Match the invoice layout from the sample image:
- Header section: Invoice No (existing `saleNo`), Account Code, Customer Name, Address, Contact/Mobile No, License#, NTN#, Invoice Date, Summary/PRS No, Booked By, Salesman Mobile#, Supplied By, Territory.
- Line item table columns: Code, Product Name, Batch No, Expiry Date, Qty, Free, Total, Trade Price, Gross Amount, Discount % / Amount, STAX, GST, Net Amount.
- Footer: No. of Items, Total Qty, Total Gross Amount, Total Discount, S.Tax Amount, G.S.Tax Amount, Net Invoice Amount, Warranty/Remarks text block.

Confirm with the client which of these fields are mandatory vs optional per sale — a retail counter sale to a walk-in patient likely doesn't need Account Code/License#/NTN# (those look like B2B distributor-to-pharmacy fields), so consider whether this is actually a **separate sale type** (e.g. "Wholesale/Distributor Sale" vs the existing simple "Retail Sale") rather than adding a dozen new required fields to every sale. This distinction matters a lot for how much of the existing sale flow needs to change vs. how much is a new parallel flow.

### B.5 — Update `src/components/pdf/InvoicePDF.tsx` and `src/app/api/pdf/invoice/[id]/route.tsx`
Update the generated PDF to match the sample invoice layout and include all new fields, laid out in the same header/line-item/footer structure as the reference image.

## Part C — Daily Sale Return (confirm scope first)
Before building anything: ask the client to confirm whether they mean:
- (a) A report/list page showing all returns processed on a given day, or
- (b) Some return workflow that's actually missing from the existing `pharmacy/returns/new` flow.

If (a): add a `src/app/(dashboard)/pharmacy/returns/page.tsx` (or similar) with a date filter, listing returns for the selected day with medicine, batch, qty returned, reason, and refund amount, sourced from the existing return records — this should be a small addition, not a new subsystem.
- None of the invoice header fields (Account Code, Supplied By, Territory, Salesman, License#, NTN#, etc.) should be hardcoded to any specific business name — they must all be editable free-text fields on the sale form, optionally pre-filled with sensible defaults from Settings where applicable (e.g. clinic name for "Supplied By"), but always overridable per sale.

- also commit every changes induadually in both maazzalii  https://github.com/MaazzAlii/hospital-management-system-offline repo or in orignal repo name 'Life-care-clinic' both are existing on my device as i am working on both right now.

- also add pharmacy invoice.md file in to main directory project 'life-care-clinic-hms' on my device and in 'maazzalii/hospital-management-system-offline' on github also update the  README.md file and update all the changes in README.md file.

- also in last run its and after that take screenshorts and commit them and add those screenshorts in readme file ok and all commits do induadually for every changes and a screenshorts,
see every things is push to github any file need to add in gitignore or its done completely ? 
## What NOT to do
- Don't add all the wholesale invoice fields as required on every sale without confirming with the client whether retail and wholesale sales should be different flows — this affects both UI complexity and data integrity.
- Don't deduct stock without going through the new `Batch` model — the current string-only `batchNo` on `SaleItem` isn't reliable enough for real FEFO deduction and expiry blocking.
- Don't build "Daily Sale Return" as new functionality before confirming it isn't just a reporting view over what already exists.

