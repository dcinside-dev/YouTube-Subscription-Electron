<div align="center">

# 📺 YouTube 구독 자동화

**Google Takeout CSV로 YouTube 구독 대량 자동 Electron 데스크탑 앱**

![Electron](https://img.shields.io/badge/Electron-29.0-47848F?style=flat-square&logo=electron&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

</div>

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| 📋 **구독 자동화** | Google Takeout CSV를 불러와 수백 개 채널을 자동 구독 |
| 🍪 **쿠키 로그인** | JSON / Header / Netscape 형식 쿠키를 붙여넣어 계정 세션 주입 |
| 🌐 **내장 브라우저** | 앱 안에 유튜브가 내장되어 직접 로그인 및 탐색 가능 |
| ⏱ **랜덤 딜레이** | 구독마다 2~4초 랜덤 딜레이로 YouTube 차단 방지 |
| 🔄 **실패 재시도** | 실패한 채널만 골라서 자동 재시도 |
| 📊 **실시간 로그** | 진행률 바 + 채널별 성공/실패 로그 실시간 표시 |
| 💾 **세션 유지** | 앱을 껐다 켜도 로그인 상태 유지 (`persist:youtube` 파티션) |

---

## 📸 스크린샷

```
┌─────────────────────────┬──────────────────────────────────────┐
│  📋 구독 실행  🍪 쿠키   │  ← › ↺  https://www.youtube.com     │
├─────────────────────────┤                                      │
│ 📂 파일 선택             │                                      │
│ ┌─────────────────────┐ │         YouTube (내장 브라우저)       │
│ │ Channel Id,Url,...  │ │                                      │
│ │ UCxxxxxx,...        │ │    새 계정으로 직접 로그인하거나       │
│ └─────────────────────┘ │    쿠키 탭에서 세션을 주입하세요      │
│ 딜레이: 2000 ~ 4000 ms  │                                      │
│ [전체:5][처리:3][성공:2] │                                      │
│ ████████░░  60%         │                                      │
│ ▶ 구독 시작              │                                      │
│ 11:25:30 채널A 완료 ✅   │                                      │
│ 11:25:33 채널B 완료 ✅   │                                      │
└─────────────────────────┴──────────────────────────────────────┘
```

---

## 🚀 빠른 시작

### 요구사항

- [Node.js](https://nodejs.org) 18 이상 (LTS 권장)
- npm 9 이상 (Node.js 설치 시 자동 포함)

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/YOUR_USERNAME/yt-sub-app.git](https://github.com/dcinside-dev/YouTube-Subscription-Electron.git
cd yt-sub-app

# 2. 의존성 설치
npm install

# 3. 앱 실행
npm start
```

---

## 📦 빌드 (배포용 설치 파일)

```bash
# Windows (.exe 설치 파일)
npm run build:win

# macOS (.dmg)
npm run build:mac

# Linux (.AppImage)
npm run build:linux
```

빌드 결과물은 `dist/` 폴더에 생성됩니다.

---

## 🎮 사용 방법

### 1단계 — 구독 목록 내보내기 (Google Takeout)

1. [takeout.google.com](https://takeout.google.com) 접속
2. **모두 선택 해제** 후 **YouTube** 항목만 체크
3. YouTube 옵션에서 **구독** 항목만 선택
4. 내보내기 → 다운로드 → 압축 파일에서 `subscriptions.csv` 추출

`subscriptions.csv` 형식:
```
Channel Id,Channel Url,Channel Title
UCxxxxxxxxxxxxxxxxxxxxxx,https://www.youtube.com/channel/UCxxxxxx,채널이름A
UCyyyyyyyyyyyyyyyyyyyyyy,https://www.youtube.com/channel/UCyyyyyy,채널이름B
```

---

### 2단계 — 새 계정으로 로그인

**방법 A: 앱 내 직접 로그인**
1. 앱 오른쪽 내장 브라우저에서 유튜브 로그인 버튼 클릭
2. 새 계정으로 직접 로그인

**방법 B: 쿠키 주입 (🍪 쿠키 로그인 탭)**

기존 계정의 세션 쿠키를 추출해 새 계정에 주입하는 방식입니다.

> **EditThisCookie 확장 사용 (권장)**
> 1. Chrome에 [EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie) 설치
> 2. YouTube에 로그인한 상태에서 확장 아이콘 클릭
> 3. **Export** 버튼 클릭 → JSON 복사
> 4. 앱의 **쿠키 로그인 탭** → 붙여넣기 → **쿠키 주입** 클릭

지원하는 쿠키 형식:
- `JSON 배열` — EditThisCookie Export 또는 DevTools "Copy all as JSON"
- `Header 문자열` — DevTools → Network → Request Headers의 `cookie:` 값
- `Netscape` — 텍스트 파일 형식 쿠키

---

### 3단계 — 구독 실행

1. **📋 구독 실행 탭** 선택
2. **파일 선택** 버튼으로 `subscriptions.csv` 불러오기  
   또는 텍스트 영역에 CSV 내용 직접 붙여넣기
3. **딜레이 설정** (기본 2000~4000ms, 많은 구독 시 3000~6000ms 권장)
4. **▶ 구독 시작** 클릭
5. 실시간 로그에서 진행 상황 확인
6. 완료 후 실패한 채널은 **↻ 실패 재시도** 버튼으로 재시도

---

## ⚙️ 작동 원리

YouTube 외부 API 키 없이 **내장 브라우저의 로그인 세션**을 직접 활용합니다.

```
[CSV 파싱] → 채널 ID 목록 추출
      │
      ▼
[webview.executeJavaScript()]  ← youtube.com 컨텍스트에서 실행
      │
      ├─ document.cookie          → SAPISID / __Secure-3PAPISID 추출
      ├─ window.ytcfg.data_       → INNERTUBE_API_KEY, CLIENT_VERSION 추출
      ├─ crypto.subtle.digest()   → SAPISIDHASH 생성 (SHA-1)
      └─ fetch()                  → /youtubei/v1/subscription/subscribe POST
      │
      ▼
[IPC: ipcRenderer → ipcMain]   ← 결과 전달
      │
      ▼
[실시간 로그 패널]              ← 성공/실패 표시
```

### 핵심 인증 방식

YouTube 내부 API는 `SAPISIDHASH` 인증을 사용합니다:

```
SAPISIDHASH = SHA1(timestamp + " " + SAPISID + " " + "https://www.youtube.com")
Authorization: SAPISIDHASH {timestamp}_{hash}
```

webview의 `partition="persist:youtube"`로 세션이 영구 보존되므로 앱 재시작 후에도 재로그인이 필요 없습니다.

---

## 📁 프로젝트 구조

```
yt-sub-app/
├── main.js           ← Electron 메인 프로세스
│                        (BrowserWindow 생성, IPC 핸들러, 쿠키 관리)
├── package.json      ← 의존성 및 electron-builder 빌드 설정
├── src/
│   ├── index.html    ← 메인 UI
│   │                    (좌: 탭 패널 / 우: YouTube webview)
│   └── renderer.js   ← 렌더러 프로세스 로직
│                        (CSV 파싱, 구독 루프, 쿠키 처리, IPC 통신)
└── assets/
    ├── icon.ico      ← Windows 아이콘
    └── icon.icns     ← macOS 아이콘
```

---

## ⚠️ 주의사항

- **차단 방지**: 한 번에 100개 이상 구독 시 YouTube가 일시적으로 요청을 제한할 수 있습니다. 딜레이를 3000~6000ms로 설정하거나 100개씩 나눠서 실행하세요.
- **이미 구독 중인 채널**: 중복 구독 요청은 오류 없이 무시됩니다.
- **로그인 필수**: 구독 시작 전 반드시 새 계정으로 로그인 여부를 확인하세요.

---

## 🛠 기술 스택

- **[Electron](https://www.electronjs.org/)** v29 — 크로스플랫폼 데스크탑 앱 프레임워크
- **[electron-builder](https://www.electron.build/)** — 설치 파일 패키징
- **Vanilla JS / HTML / CSS** — 외부 UI 프레임워크 없음
- **YouTube Innertube API** — YouTube 내부 비공개 API (API 키 불필요)

---

## 📝 라이선스

MIT License — 자유롭게 사용, 수정, 배포 가능합니다.

---

## 🙋 FAQ

**Q. API 키가 필요한가요?**  
A. 아닙니다. YouTube 내부 API를 로그인 세션으로 직접 호출하므로 별도 API 키가 필요 없습니다.

**Q. 구독이 실패하는 이유는?**  
A. 로그인 상태를 먼저 확인하세요. 연속 요청이 많으면 딜레이를 늘려보세요. 실패한 채널은 "실패 재시도" 버튼으로 재시도할 수 있습니다.

**Q. 세션이 만료되면?**  
A. 쿠키 로그인 탭에서 다시 쿠키를 주입하거나 내장 브라우저에서 재로그인하면 됩니다.

**Q. Windows 외 OS도 지원하나요?**  
A. macOS, Linux도 지원합니다. 각각 `npm run build:mac`, `npm run build:linux`로 빌드하세요.
