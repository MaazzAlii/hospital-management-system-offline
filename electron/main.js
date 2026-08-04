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
  let appPath = app.getAppPath();
  if (appPath.endsWith('.asar')) {
    appPath = path.join(path.dirname(appPath), 'app.asar.unpacked');
  }
  const serverPath = path.join(appPath, '.next', 'standalone', 'server.js');

  console.log(`[Electron] Starting Next.js server on port ${port}...`);

  const dbFilePath = path.join(userDataPath, 'hms.db');
  const dbUrl = `file:${dbFilePath.replace(/\\/g, '/')}`;

  process.env.NODE_ENV = 'production';
  process.env.PORT = String(port);
  process.env.DATABASE_URL = dbUrl;

  console.log('[Electron] Environment injected:');
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  PORT:', process.env.PORT);
  console.log('  DATABASE_URL:', process.env.DATABASE_URL);

  if (fs.existsSync(serverPath)) {
    try {
      console.log('[Electron] Standalone server found at:', serverPath);
      try {
        const resolved = require.resolve(serverPath);
        if (require.cache[resolved]) {
          delete require.cache[resolved];
          console.log('[Electron] Cleared require cache for serverPath');
        }
      } catch (cacheErr) {}

      const standaloneDir = path.dirname(serverPath);
      console.log('[Electron] Setting CWD to standalone directory:', standaloneDir);
      process.chdir(standaloneDir);

      console.log('[Electron] BEFORE require(serverPath)');
      require(serverPath);
      console.log('[Electron] AFTER require(serverPath) - server initialized successfully');
      process.chdir(appPath);
      return;
    } catch (err) {
      console.error('[Electron] Exception thrown during require(serverPath):', err);
      const errLogPath = path.join(userDataPath, 'server-error.log');
      fs.writeFileSync(errLogPath, String(err && err.stack ? err.stack : err));
    }
  } else {
    console.log('[Electron] Standalone server file not found at:', serverPath);
  }

  const standaloneDir = path.dirname(serverPath);
  const spawnEnv = {
    ...process.env,
    NODE_ENV: 'production',
    DATABASE_URL: dbUrl,
    PORT: String(port),
    ELECTRON_RUN_AS_NODE: '1',
  };

  const nextBin = path.join(appPath, 'node_modules', 'next', 'dist', 'bin', 'next');
  if (fs.existsSync(nextBin)) {
    console.log('[Electron] Falling back to next bin at:', nextBin);
    serverProcess = spawn(process.execPath, [nextBin, 'start', '-p', String(port)], {
      cwd: standaloneDir,
      env: spawnEnv,
      stdio: 'inherit',
    });
  } else {
    console.log('[Electron] Falling back to npx next start...');
    const isWin = process.platform === 'win32';
    const npmCmd = isWin ? 'npx.cmd' : 'npx';
    serverProcess = spawn(npmCmd, ['next', 'start', '-p', String(port)], {
      cwd: standaloneDir,
      env: spawnEnv,
      shell: true,
      stdio: 'inherit',
    });
  }

  if (serverProcess) {
    serverProcess.on('error', (err) => {
      console.error('[Electron] Failed to start Next.js server process:', err);
    });
  }
}

function waitForServer(url, timeoutMs = 15000, intervalMs = 250) {
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
      const safeExtra = extraErr ? extraErr.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'No error log recorded.';
      win.loadURL(`data:text/html,<h2>Server Start Error</h2><p>${err.message}</p><hr/><pre style="color:red;white-space:pre-wrap;">${safeExtra}</pre>`);
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
