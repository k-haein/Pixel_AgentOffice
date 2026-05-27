# Platform Adapter 패턴 도입 — 결정 흐름과 구현 회고

> 작성: 2026-05-19 (Day 8)
> 목적: 이 작업을 *왜 했는지*, *어떤 대화에서 결심하게 됐는지*, *어떻게 구현했는지* 의사결정 흐름을 보존.
> 비개발자도 따라갈 수 있는 톤으로 정리.
>
> 참고:
> - 추상화 자체에 대한 *개념* 설명: [`13-electron-and-mobile-strategy.md`](./13-electron-and-mobile-strategy.md)
> - 본 문서: *왜 / 언제 / 어떻게* 결정했는지 흐름

---

## 1. 결정 흐름 한눈에

```
태블릿에서 작업 가능한가?
   ↓
"웹 데모 배포하면 모바일에서 채팅도 돼?"
   ↓
"안 됨 — Electron 전용 API에 강하게 묶여있어서"
   ↓
"그럼 모바일 출시하려면 설계부터 다시?"
   ↓
"전체 다시는 X. 다만 백엔드 결심 필요"
   ↓
"백엔드 = 토큰 비용 우리가 내야 한다는 거?"
   ↓
"아니. BYOK + 백엔드 프록시면 사용자 부담. 우리는 서버 운영비만"
   ↓
사용자 결심: 모바일 출시 + 백엔드 + BYOK
   ↓
"Electron API 추상화가 뭐야?"
   ↓
"Platform Adapter 패턴 — 4~6시간 투자로 미래 모바일 진입 비용 ↓"
   ↓
👉 **도입 결정**
```

---

## 2. 계기 — 어떤 대화에서 시작됐는가

### Day 7 (2026-05-18): 태블릿 작업 가능성 논의

사용자가 GitHub에 코드를 푸시했고, **주말에 태블릿에서 이어 작업하고 싶다**는 요구가 등장.

> "내가 이 프로젝트를 핸드폰에서 연결해서 마저 진행한다고 하면, mcp 서버가 연결되어잇어야해?"

이때 알게 된 사실:
- 데스크탑 Claude Code → 모바일 ↔ 데스크탑 세션 이어받기 (Remote Control) — **회사 조직 정책으로 막힘**
- Chrome Remote Desktop은 가능하지만 *데스크탑 PC를 켜둬야 함*
- GitHub만으로는 *코드 수정*은 가능하지만 *실행/테스트 불가*

→ "주말 작업"을 진지하게 원한다면 **모바일에서 *실행*까지 되어야 한다**는 인식 등장.

### Day 8 (2026-05-19): 모바일 출시 진지하게 검토

> "이 프로젝트를 태블릿에서 실행해서 테스트해볼 수 있을까?"

답:
- iPad/Android 태블릿에서 Electron은 **직접 실행 불가** (Electron은 데스크탑 OS 전용)
- 웹 데모 배포해도 *시각만* 보일 뿐 채팅·저장 모두 작동 X (Electron API 의존)

> "직접 채팅도 가능하고?"
> "안 돼요. window.api 같은 Electron 전용 호출이 20군데 흩어져 있어서."

여기서 **Electron 의존성의 *비용***이 처음으로 *구체적*으로 인식됨. 단순 *데스크탑/모바일 빌드 차이*가 아니라, **컴포넌트 코드 자체가 Electron을 *직접* 알고 있다**는 게 문제.

### 사용자의 핵심 질문

> "근데 실제 LLM 연결을 못하면 의미가 없잖아. 나중에는 모바일이나 테블릿버전도 출시하고 싶은데 그것도 되게 하려면 설계부터 다시해야해?"

이 질문이 결정적이었다. 두 갈래로 답이 나뉨:
- **A. 설계 전체 다시 — NO**. 우리 코드 85%는 이미 환경 무관 (React, Phaser, 자리 시스템, LLM provider 추상화 등)
- **B. 다만 *Electron 전용 호출 부분*을 격리 필요** — 그게 Platform Adapter 패턴

### 백엔드 결심

> "백엔드를 한다는건, 지금처럼 API 키를 받아서 하는게 아니라 사람들의 토큰 비용을 내가 내야한다는거야?"

이 오해를 풀고 — **백엔드 + BYOK** 모델이 가능함을 확인:
- 사용자가 자기 API 키를 우리 백엔드에 등록 (사용자별 암호화 저장)
- 백엔드는 *프록시*만 — LLM 비용은 사용자가 직접 청구받음
- 우리 부담 = 서버 운영비만 (월 $10~50, 100~1000명 규모)

→ **사용자 결심**: 모바일 출시 + 백엔드 + BYOK. 사업 부담 *최소화* + 사용자 진입 부담 *유지*.

---

## 3. 검토했던 대안

### 대안 A: 그냥 한꺼번에 모바일 빌드 시점에 바꾸기
- 모바일 빌드 결심한 *그 시점에* 모든 `window.api.*` 호출을 찾아 바꿈
- **단점**:
  - 한 번에 20군데 + 백엔드 fetch 로직까지 함께 → 위험 큼
  - 디버깅 지옥 (어디서 깨졌는지 추적 어려움)
  - 그 동안 새 작업하면 또 `window.api.*` 추가됨 → 부담 누적

### 대안 B: Electron 전용 함수를 단순히 wrap (Facade 패턴)
- `api.ts` 같은 파일에 `function chatWithLLM(req) { return window.api.chatWithLLM(req) }` 정도만
- **단점**: 환경별 분기가 안 됨. 그냥 한 번 더 호출하는 layer일 뿐.

### 대안 C: Vite의 환경별 빌드 분기로 해결
- `vite.config.ts`에서 환경 변수 따라 다른 entry point
- **단점**: 컴포넌트 코드는 여전히 `window.api.*` 직접 호출. 빌드 단에선 해결 안 됨.

### 대안 D: Platform Adapter 패턴 ⭐ **채택**
- 환경 무관 인터페이스 1개 + 환경별 adapter 여러 개
- 컴포넌트는 인터페이스만 사용
- 환경 추가 = adapter 1개만 작성
- 미래 mock·E2E·데모 모드도 같은 패턴으로 자연스럽게 확장

→ **장기적으로 가장 견고한 구조**.

---

## 4. 왜 Platform Adapter였나 — 핵심 가치 3가지

### (1) 컴포넌트 코드 = 환경 무관

Before:
```ts
const result = await window.api.chatWithLLM({ ... })  // ← Electron 강제 의존
```

After:
```ts
const result = await platform.chat({ ... })  // ← 환경 무관
```

**의미**: 같은 코드가 데스크탑(Electron)에서도, 모바일(Tauri/Capacitor)에서도, 단위 테스트(Mock)에서도 동작.

### (2) 미래 모바일 진입 비용 ↓

모바일 출시 시:
1. `src/platform/web.ts` 신규 작성 (백엔드 fetch 호출) — *1개 파일*
2. `index.ts` 환경 감지 분기에 web 추가 — *3줄*
3. 컴포넌트 코드 변경 → **0줄**

**비교 (Adapter 안 했을 경우)**: 20군데 `window.api.*` 찾아서 일일이 환경 분기 추가. 위험 + 시간 + 디버깅.

### (3) 테스트성 ↑

`mockPlatform`을 주입하면 LLM 호출 없이 결정론적 응답으로 단위 테스트 가능:
```ts
window.__PLATFORM_OVERRIDE__ = mockPlatform
// 이제 모든 chat() 호출이 가짜 응답 반환
```

미래 Playwright E2E에서 *실제 LLM 키 없이도* 채팅 흐름 테스트 가능.

---

## 5. 구현 결정 디테일

### 5.1 인터페이스 설계 — 메서드 12개

`window.api`에 노출된 모든 호출을 그대로 인터페이스로 옮김:

| 카테고리 | 메서드 |
|---|---|
| **Data 영속화** | `loadData`, `addEmployee`, `updateEmployee`, `removeEmployee`, `updateSettings` |
| **API 키 관리** | `saveApiKey`, `hasApiKey`, `deleteApiKey`, `isApiKeyStorageAvailable` |
| **LLM 호출** | `chat`, `abortChat`, `getRateLimit` |

**왜 이렇게 묶었나**: 데이터 영속화는 미래에 *백엔드 DB*로 가게 됨. API 키 관리는 *암호화 정책*에 묶임. LLM은 *프록시*로 분리.
→ 카테고리별로 *환경별 구현이 다를 책임*이 명확.

### 5.2 메서드 이름 정리

`window.api.chatWithLLM` → `platform.chat`으로 *짧고 명확하게*. (어차피 platform은 LLM 컨텍스트라 `WithLLM` 군더더기)

### 5.3 환경 감지 로직

```ts
function isElectronRenderer(): boolean {
  if (typeof window === 'undefined') return false
  return 'api' in window && typeof (window as any).api === 'object'
}
```

`window.api` 존재 여부로 Electron renderer인지 자동 판단. SSR 환경(`window` 없음)도 안전.

### 5.4 테스트 override 메커니즘

```ts
const w = window as { __PLATFORM_OVERRIDE__?: Platform }
return w.__PLATFORM_OVERRIDE__ ?? null
```

테스트에서 `window.__PLATFORM_OVERRIDE__ = mockPlatform` 한 줄로 환경 교체. Playwright E2E에서 활용 가능.

### 5.5 Mock adapter 같이 작성 — 데모 모드 씨앗

```ts
const FAKE_REPLIES = [
  '안녕! 잘 지냈어요?',
  '오 그건 흥미로운 질문이네요. 좀 더 생각해볼게요.',
  // ...
]
```

미래 *데모 모드* (API 키 없이 SNS 영상 촬영용)의 기반. 12-business-model.md의 옵션 D와 정합.

---

## 6. 구현 통계

| 항목 | 수치 |
|---|---|
| 신규 파일 | 4개 (types/electron/mock/index) |
| 수정 파일 | 7개 (App, ChatPopup, HireModal, MemoModal, SettingsModal, SeatPickerModal, OfficeScene) |
| `window.api.*` 호출 제거 | 약 20군데 → 0건 (electron adapter 내부 외) |
| 작업 시간 | 약 5시간 (예상 4~6시간과 일치) |
| TS 빌드 에러 | 0 |
| E2E 통과 | B-3 우클릭/zone **4/4** (핵심 인터랙션 회귀 없음) |

---

## 7. 같이 고친 사전 결함 2건

Platform 리팩토링 검증 중 발견한 *원래 있던* 작은 결함:

### (1) `index.html`의 `<title>` 대소문자
- 기존: `pixelagentoffice` (소문자) — Playwright `01-launch.spec.ts`가 `'PixelAgentOffice'` 기대해서 사전부터 fail
- 수정: 대문자 시작으로 통일

### (2) `03-gemini-chat.spec.ts`의 모델 라벨 검증
- 기존: `toContainText('gemini')` 정확 매칭 — M4 시점에 라벨이 `Gemini 2.5 Flash`로 바뀐 후 fail
- 수정: `toContainText(/gemini/i)` 정규식으로 대소문자 무관

→ 이 두 fix는 Platform 리팩토링과 무관하지만 *검증 통과를 위해 같이 처리*. 사전 부채 청산.

---

## 8. 미래 모바일 진입 시 어떻게 작동하는가

### Phase 3 — 백엔드 최소 (BYOK 프록시)

`src/platform/web.ts` 신규 작성:

```ts
export const webPlatform: Platform = {
  chat: (req) => fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  }).then(r => r.json()),

  saveApiKey: (provider, key) => fetch(`/api/keys/${provider}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  }),
  // ... 나머지 9개도 유사 패턴
}
```

`src/platform/index.ts` 분기 추가:

```ts
function detect(): Platform {
  // ... 기존 로직
  if (isElectronRenderer()) return electronPlatform
  if (typeof window !== 'undefined') return webPlatform  // ← 신규
  return mockPlatform
}
```

**컴포넌트 코드 변경 0줄**. 백엔드 API 엔드포인트만 작성하면 끝.

### Phase 5 — Tauri/Capacitor 모바일 빌드

같은 코드 그대로. Vite로 web build → Tauri/Capacitor가 그걸 native shell로 감쌈. `platform`은 `webPlatform`이 자동 선택됨.

---

## 9. 교훈

### "추상화는 결정이 명확해진 후에 도입"
이 패턴을 Day 1부터 도입했다면 *오버 엔지니어링*이었을 것. **모바일 출시 결심한 시점**에 도입한 게 정확한 타이밍.
→ "현재 환경(Electron)만 동작" 시점엔 직접 호출이 가장 단순. *환경이 늘어날 거라는 *확신*이 들 때* adapter 도입.

### "패턴 도입은 *컴포넌트 수정 비용*이 *추상화 도입 비용*보다 클 때"
20군데 흩어진 호출 + 미래 모바일·테스트·데모 환경 추가 예정 → 추상화가 명백히 이득.

### "사전 결함은 *리팩토링 후* 같이 청산"
큰 변경 검증 중 발견한 작은 결함은 그 자리에서 같이 처리. PR 분리하면 잊혀짐.

### "Mock adapter는 *Free* 부산물"
Electron adapter + Web adapter만 만들면 되는데 Mock도 같이 — 미래 *데모 모드* / *단위 테스트* / *Storybook* 모두 활용. **추상화의 자연스러운 보상**.

---

## 관련 문서

- [`13-electron-and-mobile-strategy.md`](./13-electron-and-mobile-strategy.md) — Electron 설명 + 모바일 전환 전반 전략
- [`12-business-model.md`](./12-business-model.md) — BYOK / SaaS / 백엔드 비용 모델
- [`../HANDOFF.md`](../HANDOFF.md) — 현재 상태 + 다음 작업
- [`../portfolio/PixelAgentOffice/PRD.md`](../portfolio/PixelAgentOffice/PRD.md) §7.2 — 모바일 출시 전략
