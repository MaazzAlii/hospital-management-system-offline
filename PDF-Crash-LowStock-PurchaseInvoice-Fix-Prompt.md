# Task: Fix PDF Generation Crash, Low-Stock Default, Walk-in Form Clutter, and Add Purchase Invoice PDF

Client (via Hammad) reported three real issues plus one new feature request. Two of the three bugs have been traced to specific code with high confidence — implement the targeted fixes below, don't re-investigate from scratch.

---

## Bug 1 — PDF generation crashes with generic "Internal Server Error generating PDF"

**Confirmed source:** `src/app/api/pdf/invoice/[id]/route.tsx` (and the same pattern in `src/app/api/pdf/lab-report/[id]/route.tsx`). The catch block only does `console.error(...)` server-side and returns a bare 500 with no detail — this is why the client sees an opaque message with nothing actionable.

**Most likely root cause:** both PDF routes build the logo like this:
```ts
const logoUrl = `${url.protocol}//${url.host}/logo.jpeg`;
...
<Image src={logoUrl} />
```
This makes the PDF-rendering code perform a **live HTTP self-fetch back to the same Node server that is currently handling the request**, purely to load a static image that already exists on disk at `public/logo.jpeg`. This is a fragile, unnecessary round-trip — known to fail intermittently depending on how `url.host` resolves (e.g. if it resolves to `0.0.0.0` instead of `localhost`, or under connection-limited conditions), and is a classic cause of "works sometimes / works on my machine, fails on others."

**Fix — eliminate the self-fetch entirely:**
1. In both PDF route files, read the logo file directly from disk and embed it as a base64 data URI instead of fetching over HTTP:
   ```ts
   import fs from 'fs';
   import path from 'path';

   const logoPath = path.join(process.cwd(), 'public', 'logo.jpeg');
   const logoBase64 = fs.existsSync(logoPath)
     ? `data:image/jpeg;base64,${fs.readFileSync(logoPath).toString('base64')}`
     : undefined;
   ```
   Pass `logoBase64` (or `undefined` if missing — the `InvoicePDF`/`LabReportPDF` components already guard with `{logoUrl && <Image .../>}`, so a missing logo should degrade gracefully, not crash) instead of the constructed HTTP URL.
2. **Fix the swallowed error** so this can actually be diagnosed if it happens again: log the full error message and stack to `server-error.log` (not just `console.error`, which the client can't see) — reuse whatever logging mechanism `electron/main.js` already writes to `server-error.log` with, or explicitly `fs.appendFileSync` the error there from within the route's catch block.
3. Also add a bit more detail to the response in dev/debug scenarios — at minimum, log enough that if this happens again, checking `server-error.log` immediately shows the real underlying error instead of nothing.

**Verify:** generate a real Sales PDF and a Lab Report PDF in the actual packaged app, confirm both succeed and show the logo. Also intentionally test with a temporarily-renamed/missing `logo.jpeg` to confirm it degrades gracefully (no logo, no crash) rather than 500ing.

---

## Bug 2 — Low stock threshold defaults to 100, causing false alerts on 16/18 medicines

**Confirmed source:** in the Add Medicine form, the reorder level field defaults to:
```ts
const [reorderLevel, setReorderLevel] = useState("100"); // Default level
```
Staff adding medicines mostly left this at the default, so nearly every medicine ended up with `reorderLevel = 100` — which triggers a false low-stock alert for any item with fewer than 100 units in stock (i.e., almost everything in a small retail pharmacy). The underlying low-stock calculation logic itself (`isLowStock: currentStock <= reorderLevel`) is correct and does not need to change — only the default value does.

**Fix:**
1. Change the Add Medicine form's default from `"100"` to `"4"` (per the client's latest confirmed number — they went back and forth between 2 and 4 across messages, settling on 4 in the most recent voice note).
2. Also update the Edit Medicine form's fallback default (currently `"10"` when no value is set) to match — `"4"` — for consistency.
3. **Fix existing data:** the 16 medicines already saved with `reorderLevel = 100` need to be corrected too, or the client will still see false alerts even after this fix ships. Either:
   - Provide a one-time script to update all medicines currently at `reorderLevel = 100` down to `4` (safe since 100 was clearly always the unintended default, not a deliberate choice), or
   - Tell the client which medicines need their reorder level manually adjusted via Edit.
   Prefer the script — faster and removes the need for the client to manually fix 16 items.

**Verify:** add a new medicine, confirm the reorder level field now defaults to 4, not 100. Check the Medicines Master dashboard's "Low Stock Alerts" count after running the repair script — it should now reflect genuinely low-stock items only, not nearly the entire catalog.

---

## Bug 3 — Walk-in POS sale form is too cluttered with wholesale-only fields

**Context:** already partly addressed in earlier work (all wholesale fields were made optional, not required), but the client's video shows the form still visually presents Account Code, NTN No., Drug License No., Booked By, Salesman Mobile#, Supplied By, Territory all at once regardless of customer type — which is confusing for a simple walk-in sale even though those fields aren't technically required to submit.

**Fix:** in the sale form (`src/app/(dashboard)/pharmacy/sales/new/form.tsx`), when **Customer Profile** is set to "Walk-in / Wholesale Customer" (or however walk-in is distinguished from a real wholesale account), visually collapse/hide the institutional fields (Account Code, NTN No., Drug License No., Booked By, Salesman Mobile#, Territory) behind a toggle or accordion like "Add wholesale/distributor details (optional)" — collapsed by default. Only show Customer Name, Phone, and Address by default for a walk-in sale. If the user selects/enters a real wholesale account, expand automatically or let them expand manually.

**Verify:** open New Sale, confirm the default view shows only Customer Name/Phone/Address prominently, with wholesale fields tucked behind an optional expandable section — not all visible at once.

---

## Feature — Add Purchase Invoice PDF matching the Swat Distributors reference format

The client provided two real invoice samples (Swat Distributors stock invoice, Fazal Enterprises sales invoice) as the target format for **Purchase module PDFs** specifically (distinct from the Sales invoice PDF already built). Implement a new PDF template for Purchases:

**Header:**
- Supplier details (name, address, phone) — pulled from the `Supplier` record on the purchase.
- Invoice No / Date (purchase's own invoice number and date fields).
- Clinic's own receiving details (name/address — from Settings, same as other PDFs).

**Line items table**, matching the reference images' columns:
- Code, Product Name, Batch No, Expiry Date, Units (Qty), Free/FOC, Price, Gross Amount, Discount % / Amount, Tax, Net Amount.

**Footer:**
- Number of Items, Total Gross Amount, Total Discount, Total Tax, Net/Total Invoice Amount.
- Previous Balance and Payable Amount, if the Purchase model tracks these (check `Purchase`/`Supplier` schema — if there's no running balance concept currently, either add it minimally or omit this line rather than fabricating data).

Build this as a new component (e.g. `src/components/pdf/PurchaseInvoicePDF.tsx`) and a new route (`src/app/api/pdf/purchase/[id]/route.tsx`), following the same pattern as the existing Sales `InvoicePDF.tsx`/route — including the logo-as-base64 fix from Bug 1 from the start, not the fragile self-fetch pattern.

**Verify:** generate a real Purchase PDF in the packaged app and visually compare its layout against the reference images — confirm all listed columns and footer totals are present and correctly populated from real purchase data.

---

## Build & verify (per `AGENT_WORKFLOW.md`)
```
npx prisma generate
node scripts/copy-prisma-engine.js
npm run electron:build
```
Launch the real installed `.exe` directly, and manually verify all four items above by clicking through the real app — generate a real Sales PDF, a real Purchase PDF, add a medicine and confirm the reorder default, and check the walk-in form layout. Confirm `server-error.log` is clean (or if any PDF generation is attempted with an edge case, confirm it now logs a real, useful error instead of a silent generic 500).
