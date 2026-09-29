# Task: Fix "This page couldn't load — A server error occurred" on a Fresh Install (Test PC)

Client-facing symptom: the installer runs fine on the dev machine, but on a second/fresh test PC the app window shows a generic **"This page couldn't load. A server error occurred. Reload to try again."** with a numeric `ERROR <digits>` at the bottom (a Next.js digest ID, not a Chromium network error).

This is NOT the same failure mode as the packaged-server-crash screen `electron/main.js` already handles (`renderCrashPage`, the dark "Next.js Server Process Crashed" screen with logs). That screen only fires when the Next.js child process exits **before ever serving a page successfully**. What's shown in the screenshot is Next.js's own generic production error fallback for an **uncaught exception thrown while handling a request after the server was already up and running** — meaning the server started fine, but something it queried/rendered threw.

Two confirmed, related root causes — read both before changing anything.

---

## STEP 0 — Confirm before fixing: read the real error on the test PC

Next.js deliberately hides the real stack trace from the browser in production (that's why the screen only shows a bare digest number). The real error **is already being logged** — `electron/main.js`'s `startNextServer` pipes all stdout/stderr into `path.join(userDataPath, 'server-error.log')`.

On the test PC, open:
```
%APPDATA%\Life Care HMS\server-error.log
```
(`userDataPath` = Electron's per-app AppData folder — the exact path is also printed in the console log lines this file already writes, e.g. `[Electron] appPath: ...`.)

Find the last exception near the timestamp when the blank/error screen appeared. It will most likely be a Prisma error like `no such table: Batch` / `no such column: ...` / `SqliteError: ...`. **Paste that exact error before proceeding** — the fix below is the most likely and best-evidenced cause given the code, but confirm it matches rather than assuming.

---

## Root cause confirmed in `electron/main.js`, function `ensureDatabaseExists`

```js
if (!fs.existsSync(dbPath)) {
  // FIRST LAUNCH ON THIS MACHINE — dbPath doesn't exist yet
  const seedDbPath = path.join(app.getAppPath(), 'hms.db');
  if (fs.existsSync(seedDbPath)) {
    fs.copyFileSync(seedDbPath, dbPath);   // <-- just copies the bundled hms.db as-is
  } else {
    execSync('npx prisma db push', ...);
  }
} else {
  // ONLY runs on subsequent launches, once dbPath already existed:
  // CREATE TABLE IF NOT EXISTS "Batch" (...)
  // CREATE TABLE IF NOT EXISTS "StockMovement" (...)
  // addColumnIfMissing('LabTest', 'isActive', ...)
  // addColumnIfMissing('SaleItem', 'batchId', ...)
  // ...about 20 more schema-repair statements...
}
```

And in `package.json`, the electron-builder config bundles a **static, point-in-time snapshot** of the database into every installer:

```json
"files": [
  ...
  "hms.db",
  ...
]
```

Put together: on a brand-new machine, the app copies that bundled `hms.db` (whatever schema state it happened to be in when it was last copied into the repo) straight into the user's AppData folder as the live database — and the entire schema-repair block (the `Batch`/`StockMovement` table creation, the ~20 `addColumnIfMissing` calls for `LabTest.isActive`, `Sale.accountCode`, `SaleItem.batchId`, `PurchaseItem.batchNo`, `Settings.clinicName`, etc.) is inside the `else` branch, so **it never runs on that first launch**. If the bundled `hms.db` predates any of those tables/columns — which is likely, since this file is a manually-committed snapshot, not something regenerated on every build — the first real query against a missing table or column throws, and that's the uncaught exception landing as this generic error page.

This explains exactly the reported pattern: works on the dev machine (its `hms.db` already exists locally and has been through the `else` branch/repairs across many prior runs), fails on a fresh test PC (first launch always takes the copy-only branch).

---

## Fix

### 1. Make the schema-repair pass run unconditionally, every launch — not just when the db already existed

Restructure `ensureDatabaseExists()` in `electron/main.js` so the "ensure tables/columns exist" logic is a separate step that always executes after the database file is guaranteed to exist, regardless of which path created it:

```js
function ensureDatabaseExists() {
  try {
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    if (!fs.existsSync(dbPath)) {
      console.log('[Electron] Initializing database at:', dbPath);
      const seedDbPath = path.join(app.getAppPath(), 'hms.db');
      if (fs.existsSync(seedDbPath)) {
        fs.copyFileSync(seedDbPath, dbPath);
        console.log('[Electron] Copied seed database to user data directory.');
      } else {
        console.log('[Electron] No pre-existing database found. Running prisma db push...');
        execSync('npx prisma db push', {
          cwd: app.getAppPath(),
          env: { ...process.env, DATABASE_URL: databaseUrl },
          stdio: 'inherit',
        });
      }
    }

    // Run on EVERY launch, whether the db just got created above or already existed.
    // All statements are idempotent (IF NOT EXISTS / column-presence checks), so this is safe to repeat.
    runSchemaRepairs();
  } catch (err) {
    console.error('[Electron] Database initialization error:', err);
    const msg = `[Database Init Error] ${err.stack || err}\n`;
    appendCapturedLog(msg);
    try { fs.appendFileSync(path.join(userDataPath, 'server-error.log'), msg); } catch (e) {}
  }
}

function runSchemaRepairs() {
  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath);

    // ...move the entire existing body of the current `else` branch in here, unchanged:
    // CREATE TABLE IF NOT EXISTS "Batch" (...), CREATE TABLE IF NOT EXISTS "StockMovement" (...),
    // addColumnIfMissing(...) calls for LabTest / Sale / SaleItem / PurchaseItem / Settings,
    // the reorderLevel=100 -> 4 fix, db.close(), and the try/catch around it.

  } catch (migrateErr) {
    console.warn('[Electron] DB schema migration check warning:', migrateErr);
  }
}
```

Do not change the SQL statements themselves — they're already written defensively (`CREATE TABLE IF NOT EXISTS`, `addColumnIfMissing` checks `PRAGMA table_info` before altering). The only change is **when** this block runs: always, not conditionally.

### 2. Regenerate the bundled `hms.db` seed before the next build

Even with fix #1, don't ship a stale seed if avoidable. Before running `npm run electron:build` for this release:
- Confirm the `hms.db` at the project root (the one `package.json`'s `files` array bundles) was produced by the **current** `prisma/schema.prisma` — e.g. delete it and regenerate via `npx prisma db push` against a fresh empty file, or copy over a known-current dev database — so a fresh install is as close to correct as possible even before fix #1's repair pass runs.
- Longer-term (flag to the client/yourself as a follow-up, not required for this fix): this project only has one committed Prisma migration (`prisma/migrations/20260802085518_init`) despite the schema having grown substantially since (Batch, StockMovement, and ~15 columns added by hand in `electron/main.js` instead of via `prisma migrate`). Every future schema change currently requires remembering to hand-add another `addColumnIfMissing` line here — that's exactly how this bug happened. Moving to real `prisma migrate dev` migrations, run via `prisma migrate deploy` on launch instead of ad-hoc `ALTER TABLE`s, would remove this whole class of bug going forward. Don't attempt this migration-system change in this task — it's a bigger, separate piece of work — just note it.

### 3. Add error boundaries so any future uncaught exception is diagnosable in-app, not a dead end

Confirmed: this project has **no `error.tsx` or `global-error.tsx` anywhere** in `src/app`. That's why any server-side exception — this one or a future one — surfaces as Next.js's bare, unbranded "This page couldn't load" screen with nothing but a digest number, instead of something a non-technical clinic user can act on or that captures diagnostics.

Add `src/app/global-error.tsx`:

```tsx
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 32, background: "#0f172a", color: "#f8fafc" }}>
        <h1 style={{ color: "#f87171" }}>Something went wrong</h1>
        <p>An unexpected error occurred. Please try reloading. If this keeps happening, contact support with the reference below.</p>
        {error.digest && (
          <p style={{ fontFamily: "monospace", color: "#94a3b8" }}>Reference: {error.digest}</p>
        )}
        <button
          onClick={() => reset()}
          style={{ marginTop: 16, padding: "8px 16px", borderRadius: 8, background: "#3b82f6", color: "white", border: "none", cursor: "pointer" }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
```

Also add `src/app/(dashboard)/error.tsx` (same pattern, without the `<html>/<body>` wrapper since it's nested inside the existing dashboard layout) so an error inside any dashboard route — Medicines Master, Sales, Purchases, etc. — shows this friendly boundary with a "Try Again" button instead of the bare Next.js fallback, while still letting the digest be reported back to you for debugging.

This does not fix the underlying error by itself — it makes whatever *does* go wrong (this bug, or any future one) show something actionable in front of the client instead of a dead "reload to try again" screen with no path forward.

---

## Data safety

Fix #1 only changes *when* already-idempotent, already-reviewed SQL runs — no SQL statement content changes, so no risk to existing data on machines where the bug hasn't triggered. Fix #3 is purely additive UI (new files only). Regenerating the bundled seed `hms.db` (#2) only affects *new* installs on machines that have never run the app before — it does not touch any already-deployed clinic database.

---

## Verification (do NOT skip)

1. On a clean Windows VM or the same test PC (uninstall the app and delete `%APPDATA%\Life Care HMS` first to truly simulate a fresh install — reinstalling over a half-broken existing AppData folder will not reproduce this).
2. Install the newly built `.exe`, launch it, and confirm the app loads straight into the login/dashboard — no error screen.
3. Check `%APPDATA%\Life Care HMS\server-error.log` — confirm it logs `[Electron Migration] Added column ...` lines (or no "missing" warnings) instead of a Prisma/SQLite exception.
4. Click through Medicines Master (pagination), Edit Medicine (batch/expiry editing), New Sale, New Purchase, Lab Tests, Settings — the screens whose columns/tables this repair pass covers — confirm none of them error.
5. To verify the error boundary independently, temporarily introduce a deliberate throw in one server component in a dev branch (never in the shipped code), confirm the friendly `error.tsx`/`global-error.tsx` screen appears with a digest instead of the bare Next.js fallback, then revert that test change.
6. Full packaging pipeline and real installed `.exe` test on the test PC specifically (not just the dev machine), per `AGENT_WORKFLOW.md` — this bug is machine-state-dependent and will not reproduce on the dev machine where `hms.db` already exists and has been through prior repair runs.
