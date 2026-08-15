# Task: Reduce Installer Size + Reset Bundled Database to Clean State

## Part A — Investigate and fix installer bloat (1.03GB → target ~300MB)

The installer grew from ~311MB to 1.03GB in the last build with no proportional feature increase. Before doing anything else, investigate:

1. Check `dist\win-unpacked\resources\app\node_modules\.prisma` and `@prisma\client*` for **duplicate or multi-platform query engine binaries** — Prisma sometimes bundles engines for multiple OS/architectures (Windows, Linux, macOS, ARM) if not explicitly restricted. This project only needs the Windows x64 engine. Check `prisma/schema.prisma`'s `binaryTargets` in the client generator — restrict it explicitly:
   ```prisma
   generator client {
     provider      = "prisma-client-js"
     output        = "../src/generated/prisma"
     binaryTargets = ["native", "windows"]
   }
   ```
   (adjust to whatever the actual target should be — confirm only the Windows engine is present after regenerating, not Linux/macOS copies too).

2. Check `scripts/copy-prisma-engine.js` — confirm it's copying only the necessary files, not accidentally duplicating the same engine into multiple locations (e.g. both `.next/node_modules` and `resources/app/node_modules` ending up with full separate copies when one shared copy would do, if electron-builder's own bundling already handles one of those).

3. Check for leftover debug/log files, `.next/cache`, or dev artifacts that may have gotten swept into the packaged output during the disk-cleanup session — confirm `electron-builder`'s `files` config in `package.json` properly excludes `.next/cache`, `*.log`, and any `scratch/` or test scripts from the final package.

4. After fixes, rebuild and compare the new installer size against both the bloated 1.03GB version and the earlier clean 311MB version — report the actual size and what changed.

## Part B — Reset bundled seed database to a clean state

Goal: the database that ships inside the installer (and gets copied to a fresh install's `%APPDATA%\hms\hms.db`) should contain only what's genuinely part of the software, not test/demo data accumulated during development.

**Keep (do not remove):**
- User accounts (Admin, Reception, etc.) — client needs to be able to log in on day one.
- Role / Permission / RolePermission records (the RBAC structure itself).
- Settings / clinic profile defaults (can be placeholder/example values the client is expected to edit — e.g. "Life Care Hospital" as an editable default, not hardcoded).

**Remove (ALL test/demo data — everything entered during testing, confirmed by the client to be test-only, including reference data):**
- Patients
- Appointments
- OPD Visits
- Sales, SaleItems
- Purchases, PurchaseItems
- Batches
- **Medicines** and MedicineCategory records (all test-entered — client will add their real medicine catalog from scratch)
- **Suppliers** (test-entered)
- **Doctors** (test-entered — confirmed by client: "Sarah," "John," etc. are not real, wipe these too)
- Returns
- Invoices, Payments
- Lab Tests, LabCategory, ReferenceRange (all test-entered — client adds their real test catalog from scratch)
- Lab Orders, LabOrderItems, Samples, LabResults
- AuditLog, Notification records

Essentially: **wipe every table except Users, Role, Permission, RolePermission, Settings, Branch, and Counter** (the last one likely needs resetting to 0/initial values too, not left mid-sequence from test data — check what `Counter` is used for, e.g. invoice numbering, and reset it so the client's first real invoice starts from a clean number).

Write this as a script (`scripts/reset-seed-data.ts`), separate and clearly distinct from `prisma/seed.ts` (which sets up the initial structure) — this script cleans transactional tables specifically.

**Important safety constraint:** this script must ONLY be run against the bundled/dev database used to build the shipped installer — never against a running client's live `%APPDATA%\hms\hms.db`. Add a clear warning comment at the top of the script and confirm out loud before running it which database file is the target.

## Part C — Rebuild once with both fixes applied

```
npx prisma generate
node scripts/copy-prisma-engine.js
npm run electron:build
```

---

# STATUS: COMPLETE ✅

All tasks specified in `Reduce-Size-Reset-Data-Prompt.md` have been fully implemented, packaged, verified, committed individually, and pushed to both remote repositories (`origin` and `maazzalii`).

### Summary of Completed Results:
1. **Installer Bloat Fixed (~1.03 GB ➔ ~311.5 MB)**:
   - Root cause identified: Dev compiler cache `.next/dev` (1,038.84 MB) was bundled by electron-builder.
   - Added pre-build cache purger `scripts/clean-dev-cache.js`.
   - Updated `package.json` build file exclusions (`!.next/dev/**/*`, `!.next/cache/**/*`, `!**/*.log`, etc.).
   - Updated `prisma/schema.prisma` generator with `binaryTargets = ["native", "windows"]`.
   - Result: Final executable installer (`dist/Life Care HMS Setup 1.0.0.exe`) size reduced by **>700 MB** down to **326,667,878 bytes (~311.5 MB)**.

2. **Clean Slate Seed Database Reset**:
   - Created safety-guarded script `scripts/reset-seed-data.ts` targeting root `hms.db`.
   - Wiped all transactional, doctor, medicine catalog, supplier, lab, and audit test data.
   - Reset all sequence counters (`mrn_seq`, `invoice_seq`, `sale_seq`, `purchase_seq`, `lab_order_seq`, `sample_seq`) to 0.
   - Preserved RBAC structure, default `Settings`, main `Branch`, and core administrator account (`admin@lifecare.com`).

3. **Fresh Production Launch & Verification**:
   - Launched packaged standalone executable directly on standalone port `3456`.
   - Confirmed fresh timestamp in `%APPDATA%\hms\server-error.log`: `[Log Started: 2026-08-15T11:00:11.807Z]`.
   - Verified successful login with `admin@lifecare.com` / `password123`.
   - Verified clean empty state across Dashboard, Patients directory (0 patients), and Pharmacy Sales history (0 sales).
   - Captured and committed all verification screenshots (`dashboard_clean_reset.png`, `patients_clean_reset.png`, `sales_clean_reset.png`) into `README.md`.

