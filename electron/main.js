const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn, execSync } = require('child_process');

let serverProcess = null;
let isQuitting = false;

// Determine writable user data database path
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'hms.db');
const databaseUrl = `file:${dbPath.replace(/\\/g, '/')}`;

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
  } catch (err) {
    console.error('[Electron] Database initialization error:', err);
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
    ELECTRON_RUN_AS_NODE: '1',
    ELECTRON_ENABLE_LOGGING: '1',
  };

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
      try { fs.appendFileSync(errLogPath, str); } catch (e) {}
    });
  }

  if (serverProcess.stderr) {
    serverProcess.stderr.on('data', (data) => {
      const str = data.toString();
      console.error('[Next.js STDERR]', str.trim());
      try { fs.appendFileSync(errLogPath, str); } catch (e) {}
    });
  }

  serverProcess.on('error', (err) => {
    const msg = `[Spawn Error] ${err.stack || err}\n`;
    console.error(msg);
    try { fs.appendFileSync(errLogPath, msg); } catch (e) {}
  });

  serverProcess.on('exit', (code, signal) => {
    const msg = `[Server Exit] code=${code} signal=${signal}\n`;
    console.log(msg);
    try { fs.appendFileSync(errLogPath, msg); } catch (e) {}
  });
}

function waitForServer(url, timeoutMs = 25000, intervalMs = 250) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
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
      if (Date.now() - startTime >= timeoutMs) {
        reject(new Error(`Timed out waiting for server at ${url}`));
      } else {
        setTimeout(check, intervalMs);
      }
    };

    check();
  });
}

function createWindow(port) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Life Care Clinic HMS',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const url = `http://localhost:${port}`;

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Electron] Window failed to load:', errorCode, errorDescription, validatedURL);
    const html = `<html><body style="font-family:sans-serif;padding:30px;background:#1e1e1e;color:#fff;">
      <h2 style="color:#ff5555;">Page Load Failure (${errorCode})</h2>
      <p><strong>Description:</strong> ${errorDescription}</p>
      <p><strong>URL:</strong> ${validatedURL}</p>
    </body></html>`;
    win.loadURL(`data:text/html,${encodeURIComponent(html)}`);
  });

  waitForServer(url)
    .then(() => {
      console.log(`[Electron] Next.js server ready! Loading ${url}`);
      win.loadURL(url);
    })
    .catch((err) => {
      console.error('[Electron] Server failed to load:', err);
      const errLogPath = path.join(userDataPath, 'server-error.log');
      let extraErr = '';
      if (fs.existsSync(errLogPath)) {
        extraErr = fs.readFileSync(errLogPath, 'utf8');
      }
      const safeMessage = (err.message || String(err)).replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeExtra = extraErr ? extraErr.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'No server error log recorded.';
      const htmlContent = `<html><body style="font-family:sans-serif;padding:30px;background:#1e1e1e;color:#fff;">
        <h2 style="color:#ff5555;">Server Error / Startup Timeout</h2>
        <p><strong>Message:</strong> ${safeMessage}</p>
        <hr style="border-color:#444;"/>
        <h3>Server Startup Error / Trace:</h3>
        <pre style="color:#ffb86c;background:#282a36;padding:15px;border-radius:5px;white-space:pre-wrap;word-break:break-all;max-height:500px;overflow:auto;">${safeExtra}</pre>
      </body></html>`;
      win.loadURL(`data:text/html,${encodeURIComponent(htmlContent)}`);
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
