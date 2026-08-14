# Task: Delete (Patients & Appointments only) + Earnings Dashboard with Time Filters

## Part A — Delete button, scoped narrowly

Do NOT add delete everywhere. Only add it where it's actually safe:

### Add delete to:
- **Patients** (list + detail page)
- **Appointments** (list + detail page)
- Doctors, if there's a similar test-data risk there — otherwise skip.

### Deletion rule for Patients specifically
Before allowing a patient to be deleted, check whether they have any linked records (Appointments, OPD Visits, Sales, Lab Orders, Invoices, Payments).
- **Zero linked records** → allow delete immediately (this covers your "temp1/temp2" test-patient case).
- **Has linked records** → block deletion and show a clear message, e.g. "Cannot delete — this patient has 2 appointments and 1 invoice linked. Remove those first, or contact an admin." Do not cascade-delete linked records automatically — that risks destroying real appointment/sale history by accident.

### Deletion rule for Appointments
Appointments can generally be deleted freely UNLESS an appointment has a linked OPD Visit, Invoice, or Payment already created from it — in that case, block deletion with a similar clear message, since that would orphan financial/clinical records.

### Do NOT add delete to:
- Sales, Purchases, Invoices, Payments, Lab Orders/Results, OPD Visits — these carry financial or clinical history. Leave these alone entirely for now; no Void system needed either unless a real need comes up later. Just don't add delete buttons here.

### UI requirements
- Delete button next to existing Edit/View buttons on Patients and Appointments (list + detail views).
- Confirmation dialog showing key identifying details before deleting (e.g. "Delete patient 'temp1', no linked records — this cannot be undone. Continue?").
- If blocked due to linked records, show the specific reason, not just a generic error.
- Log successful deletions to `AuditLog` (who deleted what, when).

## Part B — Earnings Dashboard with time filters

Add a dashboard section (Dashboard home page, or wherever earnings/revenue is currently shown) with a filter control for:
- **Daily** — earnings for a selected specific day (date picker)
- **Weekly** — earnings for the selected week
- **Monthly** — earnings for the selected month/year
- **Yearly** — earnings for the selected year

Default view: current month.

- Compute totals from completed Sales' `netAmount` (or `totalAmount` — confirm which field is the authoritative total across both retail and distributor sales, since distributor sales now populate `netAmount` per-line but confirm the sale-level total field used for reporting is consistent).
- Get the date-range boundaries right for each filter (start/end of day, week starting Monday or Sunday — confirm local convention, start/end of month, start/end of year) — this is an easy place to get off-by-one errors, so verify against a manual count for at least one real period before trusting it.
- Simple summary number is enough for v1 (e.g. "Rs. 45,000 — August 2026"). Add a small chart only if a charting library is already in the project; don't add a new dependency just for this.

## Testing before rebuild
- Create a throwaway patient with no linked records, delete it, confirm it's gone.
- Attempt to delete a patient who has an appointment linked, confirm it's blocked with a clear message.
- Delete a plain appointment with no linked visit/invoice, confirm it works.
- Attempt to delete an appointment with a linked OPD visit, confirm it's blocked.
- Check the earnings dashboard's Daily/Weekly/Monthly/Yearly totals against a manual sum for at least one real period each, to confirm correctness.

## Build & verify (same pipeline as before, one cycle for both parts)
```
npx prisma generate
node scripts/copy-prisma-engine.js
npm run electron:build
```
Launch the actual installed/unpacked `.exe` directly and manually test both parts by clicking through the real app before sending anything to the client.
