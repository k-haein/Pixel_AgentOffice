# M3 — 다중 LLM 연결 + E2E 자동 테스트

> 마일스톤 도달일: 2026-05-14 (코드 완성)
> 소요 시간: 약 1세션 (M3-a Claude + M3-b Gemini + Playwright 셋업)
> 코드 라인 수: ~1,800 LOC (M2 대비 +400)
> 상태: 코드 완성, 실제 동작 검증은 사용자 환경 (Gemini quota 정책 이슈)

---

## 🎯 목표

> "실제 LLM과 대화 가능. Anthropic Claude (유료) + Google Gemini (무료 한도) 둘 다 지원."

원래 M3-a는 Claude만 계획했으나, 사용자가 "이미 Claude 쓰는 사람에게 UI만 무료로" 비전을 가지고 있었고, 그게 Anthropic ToS상 불가능함을 발견. **무료 진입 옵션 확보 → Gemini 추가 결정 → 다중 LLM 아키텍처로 확장**.

---

## ✅ 달성한 것

### 다중 LLM 인프라
- [x] `@anthropic-ai/sdk` + `@google/generative-ai` 설치
- [x] `electron/llm/` 폴더 — provider abstraction:
  - `types.ts` — LLMProvider 인터페이스, ChatRequest, LLMError
  - `anthropic.ts` — Claude API 래퍼
  - `gemini.ts` — Google Generative AI 래퍼
  - `registry.ts` — model에서 provider 자동 추론
  - `dispatch.ts` — 통합 chat() 함수 (provider 무관)
  - `apiKeys.ts` — provider별 safeStorage 분리 + 하위호환 마이그레이션
- [x] IPC 갱신 — `llm:chat`, `apikey:*` 핸들러
- [x] Model 타입 6종 — Claude 3 + Gemini 3
- [x] `MODEL_INFO` 메타데이터 — label/tier/provider/desc

### UI 통합
- [x] Settings 모달 — Google + Anthropic 두 키 입력란 분리, Free/Paid 모델 그룹 UI
- [x] Hire/Memo 모달 — 모델 선택을 Free/Paid 그룹으로
- [x] ChatPopup — provider별 친절한 에러 메시지 (quota=0, RATE_LIMIT, INVALID_KEY 등)

### Playwright E2E 자동 테스트
- [x] `@playwright/test` + `dotenv` 설치
- [x] `playwright.config.ts` — Electron 테스트 설정
- [x] `tests/e2e/helpers.ts` — launchApp + 환경변수 키 로딩
- [x] 3개 시나리오:
  - 01-launch: 앱 띄움 + 타이틀 검증
  - 02-api-key: 설정 모달에서 Gemini 키 저장
  - 03-gemini-chat: 모델 변경 + 채팅 + 응답 검증
- [x] `window.__test` 헬퍼 — Phaser 캔버스 우회 (좌표 클릭 어려움 해결)
- [x] `package.json` scripts: `test:e2e`, `test:e2e:no-build`, `test:e2e:report`
- [x] `.env.local.example` — 키 템플릿 (gitignored)

---

## 🔧 기술적 의사결정

| 결정 | 선택 | 이유 |
|---|---|---|
| LLM SDK | `@anthropic-ai/sdk` + `@google/generative-ai` (직접) | Agent SDK 미선택 — 도구 사용·OAuth 안 필요, 가벼움 |
| Provider 분리 | `LLMProvider` 인터페이스 | 추후 Groq/Ollama 추가 5분 |
| Model → Provider 매핑 | `providerFromModel()` (이름 prefix) | 사용자에겐 단일 선택만 보임 |
| API 키 저장 | provider별 별도 파일 + safeStorage | 보안 + 분리 |
| 첫 실행 기본 모델 | `gemini-2-5-flash` (무료) | 무료 진입 의도 |
| 스트리밍 | 비-스트리밍 우선 (M3 단순화) | 응답 끝까지 받고 표시 |
| E2E 빌드 전략 | Production build (`dist-electron/main.js`) | HMR/StrictMode 변수 제거 |
| Phaser 인터랙션 우회 | `window.__test` 헬퍼 | 캔버스 좌표 클릭보다 안정적 |

---

## 🐛 만난 이슈와 해결

### 1. `erasableSyntaxOnly` TS 에러
**증상**: ClaudeError 클래스의 `constructor(public code: ...)` parameter property가 erasable 아님
**해결**: 명시적 필드 + 본문 할당으로 변경

### 2. Gemini quota = 0 (사용자 환경)
**증상**: Flash로 변경해도 첫 호출에 RATE_LIMIT
**진단**: gemini.ts에 raw error 로깅 추가 → `limit: 0` 발견
**원인**: 2024년 Google 정책 — 신규 Cloud 프로젝트 기본 quota = 0
**해결**: 코드에 `limit: 0` 분기 추가 + 사용자 가이드 메시지, 사용자에게 결제 등록 또는 기존 프로젝트 키 사용 권장

### 3. Playwright Phaser 캔버스 인터랙션
**증상**: 💬 말풍선 클릭이 Canvas 내부라 좌표 기반 클릭 까다로움
**해결**: App.tsx에 `window.__test.openChat()` helper 노출. 테스트에서 이걸 호출.

### 4. ESLint react-hooks/set-state-in-effect (React 19 새 룰)
**증상**: 모달들의 `useEffect`에서 setState 직접 호출 위반
**해결**: 조건부 마운트 패턴 (`{open && <Modal />}`) + state 초기값으로 props 사용

---

## 💡 핵심 인사이트 (비즈니스 영향)

### "Claude 구독자 = 우리 앱 무료" 모델 불가능 (Anthropic ToS)
사용자의 원래 비전이 정책적으로 막혀있음을 확인:
- Claude.ai Pro 구독은 외부 앱에서 활용 불가
- Claude Code SDK OAuth도 ToS 위반
- → BYOK 모델 또는 백엔드 결심 필요

### Gemini "무료"의 실체 — 카드 등록 사실상 강제
- 2024년부터 신규 Google Cloud 프로젝트 quota = 0
- 키 발급 ≠ 사용 권한
- 한국 사용자는 카드 등록해야 무료 한도 활성화
- 사용자 깨달음: "이거 다른 사람들도 결제 등록해야 해?"

### 대안 — 4가지 옵션 정리 (12-business-model.md)
- A. BYOK 유지 (현재)
- B. 백엔드 + SaaS (사업 결심)
- C. **Groq + 데모 모드** 추가 (진짜 무료 옵션) ⭐
- D. Ollama 로컬 LLM

→ 사용자 결정 보류, 다음 라운드에서 진행 예정.

---

## 📐 코드 구조 (M3 추가분)

```
PixelAgentOffice/
├─ electron/
│  ├─ llm/                       # 🆕 다중 LLM 인프라
│  │  ├─ types.ts                # LLMProvider 인터페이스
│  │  ├─ anthropic.ts            # Claude 래퍼
│  │  ├─ gemini.ts               # Gemini 래퍼
│  │  ├─ registry.ts             # model → provider
│  │  ├─ dispatch.ts             # 통합 chat()
│  │  └─ apiKeys.ts              # provider별 키 저장
│  ├─ main.ts                    # IPC 갱신
│  └─ preload.ts                 # window.api 갱신
├─ src/
│  ├─ shared/types.ts            # Model 6종 + MODEL_INFO
│  └─ components/
│     ├─ SettingsModal.tsx       # 두 키 입력 + 모델 그룹
│     ├─ HireModal.tsx           # Free/Paid 모델 그룹
│     ├─ MemoModal.tsx           # Free/Paid 모델 그룹
│     └─ ChatPopup.tsx           # 실제 LLM 호출 + 친절 에러
└─ tests/                        # 🆕 E2E 자동 테스트
   └─ e2e/
      ├─ helpers.ts
      ├─ 01-launch.spec.ts
      ├─ 02-api-key.spec.ts
      └─ 03-gemini-chat.spec.ts
```

---

## 📊 통계

- **신규 코드 파일**: 10개 (llm/ 6개 + tests/e2e/ 4개)
- **수정 파일**: 8개 (main.ts, preload.ts, App.tsx, 3개 모달, ChatPopup, types.ts)
- **순 추가 LOC**: ~400 (M2 → M3)
- **새 패키지**: 4개 (`@anthropic-ai/sdk`, `@google/generative-ai`, `@playwright/test`, `dotenv`)
- **TypeScript/Lint 에러**: 0
- **E2E 테스트 시나리오**: 3개
- **지원 LLM 모델**: 6개 (Claude 3 + Gemini 3)
- **빌드 시간**: 1.6초 (main.js 350KB로 커짐)

---

## 🚧 의도적 미구현 (다음 마일스톤)

| 항목 | 마일스톤 | 이유 |
|---|---|---|
| 스트리밍 응답 | M3-c | 비-스트리밍으로 먼저 검증 |
| 토큰 사용량 UI | M3-c | 백엔드는 받음, UI만 미구현 |
| 채팅 영속화 | M3-c | 진짜 대화 생기면 |
| 메모리 시스템 | M4 | 대화 누적 후 압축 |
| Groq Provider | (사용자 결정 후) | 진짜 무료 옵션 |
| 데모 모드 | (사용자 결정 후) | 카드 없는 둘러보기 |
| 자동 차단 (예산 한도) | M3-c | Cloud Function 셋업 |

---

## 🎯 다음 단계 — 결정 대기 중

사용자가 **고민 중**:
- A. Groq + 데모 모드 추가 (1시간 작업) → 진짜 무료 진입
- B. 본인 학습용으로만 + 배포는 나중에
- C. 백엔드 사업 결심

추가로 사용자가 요청: **PRD / 와이어프레임** 만들기. 같은 세션 후반에 완료 (`PRD.md` + `visuals/wireframes-v2.html`).

---

## 🔥 후속 발견 — Gemini 2.0 Flash 폐기 (같은 날, 컴팩트 이후)

**증상**: 채팅 시도 → "⚠️ 네트워크 연결을 확인해주세요" 표시.

**진단 흐름**:
1. 에러 분류 로직이 `msg.includes('fetch')`로 SDK 에러 메시지를 NETWORK로 오분류한 것 발견
2. fallback에 raw 메시지 노출 + 분류 로직 개선 후 재시도
3. 진짜 메시지: `[404 Not Found] This model models/gemini-2.0-flash is no longer available to new users.`

**원인**: Google이 `gemini-2.0-flash`를 신규 사용자에게 차단. 우리가 "⭐ 무료 한도 큼" 옵션으로 푸시했던 모델.

**대응**:
- `Model` union에서 `gemini-2-0-flash` 제거 (TS 컴파일 타임 안전)
- `DEPRECATED_MODELS` 매핑 신규 → 로드 시 폐기 모델 자동 치환
- `store.ts loadData()` 에 마이그레이션 + 디스크 재저장
- 모달 3종 (Hire/Memo/Settings)에서 선택지 제거
- gemini.ts 에러 분류 개선 (HTTP status 기반)

**교훈**:
- 외부 의존(LLM 라인업)은 폐기 통보 없이 흔들린다 → 우리 default 옵션이 즉시 무너짐
- `DEPRECATED_MODELS` 패턴은 미래에 또 발생할 폐기에 재사용
- 에러 메시지 분류는 키워드 매칭(`fetch`)이 SDK의 다른 정상 출력과 충돌하기 쉽다 → status 기반이 더 견고
- fallback에 raw 메시지를 항상 노출해야 디버깅 가능

**검증**: 사용자 환경에서 정상 동작 확인.
