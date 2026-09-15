const { app, BrowserWindow, Menu, globalShortcut } = require('electron');
const path = require('path');

// ── Single instance lock — SABSE PEHLE ──────────────────────────────────────
const lock = app.requestSingleInstanceLock();
if (!lock) { app.quit(); }

let mainWindow;
let exitWindow = null;
const EXIT_WORDS = ['quit', 'exit'];
const APP_VERSION = '1.1.3';
const APP_NAME = 'OJUExam';
const APP_URL = 'https://ojuexam.online/login';
let allowQuit = false;

const ALLOWED_DOMAINS = [
  'ojuexam.online',
  'www.ojuexam.online',
  'ojuexam-online.vercel.app',
  'mveipmhxfqnnoygilfum.supabase.co'
];

const ALLOWED_PATHS = [
  '/login',
  '/student/login',
  '/student/dashboard',
  '/student/exam'
];

function isAllowedURL(url) {
  try {
    const parsed = new URL(url);
    const domainOk = ALLOWED_DOMAINS.some(d => parsed.hostname.includes(d));
    if (!domainOk) return false;
    if (parsed.hostname.includes('supabase')) return true;
    const pathOk = ALLOWED_PATHS.some(p => parsed.pathname.startsWith(p));
    return pathOk;
  } catch { return false; }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    icon: path.join(__dirname, 'build', 'icon.png'),
    title: APP_NAME,
    fullscreen: true,
    kiosk: true,
    frame: false,
    closable: false,
    minimizable: false,
    maximizable: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
      sandbox: true,
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadURL(APP_URL);

  // Block non-student navigation
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedURL(url)) {
      event.preventDefault();
      mainWindow.loadURL(APP_URL);
    }
  });

  // Block new windows / popups
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Block right-click
  mainWindow.webContents.on('context-menu', (e) => e.preventDefault());

  // Block dangerous keyboard shortcuts
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'x') {
      showExitDialog(); event.preventDefault(); return;
    }
    const blocked =
      input.key === 'F12' || input.key === 'F11' || input.key === 'F5' ||
      input.key === 'Escape' || input.key === 'PrintScreen' || input.key === 'Meta' ||
      (input.alt && input.key === 'F4') ||
      (input.alt && input.key === 'Tab') ||
      (input.control && ['w','q','n','t','r','u','s','p','l'].includes(input.key.toLowerCase())) ||
      (input.control && input.shift && ['i','j','c'].includes(input.key.toLowerCase()));
    if (blocked) event.preventDefault();
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.setFullScreen(true);
    mainWindow.focus();
  });

  // Prevent close unless allowQuit
  mainWindow.on('close', (event) => {
    if (!allowQuit) event.preventDefault();
  });

  // Always stay on top
  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed() && !exitWindow) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(true);
          mainWindow.focus();
        }
      }, 100);
    }
  });

  // Inject EXIT button on every page load
  mainWindow.webContents.on('did-finish-load', injectExitButton);
  mainWindow.webContents.on('did-navigate-in-page', injectExitButton);

  // Listen for exit trigger from injected button
  mainWindow.webContents.on('page-title-updated', (event, title) => {
    if (title === 'SHOW_EXIT') {
      event.preventDefault();
      mainWindow.webContents.executeJavaScript(`document.title='${APP_NAME}'`).catch(() => {});
      showExitDialog();
    }
  });
}

function injectExitButton() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.executeJavaScript(`
    (function(){
      var old = document.getElementById('oju-exit-btn');
      if(old) old.remove();
      var btn = document.createElement('div');
      btn.id = 'oju-exit-btn';
      btn.innerHTML = '🔒 EXIT';
      btn.style.cssText = [
        'position:fixed', 'bottom:12px', 'right:12px', 'z-index:2147483647',
        'background:#dc2626', 'color:#fff', 'padding:6px 14px', 'border-radius:8px',
        'font:bold 12px Arial,sans-serif', 'cursor:pointer', 'opacity:0.75',
        'letter-spacing:1px', 'user-select:none', 'box-shadow:0 2px 8px rgba(0,0,0,0.4)',
        'transition:opacity 0.2s'
      ].join(';');
      btn.onmouseenter = function(){ btn.style.opacity='1'; };
      btn.onmouseleave = function(){ btn.style.opacity='0.75'; };
      btn.onclick = function(){ document.title='SHOW_EXIT'; };
      document.body.appendChild(btn);
      document.addEventListener('contextmenu', function(e){ e.preventDefault(); }, true);
    })();
  `).catch(() => {});
}

function showExitDialog() {
  if (exitWindow && !exitWindow.isDestroyed()) { exitWindow.focus(); return; }
  mainWindow.setAlwaysOnTop(false);

  exitWindow = new BrowserWindow({
    width: 340,
    height: 440,
    parent: mainWindow,
    modal: true,
    show: false,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    center: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, devTools: false },
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;background:#fff;padding:28px 24px;text-align:center;user-select:none;border-radius:12px;overflow:hidden}
.logo{width:64px;height:64px;margin:0 auto 12px;background:#0A1628;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px}
h2{font-size:17px;color:#0f172a;margin-bottom:2px;font-weight:700}
.ver{font-size:10px;color:#94a3b8;margin-bottom:6px;letter-spacing:1px}
p{font-size:12px;color:#64748b;margin-bottom:14px}
.er{color:#dc2626;font-size:11px;margin-bottom:8px;display:none;font-weight:500}
.cn{padding:8px 20px;font-size:12px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;color:#64748b;font-weight:500}
.cn:hover{background:#f1f5f9}
input#code{width:100%;padding:12px 14px;font-size:16px;text-align:center;border:1.5px solid #e2e8f0;border-radius:8px;color:#0f172a;margin-bottom:12px;outline:none;letter-spacing:1px}
input#code:focus{border-color:#1e40af;box-shadow:0 0 0 3px rgba(30,64,175,0.1)}
.go{width:100%;padding:11px;font-size:14px;font-weight:700;border:none;border-radius:8px;background:#1e40af;color:#fff;cursor:pointer;margin-bottom:10px}
.go:hover{background:#1e3a8a}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
.shake{animation:shake 0.35s ease}
</style></head><body>
<div class="logo">🔒</div>
<h2>Exit ${APP_NAME}</h2>
<div class="ver">v${APP_VERSION}</div>
<p>Exit word type karo</p>
<input type="text" id="code" autofocus autocomplete="off" spellcheck="false" />
<p class="er" id="er">❌ Galat word. Dobara try karo.</p>
<button class="go" onclick="go()">Submit</button>
<button class="cn" onclick="window.close()">Cancel</button>
<script>
var inp = document.getElementById('code');
inp.focus();
function go(){
  var val = inp.value.trim();
  if(!val) return;
  document.title = 'CODE:' + val;
}
function err(){
  document.getElementById('er').style.display='block';
  inp.className='shake';
  setTimeout(function(){ inp.className=''; },400);
  inp.value=''; inp.focus();
}
inp.addEventListener('keydown', function(e){
  if(e.key === 'Enter'){ go(); }
  if(e.key === 'Escape'){ window.close(); }
});
</script></body></html>`;

  exitWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  exitWindow.once('ready-to-show', () => { exitWindow.show(); exitWindow.focus(); });

  exitWindow.webContents.on('page-title-updated', (event, title) => {
    event.preventDefault();
    if (title.startsWith('CODE:')) {
      const entered = title.replace('CODE:', '').trim().toLowerCase();
      if (EXIT_WORDS.includes(entered)) {
        allowQuit = true;
        exitWindow.destroy(); exitWindow = null;
        mainWindow.destroy();
        app.quit();
      } else {
        exitWindow.webContents.executeJavaScript('err()').catch(() => {});
      }
    }
  });

  exitWindow.on('closed', () => {
    exitWindow = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(true);
      mainWindow.focus();
    }
  });
}

// ── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  try { globalShortcut.register('CommandOrControl+Shift+X', showExitDialog); } catch(e) {}
  try { globalShortcut.register('Alt+Tab', () => { if(mainWindow && !mainWindow.isDestroyed()) mainWindow.focus(); }); } catch(e) {}
  try { globalShortcut.register('Alt+F4', () => {}); } catch(e) {}
  try { globalShortcut.register('Super+D', () => {}); } catch(e) {}
  try { globalShortcut.register('Super+Tab', () => {}); } catch(e) {}
  try { globalShortcut.register('Super+L', () => {}); } catch(e) {}
});

app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(true);
    mainWindow.focus();
  }
});

app.on('will-quit', () => { try { globalShortcut.unregisterAll(); } catch(e) {} });
app.on('window-all-closed', () => { app.quit(); });
