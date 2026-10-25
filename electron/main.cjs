const { app, BrowserWindow, protocol } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.bin': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8'
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true
    }
  }
]);

function registerAppProtocol() {
  const distDir = path.resolve(__dirname, '..', 'dist');

  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    const pathname = decodeURIComponent(url.pathname || '/');
    const relative = pathname.replace(/^\/+/, '') || 'index.html';
    const filePath = path.resolve(distDir, relative);

    if (!filePath.startsWith(distDir + path.sep) && filePath !== distDir) {
      return new Response('Forbidden', { status: 403 });
    }

    const headers = {
      'content-type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache'
    };

    try {
      const data = await fs.promises.readFile(filePath);
      if (request.method === 'HEAD') return new Response(null, { status: 200, headers });
      return new Response(data, { status: 200, headers });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

// `GOGAME_BUNDLE=1` serves the built dist/ over app:// without packaging, which
// makes it possible to smoke-test the production path with `npx electron .`.
const useBundle = app.isPackaged || process.env.GOGAME_BUNDLE === '1';
const debugQuery = process.env.GOGAME_DEBUG === '1' ? '?debug=1' : '';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 920,
    minWidth: 480,
    minHeight: 480,
    backgroundColor: '#0e0b08',
    title: 'GoGame 3D',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Block unauthorized popups and new windows
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Prevent unwanted in-window navigation away from the local app
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl);
      const isAllowedOrigin =
        parsed.origin === 'app://bundle' ||
        parsed.origin === 'http://localhost:5173' ||
        parsed.origin === 'http://127.0.0.1:5173';
      if (!isAllowedOrigin) {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  // Deny sensitive device permission requests by default
  win.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  if (useBundle) {
    win.loadURL(`app://bundle/index.html${debugQuery}`);
  } else {
    win.loadURL(`http://localhost:5173${debugQuery}`);
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  if (useBundle) registerAppProtocol();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
