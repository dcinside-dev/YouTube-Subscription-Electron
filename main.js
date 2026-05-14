const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const fs   = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1400,
    height: 860,
    minWidth:  900,
    minHeight: 600,
    title: 'YouTube 구독 자동화',
    backgroundColor: '#0d0d0f',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  mainWindow.loadFile('src/index.html');
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── CSV 파일 열기 ──
ipcMain.handle('open-csv-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'subscriptions.csv 선택',
    filters: [
      { name: 'CSV 파일', extensions: ['csv', 'txt'] },
      { name: '모든 파일', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths.length) return null;
  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    return { path: result.filePaths[0], content };
  } catch (e) {
    return { error: e.message };
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  쿠키 주입 IPC 핸들러
//  렌더러에서 쿠키 배열을 받아 persist:youtube 세션에 직접 심어줌
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ipcMain.handle('inject-cookies', async (event, cookies) => {
  const ytSession = session.fromPartition('persist:youtube');
  const results = { success: 0, failed: 0, errors: [] };

  for (const cookie of cookies) {
    try {
      // Electron cookie 형식으로 변환
      const cookieObj = {
        url:      cookie.url || 'https://www.youtube.com',
        name:     cookie.name,
        value:    cookie.value,
        domain:   cookie.domain   || '.youtube.com',
        path:     cookie.path     || '/',
        secure:   cookie.secure   !== undefined ? cookie.secure   : true,
        httpOnly: cookie.httpOnly !== undefined ? cookie.httpOnly : false,
        sameSite: cookie.sameSite || 'no_restriction',
      };
      // expirationDate가 있을 때만 추가 (없으면 세션 쿠키)
      if (cookie.expirationDate) cookieObj.expirationDate = cookie.expirationDate;

      await ytSession.cookies.set(cookieObj);
      results.success++;
    } catch (e) {
      results.failed++;
      results.errors.push(`${cookie.name}: ${e.message}`);
    }
  }

  // 쿠키 플러시 (디스크에 즉시 저장)
  await ytSession.cookies.flushStore();
  return results;
});

// ── 현재 세션 쿠키 전체 읽기 (내보내기용) ──
ipcMain.handle('get-cookies', async () => {
  const ytSession = session.fromPartition('persist:youtube');
  return ytSession.cookies.get({ domain: '.youtube.com' });
});

// ── 세션 쿠키 전체 삭제 ──
ipcMain.handle('clear-cookies', async () => {
  const ytSession = session.fromPartition('persist:youtube');
  const cookies = await ytSession.cookies.get({ domain: '.youtube.com' });
  for (const c of cookies) {
    const url = `https://${c.domain.replace(/^\./, '')}${c.path}`;
    await ytSession.cookies.remove(url, c.name);
  }
  await ytSession.cookies.flushStore();
  return { cleared: cookies.length };
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
