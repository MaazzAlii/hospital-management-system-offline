# Task: Fix Lab Test "Always Inactive" Bug and Select Dropdowns Showing Raw IDs

Both root causes have been found by reading the actual code — this is not a hunt, it's two precise, confirmed fixes.

---

## Bug 1 — New lab tests are always created as Inactive, regardless of the toggle

**Root cause confirmed in `src/app/actions/lab-test.ts`, function `createLabTest`:**

The function receives `data.isActive` as a parameter but **never includes it** in the `prisma.labTest.create({ data: {...} })` call — `isActive` is completely missing from the insert. Every new lab test silently falls back to the Prisma schema's default value for `isActive` (very likely `false`), regardless of what the "Active Test" switch shows in the UI at creation time.

**This explains everything reported:**
- "Active Tests: 0" on the Lab Tests list, even though every test's toggle appeared ON when created.
- The New Lab Order "Add a test..." dropdown appearing empty / not showing the newly created test — confirmed in `src/app/(dashboard)/lab/orders/new/form.tsx`, line ~25: `availableTests = tests.filter(t => !selectedTests.find(...) && t.isActive)` — this filters to only `isActive: true` tests. Since every test is actually saved as inactive, **no test — old or new — can ever appear in this dropdown.** This was never a stale-cache or state-sync issue; the dropdown was working correctly, it just had zero eligible tests to show.

**Fix:**
```ts
// in createLabTest, add isActive to the create data:
const test = await prisma.labTest.create({
  data: {
    name: data.name,
    categoryId: data.categoryId || null,
    code: data.code,
    price: data.price,
    sampleType: data.sampleType || null,
    description: data.description || null,
    isActive: data.isActive ?? true,   // <-- add this line
  },
});
```

**Also add an `updateLabTest` check** (if one exists) — confirm it has the same bug (silently dropping `isActive` on update), since the "Edit Test" flow likely has the identical mistake.

**Data repair needed:** existing lab tests already in the database were created with this bug and are stuck as `isActive: false` even if the user intended them active. After deploying the fix, either:
- Provide a one-time script to set `isActive: true` for all existing lab tests (simplest, since they were all created intending to be active), or
- Have the user manually toggle each existing test's status via Edit after the fix ships.
Prefer the script — it's a two-line `prisma.labTest.updateMany({ data: { isActive: true } })` run once against the current database.

---

## Bug 2 — Select dropdowns show the raw database ID instead of the selected label

**Root cause confirmed in `src/components/ui/select.tsx`:**

This project uses **Base UI's** `<Select>` (`@base-ui/react/select`), not Radix. This matters because **Base UI's `<Select.Value>` does not automatically resolve the selected value to its matching item's display text** the way Radix's `SelectValue` does — Base UI requires an explicit render function/children mapping to show a label instead of the raw value. The current `SelectValue` wrapper in `select.tsx` passes through props with no such mapping, so **every `<SelectValue />` usage across the app displays the raw `value` string (e.g. a cuid like `cmsvpblfr000d9oc1ci8hw2u9`) instead of the human-readable label**, once a selection is made.

This is a single shared-component bug affecting every Select in the app that uses `<SelectValue placeholder="..." />` without a custom render — confirmed reproducing in:
- Lab Test form's Category select (`src/app/(dashboard)/lab/tests/new/form.tsx`)
- Lab Order form's Patient select (`src/app/(dashboard)/lab/orders/new/form.tsx`)
- Likely **every other Select in the app** using the same pattern (Medicine category select, Supplier select, Doctor select, etc.) — this needs an app-wide check, not just these two.

**Fix — in `src/components/ui/select.tsx`, `SelectValue`:**

Base UI's `Select.Value` supports a `children` render-prop pattern: `children={(value) => <label logic>}`. Since this shared wrapper is used generically across many different data types (categories, patients, medicines, etc.), the cleanest fix is for **each call site to pass the correct label**, OR make `SelectValue` accept an optional map/lookup. Two approaches, pick based on what's least invasive:

**Option A (safer, per-call-site fix):** At each usage site, don't rely on automatic label resolution — explicitly compute and pass the selected item's name as the displayed content. Example for the Category select:
```tsx
<SelectValue placeholder="Select Category">
  {categories.find(c => c.id === formData.categoryId)?.name}
</SelectValue>
```
Apply this same pattern to every Select usage in the app that currently shows raw IDs — Category selects, Patient selects, Supplier selects, Doctor selects, Medicine selects, etc. Audit all files importing `SelectValue` and check each one.

**Option B (fix once, centrally):** If Base UI's `Select.Root` exposes the matched item's rendered children automatically when `items`/`value` are structured a certain way, investigate whether restructuring how `Select` is used (e.g. passing an `items` prop with `{value, label}` pairs, if the Base UI version in use supports it) resolves this globally without touching every call site. Only pursue this if it's a clean, well-documented Base UI pattern — don't guess at undocumented behavior.

Do a full audit: search the codebase for every `<SelectValue` usage, and verify each one after the fix — this bug is easy to miss in one form and leave broken in another.

---

## Verification (do NOT skip — this is exactly the kind of bug that looked "silently fine" before)

1. Create a new Lab Test with "Active Test" toggle ON — confirm it shows as **Active**, not Inactive, in the Lab Tests list.
2. Confirm the Lab Tests "Active Tests" count reflects reality.
3. Go to New Lab Order — confirm the "Add a test..." dropdown now shows tests, and confirm selecting one keeps that test's **name** displayed in the trigger, not its raw ID.
4. Check the Patient select in New Lab Order — confirm after selecting a patient, the trigger shows the patient's **name**, not their ID.
5. Audit and check every other Select in the app (Medicine Category, Supplier, Doctor, etc.) for the same raw-ID display bug — fix any found.
6. Run the one-time `isActive: true` repair script against the current database so existing lab tests aren't stuck inactive.
7. Full packaging pipeline and real installed `.exe` test, per `AGENT_WORKFLOW.md`.
