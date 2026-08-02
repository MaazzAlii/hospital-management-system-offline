# Packaging HMS as a Double-Click-to-Install Desktop App

**Confirm Phase 2 (offline conversion) and Phase 3 (new features) are fully complete and verified before starting this phase.** You cannot package what doesn't already work correctly as a plain `npm run dev`/`npm run build` app.

Electron already bundles its own copy of Node.js and Chromium inside the app — the end user never installs Node.js separately. Because this app uses Next.js Server Actions and dynamic API routes, the approach is: Electron launches a real Next.js server process in the background, then opens a window pointed at it.

---

## Step 1: Add Electron and write the main process

### Problem
There is no desktop shell around this app yet — it only runs as a web app via `next dev`/`next start`.

### Analysis
The main process needs to spawn `next start` as a child process and open a window pointed at it, rather than trying to load static files — this app is not statically exportable due to Server Actions and API routes.

### Implementation
```bash
npm install --save-dev electron electron-builder @electron/rebuild
```
Create `electron/main.js`:
```js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let serverProcess;

function startNextServer() {
  const appPath = app.getAppPath();
  serverProcess = spawn(process.execPath, [path.join(appPath, 'node_modules/next/dist/bin/next'), 'start', '-p', '3456'], {
    cwd: appPath,
    env: { ...process.env, NODE_ENV: 'production' },
  });
}

function createWindow() {
  const win = new BrowserWindow({ width: 1280, height: 800, icon: path.join(__dirname, 'icon.png') });
  setTimeout(() => win.loadURL('http://localhost:3456'), 1500);
}

app.whenReady().then(() => { startNextServer(); createWindow(); });
app.on('window-all-closed', () => { if (serverProcess) serverProcess.kill(); if (process.platform !== 'darwin') app.quit(); });
```

### Validation
`npx electron .` opens a window showing the login page, with the Next.js server running as a visible child process.

### 🤖 Antigravity Execution Prompt

```
Read 0-HMS-Execution-Sequence.md and follow the AI Execution Rules. Confirm
Phase 2 and Phase 3 are fully complete and verified before starting this.

TASK:
Install electron, electron-builder, and @electron/rebuild as devDependencies.

Create electron/main.js that spawns `next start -p 3456` as a child process
using the app's own bundled Node executable (process.execPath), and opens a
BrowserWindow pointed at http://localhost:3456. Replace the fixed 1.5-second
setTimeout with actual polling of the port (retry every 250ms up to a
reasonable timeout, e.g. 15 seconds) before loading the URL, so slower
machines don't get a blank window.

Kill the spawned server process when all windows close.

Run `npx electron .` from the project root and confirm a window opens showing
the login page, with the Next.js server visible as a running child process.

Show me the diff (new electron/main.js, package.json devDependencies).

Wait for my confirmation before continuing to Step 2.
```

### Definition of Done
- ✔ `npx electron .` opens a working window showing the login page
- ✔ Server process starts and is properly polled before window loads
- ✔ Server process terminates cleanly on window close
- ✔ Git diff reviewed
- ✔ Waited for confirmation

### Files Expected to Change
- `electron/main.js` (new)
- `package.json`

### Rollback
Backup commit before starting. If the window never loads or the server process doesn't terminate cleanly: `git reset --hard`, report the exact failure, do not proceed to Step 2.

---

## Step 2: Point the SQLite database at a writable, persistent location

### Problem
The database currently lives at a relative dev path (`file:./hms.db`), which won't be writable or persistent once packaged (app install directories are often read-only, and get replaced on updates).

### Analysis
Use Electron's per-user app-data directory (`app.getPath('userData')`), set as an environment variable before the Next.js server process starts, so Prisma picks up the correct path at runtime.

### Implementation
```js
const { app } = require('electron');
const path = require('path');
process.env.DATABASE_URL = `file:${path.join(app.getPath('userData'), 'hms.db')}`;
```
Set this before spawning the Next.js server process, passing it through as an env var to the child process (not just the main process's own `process.env` — must be explicitly included in the `env` object passed to `spawn()`).

### Validation
- Build and run the packaged app once, create a patient, close the app, reopen it — the patient record persists.
- Confirm the `.db` file exists at the OS's actual per-user app-data path (not inside the app's install folder).

### 🤖 Antigravity Execution Prompt

```
Read 0-HMS-Execution-Sequence.md and follow the AI Execution Rules. Confirm
Step 1 of this phase is complete before starting.

TASK:
In electron/main.js, before spawning the Next.js server process, compute the
database path as path.join(app.getPath('userData'), 'hms.db') and set
DATABASE_URL to file:<that path>. Pass this explicitly in the env object given
to spawn() for the child process - do not rely on inheriting process.env
alone, be explicit.

Add a first-run check: if the database file does not exist yet at that path,
copy a pre-built empty database (with Prisma migrations already applied) from
the app's bundled resources into that location before starting the server.
If you don't have a pre-built db to copy, instead run Prisma's migration
programmatically against the new path on first launch before the server
finishes booting.

Test this: run the app, create a patient, fully close the app, reopen it, and
confirm the patient record is still there. Then locate the actual .db file on
disk and confirm it's in the OS user-data directory, not inside the project
or install folder.

Show me the diff.

Wait for my confirmation before continuing to Step 3.
```

### Definition of Done
- ✔ `DATABASE_URL` correctly points at `userData` path, not a relative dev path
- ✔ First-run creates/migrates the database automatically with no manual steps
- ✔ Data persists across full app close/reopen
- ✔ `.db` file confirmed in the correct OS-level location
- ✔ Git diff reviewed
- ✔ Waited for confirmation

### Files Expected to Change
- `electron/main.js`

### Rollback
Backup commit before starting. If data doesn't persist or the first-run migration fails: `git reset --hard`, report the exact failure, do not proceed to Step 3.

---

## Step 3: Rebuild native modules for Electron's Node version

### Problem
Prisma's native query engine (and `better-sqlite3` if used) is compiled against a specific Node ABI, which usually doesn't match Electron's bundled Node build.

### Analysis
This is the most common cause of "works in dev, crashes when packaged" for this exact kind of app — skipping this step produces confusing native-module errors only at packaged-app runtime, not during development.

### Implementation
```bash
npx electron-rebuild
```
Run this after every `npm install` from this point forward.

### Validation
The packaged/dev Electron app performs a database read/write without any native-module load errors in the console.

### 🤖 Antigravity Execution Prompt

```
Read 0-HMS-Execution-Sequence.md and follow the AI Execution Rules. Confirm
Step 2 of this phase is complete before starting.

TASK:
Run `npx electron-rebuild` and confirm it completes without error against the
project's current native dependencies (Prisma's query engine at minimum).

Add a note to package.json's scripts (e.g. a "postinstall": "electron-rebuild"
script) so this happens automatically after every future npm install, rather
than relying on someone remembering to run it manually.

Run the Electron app again and perform a database write (e.g. create a
patient) to confirm no native-module errors appear in the console.

Show me the diff and confirm the test passed.

Wait for my confirmation before continuing to Step 4.
```

### Definition of Done
- ✔ `electron-rebuild` runs cleanly
- ✔ Automatic rebuild wired into `postinstall`
- ✔ Database write succeeds in the Electron app with no native-module errors
- ✔ Git diff reviewed
- ✔ Waited for confirmation

### Files Expected to Change
- `package.json`

### Rollback
Backup commit before starting. If `electron-rebuild` fails or native errors persist: report the exact error output, do not proceed to Step 4 with an unresolved native-module mismatch — every later step depends on the database actually working inside Electron.

---

## Step 4: Configure `electron-builder` for a real installer

### Problem
There's no build configuration yet to produce an actual installable `.exe`.

### Analysis
`electron-builder` with the NSIS target is the standard for Windows installers — one config block in `package.json` produces a single-file installer that behaves exactly like any normal Windows program install.

### Implementation
```json
{
  "main": "electron/main.js",
  "build": {
    "appId": "com.lifecare.hms",
    "productName": "Life Care HMS",
    "files": ["electron/**/*", ".next/**/*", "public/**/*", "node_modules/**/*", "package.json"],
    "win": { "target": "nsis" },
    "nsis": { "oneClick": false, "allowToChangeInstallationDirectory": true }
  },
  "scripts": { "electron:build": "next build && electron-builder --win" }
}
```

### Validation
`npm run electron:build` completes and produces `dist/Life Care HMS Setup 1.0.0.exe`.

### 🤖 Antigravity Execution Prompt

```
Read 0-HMS-Execution-Sequence.md and follow the AI Execution Rules. Confirm
Step 3 of this phase is complete before starting.

TASK:
Add the electron-builder "build" configuration block to package.json exactly
as specified in this step's Implementation section, adjusting appId and
productName if I've given you different values. Add the "electron:build"
script that runs `next build` followed by `electron-builder --win`.

Run `npm run electron:build` and confirm it completes without error and
produces an installer file under dist/.

Show me the diff and the resulting file path/size of the installer.

Wait for my confirmation before continuing to Step 5.
```

### Definition of Done
- ✔ `electron-builder` config present in `package.json`
- ✔ `npm run electron:build` succeeds
- ✔ A single `.exe` installer file is produced under `dist/`
- ✔ Git diff reviewed
- ✔ Waited for confirmation

### Files Expected to Change
- `package.json`

### Rollback
Backup commit before starting. If the build fails: report the exact error, do not proceed to Step 5 without a successfully produced installer file.

---

## Step 5: Test the installer on a clean machine

### Problem
A build succeeding locally doesn't confirm the installer actually works for an end user with no development tools installed.

### Analysis
This is the real acceptance test for the entire project's "offline, single-user, install-like-a-normal-program" requirement — it must be tested on a machine that has never had Node.js, this project, or any of its dependencies installed.

### Implementation
Copy the `.exe` to a clean Windows machine (or VM) with no development tools. Run it.

### Validation
- The installer runs without requiring any separate download or manual step.
- The app opens to the login screen.
- Login, patient creation, appointment booking, a pharmacy sale, a lab order with a discount, and both PDF generations all work correctly.
- **Disconnect the machine's network entirely** and repeat the above — everything must still work with no internet connection.
- Close and reopen the app — data persists.

### 🤖 Antigravity Execution Prompt

```
Read 0-HMS-Execution-Sequence.md and follow the AI Execution Rules. Confirm
Step 4 of this phase is complete before starting.

TASK:
This step is a manual acceptance test, not a code change - do not modify any
files unless a genuine bug is found during testing.

Guide me through: copying the installer to a clean machine or VM with no
Node.js or development tools installed, running it, and confirming each of
the following in order:
1. Installer runs with no separate downloads or manual steps required.
2. App opens to the login screen.
3. Login succeeds with a seeded test account.
4. Create a patient, book an appointment.
5. Process a pharmacy sale, including a case with an expiring batch.
6. Create a lab order with a discount applied.
7. Generate both the invoice PDF and the lab report PDF.
8. Disconnect the machine's network entirely and repeat steps 3-7 - confirm
   everything still works with no internet connection.
9. Close and reopen the app - confirm all data from the above steps persists.

If any step fails, stop, report exactly which step and what happened, and do
not attempt further packaging changes until we've diagnosed the root cause
together - do not guess-fix without understanding what broke first.
```

### Definition of Done
- ✔ Clean-machine install succeeds with zero manual steps
- ✔ Every core workflow (patient, appointment, sale, lab order + discount, both PDFs) works
- ✔ Everything still works fully offline
- ✔ Data persists across app restart
- ✔ Any failure found is reported and diagnosed before further changes

### Files Expected to Change
None expected — this is a test step. Only touch files if a genuine bug is found, and treat that as its own new, separately-committed fix with its own backup commit.

### Rollback
Not applicable to the test itself. If a bug is found: create a backup commit, fix the specific issue found, re-run this entire Step 5 validation from the start (not just the failed part) before considering the project complete.

---

## What this gets you
A `.exe` (or `.dmg`/`.AppImage` if ever needed) that's a normal desktop application from the user's point of view: install, open, use, fully offline, completely free — no license costs for Electron, SQLite, or Node, no ongoing hosting bill since there's no server to pay for.

## What you lose, worth knowing upfront
- **No remote access** — this only runs on the one machine it's installed on. If the clinic ever wants a receptionist and a doctor on separate computers seeing the same data at the same time, that needs a different architecture (a small local network server), not "one file on one PC." Confirm with the client now whether single-machine really is the final requirement.
- **No automatic cloud backup** — the entire database is one file on one computer. Consider adding a simple "Export/Backup Database" button (copies the `.db` file somewhere the user chooses) so the clinic isn't one hard-drive failure away from losing every patient record. This isn't in the phases above — raise it with the client as a follow-up item if they want it.



 must commit every file after every changes every file must be commit induadually 