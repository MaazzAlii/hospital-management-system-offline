# HMS Electron Packaging — Full Fix Prompt

Paste this whole document into your coding agent (Antigravity / Claude Code) as one task. It contains every file to touch, the exact change, and how to verify it. Do the groups in order — each one is a prerequisite for correctly diagnosing the next.

Stack: Next.js 16.2.10 (Turbopack), Electron 43, electron-builder 26, Prisma 7 + `@prisma/adapter-better-sqlite3`, `output: 'standalone'`, `asar: false`, Windows/NSIS target.

---

## GROUP 1 — Make the crash actually visible (do this first, before changing anything else)

### 1.1 Fix the split log-file bug in `src/app/actions/auth.ts`
The `login()` catch block currently writes to `path.join(process.cwd(), "server-error.log")`. `process.cwd()` for the spawned Next process is `appPath` (`resources/app`), which is a **different file** from the one `electron/main.js` already writes to at `%APPDATA%\hms\server-error.log`. Anything the login action logs is going to the wrong place, possibly a non-writable one.

Change `auth.ts` to write to the same userData log Electron already maintains, via an env var Electron injects:

```ts
// auth.ts — inside the catch block, replace the fs logging with:
try {
  const fs = require("fs");
  const path = require("path");
  const logDir = process.env.HMS_LOG_DIR || process.cwd();
  const logMsg = `[LOGIN_ERROR ${new Date().toISOString()}]\n${error && error.stack ? error.stack : String(error)}\n\n`;
  fs.appendFileSync(path.join(logDir, "server-error.log"), logMsg);
} catch (fsErr) {
  console.error("Failed to write to server-error.log:", fsErr);
}
```

### 1.2 Have Electron pass `HMS_LOG_DIR` to the spawned process
In `electron/main.js`, inside `startNextServer`, add to `spawnEnv`:

```js
const spawnEnv = {
  ...process.env,
  NODE_ENV: 'production',
  PORT: String(port),
  DATABASE_URL: dbUrl,
  HMS_LOG_DIR: userDataPath,          // <-- add this
  ELECTRON_RUN_AS_NODE: '1',
  ELECTRON_ENABLE_LOGGING: '1',
};
```
Now both the top-level stdout/stderr capture AND the login-specific error log land in the same `%APPDATA%\hms\server-error.log`.

### 1.3 Add a `render-process-gone` listener in `electron/main.js`
The error you're seeing (`ERROR 1875816956`, a positive number) doesn't match a real Chromium `did-fail-load` net error code (those are always negative, e.g. `-6`), and it isn't your own custom dark-themed error HTML either. That strongly suggests the **renderer process itself is crashing**, not failing to navigate. Add this next to your existing `did-fail-load` handler inside `createWindow`:

```js
win.webContents.on('render-process-gone', (event, details) => {
  const msg = `[Renderer Crash] ${JSON.stringify(details)}\n`;
  console.error(msg);
  try { fs.appendFileSync(path.join(userDataPath, 'server-error.log'), msg); } catch (e) {}
});
```

### 1.4 Add a temporary DevTools toggle
So you can see the real browser console instead of guessing. In `createWindow`, right after `const win = new BrowserWindow(...)`:

```js
if (process.env.HMS_DEBUG === '1') {
  win.webContents.openDevTools({ mode: 'detach' });
}
```
Run once with `set HMS_DEBUG=1 && "Life Care HMS.exe"` (or launch the exe from a terminal with that env var set) to get a live console during the crash.

**✅ Checkpoint:** Reproduce the crash once with these four changes in place, then read `%APPDATA%\hms\server-error.log` end-to-end and paste it back before doing Group 2 blind — it will very likely already tell you whether this is a Prisma error, a thrown JS error, or a renderer crash, which determines whether Group 2 or Group 3 is the real fix.

---

## GROUP 2 — Make Prisma bundling deterministic (stop relying on manual copy)

### 2.1 Pin the Prisma Client output path
`prisma/schema.prisma` currently has no `output` on the client generator, so it falls back to Prisma 7's default location, which Next's file-tracer for `output: 'standalone'` does not always resolve correctly — this is the root cause of the `Cannot find module '.prisma/client/default'` error you hit before, and the reason manual copying was "needed."

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}
```

Then update the import in `src/lib/prisma.ts`:
```ts
import { PrismaClient } from '@/generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
```
(Add a `@/generated/*` path alias in `tsconfig.json` if one doesn't already resolve there — check it maps to `./src/generated/*`.)

Regenerate after this change: `npx prisma generate`.

Why this matters: with a fixed, known relative path *inside your own source tree*, both Next's tracer and your postbuild copy script (2.2) have a deterministic folder to find and include — you're no longer depending on Prisma's internal default location or Next correctly guessing where `node_modules/.prisma/client` lives.

### 2.2 Replace the manual xcopy with an automated postbuild script
Create `scripts/copy-prisma-engine.js`:

```js
// scripts/copy-prisma-engine.js
const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[copy-prisma-engine] Source not found, skipping: ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const standaloneRoot = path.join(__dirname, '..', '.next', 'standalone');

// 1. Your generated client (now at src/generated/prisma per schema.prisma output=)
copyDir(
  path.join(__dirname, '..', 'src', 'generated', 'prisma'),
  path.join(standaloneRoot, 'src', 'generated', 'prisma')
);

// 2. @prisma/client + @prisma/adapter-better-sqlite3 packages (runtime code, not just engine)
for (const pkg of ['@prisma/client', '@prisma/adapter-better-sqlite3', '.prisma']) {
  copyDir(
    path.join(__dirname, '..', 'node_modules', pkg),
    path.join(standaloneRoot, 'node_modules', pkg)
  );
}

// 3. better-sqlite3 native binding (must match the ABI Electron's Node was built with)
copyDir(
  path.join(__dirname, '..', 'node_modules', 'better-sqlite3'),
  path.join(standaloneRoot, 'node_modules', 'better-sqlite3')
);

console.log('[copy-prisma-engine] Done.');
```

Update `package.json`:
```json
"scripts": {
  "electron:build": "next build && node scripts/copy-prisma-engine.js && electron-builder --win"
}
```
This runs automatically on every build — no manual step to forget.

### 2.3 Explicit engine path as a belt-and-suspenders fallback
In `electron/main.js`, add to `spawnEnv` so Prisma never has to rely on `node_modules` resolution at all:
```js
const generatedClientDir = path.join(appPath, 'src', 'generated', 'prisma');
// Find the actual .node engine filename at runtime (it's platform/version-specific)
let engineFile = null;
try {
  engineFile = fs.readdirSync(generatedClientDir).find(f => f.endsWith('.node'));
} catch (e) {}

if (engineFile) {
  spawnEnv.PRISMA_QUERY_ENGINE_LIBRARY = path.join(generatedClientDir, engineFile);
}
```
Log `spawnEnv.PRISMA_QUERY_ENGINE_LIBRARY` to `server-error.log` on startup so you can confirm in the log exactly which file it resolved to.

### 2.4 `better-sqlite3` native module ABI check
`better-sqlite3` is a native addon compiled against a specific Node ABI. Electron 43 bundles its own Node version, which is **not necessarily the same ABI** as the `node` you used to `npm install`. Confirm you're running `electron-rebuild` (you already have `@electron/rebuild` as a devDependency — good) as part of the build:
```json
"postinstall": "electron-rebuild -f -w better-sqlite3"
```
If this step is missing or was skipped, `better-sqlite3` will throw `NODE_MODULE_VERSION mismatch` on `require()` inside the packaged app — this alone is a classic cause of an instant crash on first DB call (i.e. exactly on login, since that's your first `prisma.user.findUnique` call — the login page itself never touches the DB).

**✅ Checkpoint:** Full rebuild (`npm run electron:build`), fresh install, reproduce login. Check `server-error.log` again.

---

## GROUP 3 — Cookie/session correctness (lower priority than 1 & 2, but still wrong)

### 3.1 `src/lib/session.ts`
```ts
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'life_care_clinic_hms_secure_session_secret_32_chars_min',
  cookieName: 'hms_session',
  cookieOptions: {
    secure: false,        // fully offline desktop app on http://localhost — force this explicitly
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  },
};
```
You believed this was already set to `false` — it wasn't; it was `process.env.NODE_ENV === 'production'`, and `main.js` sets `NODE_ENV=production`, so the cookie was being marked `Secure`. Chromium happens to treat `localhost` as a secure context so this likely wasn't your crash, but fix it anyway so behavior matches your mental model and you don't get bitten by it later (e.g. if you ever point the window at `127.0.0.1` instead of `localhost`, which does NOT get the same exception).

---

## Verification checklist (run after all groups)

1. `npm run electron:build`
2. Install the fresh build, launch with `set HMS_DEBUG=1` so DevTools is open.
3. Log in with `admin@lcc.com` / `Admin@123`.
4. If it still fails: paste the full contents of `%APPDATA%\hms\server-error.log` plus whatever printed in DevTools console — that's now guaranteed to contain the real error.
5. Once login works, remove/guard the `HMS_DEBUG` DevTools call and the extra console logging for the release build if you don't want them shipping (keep the file-based `server-error.log` logging permanently — it's cheap and will save you next time).

Do not skip Group 1 to jump straight to "fixing" Group 2 or 3 — without real error visibility you'll be guessing at the same distance you are now.
