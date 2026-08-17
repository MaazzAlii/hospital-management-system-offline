# Task: Add Expiry/Batch to Medicine Form, Fix PDF Address, Fix Lab PDF Billing

Follow `AGENT_WORKFLOW.md` for commit/push/verification standards on every item below — no need to repeat those rules here.

Client-reported issues (Hammad, testing on behalf of the clinic):
- Clinic details for reference: **Life Care Clinic, Nawagai Buner** — 📞 03439626941 — 📧 shakeelbuneri933@gmail.com

Note: the "newly added medicine doesn't appear in the list" issue has been confirmed NOT a bug (verified working by video) — skip it, do not investigate further.

---

## Part B — Expiry Date & Batch Number when adding medicines

This needs clarification before building, since it conflicts with how the system is currently designed:

- **Current design:** `Medicine` = generic drug info (name, category, unit) with no expiry/batch. `Batch` = created via **Purchase** (stock-in), and that's where expiry date and batch number actually live, because a single medicine can have multiple batches with different expiry dates over time.
- **What the client is asking for:** it sounds like they expect to enter expiry/batch **at the same time as adding a new medicine** — i.e., a combined "add medicine + first stock batch" flow, not two separate steps (Add Medicine, then separately go to Purchases to add stock).

**Recommended fix:** Don't move expiry/batch onto the `Medicine` model itself (that would break multi-batch tracking). Instead, add an **optional "Add Initial Stock" section directly on the Add Medicine form** — when creating a new medicine, let the user optionally enter Batch No, Expiry Date, and Quantity right there in the same form, and have it create both the `Medicine` and its first `Batch` in one submission. If they skip it, they can still add stock later via Purchases as before. This solves the client's actual workflow complaint without breaking the batch architecture.

Also confirm (this should already work from earlier delivered features — just verify no regression):
- Expiry date and status badge (Valid/Expiring/Expired) show when selecting a batch during a sale.
- Batch number is selectable/visible during sale.

If either of those has regressed, fix it — but confirm first whether this is actually broken or just not where the client expected to find it.

## Part C — Invoice showing wrong/unrelated address

This is likely a Settings/data issue, not necessarily a code bug. Specific lead: earlier testing created a distributor test sale with the address "Shop 4-B, Wholesale Market, G-9/4 Islamabad" — check whether this or similar test data is what's actually showing up on the PDF instead of the real clinic address, either because Settings itself has stale data, or because the PDF is pulling from the wrong field entirely (e.g. showing a customer/distributor address where the clinic's own header address should be).

1. Check the current `Settings` record in the database — does it contain the correct clinic name and address ("Life Care Clinic, Nawagai Buner", phone `03439626941`, email `shakeelbuneri933@gmail.com`)? If Settings still has old/placeholder data (e.g. "LIFE CARE HOSPITAL" branding, or leftover test address from earlier sessions), update it to the real details above.
2. Check `src/components/pdf/InvoicePDF.tsx` (and any other PDF templates) — confirm the address/clinic name is pulled **dynamically from Settings**, not hardcoded anywhere. If any PDF template has a hardcoded address string left over from testing, fix it to pull from Settings.
3. Also check whether the "wrong/unrelated address" might actually be a **different field showing up in the wrong place** — e.g. a supplier's or distributor's address appearing where the clinic's own address should be. This ties into Part F below (module data mixing) — check both possibilities.

## Part D — Lab module PDF missing billing details

When generating a PDF from the Lab module, billing/invoice details aren't appearing. Investigate:
1. Find the Lab module's PDF generation route/template (likely separate from the Pharmacy `InvoicePDF.tsx` — check `src/app/api/pdf/` for a lab-specific route, or confirm if Lab currently reuses a generic template incorrectly).
2. Confirm the Lab PDF actually queries and includes the relevant `Invoice`/`Payment` data for that lab order — it may be querying the wrong relation, or the template may simply be missing the billing section entirely.
3. Fix so the Lab PDF includes test name(s), price, payment status, and total — matching how Pharmacy's invoice PDF already includes billing info.

## Part E — Confirm Pharmacy module PDF billing (verify, likely already correct)

Client says Pharmacy billing already works but wants it double-checked. Generate a real pharmacy sale PDF and confirm billing details (prices, discounts, tax, net amount, payment status) are present and correct. If it's already fine, no changes needed — just confirm and report.

## Part F — Separate, correctly-scoped PDFs per module (no data mixing)

Audit every PDF generation route in the app (Pharmacy invoice, Lab report, OPD/Billing invoice, and any others) and confirm:
1. Each module's PDF pulls data **only from its own relevant records** — a Lab PDF should never show pharmacy sale data, a Pharmacy invoice should never show lab test data, etc.
2. Each module's PDF pulls the **clinic header info (name/address/contact) from the same single source** — `Settings` — so fixing Part C fixes it consistently everywhere, not just in one template.
3. List out every PDF route/template found during this audit, and confirm each one individually against a real generated PDF before reporting this task complete.

---

## Build & verify (per AGENT_WORKFLOW.md)
```
npx prisma generate
node scripts/copy-prisma-engine.js
npm run electron:build
```
Launch the real installed `.exe`, and manually verify each of Parts A–F by generating real records and real PDFs in the running app — not just checking the code compiles.
