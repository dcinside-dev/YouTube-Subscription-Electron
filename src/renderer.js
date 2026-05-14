'use strict';

const { ipcRenderer } = require('electron');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DOM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const $ = id => document.getElementById(id);

const wv         = $('wv');
const csvInput   = $('csv-input');
const btnFile    = $('btn-file');
const fileName   = $('file-name');
const chCount    = $('ch-count');
const dMin       = $('d-min');
const dMax       = $('d-max');
const btnStart   = $('btn-start');
const btnStop    = $('btn-stop');
const btnRetry   = $('btn-retry');
const btnClr     = $('btn-clr');
const logEl      = $('log');
const logCnt     = $('log-cnt');
const progFill   = $('prog-fill');
const progPct    = $('prog-pct');
const progLbl    = $('prog-lbl');
const sTot       = $('s-tot');
const sPrc       = $('s-prc');
const sOk        = $('s-ok');
const sErr       = $('s-err');
const tbBadge    = $('tb-badge');
const wvBack     = $('wv-back');
const wvForward  = $('wv-forward');
const wvReload   = $('wv-reload');
const wvUrl      = $('wv-url');
const wvLoadBar  = $('wv-loading');
const loginHint  = $('wv-login-hint');
const toastEl    = $('toast');

// 쿠키 탭
const cookieInput  = $('cookie-input');
const btnInject    = $('btn-inject');
const btnVerify    = $('btn-verify');
const btnExport    = $('btn-export');
const btnClearCk   = $('btn-clear-ck');
const ckStatusCard = $('ck-status-card');
const ckAvatar     = $('ck-avatar');
const ckName       = $('ck-name');
const ckSub        = $('ck-sub');
const ckDot        = $('ck-dot');
const fmtHint      = $('fmt-hint');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  State
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let channels  = [];
let failedChs = [];
let running   = false;
let stopFlag  = false;
let logItems  = 0;
let currentFmt = 'json';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Toast
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let toastTimer;
function showToast(msg, color = 'var(--text)') {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.style.color = color;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Tab 전환
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    $('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CSV 파싱
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (!lines.length) return [];
  const header    = lines[0].toLowerCase();
  const hasHeader = header.includes('channel id') || header.includes('channel_id');
  const dataLines = hasHeader ? lines.slice(1) : lines;
  return dataLines.map(line => {
    const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
    if (hasHeader) {
      const cols  = header.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const idIdx = cols.findIndex(c => c === 'channel id' || c === 'channel_id');
      const tIdx  = cols.findIndex(c => c === 'channel title' || c === 'channel_title');
      return { id: parts[idIdx] ?? parts[0], title: parts[tIdx] ?? parts[0] };
    }
    return { id: parts[0], title: parts[2] || parts[0] };
  }).filter(ch => ch.id && ch.id.startsWith('UC'));
}

function refreshCount() {
  channels = parseCSV(csvInput.value);
  chCount.textContent = channels.length + ' 채널';
  sTot.textContent    = channels.length;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  쿠키 파싱 — 3가지 포맷 지원
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * JSON 배열 파싱
 * Chrome DevTools "Copy all as JSON" 또는 EditThisCookie Export
 */
function parseCookieJSON(text) {
  const raw = JSON.parse(text.trim());
  if (!Array.isArray(raw)) throw new Error('JSON 배열이 아닙니다');
  return raw.map(c => ({
    name:           c.name,
    value:          c.value,
    domain:         c.domain   || '.youtube.com',
    path:           c.path     || '/',
    secure:         c.secure   !== undefined ? c.secure   : true,
    httpOnly:       c.httpOnly !== undefined ? c.httpOnly : false,
    sameSite:       c.sameSite || 'no_restriction',
    expirationDate: c.expirationDate || c.expires || undefined,
    url:            'https://www.youtube.com',
  })).filter(c => c.name && c.value);
}

/**
 * Header 문자열 파싱
 * DevTools → Network → Request Headers의 cookie: 값
 * 형식: "name1=value1; name2=value2; ..."
 */
function parseCookieHeader(text) {
  // "cookie: " 접두어 제거
  const cleaned = text.replace(/^cookie:\s*/i, '').trim();
  return cleaned.split(';').map(pair => {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) return null;
    return {
      name:     pair.slice(0, eqIdx).trim(),
      value:    pair.slice(eqIdx + 1).trim(),
      domain:   '.youtube.com',
      path:     '/',
      secure:   true,
      httpOnly: false,
      sameSite: 'no_restriction',
      url:      'https://www.youtube.com',
    };
  }).filter(c => c && c.name && c.value);
}

/**
 * Netscape / EditThisCookie 텍스트 포맷 파싱
 * 형식: domain \t flag \t path \t secure \t expiry \t name \t value
 */
function parseCookieNetscape(text) {
  return text.trim().split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(line => {
      const parts = line.split('\t');
      if (parts.length < 7) return null;
      const [domain, , path, secure, expiry, name, value] = parts;
      return {
        name:           name.trim(),
        value:          value.trim(),
        domain:         domain.trim(),
        path:           path.trim() || '/',
        secure:         secure.trim().toUpperCase() === 'TRUE',
        httpOnly:       false,
        sameSite:       'no_restriction',
        expirationDate: parseInt(expiry) || undefined,
        url:            'https://www.youtube.com',
      };
    }).filter(c => c && c.name && c.value);
}

function parseCookies(text, fmt) {
  switch (fmt) {
    case 'json':      return parseCookieJSON(text);
    case 'header':    return parseCookieHeader(text);
    case 'netscape':  return parseCookieNetscape(text);
    default:          return parseCookieJSON(text);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  포맷 힌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const FMT_HINTS = {
  json: `<strong>JSON 배열 형식</strong> — EditThisCookie "Export" 또는 DevTools "Copy all as JSON"<br>
[{"name":"SAPISID","value":"AbCd...","domain":".youtube.com"}, ...]`,
  header: `<strong>Header 문자열 형식</strong> — DevTools → Network → Request Headers의 cookie: 값<br>
SAPISID=AbCd...; SSID=efGh...; SID=ijKl...; ...`,
  netscape: `<strong>Netscape 형식</strong> — EditThisCookie "Export as Netscape" 또는 .txt 쿠키 파일<br>
.youtube.com	TRUE	/	TRUE	1234567890	SAPISID	AbCd...`,
};

function updateFmtHint(fmt) {
  fmtHint.innerHTML = FMT_HINTS[fmt] || '';
  const PLACEHOLDERS = {
    json:      '[{"name":"SAPISID","value":"AbCdEf...","domain":".youtube.com"},\n {"name":"SID","value":"...","domain":".youtube.com"}, ...]',
    header:    'SAPISID=AbCdEf.../xxx; __Secure-1PAPISID=...; SID=...; SSID=...',
    netscape:  '.youtube.com\tTRUE\t/\tTRUE\t1893456000\tSAPISID\tAbCdEf.../xxx\n.youtube.com\tTRUE\t/\tTRUE\t1893456000\tSID\t...',
  };
  cookieInput.placeholder = PLACEHOLDERS[fmt] || '';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  로그인 상태 UI 업데이트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function setLoginStatus(loggedIn, accountName = '') {
  if (loggedIn) {
    ckStatusCard.classList.add('logged-in');
    ckDot.classList.add('on');
    ckAvatar.textContent = '✅';
    ckName.textContent   = accountName || '로그인됨';
    ckSub.textContent    = '유튜브 세션이 활성화되어 있습니다';
    loginHint.style.display = 'none';
  } else {
    ckStatusCard.classList.remove('logged-in');
    ckDot.classList.remove('on');
    ckAvatar.textContent = '👤';
    ckName.textContent   = '로그인 안 됨';
    ckSub.textContent    = '쿠키를 붙여넣거나 유튜브에서 직접 로그인하세요';
    loginHint.style.display = 'inline';
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  로그인 확인 — webview에서 계정명 추출
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function checkLogin() {
  try {
    const result = await wv.executeJavaScript(`
      (() => {
        // SAPISID 쿠키 확인
        const hasSapisid = document.cookie.includes('SAPISID=');
        // 계정 이름 추출 시도 (로그인 아바타 버튼의 aria-label)
        const avatarBtn = document.querySelector('button#avatar-btn') ||
                          document.querySelector('yt-img-shadow#avatar');
        const label = avatarBtn ? avatarBtn.getAttribute('aria-label') : null;
        return { loggedIn: hasSapisid, name: label };
      })()
    `);
    setLoginStatus(result.loggedIn, result.name || '');
    return result.loggedIn;
  } catch {
    setLoginStatus(false);
    return false;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  로그 헬퍼
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const now = () => new Date().toLocaleTimeString('ko-KR', {
  hour: '2-digit', minute: '2-digit', second: '2-digit'
});

function addLog(cls, msg) {
  const empty = $('log-empty');
  if (empty) empty.remove();
  const d = document.createElement('div');
  d.className = 'log-line';
  d.innerHTML = `<span class="log-t">${now()}</span><span class="log-m ${cls}">${msg}</span>`;
  logEl.appendChild(d);
  logEl.scrollTop = logEl.scrollHeight;
  logCnt.textContent = (++logItems) + ' 항목';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  통계 / 배지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function updateStats(proc, ok, fail) {
  sPrc.textContent = proc;
  sOk.textContent  = ok;
  sErr.textContent = fail;
  const total = channels.length || 1;
  const pct   = Math.round((proc / total) * 100);
  progFill.style.width = pct + '%';
  progPct.textContent  = pct + '%';
  progLbl.textContent  = `${proc} / ${total} 처리됨`;
}

function setBadge(text, color, bg) {
  tbBadge.textContent      = text;
  tbBadge.style.color      = color;
  tbBadge.style.background = bg;
  tbBadge.style.borderColor = color + '44';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  YouTube 구독 API (webview 내 실행)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function subscribeInWebview(channelId) {
  const code = `
    (async () => {
      const match = document.cookie.match(/SAPISID=([^;]+)/);
      if (!match) throw new Error('SAPISID 없음 — 로그인을 확인하세요');
      const SAPISID = match[1];

      const cfg        = (window.ytcfg && window.ytcfg.data_) ? window.ytcfg.data_ : {};
      const apiKey     = cfg.INNERTUBE_API_KEY     || '';
      const clientName = cfg.INNERTUBE_CLIENT_NAME || 'WEB';
      const clientVer  = cfg.INNERTUBE_CLIENT_VERSION || '2.20240101';

      const t   = Math.floor(Date.now() / 1000);
      const msg = t + ' ' + SAPISID + ' ' + location.origin;
      const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(msg));
      const hex = Array.from(new Uint8Array(buf))
                       .map(b => b.toString(16).padStart(2,'0')).join('');
      const hash = t + '_' + hex;

      const res = await fetch(
        'https://www.youtube.com/youtubei/v1/subscription/subscribe?key=' + apiKey + '&prettyPrint=false',
        {
          method: 'POST',
          headers: {
            'Content-Type':    'application/json',
            'Authorization':   'SAPISIDHASH ' + hash,
            'X-Goog-AuthUser': '0',
            'X-Origin':        location.origin,
          },
          body: JSON.stringify({
            context: { client: { clientName, clientVersion: clientVer } },
            channelIds: ['${channelId}'],
          }),
        }
      );
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return 'ok';
    })();
  `;
  return wv.executeJavaScript(code);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  메인 구독 루프
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const delay     = ms => new Promise(r => setTimeout(r, ms));
const randDelay = (a, b) => delay(a + Math.random() * (b - a));

async function runSubscribe(list) {
  // 로그인 체크
  const loggedIn = await checkLogin();
  if (!loggedIn) {
    addLog('log-err', '❌ 로그인 상태가 확인되지 않습니다. 쿠키 로그인 탭을 확인하세요.');
    showToast('❌ 로그인 필요', 'var(--red)');
    return;
  }

  running = true; stopFlag = false;
  btnStart.disabled = true;
  btnStop.disabled  = false;
  btnRetry.disabled = true;
  setBadge('실행 중', '#00e676', 'rgba(0,230,118,0.12)');

  const dmin      = parseInt(dMin.value) || 2000;
  const dmax      = parseInt(dMax.value) || 4000;
  const newFailed = []; let okCnt = 0;

  addLog('log-info', `▶ 구독 시작 — 총 ${list.length}개 채널`);

  for (let i = 0; i < list.length; i++) {
    if (stopFlag) { addLog('log-warn', '⏹ 사용자가 중지했습니다'); break; }
    const { id, title } = list[i];
    const prog = `[${i + 1}/${list.length}]`;
    try {
      await subscribeInWebview(id);
      okCnt++;
      addLog('log-ok', `${prog} ${title} 구독 완료 ✅`);
    } catch (e) {
      newFailed.push(list[i]);
      addLog('log-warn', `${prog} ${title} 실패 ⚠️ (${e.message})`);
    }
    updateStats(i + 1, okCnt, newFailed.length);
    if (i < list.length - 1 && !stopFlag) await randDelay(dmin, dmax);
  }

  failedChs = newFailed;
  if (newFailed.length) {
    addLog('log-warn', `실패 ${newFailed.length}개: ${newFailed.map(c => c.title).join(', ')}`);
    btnRetry.disabled = false;
  }
  addLog('log-info', `완료 — 성공 ${okCnt}개 / 실패 ${newFailed.length}개`);

  running = false;
  btnStart.disabled = false;
  btnStop.disabled  = true;
  setBadge(
    stopFlag ? '중지됨' : '완료',
    stopFlag ? '#ffb300' : '#448aff',
    stopFlag ? 'rgba(255,179,0,0.12)' : 'rgba(68,138,255,0.12)'
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  webview 이벤트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 뒤로/앞으로 버튼 상태 갱신 (공통 함수) ──
function updateNavButtons() {
  try {
    wvBack.disabled    = !wv.canGoBack();
    wvForward.disabled = !wv.canGoForward();
  } catch (e) { /* webview 아직 준비 안 됨 */ }
}

wv.addEventListener('did-start-loading', () => {
  wvLoadBar.style.transform = 'scaleX(0.7)';
});

wv.addEventListener('did-stop-loading', () => {
  wvLoadBar.style.transform = 'scaleX(1)';
  setTimeout(() => { wvLoadBar.style.transform = 'scaleX(0)'; }, 300);
  // 로드 완료 후 버튼 상태 + 로그인 상태 갱신
  updateNavButtons();
  setTimeout(() => checkLogin(), 1500);
});

wv.addEventListener('did-navigate', e => {
  wvUrl.textContent = e.url;
  updateNavButtons();
});

wv.addEventListener('did-navigate-in-page', e => {
  // 유튜브는 SPA — 대부분의 이동이 이 이벤트로 처리됨
  wvUrl.textContent = e.url;
  updateNavButtons();
});

wv.addEventListener('did-frame-navigate', () => {
  updateNavButtons();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  쿠키 탭 이벤트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 포맷 탭 전환
document.querySelectorAll('.fmt-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.fmt-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFmt = tab.dataset.fmt;
    cookieInput.value = '';
    updateFmtHint(currentFmt);
  });
});

// 쿠키 주입
btnInject.addEventListener('click', async () => {
  const raw = cookieInput.value.trim();
  if (!raw) { showToast('⚠ 쿠키를 입력하세요', 'var(--amber)'); return; }

  btnInject.disabled = true;
  btnInject.textContent = '⏳ 주입 중...';

  try {
    const cookies = parseCookies(raw, currentFmt);
    if (!cookies.length) throw new Error('파싱된 쿠키가 없습니다');

    // main 프로세스에 쿠키 배열 전달 → persist:youtube 세션에 직접 저장
    const result = await ipcRenderer.invoke('inject-cookies', cookies);

    addLog('log-info', `🍪 쿠키 주입 완료 — 성공 ${result.success}개 / 실패 ${result.failed}개`);
    if (result.errors.length) {
      result.errors.slice(0, 3).forEach(e => addLog('log-warn', `  ⚠ ${e}`));
    }

    showToast(`✅ 쿠키 ${result.success}개 주입됨`, 'var(--green)');

    // webview 새로고침 (세션 반영)
    wv.reload();
    setTimeout(() => checkLogin(), 2000);

  } catch (e) {
    addLog('log-err', `❌ 쿠키 파싱 실패: ${e.message}`);
    showToast('❌ 파싱 실패: ' + e.message, 'var(--red)');
  } finally {
    btnInject.disabled = false;
    btnInject.textContent = '🍪 쿠키 주입 후 유튜브 새로고침';
  }
});

// 로그인 확인
btnVerify.addEventListener('click', async () => {
  btnVerify.textContent = '확인 중...';
  const ok = await checkLogin();
  showToast(ok ? '✅ 로그인 확인됨' : '❌ 로그인 안 됨', ok ? 'var(--green)' : 'var(--red)');
  btnVerify.textContent = '✓ 로그인 확인';
});

// 현재 쿠키 내보내기
btnExport.addEventListener('click', async () => {
  try {
    const cookies = await ipcRenderer.invoke('get-cookies');
    if (!cookies.length) { showToast('⚠ 저장된 쿠키가 없습니다', 'var(--amber)'); return; }
    const json = JSON.stringify(cookies, null, 2);
    // 클립보드에 복사
    await navigator.clipboard.writeText(json);
    showToast(`📋 쿠키 ${cookies.length}개 클립보드 복사됨`, 'var(--blue)');
    addLog('log-info', `↑ 쿠키 ${cookies.length}개 내보내기 완료 (클립보드)`);
  } catch (e) {
    showToast('❌ ' + e.message, 'var(--red)');
  }
});

// 세션 초기화
btnClearCk.addEventListener('click', async () => {
  if (!confirm('유튜브 로그인 세션을 모두 삭제하시겠습니까?')) return;
  try {
    const result = await ipcRenderer.invoke('clear-cookies');
    addLog('log-warn', `🗑 세션 초기화 — ${result.cleared}개 쿠키 삭제됨`);
    showToast(`🗑 쿠키 ${result.cleared}개 삭제됨`, 'var(--amber)');
    setLoginStatus(false);
    wv.reload();
  } catch (e) {
    showToast('❌ ' + e.message, 'var(--red)');
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  구독 탭 이벤트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
btnFile.onclick = async () => {
  const result = await ipcRenderer.invoke('open-csv-dialog');
  if (!result) return;
  if (result.error) { addLog('log-err', '파일 읽기 실패: ' + result.error); return; }
  csvInput.value = result.content;
  fileName.textContent = result.path.split(/[\\/]/).pop();
  refreshCount();
  addLog('log-info', `📂 파일 로드: ${fileName.textContent} (${channels.length}개 채널)`);
};

csvInput.addEventListener('input', refreshCount);

btnStart.onclick = () => {
  if (!channels.length) { addLog('log-err', '❌ 채널 목록이 비어있습니다'); return; }
  if (running) return;
  [sPrc, sOk, sErr].forEach(el => el.textContent = '0');
  progFill.style.width = '0%';
  progPct.textContent  = '0%';
  progLbl.textContent  = '준비 완료';
  runSubscribe([...channels]);
};

btnStop.onclick = () => { stopFlag = true; };

btnRetry.onclick = () => {
  if (!failedChs.length || running) return;
  channels = [...failedChs];
  sTot.textContent    = channels.length;
  chCount.textContent = channels.length + ' 채널';
  runSubscribe([...channels]);
};

btnClr.onclick = () => {
  logEl.innerHTML = '<div class="log-empty">로그가 여기 표시됩니다</div>';
  logItems = 0;
  logCnt.textContent = '0 항목';
};

// webview 네비게이션
wvBack.onclick = () => {
  if (wv.canGoBack()) {
    wv.goBack();
    // 클릭 직후 즉각 비활성화 (로드 완료 전 중복 클릭 방지)
    setTimeout(updateNavButtons, 100);
  }
};
wvForward.onclick = () => {
  if (wv.canGoForward()) {
    wv.goForward();
    setTimeout(updateNavButtons, 100);
  }
};
wvReload.onclick  = () => wv.reload();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  초기화
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
updateFmtHint('json');
refreshCount();
