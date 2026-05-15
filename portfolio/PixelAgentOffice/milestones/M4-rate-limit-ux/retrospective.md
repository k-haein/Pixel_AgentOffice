# M4 — Rate Limit UX + 채팅 정밀화

> 마일스톤 도달일: 2026-05-15
> 소요: 약 1세션 (Claude 검증 + Rate limit 인프라 + UI 5차 협의 + 우클릭 컨텍스트 메뉴)
> 코드 라인 수: 약 +600 LOC (M3 대비)
> 상태: 동작 검증 완료, 사용자 만족도 OK

---

## 🎯 목표

M3에서 "코드 완성"이었지만 *진짜로 일반 사용자가 쓰기 좋은가?* 라는 질문에 대답하는 단계.
주요 격차:
- 분당 한도 도달 시 사용자가 *왜 막혔는지* 모름
- 에러 메시지가 raw API 응답을 그대로 노출 (개발자 외에 무서움)
- 페르소나가 자기 이름 모름 ("Mary?" → "저는 Claude입니다")
- 채팅 중간에 멈출 수 없음
- 비용/토큰 사용량 어디서도 확인 불가
- 설정이 늘어나면서 사용자가 *어디서 무엇을 바꾸는지* 못 찾을 위험

→ 위 모두 해결.

---

## ✅ 달성한 것

### Rate Limit UX 인프라
- [x] `electron/llm/usage.ts` — sliding window RPM 카운터 + 세션 누적 통계
- [x] `dispatch.ts` 사전 차단 — 한도 도달 직전에 우리가 막아서 API 호출 자체를 안 함 (quota 보존)
- [x] MODEL_INFO에 `rpm` (분당 한도) + `pricing` (1M 토큰 단가)
- [x] `USD_TO_KRW` 환율 + `estimateCostUsd` 헬퍼
- [x] `RateLimitStatus` IPC 응답에 동봉 — UI 매 호출마다 자동 갱신

### 친절 에러 시스템
- [x] `errorMessages.ts` 신규 — `LLMError → FriendlyError` 매핑 (`humanizeError`)
- [x] 신규 에러 코드: `RATE_LIMIT_LOCAL` / `INSUFFICIENT_CREDIT` / `SERVICE_BUSY` / `ABORTED`
- [x] Provider별 분류 강화 — Anthropic credit_balance_too_low, Google 503/overloaded 등 별도 분기
- [x] HTTP status code 추출하여 `debugCode` 필드에 (사용자 친화 메시지 + 개발자용 코드 분리)

### Gemini 2.0 Flash 폐기 대응
- [x] `Model` union에서 제거
- [x] `DEPRECATED_MODELS` 매핑 — 폐기 모델 ID → 살아있는 모델 ID
- [x] `store.ts loadData()` 마이그레이션 + 디스크 재저장 (영구화)

### 페르소나 정체성
- [x] `buildSystemPrompt`에 identity 블록 추가
- [x] AI 정직성 균형 — "당신은 AI인가요?" 같은 직접 질문엔 정직, 일반 대화엔 페르소나 유지

### 채팅 중단
- [x] `AbortController` 체인 — `requestId` 부여, main이 Map 유지
- [x] Anthropic SDK `{ signal }`, Google SDK `requestOptions.signal` 양쪽 모두 forward
- [x] `llm:abort` IPC, `LLMError('ABORTED')` 코드, 친절 메시지

### 사용량 UI (5차 협의)
- [x] 두 표시 모드 — `chips` (기본, 칩 + 커스텀 툴팁) / `toggle` (펼침 스트립)
- [x] 설정에서 사용자가 선택 (`usageDisplayMode`)
- [x] `eventBus.emit('settings:changed')` — 열린 채팅창도 즉시 반영
- [x] 한국어 `word-break: keep-all` — 음절 단위 분할 차단
- [x] 한도 임박 시 토글 버튼에 빨간 점 깜빡

### 페르소나 자리비움 게임 메시지
- [x] 14가지 무작위 풀 (🚪 자리비움, 🚽 화장실, ☕ 커피, 🗂️ 서랍, 😶 멍, ✋ 미안, 📩 상사 메시지, 🧘 명상, 📞 전화, 💭 딴 생각, 🍪 간식, 🪟 창밖, 📚 책장, 🤔 답 고민)
- [x] 한도 도달 시 `pickPauseMessage()` 무작위 선택
- [x] 회복까지 같은 메시지 유지 (계속 안 바뀜)
- [x] 입력창 바로 위에 게임 상태메시지 톤 (이탤릭, 베이지, mono 카운트다운)

### 우클릭 컨텍스트 메뉴 + 설정 점프
- [x] ChatPopup 칩/토글에 `onContextMenu` 우클릭 핸들러
- [x] 작은 컨텍스트 메뉴 (좌표 절대 위치, 페이드인)
- [x] `eventBus.emit('settings:open', { section })` → App.tsx → SettingsModal `focusSection`
- [x] 각 섹션에 `data-section` 마커, 마운트 후 `scrollIntoView` + 1.8초 노랑 펄스 강조

---

## 🔧 기술적 의사결정

| 결정 | 선택 | 이유 |
|---|---|---|
| Rate limit 추적 | sliding 60초 window | 정확하면서 단순. 카운트다운 / 사용 가능 횟수 계산에 충분 |
| 한도 차단 시점 | 사전 (우리가 미리 끊음) | 서버에 429 받기 전 — quota 보존 + 즉시 UX |
| 친절 에러 | provider별 별도 분기 + 공통 fallback | raw 메시지 노출 차단, 한 줄 안내 |
| HTTP status 노출 | `debugCode` 필드 (별도 표시) | 메인 메시지는 친절, 작은 mono 칩으로 디버깅 단서 |
| 페르소나 정체 | system prompt identity 블록 | 모델이 학습된 기본값으로 fallback 차단 |
| 채팅 중단 | `AbortController` + `requestId` Map | 표준 패턴, 두 SDK 모두 지원 |
| 사용량 UI | *두* 모드 다 지원 (chips/toggle) | 사용자 협의 5차 — 한 옵션 강제는 만족 ↓ |
| 한국어 wrap | `word-break: keep-all` | 음절 중간 wrap("바 빠요") 차단 |
| 자리비움 메시지 | 무작위 풀 + 회복까지 고정 | 게임 메시지 톤, 정신없지 않게 |
| 설정 점프 | `eventBus` + `focusSection` prop | 어디서든 컨텍스트 메뉴로 접근 가능한 확장성 |

---

## 🐛 만난 이슈와 해결

### 1. SettingsModal 즉시 닫힘 버그 (컨텍스트 메뉴)
**증상**: 우클릭으로 컨텍스트 메뉴 열자마자 닫힘.
**진단**: 메뉴 닫기용 글로벌 `contextmenu` 리스너가 native event bubble로 즉시 fire.
**해결**: 글로벌 contextmenu 리스너 제거 + `e.nativeEvent.stopImmediatePropagation()` 추가.

### 2. 모델명 줄바꿈
**증상**: 헤더 안에 칩들을 같은 줄에 두니 "Gemini" "2.5" "Flash" 가 3줄로 wrap.
**해결**: 칩을 모델명 *아래 줄*로 분리 + 모델명 `white-space: nowrap`.

### 3. 한국어 음절 wrap
**증상**: "바빠요" 가 "바 / 빠요" 로 깨짐.
**해결**: 시스템 메시지 컨테이너에 `word-break: keep-all` 적용.

### 4. 페르소나 정체성 회귀
**증상**: Mary가 "저는 Claude입니다" 라고 자기를 부정.
**해결**: system prompt에 이름/역할/페르소나 규칙 명시 + 새 채팅 세션 권장 (기존 히스토리에 잘못된 답변이 남아있으면 모델이 계속 헷갈림).

---

## 💡 핵심 인사이트

### "사용자가 디테일에 민감할 때, 두 옵션 다 지원"
사용량 UI 5차 협의 — 한 디자인 강제하면 만족 ↓. `usageDisplayMode` 설정으로 사용자 선택권 → 깔끔 선호 vs 정보 선호 둘 다 만족.

### "에러 메시지 = 사용자 친화 + 디버깅 단서 분리"
이전: raw API URL 노출 (못생김) 또는 친절 메시지만 (디버깅 X).
이제: 친절 메시지(메인) + `debugCode` (작은 mono 칩) = 둘 다 만족.

### "Sliding window 사전 차단"이 사후 처리보다 우수
서버 429 받기 전에 우리가 끊음 → quota 보존 + 카운트다운 정확.
페르소나 자리비움 메시지가 *왜 잠시 못 보내는지* 게임적으로 설명 → 좌절감 감소.

### "Discoverability는 우클릭으로 푼다"
설정이 많아질수록 사용자가 *어디서 바꾸는지* 모름. 우클릭 → "여기 설정 변경" → 해당 섹션 점프 = *상태 자체가 설정 진입점이 됨*.

---

## 📐 코드 구조 (M4 추가/수정분)

```
PixelAgentOffice/
├─ electron/
│  ├─ llm/
│  │  ├─ usage.ts                # 🆕 sliding window + 세션 통계
│  │  ├─ errorMessages.ts        # 🆕 humanizeError + FriendlyError
│  │  ├─ types.ts                # 🔧 ABORTED/SERVICE_BUSY/INSUFFICIENT_CREDIT/RATE_LIMIT_LOCAL 코드 추가
│  │  ├─ anthropic.ts            # 🔧 signal + INSUFFICIENT_CREDIT/SERVICE_BUSY 분기
│  │  ├─ gemini.ts               # 🔧 signal + SERVICE_BUSY 분기
│  │  └─ dispatch.ts             # 🔧 사전 차단 + 토큰 기록 + getRateLimit
│  ├─ main.ts                    # 🔧 llm:abort IPC, AbortController Map, humanizeError 호출
│  └─ preload.ts                 # 🔧 abortChat, getRateLimit, FriendlyError/RateLimitStatus 노출
├─ src/
│  ├─ shared/types.ts            # 🔧 UsageDisplayMode, MODEL_INFO.rpm/pricing, USD_TO_KRW
│  ├─ App.tsx                    # 🔧 settings:open eventBus 리스닝 + focusSection 전달
│  └─ components/
│     ├─ ChatPopup.tsx           # 🔧 대부분 재작성 — 사용량 칩/토글, 페르소나 자리비움,
│     │                          #    중단 버튼, 우클릭 컨텍스트 메뉴, FriendlyError 노출
│     └─ SettingsModal.tsx       # 🔧 usageDisplayMode 라디오, focusSection 자동 스크롤
```

---

## 📊 통계

- **신규 코드 파일**: 2개 (`usage.ts`, `errorMessages.ts`)
- **수정 파일**: 9개
- **순 추가 LOC**: 약 +600
- **새 IPC 채널**: 2개 (`llm:abort`, `llm:getRateLimit`)
- **새 LLMErrorCode**: 4개 (`ABORTED`, `SERVICE_BUSY`, `INSUFFICIENT_CREDIT`, `RATE_LIMIT_LOCAL`)
- **새 eventBus 이벤트**: 2개 (`settings:open`, `settings:changed`)
- **TypeScript/Lint 에러**: 0

---

## 🚧 의도적 미구현 (다음 마일스톤)

| 항목 | 마일스톤 | 이유 |
|---|---|---|
| 스트리밍 응답 | M5 | thinking 도입 전 선결 조건 |
| 채팅 영속화 | M5 | 영구 대화 시작 시 |
| 메모리 시스템 | M5~M6 | 대화 누적 후 압축 |
| Extended thinking (Claude) | (보류) | 스트리밍 + 비용 OK 환경에서 검토 |
| 토큰 보드 + 시간대 + 성격 반응 | M5 | 시그니처 폴리시 (Phase 1.7) |
| Groq Provider | (사용자 결정) | 진짜 무료 옵션 — 데모 모드와 함께 |
| 데모 모드 | (사용자 결정) | 키 없는 둘러보기 |
| MBTI 페르소나 시스템 | (사용자 결정) | 캐릭터 v2 — 명확화 대기 (06번 파일 L/M 섹션) |

---

## 🎯 다음 단계 후보

1. **🎨 M5 시그니처 폴리시** — 토큰 보드(사장석 LED) + 시간대 변화(낮/저녁/밤) + 성격별 반응
2. **💾 채팅 영속화 + 메모리** — 대화 닫아도 유지, 누적 → 압축 메모리
3. **🚪 첫 실행 안내 + API 키 가이드** — 일반 사용자 진입 장벽
4. **🎮 데모 모드** — 키 없이 둘러보기, SNS 콘텐츠
5. **🤖 Groq Provider** — 카드 등록 없는 진짜 무료 옵션 (1시간 작업)
6. **🎭 MBTI 페르소나 v2** — 너드/개나댐/실용이/기자 캐릭터 시스템

사용자 결정 대기 중.
