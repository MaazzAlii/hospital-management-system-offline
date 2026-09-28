# Task: Make Batch Number & Expiry Date Editable on an Existing Medicine (Issue 2 of client report)

Client-reported symptom: when editing an existing medicine, Batch Number and Expiry Date cannot be edited/updated. Root cause has been found by reading the actual code — this isn't a hidden/disabled field, the fields do not exist anywhere in the edit flow.

---

## Root cause confirmed

**Batch Number and Expiry Date are not stored on `Medicine` at all.** Per `prisma/schema.prisma`, they live on the `Batch` model (and are duplicated at creation time onto `PurchaseItem`):

```prisma
model Batch {
  id                String        @id @default(cuid())
  medicineId        String
  medicine          Medicine      @relation(fields: [medicineId], references: [id], onDelete: Cascade)
  purchaseItemId    String?
  purchaseItem      PurchaseItem? @relation(fields: [purchaseItemId], references: [id], onDelete: SetNull)
  batchNo           String
  expiryDate        DateTime
  quantityReceived  Int
  quantityRemaining Int
  ...
}
```

**Batch Number and Expiry Date are only ever written once, at medicine creation time**, in `createMedicine` (`src/app/actions/medicine.ts`) when an optional "Initial Stock & Batch" section is filled in on the Add Medicine form (`src/app/(dashboard)/pharmacy/medicines/new/form.tsx`, has `batchNo`/`expiryDate` state and inputs — this part works).

**The Edit Medicine form has no equivalent fields at all.** `src/app/(dashboard)/pharmacy/medicines/[id]/edit/form.tsx` only has state and inputs for `name`, `categoryId`, `manufacturer`, `inPrice`, `outPrice`, `unit`, `reorderLevel`. There is no batch/expiry UI here — nothing to click, nothing hidden or disabled, the fields simply were never built for the edit screen.

And even if they existed in the UI, they'd have nowhere to go: `updateMedicine` in `src/app/actions/medicine.ts` only accepts and writes `name`, `categoryId`, `manufacturer`, `inPrice`, `outPrice`, `unit`, `reorderLevel` — no batch/expiry parameter exists in its type signature or its `prisma.medicine.update({ data: {...} })` call.

So this needs a real (small) feature addition, not a one-line fix: a medicine can have **multiple batches** (each with its own batch number, expiry date, and remaining quantity) — the fix must let staff edit an existing batch's Batch Number and Expiry Date from the Edit Medicine screen, not add a single batch/expiry field to the `Medicine` model itself (that would be schema-incorrect and would break multi-batch stock tracking, expiry alerts, and the expiry report that already exist in this app).

---

## Fix

### 1. Add a server action to fetch a medicine's batches, and one to update a batch

In `src/app/actions/medicine.ts`:

```ts
export async function getMedicineBatches(medicineId: string) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'read')) return [];

    return await prisma.batch.findMany({
      where: { medicineId },
      orderBy: { expiryDate: "asc" },
    });
  } catch (error) {
    console.error("Failed to fetch batches:", error);
    return [];
  }
}

export async function updateBatch(id: string, data: { batchNo: string; expiryDate: string }) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'write')) {
      throw new Error("Unauthorized to update batch");
    }

    const batchNo = data.batchNo?.trim();
    if (!batchNo) throw new Error("Batch number is required");

    const expiryDate = new Date(data.expiryDate);
    if (isNaN(expiryDate.getTime())) throw new Error("Invalid expiry date");

    const existing = await prisma.batch.findUnique({ where: { id } });
    if (!existing) throw new Error("Batch not found");

    const updated = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.update({
        where: { id },
        data: { batchNo, expiryDate },
      });

      // Keep the linked purchase-invoice record in sync, so the purchase history / printed
      // purchase invoice doesn't show a stale batch number or expiry date after this edit.
      if (existing.purchaseItemId) {
        await tx.purchaseItem.update({
          where: { id: existing.purchaseItemId },
          data: { batchNo, expiryDate },
        });
      }

      return batch;
    });

    revalidatePath("/pharmacy/medicines");
    revalidatePath(`/pharmacy/medicines/${updated.medicineId}/edit`);
    revalidatePath("/pharmacy/expiry-report");
    return { success: true, batch: updated };
  } catch (error: unknown) {
    console.error("Failed to update batch:", error);
    return { success: false, error: getErrorMessage(error, "Failed to update batch") };
  }
}
```

Note: `quantityRemaining` / `quantityReceived` are deliberately **not** editable from this screen — those are driven by actual stock movements (purchases, sales, returns) and hand-editing them here would desync stock history and future reports. If the client later asks for stock-quantity correction, that should be its own explicit "Stock Adjustment" feature with its own `StockMovement` audit row, not a silent field edit — flag this to the client rather than quietly allowing it.

### 2. Load batches alongside the medicine on the edit page

In `src/app/(dashboard)/pharmacy/medicines/[id]/edit/page.tsx`:

```ts
import { notFound } from "next/navigation";
import { getMedicineById, getMedicineCategories, getMedicineBatches } from "@/app/actions/medicine";
import EditMedicineForm from "./form";

export const dynamic = "force-dynamic";

export default async function EditMedicinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [medicine, categories, batches] = await Promise.all([
    getMedicineById(id),
    getMedicineCategories(),
    getMedicineBatches(id),
  ]);

  if (!medicine) {
    notFound();
  }

  return <EditMedicineForm medicine={medicine} categories={categories} batches={batches} />;
}
```

### 3. Add a Batches section to the Edit Medicine form

In `src/app/(dashboard)/pharmacy/medicines/[id]/edit/form.tsx`:

- Accept a new `batches: BatchRow[]` prop (id, batchNo, expiryDate, quantityRemaining).
- Add a `BatchRow` type and a small per-batch editable row component: text input for Batch Number, date input for Expiry Date (format as `yyyy-MM-dd` for the `<input type="date">`), a read-only "Qty Remaining" display, and its own "Save" button that calls `updateBatch(batch.id, { batchNo, expiryDate })` and shows a per-row success/error state (don't block the rest of the form on one batch's save).
- Render this as its own card, e.g. right after the existing "Pricing & Inventory" card:

```tsx
<div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
  <h2 className="text-sm font-semibold text-foreground">Batches</h2>
  {batches.length === 0 ? (
    <p className="text-sm text-muted-foreground">No stock batches recorded for this medicine yet.</p>
  ) : (
    <div className="space-y-3">
      {batches.map((b) => (
        <BatchEditRow key={b.id} batch={b} />
      ))}
    </div>
  )}
</div>
```

Where `BatchEditRow` holds its own local state for `batchNo`/`expiryDate`, calls `updateBatch` on save, disables the button while saving, and shows an inline error if the save fails — mirroring the existing category-add pattern already in this file (`handleAddCategory`/`isAddingCat`) for consistency of style.

- If a medicine can have many batches, keep the section scrollable (e.g. `max-h-80 overflow-y-auto`) rather than letting the page grow unbounded — this doesn't need pagination at medicine-edit scale (a handful to a few dozen batches per medicine, not thousands), but it should stay usable if a medicine has an unusually long batch history.

### 4. Do NOT touch `updateMedicine`'s own field set

`name`, `categoryId`, `manufacturer`, `inPrice`, `outPrice`, `unit`, `reorderLevel` stay exactly as they are today — this fix only adds the new `updateBatch` action and its UI, it does not change what `updateMedicine` accepts or does.

---

## Data safety

This is additive: a new server action, a new page-load fetch, a new form section. No schema migration is required (`Batch` already exists exactly as needed). No existing `Medicine`, `Batch`, `PurchaseItem`, or `StockMovement` rows are deleted or altered by shipping this — they're only altered when a user explicitly edits and saves a specific batch afterward.

---

## Verification (do NOT skip)

1. Open an existing medicine that already has one or more batches (created via the "Initial Stock & Batch" section on Add Medicine, or via a Purchase) — confirm its batches now appear on the Edit Medicine page with their real Batch Number, Expiry Date, and Qty Remaining.
2. Change the Batch Number and Expiry Date on one batch, save, and confirm:
   - The new values persist after a page reload.
   - The Medicines Master list and the Expiry Report (`/pharmacy/expiry-report`) reflect the updated expiry date (e.g. expiry-status badges recompute correctly).
   - The linked Purchase's printed/PDF invoice (if this batch came from a purchase) shows the updated batch number/expiry, not the stale original — confirm the `purchaseItem` sync in `updateBatch` actually took effect.
3. Confirm `quantityReceived`/`quantityRemaining` are read-only in this UI and cannot be edited from here.
4. Try saving an empty Batch Number and an invalid/empty Expiry Date — confirm validation blocks the save with a clear inline error, and no bad data reaches the database.
5. Confirm a medicine with zero batches shows the "No stock batches recorded" state without erroring.
6. Confirm a medicine with several batches (e.g. from repeated purchases) lists all of them, each independently editable/savable.
7. Full packaging pipeline and real installed `.exe` test, per `AGENT_WORKFLOW.md`.
