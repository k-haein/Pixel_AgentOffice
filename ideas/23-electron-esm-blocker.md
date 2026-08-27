# 23. 🚨 Electron 앱 실행 불가 — ESM 번들 + `electron` CJS 모듈 충돌

> 진단일: 2026-08-27 (포트폴리오 정리 세션) · 상태: **미수정 (blocker)**
> 영향 범위: `pnpm dev` · `pnpm dist:exe` — **데스크탑 앱 전체**
> 영향 없음: 웹 데모(렌더러 전용) · vitest · `pnpm build`

---

## 증상

`pnpm dev`, 그리고 Electron 바이너리 직접 실행(`node_modules\.bin\electron.cmd .`) 모두 동일하게 실패:

```
file:///D:/AIPrj/Pixel_AgentOffice/PixelAgentOffice/dist-electron/main.js:4
import { BrowserWindow, app, ipcMain, safeStorage, shell } from "electron";
         ^^^^^^^^^^^^^
SyntaxError: The requested module 'electron' does not provide an export named 'BrowserWindow'
    at #asyncInstantiate (node:internal/modules/esm/module_job:326:21)
Node.js v24.15.0
```

**창이 아예 안 뜬다.** Electron 프로세스가 0개로 즉시 종료.

---

## 원인

`electron/main.ts`는 소스에서 `import { app, BrowserWindow, ... } from 'electron'`을 쓴다.
빌드 산출물 `dist-electron/main.js`가 **ESM으로 출력**되면서 이 구문이 그대로 남았는데,
Electron의 `electron` 모듈은 **CommonJS**라 ESM 네임드 임포트를 제공하지 못한다.

ESM 출력이 된 경위 — `vite.config.ts`의 배너:

```js
banner: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
```

이 배너 자체가 **ESM `import` 문**이다. `de41fe0`(M-2F-0, Vercel AI SDK 전환, 2026-07-03)에서
*"`ai@7`의 CJS 의존성이 ESM 번들에서 `require("path")`를 호출해 앱이 안 뜬다"*를 해결하려고 넣었다.
→ **증상은 눌렀지만 원인(ESM 출력)은 그대로 뒀고, 그 원인이 더 큰 형태로 터진 것.**

부수 관찰: 실제 출력 2행이 `createRequire(import.meta.url);` 로만 남아 있다.
배너가 의도한 `const require = ` 할당이 번들러 처리 과정에서 사라졌다 — 배너가 제 역할을 하는지도 의심스럽다.

### 왜 지금까지 안 잡혔나

`pnpm build`는 **번들링만** 한다. 번들링은 성공한다. 실패는 **실행 시점**에만 난다.
그리고 `de41fe0` 이후 `pnpm dev`를 아무도 띄우지 않았다:

| 세션 | 기록 |
|---|---|
| §132 (07-03) | "e2e·tsc·lint·PC 시각 확인은 **미실행** (다음 세션 이월)" |
| §133 (07-07) | "PC 시각 확인 계속 이월" |
| §134 (07-07) | 동일 |
| §135 (07-09) | "PC 시각 검증 **미수행** — 이번 세션 `pnpm dev` 안 띄움" |

→ **"PC 시각 검증 이월"이 네 세션 연속 쌓인 게 게으름이 아니라 이 버그를 가리고 있었을 가능성이 크다.**
검증 상태 표에는 매번 `pnpm build 무결 / vitest 67 통과`가 적혔고, 둘 다 이 버그를 못 잡는 검사였다.

### 함께 확인된 사실

- Electron 바이너리 자체는 정상 설치돼 있음 (`node_modules/electron/dist/electron.exe` 존재, v42.0.1)
- v0.0.2 EXE(2026-06-24 빌드, 외부 테스터 사용)는 **이 커밋 이전**이라 정상 동작했음
- 즉 **2층 팀 협업(Phase 2·3·4)은 실제 앱에서 한 번도 돌아본 적이 없다.** 유닛 테스트는 `chat` 함수를 주입식 가짜로 넣어 통과한 것

---

## 수정 방안

### A안 — 메인 프로세스를 CommonJS로 빌드 ★ 추천

- `vite.config.ts` main 빌드에 `output.format: 'cjs'` + 확장자 `.cjs` (package.json이 `"type": "module"`이라 `.js`면 ESM으로 읽힘)
- `package.json`의 `"main": "dist-electron/main.js"` → `"main": "dist-electron/main.cjs"`
- **`createRequire` 배너 제거** — CJS에는 `require`가 원래 있으므로 배너의 존재 이유가 사라진다

**장점**: 원인과 증상을 한 번에 없앤다. AI SDK의 CJS 의존성 문제도 자연히 해결.
**주의**: `preload`도 현재 `.mjs`(ESM)다. sandbox 설정에 따라 같이 손봐야 할 수 있음 — 실행해봐야 안다.
**확인 필요**: `electron-builder` 패키징(`dist:exe`)이 새 파일명을 따라가는지.

### B안 — ESM 유지, import 방식만 변경

- `electron/` 5개 파일의 `import { app } from 'electron'` → `import electron from 'electron'; const { app } = electron`
- 대상: `main.ts` · `preload.ts` · `data/store.ts` · `llm/apiKeys.ts` · `llm/usage.ts`

**장점**: 빌드 파이프라인을 안 건드림.
**단점**: 원인(ESM 출력)은 그대로 → 배너 문제와 preload ESM 문제가 남을 수 있음. 대증요법.

---

## 재발 방지 제안

- **`pnpm build` 통과 = 앱이 뜬다, 가 아니다.** 검증 상태 표에 "빌드 무결"과 "실행 확인"을 분리 기재
- e2e(Playwright + `_electron.launch()`)가 실제로 앱을 띄우므로, **e2e 1개만 CI로 돌려도 이 버그는 즉시 잡힌다.** `pnpm test:e2e`가 §132부터 함께 이월된 것이 뼈아프다
- HANDOFF 검증 상태에 `pnpm dev 실행 확인: ✅/❌` 줄 신설
