# Task: Fix Medicines Master Disappearing at Scale (Issue 1 of client report)

Client-reported symptom: after adding 1000+ medicines, the Medicines Master page shows "No medicines registered yet" and Total Medicines = 0, but searching for a specific medicine still finds it. The list must never disappear no matter how many thousands of medicines exist, the count must always be accurate, and no existing data may be touched.

Root cause has been found by reading the actual code — this is not a hunt, it's a confirmed structural bug plus a bug-hiding catch block.

---

## Root cause confirmed in `src/app/actions/medicine.ts`, function `getMedicines`

Two compounding problems:

**1. It fetches every medicine, unpaginated, with two unbounded nested relations:**

```ts
const rawMedicines = await prisma.medicine.findMany({
  where: whereClause,
  include: {
    category: { select: { id: true, name: true } },
    stockMovements: { select: { quantity: true } },   // ALL movements, ever, for EVERY medicine
    batches: { where: { quantityRemaining: { gt: 0 } }, orderBy: { expiryDate: "asc" } },
  },
  orderBy: { name: "asc" },
});
```

On SQLite (via `better-sqlite3`, see `src/lib/prisma.ts`), Prisma resolves a to-many `include` like `stockMovements` and `batches` as a **separate query per relation** shaped like `SELECT * FROM StockMovement WHERE medicineId IN (?, ?, ?, ...)` — with **one bound parameter per medicine row** in the current result set. As the medicine catalog grows into the hundreds/low thousands, that `IN (...)` list grows past the SQLite driver's compiled host-parameter limit and the query throws.

**2. That throw is silently swallowed:**

```ts
} catch (error: unknown) {
  console.error("Failed to get medicines:", error);
  return [];               // <-- this is exactly "No medicines registered yet" + count 0
}
```

This explains every symptom reported:
- Total count shows 0 — the whole function returned `[]`, not a filtered/partial list.
- The list is empty even though data is safe in the database (confirmed: nothing here deletes or mutates data, it only fails to read it back).
- Searching works — a filtered `whereClause` returns far fewer rows, so the `IN (...)` list for the matched subset stays small enough to succeed.
- It gets worse as more medicines are added — the `IN (...)` list is exactly as long as the medicine count, so this is a hard ceiling that scales with data, not a one-time fluke.

There is no explicit `take: 1000` or similar hard cap anywhere in this function — the "around 1000" ceiling the client observed is the SQLite parameter-count wall, not a coded limit, so raising a number somewhere will NOT fix this. The list, pagination, filtering, and count logic all need to be restructured so no query's parameter count ever scales with total medicine count.

There is a second, independent problem in the same function worth fixing at the same time: computing `currentStock` by loading **every StockMovement row ever created, for every medicine** into memory and summing in JavaScript (`m.stockMovements.reduce(...)`) is unbounded in a different direction — it grows forever with sales/purchase history, independent of medicine count, and will degrade performance long before it errors. This must move to a database-side aggregate.

---

## Fix

### 1. Rewrite `getMedicines` to be paginated and to aggregate stock in SQL, never in JS

Replace the function in `src/app/actions/medicine.ts`:

```ts
export async function getMedicines(query?: string, page: number = 1, pageSize: number = 50) {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'read')) {
      throw new Error('Unauthorized to view medicines');
    }

    const whereClause: any = {};
    if (query) {
      whereClause.OR = [
        { name: { contains: query } },
        { manufacturer: { contains: query } },
        { category: { name: { contains: query } } },
      ];
    }

    // Total count for the summary card + pagination — a single COUNT(*), never scales badly.
    const totalCount = await prisma.medicine.count({ where: whereClause });

    // Only fetch ONE PAGE of medicines. skip/take keeps this query's cost flat forever.
    const pageMedicines = await prisma.medicine.findMany({
      where: whereClause,
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const medicineIds = pageMedicines.map((m) => m.id);

    // Aggregate stock in SQL, scoped ONLY to this page's medicine IDs (max = pageSize, e.g. 50).
    // This IN(...) list can never grow past pageSize, no matter how large the catalog gets.
    const stockAggregates = medicineIds.length
      ? await prisma.stockMovement.groupBy({
          by: ['medicineId'],
          where: { medicineId: { in: medicineIds } },
          _sum: { quantity: true },
        })
      : [];
    const stockByMedicine = new Map(stockAggregates.map((s) => [s.medicineId, s._sum.quantity ?? 0]));

    // Batches, also scoped only to this page.
    const batches = medicineIds.length
      ? await prisma.batch.findMany({
          where: { medicineId: { in: medicineIds }, quantityRemaining: { gt: 0 } },
          orderBy: { expiryDate: "asc" },
        })
      : [];
    const batchesByMedicine = new Map<string, typeof batches>();
    for (const b of batches) {
      if (!batchesByMedicine.has(b.medicineId)) batchesByMedicine.set(b.medicineId, []);
      batchesByMedicine.get(b.medicineId)!.push(b);
    }

    const now = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const medicines = pageMedicines.map((m) => {
      const currentStock = stockByMedicine.get(m.id) ?? 0;
      const medBatches = (batchesByMedicine.get(m.id) ?? []).map((b) => {
        const expDate = new Date(b.expiryDate);
        let expiryStatus: 'expired' | 'expiring_soon' | 'valid' = 'valid';
        if (expDate < now) expiryStatus = 'expired';
        else if (expDate <= ninetyDaysFromNow) expiryStatus = 'expiring_soon';
        return {
          id: b.id,
          batchNo: b.batchNo,
          expiryDate: b.expiryDate,
          quantityReceived: b.quantityReceived,
          quantityRemaining: b.quantityRemaining,
          expiryStatus,
          isExpired: expiryStatus === 'expired',
        };
      });

      return {
        id: m.id,
        name: m.name,
        category: m.category,
        manufacturer: m.manufacturer,
        inPrice: m.unitPrice,
        outPrice: m.sellingPrice,
        unit: m.unit || "Unit",
        currentStock,
        reorderLevel: m.reorderLevel,
        isLowStock: currentStock <= m.reorderLevel,
        isActive: true,
        batches: medBatches,
      };
    });

    return { medicines, totalCount, page, pageSize, totalPages: Math.max(1, Math.ceil(totalCount / pageSize)) };
  } catch (error: unknown) {
    // Do NOT return a silently-empty success shape. Surface the failure so it's visible,
    // not indistinguishable from "zero medicines exist".
    console.error("Failed to get medicines:", error);
    return { medicines: [], totalCount: 0, page: 1, pageSize, totalPages: 1, error: getErrorMessage(error, "Failed to load medicines") };
  }
}
```

Also add a lightweight dedicated count for the "Low Stock Alerts" summary card, since that currently comes from `medicines.filter(...)` on whatever page happens to be loaded, which would only reflect the current page once pagination is added — it needs to be computed globally instead:

```ts
export async function getLowStockCount() {
  try {
    const { role } = await getCurrentUserRole();
    if (!hasAccess(role, 'pharmacy', 'read')) return 0;

    // Sum stock per medicine in SQL, compare to each medicine's own reorderLevel, count matches.
    const medicines = await prisma.medicine.findMany({ select: { id: true, reorderLevel: true } });
    if (medicines.length === 0) return 0;

    const aggregates = await prisma.stockMovement.groupBy({
      by: ['medicineId'],
      _sum: { quantity: true },
    });
    const stockByMedicine = new Map(aggregates.map((s) => [s.medicineId, s._sum.quantity ?? 0]));

    return medicines.filter((m) => (stockByMedicine.get(m.id) ?? 0) <= m.reorderLevel).length;
  } catch (error) {
    console.error("Failed to compute low stock count:", error);
    return 0;
  }
}
```

Note: `prisma.medicine.findMany({ select: { id, reorderLevel } })` and `prisma.stockMovement.groupBy` here select only 2 scalar columns / one grouped aggregate — these are single flat queries with no per-row `IN (...)` parameter list, so they scale fine into the tens of thousands of medicines. If the clinic's medicine count ever grows enormous enough that even this becomes slow (not expected at clinic scale), this can later move to one raw SQL query; not needed now.

### 2. Update the Medicines Master page to use real pagination

In `src/app/(dashboard)/pharmacy/medicines/page.tsx`:

- Read a `page` param from `searchParams` (default `1`), alongside the existing `q`.
- Call `const { medicines, totalCount, totalPages } = await getMedicines(query, page, 50);` and `const lowStockCount = await getLowStockCount();` (run both with `Promise.all`).
- Use `totalCount` for the "Total Medicines" card and `lowStockCount` for the "Low Stock Alerts" card — never derive either from `medicines.length` again, since that's now just one page's worth.
- Add Prev/Next (or numbered) pagination controls below the table, linking to `/pharmacy/medicines?q=...&page=N`, disabled appropriately at the first/last page. Reset to `page=1` whenever the search box is submitted (the existing GET form already does this naturally since it won't include a stale `page` param — just confirm the search form doesn't carry over the old page number).
- If `getMedicines` returns an `error` field, show a distinct "Couldn't load medicines — see server logs" message instead of the current "No medicines registered yet" empty-state, so a real failure is never confused with "there are zero medicines."

### 3. Grep the rest of the codebase for anything else that could reintroduce a hidden cap

Before calling this done, search the whole repo for `take:`, `.slice(0, 1000)`, `LIMIT`, and `999` to confirm nothing else — a script, a raw SQL query, a different code path — imposes any hard ceiling on medicine records. None were found in the files reviewed for this prompt, but a full-repo grep is required since this codebase has several `scripts/*.ts` utilities that touch the medicine tables directly.

---

## Data safety

This is a read-path fix only — `getMedicines`, `getLowStockCount`, and the page component. No migration, no schema change, no write/delete logic is touched. Existing medicines, batches, and stock movements are completely untouched by this change; the bug was in *reading them back*, not in storing them.

---

## Verification (do NOT skip)

1. Check current medicine count in the database (a `scripts/check-db.js`-style query, or just open the Medicines Master page before the fix and note the discrepancy between "search finds it" and "list shows 0").
2. Seed or otherwise create **at least 3,000–5,000** test medicines (write a one-off script similar to `scripts/seed-categories.js` / `scripts/reset-seed-data.ts` if no existing seeder covers this scale) to reproduce and then confirm the fix at a scale well past where the bug used to trigger.
3. Confirm the Medicines Master page loads without error at that scale, shows the **correct total count**, and the table renders a page of results.
4. Click through pagination — confirm each page loads distinct medicines and the count stays consistent.
5. Search for a medicine by name, by manufacturer, and by category — confirm results are correct and the page number resets sensibly.
6. Confirm "Low Stock Alerts" reflects the true count across the whole catalog, not just the current page.
7. Confirm editing a medicine and returning to the list still works, and the medicine's batches/stock still display correctly.
8. Delete the seeded test medicines afterward if they were only for verification, or clearly flag them as test data so they aren't mistaken for real clinic inventory.
9. Full packaging pipeline and real installed `.exe` test at this data scale, per `AGENT_WORKFLOW.md` — this bug will not reproduce in a small dev dataset, so verification must happen with the large seeded dataset in the actual packaged app, not just `next dev`.
