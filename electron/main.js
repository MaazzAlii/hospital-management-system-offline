const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn, execSync } = require('child_process');

let serverProcess = null;
let isQuitting = false;
let mainWindow = null;
let serverExited = false;
let serverExitCode = null;
let serverExitSignal = null;
let serverStartedSuccessfully = false;
let capturedLogs = [];

function appendCapturedLog(str) {
  if (!str) return;
  const lines = str.split(/\r?\n/);
  for (const line of lines) {
    if (line.trim()) {
      capturedLogs.push(line);
      if (capturedLogs.length > 500) {
        capturedLogs.shift();
      }
    }
  }
}

// Determine writable user data database path
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'hms.db');
const databaseUrl = `file:${dbPath.replace(/\\/g, '/')}`;

function renderCrashPage(win, code, signal, logsText, logPath) {
  if (!win || win.isDestroyed()) return;

  const safeLogs = (logsText || 'No stderr or stdout logs captured before process exited.')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeLogPath = (logPath || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HMS Startup Error</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0f172a;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      padding: 32px;
      line-height: 1.5;
    }
    .card {
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    h1 {
      color: #f87171;
      font-size: 22px;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 8px 16px;
      background: #0f172a;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
      border: 1px solid #334155;
    }
    .meta-label { font-weight: 600; color: #94a3b8; }
    .meta-val { color: #e2e8f0; font-family: monospace; word-break: break-all; }
    .logs-header {
      font-size: 14px;
      font-weight: 600;
      color: #cbd5e1;
      margin-bottom: 8px;
    }
    pre {
      background: #020617;
      color: #ffb86c;
      border: 1px solid #334155;
      padding: 16px;
      border-radius: 8px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 13px;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 420px;
      overflow-y: auto;
    }
    .footer-note {
      margin-top: 20px;
      font-size: 13px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>⚠️ Next.js Server Process Crashed</h1>
    <p style="margin-bottom: 16px; color: #cbd5e1;">The backend Next.js process exited before port 3456 became reachable.</p>
    
    <div class="meta-grid">
      <div class="meta-label">Exit Code:</div>
      <div class="meta-val">${code !== null && code !== undefined ? code : 'N/A (Process timed out or killed)'}</div>
      <div class="meta-label">Exit Signal:</div>
      <div class="meta-val">${signal || 'None'}</div>
      <div class="meta-label">Log File Path:</div>
      <div class="meta-val">${safeLogPath}</div>
    </div>

    <div class="logs-header">Captured Stderr Output (Last ~50 lines):</div>
    <pre>${safeLogs}</pre>

    <p class="footer-note">📸 <strong>Note:</strong> Please take a screenshot of this window or copy the Log File Path above to report this error.</p>
  </div>
</body>
</html>`;

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
}

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
    } else {
      try {
        const Database = require('better-sqlite3');
        const db = new Database(dbPath);

        // 1. Ensure Batch table exists
        db.exec(`
          CREATE TABLE IF NOT EXISTS "Batch" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "medicineId" TEXT NOT NULL,
            "purchaseItemId" TEXT,
            "batchNo" TEXT NOT NULL,
            "expiryDate" DATETIME NOT NULL,
            "quantityReceived" INTEGER NOT NULL,
            "quantityRemaining" INTEGER NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Batch_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "Batch_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "PurchaseItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
          );
          CREATE INDEX IF NOT EXISTS "Batch_medicineId_idx" ON "Batch"("medicineId");
          CREATE INDEX IF NOT EXISTS "Batch_batchNo_idx" ON "Batch"("batchNo");
        `);

        // 2. Ensure StockMovement table exists
        db.exec(`
          CREATE TABLE IF NOT EXISTS "StockMovement" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "medicineId" TEXT NOT NULL,
            "purchaseItemId" TEXT,
            "type" TEXT NOT NULL,
            "quantity" INTEGER NOT NULL,
            "referenceType" TEXT,
            "referenceId" TEXT,
            "notes" TEXT,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "StockMovement_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT "StockMovement_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "PurchaseItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
          );
        `);

        // Helper to safely add missing columns
        const addColumnIfMissing = (tableName, columnName, columnDef) => {
          try {
            const cols = db.prepare(`PRAGMA table_info("${tableName}")`).all();
            const colSet = new Set(cols.map(c => c.name));
            if (!colSet.has(columnName)) {
              db.prepare(`ALTER TABLE "${tableName}" ADD COLUMN ${columnName} ${columnDef}`).run();
              console.log(`[Electron Migration] Added column ${columnName} to ${tableName}`);
            }
          } catch (e) {
            console.warn(`[Electron Migration] Note adding ${columnName} to ${tableName}:`, e.message);
          }
        };

        // 3. Ensure LabTest columns
        addColumnIfMissing('LabTest', 'turnaroundHours', 'INTEGER');
        addColumnIfMissing('LabTest', 'isActive', 'BOOLEAN NOT NULL DEFAULT 1');

        // 4. Ensure Sale columns
        addColumnIfMissing('Sale', 'accountCode', 'TEXT');
        addColumnIfMissing('Sale', 'customerAddress', 'TEXT');
        addColumnIfMissing('Sale', 'licenseNo', 'TEXT');
        addColumnIfMissing('Sale', 'ntn', 'TEXT');
        addColumnIfMissing('Sale', 'summaryPrsNo', 'TEXT');
        addColumnIfMissing('Sale', 'bookedBy', 'TEXT');
        addColumnIfMissing('Sale', 'salesmanMobile', 'TEXT');
        addColumnIfMissing('Sale', 'suppliedBy', 'TEXT');
        addColumnIfMissing('Sale', 'territory', 'TEXT');

        // 5. Ensure SaleItem columns
        addColumnIfMissing('SaleItem', 'batchId', 'TEXT');
        addColumnIfMissing('SaleItem', 'batchNo', 'TEXT');
        addColumnIfMissing('SaleItem', 'expiryDate', 'DATETIME');
        addColumnIfMissing('SaleItem', 'freeQty', 'INTEGER NOT NULL DEFAULT 0');
        addColumnIfMissing('SaleItem', 'tradePrice', 'REAL');
        addColumnIfMissing('SaleItem', 'grossAmount', 'REAL');
        addColumnIfMissing('SaleItem', 'discountPercent', 'REAL DEFAULT 0');
        addColumnIfMissing('SaleItem', 'discountAmount', 'REAL DEFAULT 0');
        addColumnIfMissing('SaleItem', 'sTax', 'REAL DEFAULT 0');
        addColumnIfMissing('SaleItem', 'gst', 'REAL DEFAULT 0');
        addColumnIfMissing('SaleItem', 'netAmount', 'REAL');

        // 6. Ensure PurchaseItem columns
        addColumnIfMissing('PurchaseItem', 'batchNo', 'TEXT');
        addColumnIfMissing('PurchaseItem', 'expiryDate', 'DATETIME');

        // 7. Ensure Settings columns
        addColumnIfMissing('Settings', 'clinicName', "TEXT NOT NULL DEFAULT 'Life Care Clinic, Nawagai Buner'");
        addColumnIfMissing('Settings', 'address', "TEXT DEFAULT 'Nawagai, Buner, Khyber Pakhtunkhwa'");
        addColumnIfMissing('Settings', 'phone', "TEXT DEFAULT '03439626941'");
        addColumnIfMissing('Settings', 'email', "TEXT DEFAULT 'shakeelbuneri933@gmail.com'");

        // 8. Fix erroneous default reorder levels (100 -> 4)
        try {
          const reorderFix = db.prepare('UPDATE "Medicine" SET "reorderLevel" = 4 WHERE "reorderLevel" = 100').run();
          if (reorderFix.changes > 0) {
            console.log(`[Electron Migration] Updated ${reorderFix.changes} medicines from reorderLevel=100 to 4.`);
          }
        } catch (e) {
          console.warn('[Electron Migration] Note updating medicine reorder levels:', e.message);
        }

        db.close();
        console.log('[Electron] DB schema auto-migration check completed successfully.');
      } catch (migrateErr) {
        console.warn('[Electron] DB schema migration check warning:', migrateErr);
      }
    }
  } catch (err) {
    console.error('[Electron] Database initialization error:', err);
    const msg = `[Database Init Error] ${err.stack || err}\n`;
    appendCapturedLog(msg);
    try { fs.appendFileSync(path.join(userDataPath, 'server-error.log'), msg); } catch (e) {}
  }
}

function startNextServer(port) {
  const appPath = app.getAppPath();

  const dbFilePath = path.join(userDataPath, 'hms.db');
  const dbUrl = `file:${dbFilePath.replace(/\\/g, '/')}`;

  process.env.NODE_ENV = 'production';
  process.env.PORT = String(port);
  process.env.DATABASE_URL = dbUrl;

  const errLogPath = path.join(userDataPath, 'server-error.log');
  try { fs.writeFileSync(errLogPath, `[Log Started: ${new Date().toISOString()}]\n`); } catch (e) {}

  const nextBin = path.join(appPath, 'node_modules', 'next', 'dist', 'bin', 'next');
  const nextBinExists = fs.existsSync(nextBin);

  console.log(`[Electron] appPath: ${appPath}`);
  console.log(`[Electron] nextBin: ${nextBin} (exists: ${nextBinExists})`);
  console.log(`[Electron] DATABASE_URL: ${dbUrl}`);

  let spawnArgs;
  let spawnOpts;

  let nodeExecutable = 'node';
  try {
    execSync('node -v', { stdio: 'ignore' });
  } catch (e) {
    nodeExecutable = process.execPath;
  }

  const spawnEnv = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    DATABASE_URL: dbUrl,
    HMS_LOG_DIR: userDataPath,
    ELECTRON_RUN_AS_NODE: '1',
    ELECTRON_ENABLE_LOGGING: '1',
  };

  const generatedClientDir = path.join(appPath, 'src', 'generated', 'prisma');
  let engineFile = null;
  try {
    engineFile = fs.readdirSync(generatedClientDir).find(f => f.endsWith('.node'));
  } catch (e) {}

  if (engineFile) {
    spawnEnv.PRISMA_QUERY_ENGINE_LIBRARY = path.join(generatedClientDir, engineFile);
    console.log('[Electron] PRISMA_QUERY_ENGINE_LIBRARY set to:', spawnEnv.PRISMA_QUERY_ENGINE_LIBRARY);
    try { fs.appendFileSync(errLogPath, `[Electron] PRISMA_QUERY_ENGINE_LIBRARY: ${spawnEnv.PRISMA_QUERY_ENGINE_LIBRARY}\n`); } catch (e) {}
  }

  if (nextBinExists) {
    spawnArgs = [nextBin, 'start', '-p', String(port)];
    spawnOpts = {
      cwd: appPath,
      env: spawnEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    };
    console.log(`[Electron] Spawning (${nodeExecutable}):`, spawnArgs.join(' '));
    try { fs.appendFileSync(errLogPath, `[Electron] Spawning (${nodeExecutable}): ${spawnArgs.join(' ')}\n`); } catch (e) {}
    serverProcess = spawn(nodeExecutable, spawnArgs, spawnOpts);
  } else {
    // Fallback: use npx.cmd
    console.log('[Electron] next bin not found, falling back to npx.cmd');
    serverProcess = spawn('npx.cmd', ['next', 'start', '-p', String(port)], {
      cwd: appPath,
      env: spawnEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
  }

  if (serverProcess.stdout) {
    serverProcess.stdout.on('data', (data) => {
      const str = data.toString();
      console.log('[Next.js]', str.trim());
      appendCapturedLog(str);
      try { fs.appendFileSync(errLogPath, str); } catch (e) {}
    });
  }

  if (serverProcess.stderr) {
    serverProcess.stderr.on('data', (data) => {
      const str = data.toString();
      console.error('[Next.js STDERR]', str.trim());
      appendCapturedLog(str);
      try { fs.appendFileSync(errLogPath, str); } catch (e) {}
    });
  }

  serverProcess.on('error', (err) => {
    const msg = `[Spawn Error] ${err.stack || err}\n`;
    console.error(msg);
    appendCapturedLog(msg);
    try { fs.appendFileSync(errLogPath, msg); } catch (e) {}
  });

  serverProcess.on('exit', (code, signal) => {
    const msg = `[Server Exit] code=${code} signal=${signal}\n`;
    console.log(msg);
    appendCapturedLog(msg);
    try { fs.appendFileSync(errLogPath, msg); } catch (e) {}

    serverExited = true;
    serverExitCode = code;
    serverExitSignal = signal;

    if (!serverStartedSuccessfully && mainWindow && !mainWindow.isDestroyed()) {
      const errLogPath = path.join(userDataPath, 'server-error.log');
      const lastLogs = capturedLogs.slice(-50).join('\n');
      renderCrashPage(mainWindow, code, signal, lastLogs, errLogPath);
    }
  });
}

function waitForServer(url, timeoutMs = 25000, intervalMs = 250) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      if (serverExited) {
        return reject(new Error(`Server process exited with code ${serverExitCode} (signal: ${serverExitSignal}) before port became reachable.`));
      }

      http
        .get(url, (res) => {
          if (res.statusCode === 200 || res.statusCode === 307 || res.statusCode === 302) {
            resolve();
          } else {
            retry();
          }
        })
        .on('error', () => {
          retry();
        });
    };

    const retry = () => {
      if (serverExited) {
        return reject(new Error(`Server process exited with code ${serverExitCode} (signal: ${serverExitSignal}) before port became reachable.`));
      }
      if (Date.now() - startTime >= timeoutMs) {
        reject(new Error(`Timed out waiting for server at ${url}`));
      } else {
        setTimeout(check, intervalMs);
      }
    };

    check();
  });
}

function getAppIconPath() {
  const candidates = [
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, '../public/icon.png'),
    path.join(__dirname, '../public/logo.jpeg'),
    path.join(process.resourcesPath || '', 'build/icon.ico'),
    path.join(process.resourcesPath || '', 'app/build/icon.ico'),
    path.join(process.resourcesPath || '', 'app/public/icon.png'),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch (e) {}
  }
  return undefined;
}

function createWindow(port) {
  const icon = getAppIconPath();
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Life Care Clinic HMS',
    icon: icon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.HMS_DEBUG === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  const url = `http://localhost:${port}`;

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    const msg = `[Renderer Crash] ${JSON.stringify(details)}\n`;
    console.error(msg);
    try { fs.appendFileSync(path.join(userDataPath, 'server-error.log'), msg); } catch (e) {}
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Electron] Window failed to load:', errorCode, errorDescription, validatedURL);
    if (!serverStartedSuccessfully) {
      const errLogPath = path.join(userDataPath, 'server-error.log');
      const lastLogs = capturedLogs.slice(-50).join('\n');
      renderCrashPage(mainWindow, serverExitCode, serverExitSignal, lastLogs, errLogPath);
    }
  });

  if (serverExited) {
    const errLogPath = path.join(userDataPath, 'server-error.log');
    const lastLogs = capturedLogs.slice(-50).join('\n');
    renderCrashPage(mainWindow, serverExitCode, serverExitSignal, lastLogs, errLogPath);
    return;
  }

  waitForServer(url)
    .then(() => {
      serverStartedSuccessfully = true;
      console.log(`[Electron] Next.js server ready! Loading ${url}`);
      mainWindow.loadURL(url);
    })
    .catch((err) => {
      console.error('[Electron] Server failed to load or exited:', err);
      const errLogPath = path.join(userDataPath, 'server-error.log');
      const lastLogs = capturedLogs.slice(-50).join('\n');
      renderCrashPage(mainWindow, serverExitCode, serverExitSignal, lastLogs, errLogPath);
    });
}

function stopNextServer() {
  if (serverProcess) {
    console.log('[Electron] Terminating Next.js server child process...');
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch (err) {
      console.error('[Electron] Error killing server process:', err);
    }
    serverProcess = null;
  }
}

app.whenReady().then(() => {
  const port = 3456;
  ensureDatabaseExists();
  startNextServer(port);
  createWindow(port);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(port);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    isQuitting = true;
    stopNextServer();
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  stopNextServer();
});

