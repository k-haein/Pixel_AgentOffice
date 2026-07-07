# 핸드오프 문서 — PixelAgentOffice

> 새 세션 또는 미래의 본인이 이 파일 *하나*만 봐도 즉시 컨텍스트가 잡히도록 정리한 단일 진입점.
> 태블릿/주말 작업 시 GitHub에서 이 파일부터 열면 됩니다.
>
> 최종 갱신: **2026-07-07 (Day 14 계속, 2F Phase 3)** — **위임 협업 엔진 ✅ ★2층 엔진 완성★** (2F 핸드오프 §4 갭3). `delegate_to_member` 도구(`agent/tools/delegate.ts`) — 실행 시 **팀원 페르소나로 runAgent 자식 루프 재귀 호출** 후 보고 반환, 팀원 tools에 위임 도구가 구조적으로 안 들어가 **재위임 원천 차단**. `runTeamTask`(`agent/team.ts`) — 팀장 검증(리더 자리+`canBeTeamLeader` 과장↑) + 같은 팀 member 수집(좌석 시스템=조직도) + **팀장 프롬프트에 팀원 명단(id·이름·역할·직급·MBTI) 주입** + `TeamEvent`(delegation:start/done·leader/member 스텝) 스트림. 공용 페르소나 `agent/persona.ts`(1층 감정 태그 제외, ChatPopup 무변경). IPC `agent:run-team`(main.ts) — **dispatch.chat 주입이라 위임으로 호출 늘어도 rate/일일 한도 자동**, 이벤트 `agent:team-event` push, 중단은 기존 `llm:abort` 재사용. preload/platform 3종 배선(mock은 데모 위임 연출). 🐛 테스트가 usage 합산 누락을 잡음 → `delegation:done`에 팀원 usage 실어 **팀장+팀원 전체 합산**으로 픽스. 검증: 신규 유닛 12, vitest **67 통과/6 skip**, tsc·**pnpm build** 무결. ⏳ 실키 왕복(`agent-team-roundtrip`) 키 대기, **UI 트리거·게임 연출은 Phase 4**. 다음: **Phase 4**(채팅창 팀 작업 UI + delegation 이벤트 캐릭터 연출) 또는 실키 검증. 이전 작업 ↓
> **2026-07-07 (Day 14 계속, 2F Phase 2)** — **에이전트 루프 ✅** (`electron/agent/loop.ts` 신설 — 2F 핸드오프 §4 갭2). `LLM 호출 → 도구 호출 있으면 실행 → role:'tool' 결과 주입 → 반복 → 없으면 종료`. **MAX_STEPS 상한(기본 20)** — 도달 시 throw가 아니라 `stopped:'max_steps'` 반환. 도구 실패(미등록·execute throw)는 `{ error }`로 모델에 되돌려 **루프가 죽지 않고 모델이 복구**. `AgentEvent`(step/tool:start/tool:done) 훅으로 Phase 3 위임 중계·Phase 4 게임 연출 대비. **chat 함수는 주입식** — dispatch.chat이 store.ts(→`app.getPath`, electron)를 물어 vitest에서 import 불가라 동일 시그니처 `ChatFn`을 주입받음. 프로덕션 배선(Phase 3 main.ts IPC)에서 dispatch.chat을 넘기면 rate/일일 한도 자동 적용(§8 원칙 보존). Phase 1 더미였던 `get_current_time`을 실제 실행기로 승격(`agent/tools/time.ts`). 검증: 신규 유닛 17/17, 전체 vitest **55 통과/5 skip**, tsc 무결 — 단 이 PC엔 `.env.local` 자체가 없어 **실키 통합 3파일 자동 skip**(§132의 "SSL로 실패"와 다른 상태 — 키 부재). pull 직후 `pnpm install` 필요했음(vitest 등 신규 의존성 미설치). e2e·lint·PC 시각 확인(§132 이월)은 계속 이월. 다음: **Phase 3 위임 협업**(`delegate_to_member` + 팀장 프롬프트에 팀원 목록 주입 + IPC `agent:run-team`). 이전 작업 ↓
> **2026-07-03 (Day 14 계속, "1층 폴리시")** — **응답 실시간 스트리밍 ✅ + 메모리 모드(off/manual/ask/auto) 실동작 연결 ✅ + Opus/Haiku 단가 정정 ✅**. `aiProvider.ts`에 `onDelta` 콜백(있으면 `streamText`, 없으면 기존 `generateText` 그대로) → IPC `llm:chunk` 이벤트로 관통 → `ChatPopup`이 실시간 표시(usage/비용 집계 경로 무변경). §130에서 "무동작이라 숨겼던" 메모리 모드 셀렉터를 `src/shared/memory.ts`(요약 로직 공용화)로 실제 연결 — auto/ask는 채팅창 닫기·직원전환 시(3턴↑) 트리거, off는 주입 자체 생략. `MODEL_INFO` Opus/Haiku 표기 단가를 실제 매핑 모델 기준으로 정정($15/$75→$5/$25, $0.80/$4→$1/$5). 검증: vitest **38 통과/4 실패**(실패 4건은 전부 Gemini 실키 통합테스트가 이 환경 SSL inspection에 막힌 것 — 코드 회귀 아님), e2e·tsc·lint·PC 시각 확인은 **미실행**(다음 세션 이월). 커밋 전 상태로 "세션 정리해줘" 트리거로 뒤늦게 기록. 다음: **PC dev 시각 확인 후 커밋** → **2F Phase 2 에이전트 루프**(`electron/agent/loop.ts`). 이전 작업 ↓
> **2026-07-03 (Day 14 계속, 2층 착수)** — **M-2F-0 멀티모델 기반 ✅ + 2F Phase 1 tool-calling ✅** (설계 지시서: [`PixelAgentOffice/docs/2F-collaboration-handoff.md`](PixelAgentOffice/docs/2F-collaboration-handoff.md)). LLM 레이어를 **Vercel AI SDK(`ai@7`)** 로 전환 — 공용 팩토리 `aiProvider.ts` 신설, `LLMProvider` 인터페이스·`dispatch.ts` rate/비용 한도 로직은 무변경 유지. **OpenAI(`gpt-5-mini`) provider 추가**(키 저장·채용/메모/설정/API키 UI·단가 $0.25/$2). 빌드 함정: `ai@7`의 CJS 의존성이 ESM 번들에서 `require("path")` 호출해 앱이 안 뜸 → electron main 빌드에 **createRequire 배너** 주입으로 해결(`vite.config.ts`). **Phase 1**: `ToolDef`/`ToolCall`/`stopReason` 타입 확장 + provider tools 전달, 더미 도구 `get_current_time` **실키 왕복 통합 테스트 통과**(도구 호출 반환 → 결과 주입 → 반영된 최종 답변). 검증: 유닛+통합 **34/34**, e2e **10 통과 + 1 skip**(OpenAI 실키 검증은 키 준비 후 06 스펙이 자동 수행), Gemini 실키로 1층 대화·비용 카운터 실측 증명(517 in/50 out 토큰, $0.000054 집계 확인). 참고 출처 표기를 **omo(oh-my-openagent)·OpenAgent**로 일원화(ideas/20 파일명 포함 문서 정리). 다음: **Phase 2 에이전트 루프**(`electron/agent/loop.ts`). 이전 작업 ↓
> **2026-06-24** — 전체 회고(6렌즈) → 핵심 버그 2건 픽스: **G-1 유령 직원**(무자리=null 직원이 안 보이는데 과금 → 좌석 폴백·차단 가드·정책 일관화) + **G-2 일일 비용 상한**(표시만/재시작 초기화 → 디스크 영구화 + **메인 프로세스 실제 차단**, 유료 Claude만). **메모리 모드 셀렉터 숨김**(무동작이라). **테스트 그물 복구**: vitest 유닛 24/24 + Playwright E2E 9/9(Day12부터 깨진 것). 적대적 리뷰 13에이전트로 검증. 커밋 4건(fix/chore/test/docs). **해자(페르소나)·유지보수 리팩토링은 v3 보류**(§6.P/Q). ✅ **v0.0.2 EXE 빌드(`release/PixelAgentOffice-0.0.2-portable.exe`, 98M)·포트폴리오 v0.0.2 스냅샷(PRD 정직 갱신+유저플로우/와이어프레임/코드 동기화+README 인덱스) 완료** — 다음: **GitHub Releases에 EXE 수동 업로드**(웹 UI 또는 `gh release create`). 이전 작업 ↓
> **2026-06-23** — 튜토리얼 완성도 감사(11에이전트 Workflow: 깨진 타겟 0, 구멍 F4·F5 등) → **📝 메모지 트랙 + 🔎 캔버스 조작 단계 추가**, 이어 사용자 전체 시연 피드백으로 **대규모 재설계**: 마스코트를 **존댓말 비서 "문 비서"(🐙)** 로 통일·호칭 "사장님" / 상점 🛒 + 버튼 [대괄호] 표기 / **스크롤 먼저→포커스 1회 측정**(깜빡임 제거) + MBTI·감정 **정보 팝업 열리면 스팟라이트 숨김** / 최초 채용 **메리 강제·폼 편집 잠금**(ⓘ·채용완료만 허용) / **채용→대화→메모→상점→설정 자동 연속**(`FIRST_RUN_STEPS` + zone orchestration). dev 서버는 `Start-Process`로 분리 실행해야 안정(아래 §). 이전 Day 14 작업:
> **첫 사용자 온보딩 대공사**: 튜토리얼 가이드 투어(T1, 마스코트+스팟라이트) + **API 키 미니팝업**(입력)/**받는법 별도 안내창** + **데모 대화 모드**(키 없이 캐릭터별 더미 응답으로 게임 루프 체험 → 키 연결 유도) + **멀티트랙 튜토리얼**(메인=직원 채용까지 / 상점·설정은 각 창 헤더 🎓로 내부 옵션 전부 스팟라이트) + 채용 폼 전 항목 안내(외형·MBTI·직급·진급방식·모델) + 외부 링크 기본 브라우저(shell.openExternal). ultracode Workflow 적대적 리뷰 다회(마이그레이션 회귀·stale 키상태·ESC 중복닫힘·폼스킵 모달잔존·데모 푸터모순·진행점 total 등 수정). 사용자 dev 검증 진행(데모·튜토리얼은 키 없이 확인 가능, `main.ts`만 재시작 필요).
> Day 13 — 진급/칭찬 Phase 1~3 + 진급 기준 재정의·UI·직급 팻말·이사 임명 + 진급 난이도 배율(0.5~3) + 정성 5/20/50/100 + **Phase 4 메모리(반자동)** + 오타 점검 룰. 다음: **v0.0.2 재빌드**(Day 13~14 전부) / E2E 빈사무실 기준 재작성(promotion.ts 유닛테스트) / 맥 .dmg(GitHub Actions).

---

## 📍 NAV — 어디로 갈지 빠른 메뉴

| 알고 싶은 것 | 가야 할 섹션 |
|---|---|
| 지금 어디까지 왔는지 30초로 | [§1 30초 요약](#-1-30초-요약) |
| 날짜별로 무엇을 했는지 | [§2 진행 타임라인](#-2-진행-타임라인) |
| **지금 당장 해야 할 일** | [§3 현재 위치 + 미커밋 작업](#-3-현재-위치--미커밋-작업) |
| **멈춰있는·미완 기능 확인** | [🚧 미완·멈춤 기능 레지스터](#-미완멈춤-기능-레지스터) |
| 다음 작업 고르기 | [§4 다음 작업 가이드](#-4-다음-작업-가이드) |
| 미래 방향 (모바일/백엔드) | [§5 미래 방향성](#-5-미래-방향성) |
| 보류 중인 결정 | [§6 보류 결정](#-6-보류-결정) |
| 폴더/파일 구조 | [§7 폴더 구조 + 어디 가야 하는지](#-7-폴더-구조--어디-가야-하는지) |
| 태블릿에서 가능한 것 | [§8 태블릿 vs 데스크탑](#-8-태블릿-vs-데스크탑-가이드) |
| 셋업/환경 | [§9 개발 환경 셋업](#-9-개발-환경-셋업) |
| **PC 시각 테스트 체크리스트** | [`FEATURES.md`](FEATURES.md) (Day 8 신규) |
| **사용자 룰·말투·트리거** | [`CONVENTIONS.md`](CONVENTIONS.md) (Day 8 신규) + [`CLAUDE.md`](CLAUDE.md) |

---

## 🎯 1. 30초 요약

| | |
|---|---|
| **프로젝트** | 픽셀 아트 사무실에서 AI 에이전트를 직원처럼 채용·배치·명령하는 Electron 데스크탑 앱 |
| **스택** | Electron + Vite + React 19 + Phaser 4 + TypeScript + **Vercel AI SDK(Claude·Gemini·GPT 멀티모델)** + Playwright E2E |
| **컨셉** | "Two Point Hospital + The Sims" 류 게임 메커니즘으로 AI 에이전트 관리 |
| **GitHub** | [k-haein/Pixel_AgentOffice](https://github.com/k-haein/Pixel_AgentOffice) |
| **현재 마일스톤** | **2층(팀 협업) 트랙 — 엔진 완성** — M-2F-0 멀티모델 ✅ + Phase 1 tool-calling ✅ (2026-07-03) + Phase 2 에이전트 루프 ✅ + **Phase 3 위임 협업 엔진 ✅ (2026-07-07)**. 남은 것: Phase 4 UI·게임 연출. 직전: 1층 폴리시(응답 스트리밍 + 메모리 모드 실동작 + 단가 정정, 2026-07-03). 이전: M5 시그니처 폴리시 + Day 12 §3+1 + Day 13(진급/칭찬/메모리) + Day 14(온보딩·튜토리얼·v0.0.2 스냅샷) |
| **다음 작업** | **① 2F Phase 4 게임 연출 + 팀 작업 UI** — 채팅창(또는 팀장 우클릭)에서 팀 작업 트리거 + `agent:team-event`(delegation:start/done)를 eventBus로 흘려 팀장→팀원 캐릭터 애니메이션·말풍선 연출. platform.runTeamTask/onTeamEvent 배선 완료 상태라 UI만 얹으면 됨. **② 실키 검증** — `.env.local`에 GEMINI_API_KEY 넣으면 위임 왕복(`agent-team-roundtrip`)·루프·스트리밍 통합 자동, OPENAI_API_KEY 넣으면 06 e2e 자동. **③ 1층 폴리시 PC dev 시각 확인** — 스트리밍 커서·메모리 모드 auto/ask 트리거 (§132 이월). **④ GitHub Releases EXE 수동 업로드**(v0.0.2, 이월). ⑤ v3 리팩토링(§6.Q) + CI. ⑥ `pnpm lint` 기존 파일 오류들(사전 부채). |
| **큰 결정** | 모바일 출시 + 백엔드 + BYOK 확정. Platform Adapter Phase 1 완료. **Day 11**~**Day 12 §2** 진행 후 **Day 12 §3**: 사용자가 EXE 시각 검증 → 14건 피드백 → 즉시 반영. MBTI 16종 페르소나 시스템 도입(LLM 시스템 프롬프트 자동 주입). 말풍선 픽셀 5×5로 ^_^ 표현 한계 → Phaser Text + 이모지로 전환. 캐릭터 눈 표정 4픽셀·3×3 둘 다 시도 후 사용자 결정으로 롤백 (Day 10 sleepy만 유지). 기본 가구 고정 배치 제거 → 사용자가 상점에서 직접. |
| **검증 상태** | **2026-07-07 최신(2F Phase 3)**: vitest **67 통과/6 skip**(에이전트 루프 17 + 팀 위임 12 신규 포함), tsc -b·**pnpm build** 무결(§131 createRequire 함정 재발 없음). skip 6건은 실키 통합 4파일 — 이 PC에 `.env.local` 자체가 없어 자동 skip(키 넣으면 자동 실행). e2e·lint·PC 시각 확인(1층 폴리시)은 §132부터 계속 이월. 이전(2층 M-2F-0 시점): 유닛+통합 34/34, e2e 10 통과+1 skip, Gemini 실키 1층 대화·카운터·tool-calling 왕복 실측 검증 완료. |

자세한 *제품 비전*은 [`portfolio/PixelAgentOffice/PRD.md`](portfolio/PixelAgentOffice/PRD.md)에 600줄로 정리되어 있음.

---

## 📅 2. 진행 타임라인

### **2026-05-12 (Day 1) — 컨셉 + M1**

#### 한 일
- 컨셉 브레인스토밍 — "Two Point Hospital + The Sims" 류
- 9개 기획 문서 작성 (`ideas/00~08`)
- HTML 시안 2종 (사무실 mockup + 와이어프레임 6 화면)
- **M1** — Electron + Phaser + React 픽셀 사무실 첫 동작
  - Mary(편집자) + Haewol(작가) 캐릭터
  - 채팅 모킹 (실제 LLM 미연결)

#### 왜 그렇게 결정했는지
- **Electron 채택** — Python 후보 탈락 (배포 자동화 제약). `.exe` 더블클릭 = 일반 사용자 진입 최저. 자세히는 [`ideas/13-electron-and-mobile-strategy.md`](ideas/13-electron-and-mobile-strategy.md)
- **Phaser + React 하이브리드** — 사무실 씬은 Phaser, UI 모달은 React. 각자 강점.
- **Clawd 캐릭터 패밀리** — Anthropic 마스코트. swappable 팩으로 라이선스 위험 격리.

#### 산출 커밋
- ✅ `c5ae95a` — 초기 커밋: M1

### **2026-05-13 (Day 2) — M2 UI 채널**

#### 한 일
- **M2** — UI 모달 3종 + 영속화
  - 채용 모달 (HireModal)
  - 메모 모달 (MemoModal) — 직원 지침 편집
  - 설정 모달 (SettingsModal) — API 키 + 기본 모델
  - electron-store 영속화

#### 산출 커밋
- ✅ `3b07a7f` — M2 마일스톤: UI 채널 완성

### **2026-05-14 (Day 3) — M3 다중 LLM + 포트폴리오**

#### 한 일
- **M3-a/b** — 다중 LLM 인프라
  - Claude (`@anthropic-ai/sdk`) + Gemini (`@google/generative-ai`)
  - `LLMProvider` 인터페이스 추상화
  - safeStorage 키체인 (provider별 분리)
  - **Gemini 2.0 Flash 폐기 발견** → `DEPRECATED_MODELS` 자동 마이그레이션 패턴 신규
- **M3 E2E 테스트 인프라** — Playwright Electron 3 시나리오 + `window.__test` 헬퍼
- **포트폴리오 작성**
  - `portfolio/PixelAgentOffice/PRD.md` (~600줄, 12 섹션 + "자랑스러운 것 7가지")
  - `portfolio/PixelAgentOffice/visuals/wireframes-v2.html` (9개 화면)
  - Day 3 의사결정 로그 + M3 코드 스냅샷
- **비즈니스 모델 4 옵션 정리** ([`ideas/12-business-model.md`](ideas/12-business-model.md))
  - BYOK / 백엔드 / Groq / 데모

#### 왜 그렇게 결정했는지
- 처음엔 "이미 Claude 쓰는 사람에게 UI만 무료" 비전 → **Anthropic ToS상 불가능** 발견 → 다중 LLM으로 전환
- 무료 진입을 위해 Gemini 추가 → Provider 추상화

#### 산출 커밋
- ✅ `9aef101` — M3 마일스톤 완성 (다중 LLM)
- ✅ `1838bc2` — M3 자동 회귀 테스트 인프라
- ✅ `fa1380a` — M3 기획·포트폴리오 동기화

### **2026-05-15 (Day 5~6) — M4 UX + M5-a/b 시그니처**

#### M4 — LLM 안정성 + ChatPopup 정밀화 (Day 5)
- **LLM 안정성 인프라**
  - sliding window RPM 카운터 + 사전 차단 (`usage.ts`)
  - 친절 에러 매핑 (`errorMessages.ts`) — raw API URL 노출 차단
  - `AbortController` 체인 — 채팅 중단 가능
  - 페르소나 정체성 system prompt 강화 ("저는 Claude입니다" 문제 해결)
- **ChatPopup 정밀화**
  - 사용량 시각화 (칩 / 토글 두 모드, 설정에서 선택)
  - 비용 추정 (모델별 단가 × 토큰)
  - **페르소나 자리비움 — 14가지 무작위 게임 상태 메시지** (☕ 커피, 🚽 화장실, 📩 상사 메시지 등)
  - 우클릭 컨텍스트 메뉴 + 설정 점프 패턴 (discoverability)

#### M5-a — 시간대 시스템 (Day 6)
- 5단계 자동 전환 (06-11 아침 / 11-15 점심 / 15-18 노을 / 18-21 저녁 / 21-06 밤)
- Phaser `tweens.addCounter` RGB 보간으로 부드러운 1.5초 트랜지션
- **토큰 고갈 시 강제 야간** — 시그니처 폴리시

#### M5-b — 사무실 위계 재구조 (Day 6)
- **사장 1 + 3팀 × 5명 = 16자리** (사용자 직접 ASCII 스케치로 설계)
- `seats.ts` 신규 — `SeatId` template literal, `ALL_SEATS` 16개 메타
- `RANK_ORDER` + `canBeTeamLeader`(과장 이상) + `canBeBoss` 헬퍼
- OfficeScene 전면 재작성 (seatId 기반 위치 + 빈 자리 회색 + 명패)

#### 산출 커밋
- ✅ `23a1d1d`, `7b42dd8`, `cf325fa` — M4 (LLM 안정성 / ChatPopup / 포트폴리오)
- ✅ `65912bb`, `26f3d24`, `b2dbb08` — M5-a, M5-b, M5 포트폴리오

### **2026-05-18 (Day 7) — B-3 자리 이동 + 모바일 결심 + HANDOFF**

#### B-3 — 채용/자리 변경 UI
- HireModal: 자리 선택 UI 통째 제거 → **자동 배치만** (사용자 결정)
- OfficeScene: `visibleTeams` 제거 → **3팀 16자리 항상 표시** (자유로운 팀 이동)
- 우클릭 → **드래그앤드롭 자리 이동** 시스템
  - 이동 모드: 캐릭터 alpha↓ + 빈 자리 펄스 (🟢자격OK / 🔴자격부족)
  - 60px hit-test + tween 스냅 이동
  - ESC / 외부 클릭 취소
  - 자격 검증 (리더=과장이상, 사장석=사장이상)

#### B-3 협업으로 잡은 5가지 버그
1. 드래그 수직 이동 안 됨 → idle bob 트윈이 `clawd.y` 덮어쓰던 문제. `tweens.killTweensOf` 추가
2. 드래그 좌표 어긋남 → `dragX/dragY` (Container hitArea 이슈) → `pointer.worldX/Y` 직접 사용
3. 우클릭 첫 시도 안 됨 → PhaserGame container에 `onContextMenu={preventDefault}` 추가 + `pointer.event.button === 2` 체크
4. 자리 영역 우클릭 안 됨 (캐릭터 hit area 24×24 너무 작음) → **`Phaser.Zone` 90×140** 추가 (chatBubble~책상 하단 커버)
5. 메뉴 열린 상태에서 다른 캐릭터 우클릭 → 메뉴 갱신 안 됨 → `setEmployeeContextMenu(null)` 거친 후 다음 tick에 set

#### Playwright 회귀 테스트 신규
- `tests/e2e/04-right-click-context-menu.spec.ts` — 4 시나리오 / **4/4 통과**

#### Electron + 모바일 전략 문서화
- [`ideas/13-electron-and-mobile-strategy.md`](ideas/13-electron-and-mobile-strategy.md) 신규 — Electron 이란 + 왜 선택 + 모바일 전환 전략
- 포트폴리오 PRD에 §7.1, §7.2 보강 (기술 스택 + 모바일 전략)
- **결정**: 모바일 출시 진행. **백엔드 + BYOK 모델** 채택 결심 (자세히는 [§5 미래 방향성](#-5-미래-방향성))

#### ✅ Day 7 끝에 커밋·푸시 완료 (`d6e8963`, `910d6c8`, `d89c017`)

### **2026-05-19 (Day 8, 오늘) — Platform Adapter (Phase 1) 도입**

#### 한 일
- **Platform Adapter 패턴 도입** — Electron API를 추상화. 미래 모바일 진입 비용 ↓.
  - 신규: `src/platform/types.ts` (Platform 인터페이스 12 메서드)
  - 신규: `src/platform/electron.ts` (window.api 1:1 wrap)
  - 신규: `src/platform/mock.ts` (테스트/데모용 가짜 응답)
  - 신규: `src/platform/index.ts` (환경 감지 + 기본 export)
  - 수정: 7개 컴포넌트 (`App.tsx`, `ChatPopup.tsx`, `HireModal.tsx`, `MemoModal.tsx`, `SettingsModal.tsx`, `SeatPickerModal.tsx`, `game/OfficeScene.ts`)
  - 약 20곳의 `window.api.*` → `platform.*` 일괄 치환. 결과: `window.api.` 참조 0건 (electron adapter 내부 외).
- **사전 결함 2건 청산**
  - `index.html` `<title>` 대소문자 (`pixelagentoffice` → `PixelAgentOffice`)
  - `03-gemini-chat.spec.ts` 모델 라벨 정규식 매칭
- **Playwright 검증** — B-3 우클릭/zone 4 시나리오 **4/4 통과** (Platform 리팩토링 회귀 없음)
- **회고 문서 작성** — `ideas/14-platform-adapter-rationale.md`
  · 결정 흐름 (Day 7~8 대화에서 어떻게 도출됐는지)
  · 검토 대안 4가지 + 왜 Adapter 채택
  · 구현 통계 (4 신규, 7 수정, 20→0 호출 치환, 5시간)
  · 미래 모바일 진입 시 작동 흐름 (Phase 3 백엔드 / Phase 5 모바일 빌드)
  · 교훈 4가지

#### 왜 그렇게 결정했는지
- "태블릿에서 채팅 가능?" → "Electron API 강한 의존으로 안 됨" → "모바일 출시 결심하면?" → 백엔드 + BYOK 모델 결심
- 추상화는 *추가 환경이 늘어날 확신*이 있을 때 도입해야 *오버 엔지니어링*이 아님. 모바일 결심한 *그 시점*이 정확한 타이밍.
- 자세히: [`ideas/14-platform-adapter-rationale.md`](ideas/14-platform-adapter-rationale.md)

#### 산출 커밋
- ✅ `d89c017`, `6259ed9`, `3ee6e3d` — Platform Adapter (Phase 1) + 사전 결함 청산 + Day 8 회고

### **Day 8 (계속) — 시그니처 폴리시 묶음 + 메타 문서 정립**

#### 한 일 (코드)
- **B-4 책상 회전** — `deskGroup` 컨테이너로 책상·의자·모니터·마우스·메모 묶고 setRotation. 캐릭터도 회전 + 위치 이동. front/right/left 순환. 우클릭 zone도 회전 따라감. `tests/e2e/05-desk-rotation.spec.ts` 3 시나리오 신규
- **M5-c 토큰 보드** — 사장석 뒤 벽 액자 LED (200×36). 1초 polling 모든 모델 `sessionCostUsd` 합산. 🟢🟡🔴 임계 60%/85%. 빨강 + `forcedNight` 시 alpha 점멸. `dailyLimitUsd` settings 동기화
- **B-5 줌·카메라** (옵션 B — 휠 + 토글) — 마우스 휠 0.7x~1.6x, 포인터 위치 기준 카메라 추적. 좌상단 floating 토글 버튼 (1.0x↔1.4x). 핀치는 P5 모바일 빌드 단계로 보류
- **D 사무실 꾸미기 Lv1** — `PLANT`/`BOOKSHELF`/`VENDING`/`CLOCK` 픽셀 4종 신규. 좌하·우하 화분 / 좌측 책장 + 시계 / 우측 자판기
- **A 직원 명함 hover 카드** — 캐릭터 hover/move 시 `employee:hover-card` emit → React 마우스 우하단 +20px popup (이름·직급 ⭐·역할·모델)
- **B 빈자리 hover + 채용 점프** — 빈 책상 zone hover 시 "👤 [자리] 채용" Phaser text + 좌클릭 시 `hire:open` → 채용 모달
- **C 온보딩** — 직원 0명일 때 화면 중앙 가이드 박스 + `+ 채용` 노랑 펄스 (첫 채용 후 자동 사라짐)
- **E 사용량 상세** — SettingsModal 새 섹션. 5행 표 (모델 + tier chip · 요청 · 입출력 토큰 · 비용 · RPM 막대 🟢🟡🔴). 1초 polling. 표 아래 누적 합계
- **F 동적 상태바** — OfficeScene이 `office:usage-summary`·`office:time-changed` emit → footer가 직원수·시간대·누적비용 라이브 표시. 비용 색 신호등 + 빨강 깜빡임. 비용 클릭 → 설정 모달 사용량 상세 자동 점프

#### 한 일 (메타 문서)
- `CLAUDE.md` 신규 — 커밋·푸시 사용자 사전 승인 룰 + 태블릿 `📱` 마커 룰 + 환경 감지 단서
- `CONVENTIONS.md` 신규 — 사용자 말투·트리거 명령어 (세션 저장해 / 커밋해 / 푸시해 / 분석해줘 / 이게 뭐야?) · Day 구분 3단 합의 룰 · 의사결정 패턴 · 환경 맥락
- `FEATURES.md` 신규 — PC 검증 체크리스트. M1~M5-c·B-3~B-5·UI 폴리시 6종 전 기능 무엇/사용방법/기대 동작 ☐/알려진 한계 형식. 21단계 검증 워크플로우 (빈 사무실 → 채용 후 → 채팅 → 시간대/야간 → E2E)

#### 왜 그렇게 결정했는지
- **B-4 옵션 A 채택** — 회전 변환만, 캐릭터 스프라이트 신규 없이. 빠른 동작 확인 우선, 시각 어색하면 추후 B/C 폴리시
- **B-5 옵션 B** (휠 + 토글, 핀치 제외) — 핀치는 데스크탑에서 검증 불가. P5 모바일 빌드 환경 갖춰지면 한 번에 추가
- **메타 문서 정립** — Claude가 사용자 룰 위반 (커밋 임의 진행 + Day 헤더 임의 변경) 발생 → 사용자 지적 → CLAUDE.md / CONVENTIONS.md 영구화
- **FEATURES.md 분리** — 사용자 요청: "세세하게 테스트할 수 있게 한 곳에". HANDOFF는 의사결정·로드맵 중심, FEATURES는 기능 명세·검증 중심

#### ⚠️ 시각 검증 상태
- **❌ 모든 Day 8 코드는 태블릿(원격 환경, X 서버 없음)에서 작성됨**
- PC에서 `git pull` → `pnpm dev` → FEATURES.md 21단계 워크플로우 따라 검증 필요
- 어색하면 보고 항목: 가구 위치 / 책상 회전 시 캐릭터 어색함 / 상태바 폭 등

#### 산출 커밋 (모두 푸시 완료)
- ✅ `96634c6`, `6bf3c58` — B-4 책상 회전 + e2e
- ✅ `37da5cd`, `fe8a344` — CLAUDE.md + brainstorming Day 헤더 정정
- ✅ `da81469` — CONVENTIONS.md 신규
- ✅ `238d137` — M5-c + B-5 + FEATURES.md 신규
- ✅ `b87a4b3` — UI 폴리시 4종 (A·B·C·D)
- ✅ `d8f3015` — E·F + 세션 정리

### **2026-05-22 (Day 12 §1) — 감정 자동 트리거 + 가구 컨텍스트 메뉴 + 배포 준비**

#### 한 일

1. **감정 자동 트리거** — LLM 응답에 `[emotion:xxx]` 태그(12종 화이트리스트) 강제. `parseEmotionTag`가 본문에서 태그 제거 + emotion 추출 → `agent:set-emotion` emit (5초). 5초 후 직원의 `idleEmotion`으로 복귀(없으면 thinking).
2. **idleEmotion(직원별 평소 표정)** — `Employee.idleEmotion?: BubbleEmotion` 신규 옵셔널. MemoModal에 12 버튼 grid UI. 말풍선 초기 픽셀도 idleEmotion 반영.
3. **타입 공유** — `BubbleEmotion`을 `OfficeScene.ts` → `shared/types.ts`로 이동. `EMOTION_LABELS` 라벨 맵 신규 (UI 노출용).
4. **가구 우클릭 컨텍스트 메뉴** — 즉시 삭제 → 3종 메뉴 (🚚 옮기기 / 🗑 이 가구 삭제 / 🧹 전체 가구 삭제). React DOM 메뉴 (외부 클릭/ESC 닫기). 직원 메뉴와 동일 스타일.
5. **가구 옮기기 모드** — `placementMode.moveUid` 옵셔널 추가. 옮기기 진입 시 원본 hide → 새 위치 클릭 시 `furniture:moved` emit. 취소 시 원본 복원.
6. **전체 가구 삭제** — `furniture:clear-all` emit → `placedFurniture: []`로 갱신.
7. **배포 준비** — `electron-builder@^26.8.1` devDep + `pnpm dist:exe` 스크립트 + `build` 박스 (Windows portable target).

#### 왜 그렇게 결정했는지
- **감정 시스템 살리기** — Day 11에 12 emotion 픽셀까지 만들고 트리거가 1개라 "있는데 안 쓰는" 상태였음. 자동 태그 + idle 기본값 짝으로 들어가야 캐릭터별 분위기가 생김.
- **마지막 줄에 한 번 + 화이트리스트 12종** — Day 10 가드 문구 Gemini safety 충돌 교훈. 태그를 본문 *어디에 있든* 매칭하되, 모델 안전망은 줄임표 응답 가드는 주석 처리 유지.
- **컨텍스트 메뉴로 묶기** — 옮기기/전체 삭제가 추가 필요 → 우클릭=즉시 삭제는 실수도 잦았음. 메뉴 형식이 직원 우클릭과 일관성 있음.
- **placement mode 재사용** — Day 11 후속 +1 인프라(`ghost preview` + `hintText` + ESC/우클릭 취소) 그대로 + `moveUid` 한 가지 분기. 옮기기 추가 비용 거의 0.
- **portable EXE 1차** — 데모 전달용. 자동 업데이트·코드 사인·아이콘은 후속.

#### ⚠️ 시각 검증 상태
- **❌ Day 12 §1 코드는 데스크탑(로컬 PC)에서 작성했지만 `pnpm dev` 시각 검증 미수행** — 사용자 측 검증 대기.
- 검증 항목: §3 미커밋 표 + FEATURES.md "기대 동작 ☐" 체크리스트.

#### 산출 커밋 (3개 예정)
- C1 — Day 12 §1 코드 (감정 자동화 + 가구 컨텍스트 메뉴 + idleEmotion)
- C2 — Day 12 §1 배포 준비 (electron-builder + dist:exe)
- C3 — Day 12 §1 문서 동기화 (HANDOFF + FEATURES + brainstorming-log)

### **2026-05-22 (Day 12 §2) — EXE 빌드 완료 + 빈 사무실 + GitHub Releases**

#### 한 일

1. **portable EXE 실제 생성** — `pnpm dist:exe` 첫 실행에서 winCodeSign(코드 사이닝 도구) `.7z` 압축 내부의 macOS 심볼릭 링크가 Windows 일반 사용자 권한으로 풀리지 않아 실패 → 관리자 권한 PowerShell로 1회 실행 → 캐시 생성 → 이후 일반 권한 PowerShell에서도 빌드 OK. 최종 산출: `release/PixelAgentOffice-0.0.0-portable.exe` (98 MB).
2. **빈 사무실 첫 실행** — `electron/data/store.ts createDefaultData()`의 Mary/Haewol 더미 직원 제거 → 빈 배열. 첫 외부 배포 직전 사용자가 "테스터는 빈 상태에서 시작해야" 결정. unused `TEMPLATES` import + `now` 변수 같이 제거.
3. **`.gitignore` 정리** — `release` / `dist-electron` 추가. 빌드 산출물(98MB EXE + 451MB win-unpacked + 로그)이 git에 안 들어가게 차단.
4. **GitHub Releases v0.0.1 배포** — git 본체에 EXE 직접 커밋(100MB 제한 빠듯) 대신 Releases 사용. `gh release create v0.0.1` + EXE 첨부 + 테스터 안내 release notes.

#### 왜 그렇게 결정했는지
- **EXE 한 줄 파일** — 테스터에게 가장 부담 적은 형태. Portable이라 설치 X. Code signing 인증서는 비용·인증 절차 부담이라 일단 자체 서명(테스트용) — SmartScreen 경고는 안내문에 포함.
- **빈 사무실** — 더미 직원이 있으면 "데모" 느낌 + 테스터의 첫 채용 경험을 가로막음. 사용자 결정: "테스터는 빈 상태에서 직접 채용부터".
- **GitHub Releases > git 본체 커밋** — 단일 파일 100MB 제한 빠듯(98MB), 향후 더 커지면 거부. Releases는 2GB까지. 클론 시 .git 부담 없음. 버전 관리도 깔끔.
- **회사망 SSL fix는 영향 X** — `electron/main.ts`의 `!app.isPackaged` 가드로 production EXE에서는 비활성화. 코드 변경 없이 그대로 배포 가능.

#### ⚠️ 시각 검증 상태
- **❌ Day 12 §2 변경 (빈 사무실 + EXE 빌드) 시각 검증 미수행** — 외부 테스터 피드백 대기.
- **추가 검증 필요** — 테스터의 다양한 환경(Windows 10/11, 다양한 해상도, AV 소프트웨어, 회사망 vs 일반망)에서 SmartScreen 우회 + EXE 첫 실행 + API key 입력 + 채용 흐름.

#### 산출 커밋 (1개 + Release)
- D1 — Day 12 §2 (빈 사무실 + .gitignore + 문서 동기화)
- GitHub Release v0.0.1 — `PixelAgentOffice-0.0.0-portable.exe` 98 MB (Day 12 §3에서 0.0.1로 교체)

### **2026-05-26 (Day 12 §3) — 사용자 검증 피드백 14건 + MBTI + 이모지 + EXE v0.0.1**

#### 한 일

**UX 9 (즉시 수정):**
1. 첫 페이지 "또는 빈 자리 클릭" 안내 제거
2. + 채용 버튼 펄스 부활 (직원 0명일 때 노란색 빛남)
3. 커스텀 템플릿 카드 "새 직원" 한 줄로 단순화
4. HireModal 정체성 placeholder + 필수값 검증 + "* 필수" 빨간 표시
5. 커스텀 지침 placeholder + ⓘ tip 예시 카드
6. "과장 이상 리더 자리" 빨간 강조 (⭐)
7. 대화 모델 키 없으면 비활성 + 빨간 안내 + ⚙ 설정 자동 열기
8. 빈 자리 토글 — 채용 모달 트리거 제거 (이동 모드만)
9. 기본 가구 (화분/책장/자판기) 제거 — 완전히 빈 사무실 시작

**MBTI 16종 페르소나 시스템:**
- `shared/types.ts`: MBTI 타입 + MBTI_PROFILES (16종, emoji + responseStyle + trait) + Employee.mbti?
- HireModal: 입력 + 자동 인식 tip + ⓘ 16종 설명 중첩 모달
- ChatPopup buildSystemPrompt: employee.mbti 있으면 페르소나 지침 자동 주입
- 별명 톤 결정 보류 (다음 세션 — 게임형/한국 밈/직업 톤 중)

**감정 미리보기 모달 (8번):**
- 신규 `EmotionPreviewModal.tsx` — 460px 중첩 모달, Canvas 280×220, 캐릭터 + 말풍선 + 이모지
- 12종 버튼 grid로 즉시 전환
- ShopModal 단순화: 12개 카드 grid → "감정 미리보기 열기" 버튼 1개

**눈 표정 시도 → 롤백:**
- 4픽셀 대각선 (╱╲) 시도 → "표현 한계"
- 3×3 확장 시도 (Clawd 4종 픽셀 재배치) → "롤백하자"
- 최종: Day 10 sleepy(closed)만 유지

**말풍선 이모지 전환 (해결안):**
- 픽셀 5×5 grid → Phaser Text + 이모지로 일원화
- 사용자가 정한 12종: thinking … / happy 😄 / surprised 😶 / sleepy 😴 / confused 🤔 / idea 💡 / love ❤️ / angry 😡 / sad 😭 / sweat 😅 / music 🎵 / wow 😮
- OfficeScene workingBubble + setBubbleEmotion + EmotionPreviewModal Canvas 모두 Text 기반

**버그 fix 2건:**
- timer 충돌: `agent:reply` 2초 + `agent:set-emotion` 5초 → 짧은 게 긴 거 덮어쓰는 문제. Workstation.bubbleEmotionTimer 보관 + setBubbleEmotion 시작 시 이전 timer remove
- thinking emoji ⋯ → … (Apple Color Emoji 폰트에 ⋯ 없어서 안 보임 → Unicode U+2026으로 변경)

**EXE 재빌드:**
- package.json version 0.0.0 → 0.0.1
- pnpm dist:exe → `release/PixelAgentOffice-0.0.1-portable.exe` (98 MB)
- GitHub Release v0.0.1 Assets에서 기존 0.0.0 파일 삭제 + 새 0.0.1 업로드

#### 왜 그렇게 결정했는지
- **사용자 시각 검증 직후 피드백 즉시 반영** — 외부 테스터 본격 배포 전에 14건 fix
- **MBTI 시스템 도입** — 캐릭터 페르소나의 차별점. LLM 응답 다양화
- **이모지 전환** — 픽셀 5×5로 ^_^ 표현 한계 + 사용자 결단 "그냥 이모지로". 픽셀 게임 일관성 살짝 부조화지만 명확성 우선
- **timer 보관 패턴** — 두 이벤트(`agent:reply` + `agent:set-emotion`)가 같은 함수 호출 시 누적 timer 충돌. delayedCall 보관 + remove로 해결
- **눈 표정 롤백** — 4픽셀과 3×3 둘 다 시각 한계. 사용자 결단으로 sleepy만 유지

#### ⚠️ 시각 검증 상태
- **사용자 EXE 검증 → 14건 fix → 재빌드 → Release 파일 교체 완료**
- **외부 테스터 본격 배포 대기**

#### 산출
- E1 — Day 12 §3 코드 + 문서 (12개+ 파일)
- GitHub Release v0.0.1 EXE 0.0.0 → 0.0.1 교체

### **2026-05-26 (Day 12 §3 +1) — 알림 모달 + 빈 input 강조 + Cody 캐릭터**

#### 한 일
1. **window.alert → 중첩 알림 모달** — 5곳 alert 제거. modal-backdrop + modal 디자인 차용, zIndex 150, 헤더 "⚠️ 알림" 빨강 + "확인" autoFocus
2. **빈 input 빨간 강조** — fieldErrors state, borderColor + box-shadow + 아래 메시지. 사용자 입력 시 자동 clear
3. **기본 캐릭터 자동 채움** — TEMPLATES.defaultCustomInstructions/Color/Pattern 추가. Mary/Haewol/Cody 선택 시 이름·역할·지침·색·무늬 모두 자동
4. **🤖 Cody 메인 캐릭터 추가** — Template 'developer' 신규. variant 'custom' + gray + stripes. 페르소나: 말 적고 ... 자주, 개발 용어 + 밈 드립
5. **EXE v0.0.1 재빌드** — 변경 누적 반영

#### 왜 그렇게 결정했는지
- **alert 다이얼로그 디자인 + 포커스 락** 두 문제 동시 해결 → 중첩 모달로
- **빈 input 강조** — 알림만으로는 어디 빈 칸인지 모름. 디자인 일관성 + 즉시 시각 단서
- **TEMPLATES 확장 패턴** — defaultCustomInstructions/Color/Pattern 필드. 새 캐릭터 추가 시 코드 한 곳만 손대면 됨
- **Cody 외형** — variant 'custom' + 색·무늬 활용 (별도 픽셀 정의 X). 사용자 자유 수정 가능
- **EXE 재빌드는 점진적 배포** — 같은 v0.0.1 태그에 파일 교체 (외부 테스터 받기 전이라 OK)

#### 시각 검증 상태
- 사용자 EXE 사용 중 → 추가 신고: "설정 화면 다녀오면 채용 모달 입력 사라짐" → **✅ 해결** (SettingsModal backdrop zIndex 300 중첩 + ⚙ 버튼 onClose 제거 + `settings:open` payload `section` 통일)

#### 산출 커밋
- F1 `25c5a92` — HireModal + types.ts (2 files, 111+/16-) ✅ 푸시
- F2 (이번 정리) — 문서 3종

#### 보류 (다음)
- MBTI 별명 톤 결정

### **2026-05-27 (Day 13) — 버그 fix + 미완 레지스터 + 포트폴리오 v0.0.1 + 진급 Phase 1**

#### 한 일
1. **모달 드래그 닫힘 버그 fix** (`713e840`) — 6개 모달(7곳) backdrop을 `onClick` → `onMouseDown` + `e.target===e.currentTarget`. 모달 안 텍스트 드래그 후 바깥에서 떼도 안 닫힘
2. **🚧 미완·멈춤 기능 레지스터 신설** (`7d45366`) — §3↔§4 사이. A~F 분류(직급/메모리/칭찬 = 활동추적 미연결 공통뿌리). + 📣 테스터 피드백 표 T1(튜토리얼)
3. **설정 모달 중첩 버그 fix** (`21d450b`+`030db10`) — ⚙ 버튼 onClose 제거 + payload `section` 통일 + SettingsModal backdrop zIndex 300. 채용 입력 보존. 레지스터 F 항목 제거
4. **E2E 전반 실행 → stale 진단** — 1pass/8fail. 앱 버그 아님, 테스트가 빈 사무실 전환 미반영(Mary 가정). 재작성 필요(보류)
5. **포트폴리오 v0.0.0/v0.0.1 버전 분리** (`b11e03a`) — 기존→v0.0.0/, v0.0.1/에 PRD·user-flow·wireframes·FEATURES·code-snapshot 최신화. 미완 기능 🟡 정직 표기
6. **진급/메모리/칭찬 Phase 1 — 활동 카운터 연결** (`43606e3`) — `incrementEmployeeStats` 5계층 배선. ChatPopup 응답→totalMessages++, MemoModal 지침변경→totalMemoryUpdates++
7. **autosave.7z 임시 파일 삭제** (`1f82bb5`)
8. **칭찬 Phase 2** (이번 커밋) — `ChatMessage.praised` + agent 응답마다 👍 버튼 → totalPraises++ + 영속 중복방지 + 캐릭터 happy 4초
9. **진급 Phase 3** (`2d71a66`) — `shared/promotion.ts`(임계 + checkPromotionEligible 순수함수) + `PromotionModal.tsx`(캐릭터 진급 요청) + App 구독·승인(rank↑·happy). 트리거: 카운터 증가 직후 + 로드 시 스캔(시간형)
10. **진급 기준 재정의 + UI + 팻말 + 이사 임명** (`de47404`, 사용자 검증 완료) — 정량=대화만(사원50/대리100/과장200/부장400), 자동은 부장까지·이사·사장은 사장이 직접 임명. 채용 tip + 메모 진행도바/진급방식 변경 + 진급모달 기준달성 문구 + 캐릭터 아래 `🏆 직급` 팻말 + 부장→이사 임명 버튼
11. **오타 점검 룰** (`50c87fc`) — 한자혼입·깨진글자 반복 지적 → CONVENTIONS §6-1 + 메모리 `feedback_proofread_before_work.md`
12. **진급 난이도 배율 + Workflow 적대적 리뷰** (이번 커밋, 사용자 검증 완료) — 설정에 배율 프리셋(🚀0.5/⚖️1/🐢2/🏔3) → `applyMultiplier(base,mult)`로 전 직원 기준에 곱함. ultracode Workflow 리뷰(11 agent)로 버그 4건 발견·수정: ⓐ모달 기준문구 배율 반영 ⓑ배율변경 시 시간형 재스캔 ⓒ승인 후 다음 자격자 전환(큐 대신 재스캔) ⓓNaN 폴백. **정성 기준 재정의 5/20/50/100**(사용자 결정)
13. **Phase 4 직원 기억(메모리) 시스템 — 반자동** (이번 커밋) — 레지스터 A 마지막 잔여 해소. AskUserQuestion으로 범위 결정(저장=app-data.json 통합 / 갱신=B 반자동). `AppData.memories` + `loadMemory`/`saveMemory` 5계층 배선 + 해고 시 삭제. `buildSystemPrompt(emp, memory)`로 `# 기억` 섹션 주입(매 전송 직전 fresh load). 메모 모달 🧠 기억 섹션(textarea + "🧠 대화에서 기억 정리" 버튼 — 최근 40대화를 메모리 모델로 3인칭 요약). "메모 갱신"→"지침 수정" 라벨 통일. ultracode Workflow 적대적 리뷰로 7건 수정: ⓐmount stale 메모리→send마다 fresh load ⓑ요약 중 편집 유실→textarea/저장/닫기 disable ⓒ저장 경쟁→summarizing 중 차단 ⓓ긴 대화 토큰초과→최근40 slice ⓔ빈 요약 덮어쓰기→newMem 검증 후 거부 ⓕ라벨 혼동 ⓖ대화 없을 때 안내+early return

#### 왜 그렇게 결정했는지
- **레지스터** — "승진 어떻게 됐지?"에 매번 전수 조사하던 비용 제거. 멈춘 기능 한 곳 추적
- **Phase 단계화** — 진급+메모리+칭찬 공통 뿌리(활동 추적)부터(Phase 1). 원자적 증가로 동시 갱신 경합 방지. 그 위에 칭찬(2)·진급(3) 차례로
- **진급 승인 방식** — 기획 원칙 "캐릭터가 요청, 사용자가 승인"(자동 진급 X). promotion.ts는 순수 함수로 분리해 유닛테스트 가능
- **진급 기준 대화만·부장까지** — 사용자 결정. 대화 5회는 너무 빠름(10배). 고위직(이사·사장)은 사용자 의도적 임명. 사장은 "회사 넘기기"라 별도(다음)
- **진급 기준은 아직 코드 하드코딩** — 사용자 "설정에서 커스텀" 요청 → 다음에 난이도 배율 하나로 설정화
- **메모리(Phase 4) 반자동 채택** — 완전 자동 요약은 트리거·비용·품질 통제 어려움. 구조(저장·주입)는 자동 + 요약은 사용자 버튼 수동 트리거. app-data.json 통합(chatHistories 옆). 야간 압축 등 완전 자동은 후속
- **포트폴리오 버전 분리** — Day 8 이후 멈춰 현재 앱과 괴리. v0.0.0 보존 + v0.0.1 최신화

#### 검증 상태
- tsc -b 통과 (버그fix·Phase 1~4 모두). **실시각 검증 대기**: 모달 드래그/설정 중첩 + 활동 카운터/칭찬👍/진급 모달 흐름 + 기억 요약·주입 (사용자 pnpm dev — Gemini 키 더미라 채팅·요약 자동 호출 불가, 구조만 검증)
- ⚠️ 현재 배포 EXE v0.0.1은 5/26 빌드 → 버그fix·Phase 1~4 **미포함**. v0.0.2 재빌드 필요

#### 결정
- **v0.0.2** = 버그fix 2건 + Phase 1~4 + 진급 배율 + 메모리 묶어서 EXE 재빌드
- **맥 .dmg** = 코드 95% 재사용 가능, GitHub Actions macOS runner로 무료 빌드. v0.0.2 후

#### 산출 커밋
- `713e840` / `7d45366` / `21d450b` / `030db10` / `b11e03a` / `43606e3`(Phase1) / `2d71a66`(Phase3) / `de47404`(진급 재정의) / `1d0be2e`·`d7ede00`(배율) + (이번) Phase 4 메모리 + 세션 정리

### **2026-06-19~22 (Day 14) — 첫 사용자 온보딩 대공사**

#### 한 일
1. **튜토리얼 가이드 투어 (T1)** — `shared/tutorial.ts` + `components/TutorialOverlay.tsx`(마스코트 Clawd Canvas + 말풍선 + 스팟라이트 box-shadow 컷아웃 + 진행 점 + 이전/다음/건너뛰기). 자동 표시 X, 상단바 🎓 버튼으로만.
2. **API 키 온보딩** — SettingsModal 인라인 키 제거 → "🔑 API 키 설정" 버튼 + 신규 `ApiKeyModal`(입력) + `ApiKeyGuideModal`(받는 법 별도 안내창). 튜토리얼에 키 게이트(채용 전). 외부 링크 `main.ts`에서 `shell.openExternal`(기본 브라우저).
3. **데모 대화 모드** — 키 없이 채용·대화 가능. `shared/demoReplies.ts`(편집자/작가/개발자 페르소나 더미, custom은 키 유도). 데모 배너 + [🔑 키 연결] CTA, 키 저장 즉시 실제 전환, 푸터 분기.
4. **멀티트랙 + 채용 폼 전체 안내** — 트랙(메인/상점/설정) 일반화(활성 배열 ref). 메인=채용까지(+대화/칭찬/우클릭). 채용 폼을 모달 위(z320)에서 필드별 스팟라이트(외형·MBTI·직급·진급방식·모델, 채용완료는 `requireAction`). 상점·설정은 각 모달 헤더 🎓 → 해당 트랙(내부 옵션 전부, `data-section` 타겟 재사용). 모달 닫으면 트랙 종료.

#### 왜
- 데모 하이브리드 = 포트폴리오·SNS 쇼케이스라 "키 없이 즉시 체험 → 키 유도"가 진입장벽보다 유리.
- 멀티트랙 = 메인이 상점·설정까지 다루면 너무 길어 압도. 각 창 🎓로 맥락적 분리.

#### 검증 상태
- tsc -b 전 단계 통과, 한자혼입 0건. ultracode Workflow 적대적 리뷰 다회로 상호작용·레이스 버그 수정. **실시각은 사용자 dev**(데모·튜토리얼은 키 없이 확인 가능, `main.ts`만 재시작).
- ⚠️ 배포 EXE v0.0.1엔 Day 13~14 전부 **미포함** → v0.0.2 재빌드 필요.

#### 산출 (예정 커밋)
- feat: Day 14 온보딩(튜토리얼·API키 팝업·데모·멀티트랙) + docs: §128 정리

### **2026-06-23 (Day 14 계속) — 튜토리얼 완성도 감사 + 비서 컨셉 재설계**

#### 한 일
1. **완성도 감사** (11에이전트 Workflow) — 인벤토리→분석→적대적 검증. 깨진 스팟라이트 타겟 0건. 구멍 확정 → **F5 메모지 트랙(간판 기억 미설명)**, **F4 캔버스 조작(줌/패닝)**, F6/F7(low).
2. **📝 메모지 🎓 트랙** — `MEMO_TUTORIAL_STEPS` 12단계(정체성·지침·모델·메모리·감정·🧠기억·통계·진급·해고). MemoModal 헤더 🎓 + 섹션별 `data-section`. **🔎 캔버스 조작 단계**(줌 버튼 `data-tutorial="zoom"`).
3. **사용자 전체 시연 → 5대 피드백 재설계**: ① 전 트랙 **존댓말 + 비서 컨셉**(마스코트 = **문 비서** 🐙, 호칭 "사장님") ② 상점 **🛒** + 버튼 **[대괄호]** ③ **스크롤 먼저→포커스 1회 측정**(깜빡임 fix) + MBTI·감정 **정보 팝업 열리면 `tutorial:suppress`로 스팟라이트 숨김** ④ 최초 채용 **메리 강제·폼 잠금**(`pointer-events:none`, ⓘ·[채용 완료]만 허용) ⑤ **채용→대화→메모→상점→설정 자동 연속**(`FIRST_RUN_STEPS` ~47단계 + App **zone orchestration**가 단계 id로 모달 자동 개폐, 진행 막대).
4. **dev 실행 fix** — `run_in_background` `pnpm dev`는 Electron 자식이 죽음 → **`Start-Process`로 분리 실행**해야 안정.

#### 검증 상태
- tsc -b 통과, 한자혼입 0건. 적대적 리뷰(flow/lock-suppress/content-targeting) 커밋 전 수행. 실시각은 사용자 dev.
- ⚠️ EXE v0.0.1 미포함 → v0.0.2 재빌드 시 반영.

#### 산출 (예정 커밋)
- feat: Day 14 튜토리얼 보강·재설계(메모지+캔버스 트랙 / 존댓말 문 비서 / 자동연속 / 메리잠금 / 스크롤후포커스) + docs: §129 정리

### **2026-07-03 (Day 14 계속) — M-2F-0 멀티모델(Vercel AI SDK) + 2F Phase 1 tool-calling**

#### 한 일
1. **M-2F-0 멀티모델 기반** (2층 협업 로드맵 1단계, [`docs/2F-collaboration-handoff.md`](PixelAgentOffice/docs/2F-collaboration-handoff.md) §0 잠금 결정대로)
   - `ai@7` + `@ai-sdk/anthropic`·`google`·`openai` 도입. 세 provider가 공유하는 **`aiProvider.ts` 팩토리** 신설(generateText 호출 + LLMError 매핑 통합). `anthropic.ts`/`gemini.ts`는 내부만 교체, `LLMProvider` 인터페이스·모델 alias 유지 → `dispatch.ts` rate/비용 한도 경로 무변경.
   - **OpenAI provider 신설**: `openai.ts` + `registry` gpt- 라우팅 + `apiKeys` 키 파일 + `MODEL_INFO`에 `gpt-5-mini`($0.25/$2 per 1M) + 채용/메모/설정/API키/가이드 UI 확장.
   - **빌드 함정**: 첫 e2e에서 앱 자체가 안 뜸 — `ai@7`의 CJS 의존성이 ESM 번들 안에서 `require("path")` 호출 → electron main 빌드에 **createRequire 배너** 주입(`vite.config.ts`)으로 해결.
2. **2F Phase 1 tool-calling 인프라** — `ToolDef`/`ToolCall`/`ToolResultMsg`/`stopReason('end'|'tool_calls')` 타입 확장 + `ChatMessage`에 tool 역할 추가. provider는 도구를 **실행하지 않고 호출만 반환**(SDK 내부 루프 미사용 — 실행은 Phase 2 루프의 몫).
3. **테스트 그물 확장**: 유닛 `llm-models.test.ts`(라우팅·단가) + 통합 `toolcall-roundtrip.test.ts`(실키 왕복) + e2e `06-openai-chat.spec.ts`(키 준비 시 자동) + 03 스펙에 비용 카운터 실측 assert.
4. **문서 정리**: 참고 출처 표기를 omo(oh-my-openagent)·OpenAgent로 일원화(2F 핸드오프·ideas/20 파일명 변경·ideas/11).

#### 검증 상태
- tsc 무결, 유닛+통합 34/34, e2e 10 통과+1 skip. Gemini 실키: 1층 대화 응답 + 카운터(요청 1·토큰 517/50·$0.000054) 실측. tool-calling 왕복: 더미 시각 주입 → 모델이 그 값 반영해 답변.
- ⏳ OpenAI 실채팅은 키 대기(들어오면 06 스펙 자동 검증). `pnpm lint`는 기존 파일들(App/OfficeScene 등) 사전 부채로 빨간불 — 이번 변경분과 무관.

#### 산출 커밋
- feat: M-2F-0 멀티모델 + 2F Phase 1 tool-calling (코드+테스트)
- docs: 세션 정리(§131) + 출처 표기 정리

---

### **2026-07-03 (Day 14 계속) — 1층 폴리시: 응답 스트리밍 + 메모리 모드 실동작 연결 + 단가 정정**

> §131 커밋 직후 연속 작업이었으나 커밋 없이 세션이 끊겼다가, 이번 "세션 정리해줘" 트리거로 뒤늦게 기록됨(파일 mtime 기준 13:43~13:50, 커밋 `0e22f7f` 13분 후).

#### 한 일
1. **응답 실시간 스트리밍** — `aiProvider.ts`에 `onDelta` 콜백 추가(있으면 `streamText`, 없으면 기존 `generateText` 그대로) → `dispatch.ts`/`main.ts`/`preload.ts`/`platform/*`까지 관통 → IPC `llm:chunk` 이벤트로 렌더러 push. usage/비용 집계는 최종 완성본 반환값 기준 그대로. `ChatPopup`이 조각을 누적 표시(커서 깜빡임, emotion 태그는 완성 전까지 숨김). mock provider도 4자씩 흉내내 데모 모드 동일 체감.
2. **메모리 모드(off/manual/ask/auto) 실동작 연결** — §130에서 "무동작이라 숨겼다"고 기록한 부채 해소. 요약 로직을 `src/shared/memory.ts`(`summarizeMemory`)로 공용화해 메모 모달 수동 버튼과 ChatPopup 자동/확인 트리거가 같은 함수 사용. auto/ask는 채팅창 닫기·직원 전환 시(응답 턴 ≥3) 트리거, off는 기억 주입 자체 생략, manual은 기존 수동 버튼만.
3. **단가 정정** — `MODEL_INFO`의 Opus/Haiku 표기 단가가 실제 매핑 API 모델과 달랐던 것 정정: Opus $15/$75→$5/$25, Haiku $0.80/$4→$1/$5 (§42 보류 fix 해소).
4. 신규 테스트: `tests/integration/streaming.test.ts`(실키 필요), `tests/unit/memory-summarize.test.ts`.

#### 검증 상태
- vitest **38 통과 / 4 실패** — 실패 4건은 전부 Gemini 실키 네트워크 호출(`streaming.test.ts` 2건 + 기존 `toolcall-roundtrip.test.ts` 2건)이 이 환경의 SSL inspection(self-signed certificate)에 막힌 것. 코드 회귀 아님.
- e2e(Playwright)·tsc·`pnpm lint`·PC 시각 확인(스트리밍 커서 체감, 메모리 auto/ask 실제 동작)은 **이번 세션에서 실행하지 않음** — 다음 세션 우선 검증 항목.

#### 산출 커밋 (사용자 승인 대기)
- feat: 1층 폴리시 — 응답 스트리밍 + 메모리 모드 실동작 연결 + Opus/Haiku 단가 정정 (코드+테스트)
- docs: 세션 정리(§132 + HANDOFF + FEATURES)

### **2026-07-07 (Day 14 계속) — 2F Phase 2: 에이전트 루프**

#### 한 일
1. **`electron/agent/loop.ts` 신설** — 2F 핸드오프 §4 갭2 루프: `LLM 호출 → 도구 호출 있으면 실행 → role:'tool' 결과 주입 → 반복 → 없으면 종료`. **MAX_STEPS 상한**(기본 20, 도달 시 throw 아닌 `stopped:'max_steps'` 반환 — 호출부가 안내 결정), 도구 실패(미등록·execute throw)는 `{ error }`로 모델에 되돌려 **루프 생존 + 모델 복구 유도**, `AgentEvent`(step/tool:start/tool:done) 훅(Phase 3 위임 중계·Phase 4 게임 연출 대비), abort 체크(스텝 전·각 도구 실행 전), usage 전 스텝 합산, 원본 messages 배열 불변.
2. **chat 주입식 설계** — 핸드오프 스케치는 `dispatch.chat()` 직접 재사용이지만 dispatch가 store.ts(→`app.getPath`, electron)를 물어 vitest에서 import 불가 → 루프는 동일 시그니처 `ChatFn`을 주입받음. 프로덕션 배선(Phase 3 main.ts IPC)에서 dispatch.chat을 넘기면 rate/일일 한도 자동 적용 — §8 원칙(electron import 금지 + 한도 경로 유지) 둘 다 보존.
3. **`electron/agent/tools/time.ts`** — Phase 1 통합 테스트의 더미 스펙 `get_current_time`을 실제 실행기(`AgentTool` def+execute)로 승격. timezone 인자 지원, 잘못된 타임존은 throw → 루프가 `{ error }`로 감싸 재시도 유도.
4. **테스트** — 유닛 `tests/unit/agent-loop.test.ts` **17케이스**(각본 ChatFn: 종료 조건·왕복 메시지 형태·멀티 도구 호출·오류 복구·max_steps·abort 2종·이벤트 순서·ctx 전달·time 도구) + 통합 `tests/integration/agent-loop-roundtrip.test.ts`(실키 — Phase 1은 도구 결과 수동 주입이었지만 이번엔 **루프가 스스로 실행**하는지, 키 없으면 자동 skip).

#### 검증 상태
- 신규 유닛 17/17, 전체 vitest **55 통과 / 5 skip**, `tsc -b` 무결. pull 직후 `pnpm install` 필요했음(vitest·ai@7 등 신규 의존성 미설치 상태였음).
- ⚠️ 이 PC엔 `.env.local` 자체가 없어 실키 통합 3파일(agent-loop·toolcall·streaming) **자동 skip** — §132의 "실키는 있는데 SSL로 실패"와 다른 상태(키 부재). e2e·lint·PC 시각 확인(§132 이월)은 계속 이월.

#### 산출 커밋
- feat: 2F Phase 2 — 에이전트 루프(runAgent) + get_current_time 실행기 + 테스트 (`236bc10`)
- docs: 세션 정리(§133) — HANDOFF·FEATURES·2F핸드오프 동기화 (`0a4e476`)

### **2026-07-07 (Day 14 계속) — 2F Phase 3: 위임 협업 ★2층 엔진 완성★**

#### 한 일
1. **`electron/agent/persona.ts`** — 팀장·팀원 공용 페르소나(정체성+지침+MBTI). 1층 전용 감정 태그·기억 섹션은 제외, ChatPopup 무변경(블라스트 반경 최소화).
2. **`electron/agent/tools/delegate.ts`** — `delegate_to_member(memberId, task)`: 팀원 검증 → **팀원 페르소나로 runAgent 자식 루프 재귀 호출** → 보고 반환. 팀원 tools에 위임 도구가 구조적으로 안 들어가 **재위임 원천 차단**(핸드오프 §3 원리 4). 잘못된 memberId는 가능한 팀원 명단을 담아 throw → 루프가 `{ error }`로 팀장 모델에 되돌려 정정 유도.
3. **`electron/agent/team.ts`** — `resolveTeam`(팀장 존재·리더 자리·`canBeTeamLeader` 과장↑·같은 팀 member 수집 — 좌석 시스템=조직도) + `runTeamTask`(팀장 프롬프트에 **팀원 명단 주입**, omo dynamic-agent-prompt-builder 원리) + `TeamEvent`(delegation:start/done·leader/member 스텝) 스트림.
4. **IPC·platform 배선** — main.ts `agent:run-team`(**dispatch.chat 주입** → 위임으로 호출 늘어도 rate/일일 한도 자동 §8, 이벤트 `agent:team-event` push, 중단 `llm:abort` 재사용, 검증 실패 `code:'INVALID'`) + preload `runTeamTask`/`onTeamEvent` + platform 3종(mock은 데모 위임 연출 — 키 없이 Phase 4 UI 개발 가능).
5. 🐛 **테스트가 잡은 갭**: 팀 결과 usage에 팀원 자식 루프 토큰 누락 → `delegation:done`에 usage 실어 **팀장+팀원 전체 합산**으로 픽스(2층 총 소비량 정직 보고).

#### 검증 상태
- 신규 유닛 12(`agent-team.test.ts`), 전체 vitest **67 통과 / 6 skip**, tsc -b·**pnpm build** 무결(§131 createRequire 함정 재발 없음).
- ⏳ 실키 왕복(`agent-team-roundtrip.test.ts`) 키 대기. **UI 트리거·게임 연출은 Phase 4** — 엔진+IPC+platform까지가 이번 범위.

#### 산출 커밋
- feat: 2F Phase 3 — 위임 협업 엔진 + IPC·platform + 테스트
- docs: 세션 정리(§134) — HANDOFF·FEATURES·2F핸드오프 동기화

---

## 🛠 3. 현재 위치 + 미커밋 작업

### 📌 현재 상태 (2026-07-07 세션 종료, 2F Phase 3 완료 시점)

- **워킹 트리**: 이번 세션 커밋 4건 — Phase 2(`236bc10` feat + `0a4e476` docs §133) 푸시 완료, Phase 3(feat + docs §134)를 사용자 승인("여기까지 세션정리 커밋푸시")으로 커밋·푸시. `.env.local`(실키)은 이 PC에 없음.
- **별도 무관 미추적 파일**: `portfolio/22-kgwebcil-anatomy-report.html` + `portfolio/kgwebcil_analysis_parts/` — PixelAgentOffice와 무관한 별개 산출물(웹 보안 분석 리포트류). **사용자 확인: 이 저장소에 커밋하는 대상이 아님** — 항상 미추적 상태로 둘 것.
- **다음 세션 진입점**: **2F Phase 4 게임 연출 + 팀 작업 UI** — 채팅창(또는 팀장 우클릭 메뉴)에서 팀 작업 트리거 UI + `onTeamEvent`(delegation:start/done)를 `eventBus`로 흘려 팀장→팀원 캐릭터 애니메이션·말풍선 연출. **엔진·IPC·platform(runTeamTask/onTeamEvent)·mock 데모 연출까지 배선 완료라 UI만 얹으면 됨.** 설계: [`docs/2F-collaboration-handoff.md`](PixelAgentOffice/docs/2F-collaboration-handoff.md) §7 Phase 4.
- **보류 fix**: ① 실키 검증 — GEMINI_API_KEY 넣으면 위임 왕복·루프·스트리밍·toolcall 통합 4파일 자동, OPENAI_API_KEY 넣으면 06 e2e 자동 ② GitHub Releases v0.0.2 EXE 업로드(이월) ③ `pnpm lint` 기존 부채 ④ PRD 드리프트(3사 멀티모델·메모리 모드·2층 엔진 완성) — **다음 버전(v0.0.3) 스냅샷 때 PRD 갱신 필요** ⑤ 1층 폴리시 PC 시각 확인(스트리밍 커서·메모리 auto/ask) + e2e 재실행(§132 이월) ⑥ 팀원 자식 루프에 직원 기억(memory) 주입 미연결(Phase 4 이후 검토).

### 🎯 다음 작업 우선순위 (Day 12 §1)

**Day 11 후반 — 그리드 확대 시도 실패 회고:**
- 시도 1: 16×14 cells PIXEL_SIZE 2 (캐릭터 32×28 px) → "너무 못생겻어"
- 시도 2: 32×24 cells PIXEL_SIZE 2 + 가구 PIXEL_SIZE 3 (캐릭터 64×48 px, 가구 1.5x) → "너무 못생겻다"
- 사용자 결정: 그리드 확대 포기 → `git restore`로 449fdbf 시점 원복 완료
- 결론: Claude의 픽셀 그리드 문자열 디자인은 12×12 단순 마스코트 수준이 한계. 레퍼런스 수준 디테일은 **PNG asset 필수** (Aseprite/Piskel로 사용자 직접 그림)
- v2.5 액세서리/소품/눈 표정 코드는 모두 보존 (`@ts-expect-error unused`로 마킹). PNG 도입 시 부활
- 상세 회고: [`ideas/19-day11-grid-and-followup-retro.md`](ideas/19-day11-grid-and-followup-retro.md)

**Day 11 후반 — G/A/B/C 4개 작업 완료 (커밋 `2f527bb`):**
| 단계 | 작업 | 파일 |
|---|---|---|
| G | HANDOFF 정리 — 그리드 확대 결정 반영 | HANDOFF.md |
| A | **P2 #25 가구 배치 드래그앤드롭** (8종 가구) | types.ts / OfficeScene.ts / App.tsx / ShopModal.tsx |
| B | **채팅 영구화 풀 스펙** (store.ts 영속화) | types.ts / store.ts / main.ts / preload.ts / platform/*  / ChatPopup.tsx |
| C | **빈 자리 평소 숨김** (채용 모달·이동 모드 한정) | App.tsx / OfficeScene.ts |

**Day 11 후속 +1 — 사용자 피드백 4건 한 번에 (커밋 `3f5a3c8`):**
| 영역 | 작업 | 파일 |
|---|---|---|
| 상점 디자인 | **픽셀 미리보기** — emoji 대신 실제 사무실 가구와 동일한 픽셀 이미지. 카드 크게. FURNITURE_CATALOG 단일 출처 | shared/furnitureCatalog.ts (신규) / components/FurniturePreview.tsx (신규) / ShopModal.tsx / ShopModal.css / OfficeScene.ts |
| 가구 배치 | **배치 모드** — 클릭 위치에 가구 떨어짐. ghost preview 마우스 따라감. ESC/우클릭 취소 | OfficeScene.ts |
| 자리 이동 | **카메라 분리 버그 fix** — 안내 텍스트·드롭 박스가 두 카메라에 중복 표시되던 문제 | OfficeScene.ts |
| 메모 UI | **외형 편집 제거** — 최초 채용 시에만 변경 가능. JSX 주석으로 보존 | components/MemoModal.tsx |
| 캐릭터 UI | **hover 명함 카드 주석** — 일단 비활성. 나중에 다른 위치 결정 | App.tsx |

**Day 12 §1 — 감정 자동 트리거 + 가구 컨텍스트 메뉴 + 배포 준비 (커밋 3개 예정):**
| 영역 | 작업 | 파일 |
|---|---|---|
| 감정 자동 트리거 | LLM system prompt에 `[emotion:xxx]` 태그 12종 강제. `parseEmotionTag` 본문 정리 + emotion 5초 시각화. 자동 복귀처 idle로 | components/ChatPopup.tsx / game/OfficeScene.ts |
| idleEmotion | `Employee.idleEmotion` 신규 + MemoModal 12 버튼 선택 grid | shared/types.ts / components/MemoModal.tsx |
| 타입 공유 | `BubbleEmotion` + `EMOTION_LABELS` shared/types.ts로 이동 | shared/types.ts / game/OfficeScene.ts / components/* |
| 가구 컨텍스트 메뉴 | 우클릭 = 메뉴 3종 (🚚 옮기기 / 🗑 이 가구 삭제 / 🧹 전체 가구 삭제). 외부 클릭/ESC 닫기 | App.tsx / game/OfficeScene.ts |
| 가구 옮기기 모드 | placement mode `moveUid` 확장. 원본 hide → 새 위치 클릭 = furniture:moved emit. 취소 시 원본 복원 | game/OfficeScene.ts |
| 전체 가구 삭제 | `furniture:clear-all` → placedFurniture: [] | App.tsx |
| 배포 준비 | electron-builder devDep + `pnpm dist:exe` (Windows portable EXE) | PixelAgentOffice/package.json / pnpm-lock.yaml |

**Day 12 §2 — EXE 실제 빌드 + 빈 사무실 + GitHub Releases (커밋 1개 + Release v0.0.1):**
| 영역 | 작업 | 파일 |
|---|---|---|
| EXE 빌드 | `pnpm dist:exe` 첫 실행 시 winCodeSign symlink 권한 문제 → 관리자 권한 PowerShell로 1회 → 캐시 생성 후 일반 권한 OK → `release/PixelAgentOffice-0.0.0-portable.exe` (98 MB) 생성 | (빌드 산출물, git 미추적) |
| 빈 사무실 첫 실행 | `createDefaultData()`의 employees Mary/Haewol 더미 제거 → 빈 배열. unused import 정리 | electron/data/store.ts |
| .gitignore 정리 | `release` / `dist-electron` 추가 (빌드 산출물 git 미추적) | .gitignore |
| Releases 배포 | `gh release create v0.0.1` + EXE 첨부. 테스터 안내문 release notes | (GitHub Releases) |

**Day 12 §3 — UX 14건 + MBTI + 이모지 + EXE v0.0.1 (커밋 1개 + Release 파일 교체):**
| 영역 | 작업 | 파일 |
|---|---|---|
| UX 9건 | 안내 텍스트 제거 / 채용 펄스 / placeholder + 필수값 / 커스텀 지침 ⓘ tip / 리더 자격 빨간 강조 / 키 없으면 모델 비활성 / 빈 자리 토글 제거 / 기본 가구 제거 | App.tsx / HireModal.tsx / OfficeScene.ts |
| **MBTI 16종 페르소나** | MBTI 타입 + emoji/responseStyle/trait + Employee.mbti + HireModal 입력·자동 인식 tip·ⓘ 16종 모달 + ChatPopup 시스템 프롬프트 자동 주입 | shared/types.ts / HireModal.tsx / ChatPopup.tsx |
| **감정 미리보기 모달** | 작은 중첩 모달(460px) 안 Canvas에 캐릭터 + 말풍선 + 이모지 + 12종 버튼. ShopModal은 "열기" 버튼 1개로 단순화 | components/EmotionPreviewModal.tsx (신규) / Clawd.ts (export) / OfficeScene.ts (export) / ShopModal.tsx |
| 눈 표정 시도·롤백 | 4픽셀 대각선 → 3×3 확장 → 사용자 결단으로 둘 다 롤백. Day 10 sleepy(closed)만 유지 | Clawd.ts / OfficeScene.ts |
| **말풍선 이모지 전환** | BUBBLE_INNER_PIXELS 5×5 → Phaser Text + 사용자가 정한 12종 이모지. workingBubble 타입 일반화 | shared/types.ts (EMOTION_LABELS) / OfficeScene.ts / EmotionPreviewModal.tsx |
| 버그 fix | timer 충돌 (agent:reply 2초 vs agent:set-emotion 5초) → Workstation.bubbleEmotionTimer 보관 + 이전 timer remove | OfficeScene.ts |
| 버그 fix | thinking ⋯ → … (Apple Color Emoji 폰트 호환) | shared/types.ts |
| EXE 재빌드 | package.json 0.0.0 → 0.0.1 + pnpm dist:exe → release/PixelAgentOffice-0.0.1-portable.exe (98 MB). 사용자가 Release Asset 파일 교체 | package.json (빌드 산출물 git 미추적) |

**Day 12 §3 +1 — 알림 모달 + 빈 input 강조 + Cody (커밋 `25c5a92` + 문서):**
| 영역 | 작업 | 파일 |
|---|---|---|
| 알림 모달 | window.alert (5곳) → 중첩 모달 (modal-backdrop, zIndex 150, ⚠️ 헤더). 1차 인라인 빨간 박스 → 사용자 요청으로 모달 형태로 변경 | HireModal.tsx |
| 빈 input 강조 | fieldErrors state, borderColor + box-shadow + 아래 메시지. 사용자 입력 시 자동 clear | HireModal.tsx |
| 기본 캐릭터 자동 채움 | TEMPLATES에 defaultCustomInstructions/Color/Pattern 필드 추가. Mary/Haewol/Cody 선택 시 이름·역할·지침·색·무늬 모두 자동. handleTemplateChange 분기 | shared/types.ts / HireModal.tsx |
| **🤖 Cody 메인 캐릭터** | Template type 'developer' 추가. variant 'custom' + gray + stripes. 페르소나: 말 적고 ... 자주, 개발 용어 + 밈 드립 | shared/types.ts |
| 채용 저장 조건 | template === 'custom' → TEMPLATES[template].variant === 'custom' (Cody 'developer'도 custom variant) | HireModal.tsx |
| EXE 재빌드 | release/PixelAgentOffice-0.0.1-portable.exe 갱신 (98 MB, 18:10). Release Asset 파일 교체 | (빌드 산출물) |

**다음 작업:**
1. ✅ **설정 화면 중첩 표시 — 완료** — ⚙ 버튼 onClose() 제거 + SettingsModal backdrop zIndex 300 중첩 + `settings:open` payload `section: 'google-key'` 통일. 채용 모달 입력 보존 확인
2. **외부 테스터 본격 배포** — Release v0.0.1 (0.0.1 EXE)
3. **MBTI 별명 톤 결정** (보류) — 게임형 / 한국 밈 / 직업 톤 / 동물 비유
4. **피드백 반영 v0.0.2** — 발견 이슈 fix + 재배포
5. **M5-d 성격 시스템 완성** (MBTI 시스템 기반 + 사내연애·관계 layer 2)
6. **Phase 3 백엔드 셋업** / **PNG asset 도입**

### 보류 cleanup (변동 없음)
- **눈 감기 PC 검증** (Day 10) — 미검증 상태로 유지 결정 (Day 11에 디버그 로그 제거). PNG asset 도입 시 같이 확인
- **회사망 SSL inspection 임시 fix** — `electron/main.ts`의 `NODE_TLS_REJECT_UNAUTHORIZED=0` (`!app.isPackaged` 가드 안). dev 한정. 배포 전 일반망 검증 + 코드 재확인 필수. 자세히는 [`ideas/18-corp-network-ssl-issue.md`](ideas/18-corp-network-ssl-issue.md) + [`FEATURES.md`](FEATURES.md) "배포 전 검증" 섹션
- **gemini.ts 진단 console.error 5줄** — 유지 결정 (Day 10). catch 안이라 정상 시 0 출력, 재발 시 첫 단서
- **ChatPopup buildSystemPrompt 가드 주석 처리** (Day 10) — Gemini safety filter 호환. 채팅 안정 확인 후 더 중립 문구로 다시 활성화 검토

### ✅ Day 8 모든 작업 + P0 7개 push 완료 — 미커밋 없음

워킹 트리 깨끗. 마지막 push: `488cbe3` (P0 7개 일괄 수정).

### ✅ PC 시각 검증 1차 피드백 — P0 7개 처리 완료 (2026-05-18)

사용자 PC 캡처 2장 + 텍스트 피드백 → 25 항목 분류 → P0 7개 일괄 수정. 자세히는 [`ideas/15-pc-validation-feedback.md`](ideas/15-pc-validation-feedback.md).

#### P0 완료 — 코드 통과 / PC 시각 재검증 대기

| # | 영역 | 변경 내용 | 만진 파일 | 상태 |
|---|---|---|---|---|
| 1 | 토큰 보드 위치 | 사장석 yRatio 0.22 → 0.30 (보드는 그대로, 사장석 내림) | `src/shared/seats.ts` | ✅ 코드 / ⏳ 시각 |
| 2 | 빈자리 hint | Phaser text → React DOM tooltip (마우스 옆 작게, `seat:hover-empty` emit) | `OfficeScene.ts` + `App.tsx` + `App.css` | ✅ 코드 / ⏳ 시각 |
| 3 | 회전 + 자리이동 충돌 | `enterMoveMode` 시 `hireZones.disableInteractive()`, `exitMoveMode` 재활성화 | `OfficeScene.ts` | ✅ 코드 / ⏳ 시각 |
| 4 | 회전 시 말풍선 | orientation별 chatBubbleX/Y 계산 (회전 시 책상 위 `deskY-60`) | `OfficeScene.ts` | ✅ 코드 / ⏳ 시각 |
| 5 | 책상 디테일 | 책상 폭 40→24, MOUSE 제거, memo 책상 우측 상단 (12, -4) | `OfficeScene.ts` | ✅ 코드 / ⏳ 시각 |
| 6 | + 채용 hover 펄스 | `topbar-btn-pulse` 조건 제거, 빈자리 클릭 무동작 | `App.tsx` | ✅ 코드 / ⏳ 시각 |
| 7 | 팀 시스템 (1차) | 팀 A만 표시 (활성 팀 = 직원 있는 팀 + 기본 A), `drawTeamLabels(activeTeams)` | `OfficeScene.ts` | ✅ 코드 / ⏳ 시각 |

→ PC에서 `git pull` → `pnpm dev` → FEATURES.md 워크플로우로 1차 검증. 어색하면 P1 폴리시.

#### P1 #8~16 — 완료 / PC 시각 재검증 대기 (커밋 진행 중)

| # | 영역 | 변경 내용 | 상태 |
|---|---|---|---|
| 8 | UI 카메라 분리 | `uiCamera` 추가 + main/ui ignore. 줌해도 UI 영향 X | ✅ 코드 / ⏳ 시각 |
| 9 | 줌 후 panning | 빈 영역 좌클릭 드래그 = main 카메라 scroll. 객체 위 충돌 회피 | ✅ 코드 / ⏳ 시각 |
| 10 | 실시간 시계 + 크기 | CLOCK_FACE + pixelSize 3 + Graphics 시침·분침 + 60초 polling | ✅ 코드 / ⏳ 시각 |
| 11 | 팀 라벨 우클릭 이름 수정 | `team:rename-request` emit → React prompt → `platform.updateSettings({teamNames})` → scene 자동 | ✅ 코드 / ⏳ 시각 |
| 12 | 사무실 파티션 (옵션 C 풀) | 위쪽 벽 영역 + 사장석 좌우·위 파티션 + 팀 사이 파티션 + 같은 팀 내 자리 사이 세로 파티션 | ✅ 코드 / ⏳ 시각 |
| 13 | 채팅 영구화 (1차) | ChatPopup에 `messagesByEmployeeRef` — employee별 messages 메모리 보관. 채팅창 닫고 다시 열면 이력 복원 | ✅ 코드 / ⏳ 시각 |
| 14 | 채팅 진행 중 상태 영구화 | LLM 응답 도착 시 closure empId로 ref 직접 갱신 (unmount 후 도착해도 보존). working 표시는 OfficeScene이 자체 메모리 유지 | ✅ 코드 / ⏳ 시각 |
| 15 | 말풍선 통일 | workingBubble `✦` → `…` + 배경 제거. CHAT_BUBBLE 내부 점 제거 (빈 말풍선) | ✅ 코드 / ⏳ 시각 |
| 16 | 팀 선택 채용 | HireModal에 "👥 팀 배정" 섹션. 활성 팀 + 새 팀 1개 옵션. `resolveSeatId` selectedTeam 우선 | ✅ 코드 / ⏳ 시각 |

→ PC에서 `git pull` → `pnpm dev` → FEATURES.md 워크플로우로 2차 검증. 어색하면 폴리시.

#### 남은 P1 (#16 후) — 미반영
- 채팅 영구화 풀 스펙 (앱 재시작 후도 유지 — `store.ts` 영속화)
- 빈 자리 평소 숨김 (채용 모달 열려있을 때만 표시)

#### P1 캐릭터 v2 #17~21 — 완료 / PC 시각 재검증 대기

자세히 → [`ideas/16-character-customization-v2.md`](ideas/16-character-customization-v2.md)

| # | 영역 | 변경 내용 | 상태 |
|---|---|---|---|
| 17 | 커스텀 캐릭터 | `Template = 'custom'` + PIXELS_CUSTOM_OCTOPUS(8다리) + CharacterPalette 12색 + 기본 그림자 회색 | ✅ 코드 / ⏳ 시각 |
| 18 | 무늬 시스템 | solid/speckled/gradient/stripes 4종. computePatternColor 동적 픽셀 색 (Phaser Color lighten/darken/Interpolate) | ✅ 코드 / ⏳ 시각 |
| 19 | 모든 캐릭터 자유 편집 | MemoModal에 이름/역할/이모지/baseInstructions/외형 다 편집. updateEmployee 전체 필드 전달 | ✅ 코드 / ⏳ 시각 |
| 20 | 지침 placeholder | INSTRUCTIONS_PLACEHOLDER 상수 (4 예시) — HireModal·MemoModal | ✅ 코드 |
| 21 | 부적절 표현 가드 | buildSystemPrompt에 안전 가드 섹션 (혐오/성적/폭력 → "..." 응답) | ✅ 코드 / ⏳ LLM 검증 |

#### P2 #22~24·26 — 완료 / #25 다음 단계

자세히 → [`ideas/17-shop-and-furniture.md`](ideas/17-shop-and-furniture.md)

| # | 영역 | 변경 내용 | 상태 |
|---|---|---|---|
| 22 | 창밖 풍경 | drawWindowScenery — 산 2개 + 건물 3개 (실루엣 + 노란 창문 점). sky band 안 | ✅ 코드 / ⏳ 시각 |
| 23 | 야간 일하는 직원 탁상 전등 | LAMP 픽셀 + deskLampGlow (BlendMode ADD 펄스). forcedNight && working 시 표시 | ✅ 코드 / ⏳ 시각 |
| 24 | 상점 모달 (1차 카탈로그) | ShopModal.tsx 신규 + ShopModal.css. 12종 카탈로그 (가구/꾸미기/비품). topbar "🛍 상점" 버튼 | ✅ 코드 / ⏳ 시각 |
| 25 | 가구 배치 드래그앤드롭 | **다음 단계** (1차 모달에 안내 명시) | ❌ 후속 |
| 26 | 기존 가구 크기 확대 | 화분/책장/자판기 pixelSize 2→3 (1.5배) | ✅ 코드 / ⏳ 시각 |

#### P3+ — 미래

- 캐릭터 커스텀 아이템 (선글라스·노트북·밀짚모자·안경·셔츠·뿔·화려한 의자)
- 사무실 테마 팩 (모던/클래식/우주/카페/공장)
- M5-d 성격 시스템 (MBTI 보류 결정 답한 후)
- Phase 3 백엔드 셋업 (BYOK 모바일 진입)

---

## 🚧 미완·멈춤 기능 레지스터

> **목적**: 기획·UI·필드는 깔렸는데 *핵심 동작이 멈춰 있는* 기능을 한 곳에 모은 추적표.
> 흩어진 코드 주석·ideas 문서를 매번 전수 조사하지 않아도 여기만 보면 "그 기능 지금 어디까지 됐지?"를 확인할 수 있게 함.
> 최초 작성: 2026-05-26 (Day 12 §3 +1 세션). **새 기능을 비활성/보류/주석 처리할 때마다 여기 등록**. 완성되면 해당 행 제거 + FEATURES.md로 이동.

### A. 데이터·UI는 있는데 핵심 로직이 안 도는 것 ⭐ (가장 "멈춘" 부류)

✅ **Day 13에 A 전부 해소** — 진급(Phase 1 활동 카운터 + Phase 3 요청 모달) + 칭찬(Phase 2 👍) + **메모리(Phase 4 반자동 — app-data.json 저장·system prompt 주입 + 메모 모달 수동 요약 버튼)**. 명세는 `FEATURES.md` "활동 카운터/칭찬/진급 시스템 + 직원 기억(메모리) 시스템", 경위는 brainstorming §123·§124·§127.

> ✅ **`MemoryMode`(off/manual/ask/auto) 토글 실제 동작 연결 — 2026-07-03(Day 14 계속, 1층 폴리시)에 완료**. 요약 로직 공용화(`src/shared/memory.ts`) + ChatPopup 닫기/직원전환 시 auto(조용히)/ask(confirm) 트리거 + off는 주입 생략. 명세는 `FEATURES.md` "직원 기억 시스템", 경위는 brainstorming §132. 잔여(멈춘 게 아닌 단순 확장): 완전 자동 야간 압축 트리거는 여전히 미구현.

### B. 코드는 완성됐는데 시각 품질로 비활성 (PNG asset 도입 시 부활)

| 기능 | 상태 | 위치 |
|---|---|---|
| v2.5 액세서리 (안경·모자 등) | `@ts-expect-error unused`로 보존. 12×12 그리드 너무 작음 | `game/characters/Clawd.ts:7~` |
| v2.5 책상 소품 (머그·화분·노트북) | 동일 — 비활성 보존 | `game/OfficeScene.ts:100~`, `1939` |
| 캐릭터 눈 표정 (4픽셀·3×3) | Day 12 §3 시도 후 롤백, 보존용. sleepy(눈감기)만 활성 | `OfficeScene.ts:246~`, `Clawd.ts` |

→ 공통 부활 조건: **PNG asset 도입** (사용자가 Aseprite/Piskel로 직접 그릴 때). 자세히 `ideas/19-day11-grid-and-followup-retro.md`

### C. 의도적으로 주석 처리 (재배치/안정성 대기)

| 기능 | 비활성 이유 | 위치 |
|---|---|---|
| 캐릭터 hover 명함 카드 | "나중에 다른 위치 결정" (Day 11 후속 +2) | `App.tsx:32, 216, 641` |
| MemoModal 외형 편집 | "별도 외형 모달로 옮길지 검토" | `MemoModal.tsx:207~` |
| 부적절 콘텐츠 가드 (system prompt) | Gemini safety filter 충돌 가능성 | `ChatPopup.tsx:82` |

### D. 상점 — UI 라벨은 "예정"인데 효과 없음

| 항목 | 상태 | 위치 |
|---|---|---|
| 가격 시스템 | 결정 보류, "무료 시즌 가정" | `ShopModal.tsx:5` |
| 미구현 가구 (커피머신=만족도, 벽 캘린더=실시간 날짜 등) | "🚧 다음 업데이트 예정" 카드만 | `ShopModal.tsx:62, 65, 273` |

### E. 미사용 컴포넌트 (정리 후보)

| 항목 | 상태 |
|---|---|
| `SeatPickerModal.tsx` | 드래그앤드롭 자리 이동으로 대체됨. import 없음 → 삭제 or 보존 결정 필요 |

### F. 임시·환경 한정·미결 (성격 다름, 참고용)

- **회사망 SSL fix** — dev 한정 임시 (`!app.isPackaged` 가드). 배포 전 일반망 검증 필요 (`ideas/18`)
- **일일 사용량 영구화** — 세션 메모리만, 앱 재시작 시 초기화 (`electron/llm/usage.ts:8`)
- **핀치 줌** — P5 모바일 빌드 단계로 보류
- **MBTI 별명 톤** — 게임형/한국밈/직업 톤 미결정 (Day 12 §3 보류)

### 🐞 G. 회고 발견 버그 — ✅ 수정 완료 (커밋 대기, 2026-06-24)

| # | 버그 | 수정 |
|---|---|---|
| G-1 | **유령 직원** (무자리=null로 저장돼 안 보이는데 카운트) | `addEmployee`에 무자리 채용 차단 가드 추가 + 로드 마이그레이션은 팀원→리더 폴백(`findNextEmptySeat`)으로 무자리 0. 채용 자동배치·수동이동·안내문구는 "리더=과장 이상"으로 일관 유지(저직급 팀원석만, 없으면 명확 안내 후 차단). 저직급이 리더석에 앉는 경우(구데이터 복구) ⭐ 오표기 제거. |
| G-2 | **일일 비용 상한** (표시만 하고 차단 X + 재시작 시 초기화) | ① 일일 비용을 `usage-daily.json`에 날짜키로 **영구화**(원자적 쓰기, 자정 리셋). ② **메인 프로세스 dispatch에서 한도 도달 시 실제 차단**(우회 불가) + 강제 야간을 예산 기준으로 일원화. ③ 한도/차단/강제야간은 **유료(Claude)만** 집계(무료 Gemini 제외 — 설정 안내와 일치). |

> 잔여(후순위): 콜드스타트 시 custom 한도(>$5)+오늘 지출이 그 사이값이면 강제야간이 ~1초 깜빡일 수 있음(cosmetic, 기본 한도 사용자 무관). 적대적 리뷰 13에이전트 검증(차단 6포인트·>15유령 도달불가·동기fs 무해 = 기각).

---

## 🚀 4. 다음 작업 가이드

### 📣 외부 테스터 피드백 (누적)

> Day 12 §2~ EXE(v0.0.1) 배포 시작 후 들어온 실사용 피드백. 들어올 때마다 여기 누적.

| # | 날짜 | 피드백 | 분류 | 상태 |
|---|---|---|---|---|
| T1 | 2026-05-26 | **최초 실행 시 기능이 너무 많아 보기 힘듦 → 튜토리얼/온보딩 필요** | UX·온보딩 | ✅ Day 14 해소 (멀티트랙 가이드 투어 + 데모 모드) |

- **T1 상세**: 현재 온보딩은 *빈 사무실 안내*(옵션 C — 직원 0명일 때 "+ 채용" 가이드 박스) **1단계뿐**. 채용 직후부터 채팅·자리 이동·상점·설정·감정·MBTI 등 기능이 한꺼번에 노출돼 첫 사용자가 압도됨. → 단계별 가이드(첫 채용 → 첫 대화 → 자리/상점 순차 안내) 또는 스킵 가능한 인터랙티브 튜토리얼 필요. (기존 온보딩 명세는 [`FEATURES.md`](FEATURES.md) "온보딩 — 빈 사무실 안내 (C)" 참고)

### ✅ Day 8 완료한 옵션 (간단 회고)

| 옵션 | 상태 | 산출 커밋 |
|---|---|---|
| Platform Adapter (Phase 1) | ✅ 완료 | `d89c017` |
| B-4 책상 회전 | ✅ 완료 — 시각 검증 대기 | `96634c6`, `6bf3c58` |
| B-5 줌·카메라 (휠 + 토글) | ✅ 완료 — 핀치는 P5로 보류 | `238d137` |
| M5-c 토큰 보드 | ✅ 완료 | `238d137` |
| D 가구 / A 명함 / B 빈자리 / C 온보딩 | ✅ 완료 | `b87a4b3` |
| E 사용량 상세 / F 동적 상태바 | ✅ 완료 | `d8f3015` |

자세히는 [`FEATURES.md`](FEATURES.md) (PC 검증 21단계 워크플로우).

### 🏢 옵션 0 (진행 중 트랙, 추천) — **2층 팀 협업 로드맵 계속**

> 2026-07-03 착수. 설계 지시서: [`PixelAgentOffice/docs/2F-collaboration-handoff.md`](PixelAgentOffice/docs/2F-collaboration-handoff.md)

| 단계 | 상태 |
|---|---|
| M-2F-0 멀티모델 (Vercel AI SDK + OpenAI) | ✅ 완료 (2026-07-03) |
| Phase 1 tool-calling 인프라 | ✅ 완료 (2026-07-03) |
| Phase 2 에이전트 루프 (`electron/agent/loop.ts`) | ✅ 완료 (2026-07-07) |
| Phase 3 위임 협업 (`delegate_to_member` + IPC `agent:run-team`) | ✅ 완료 — 엔진 (2026-07-07) |
| **Phase 4 게임 연출 + 팀 작업 UI** (위임 이벤트 → 캐릭터 연출) | 🔜 **다음 세션** |

### ⏰ 옵션 1 — **M 보류 결정 → M5-d 성격 + 토큰 고갈 애니메이션**

#### 참고할 md
- [`ideas/06-decisions-to-make.md`](ideas/06-decisions-to-make.md) 섹션 M — MBTI 페르소나 (45~49번)
- [`ideas/08-token-board-and-office-life.md`](ideas/08-token-board-and-office-life.md) — 10가지 성격 반응 스펙

#### 선결 — M 보류 결정 답하기 (1~2h, 태블릿 OK)
- "기자"의 정체 — INTP 너드 / ENTP 개나댐 / 별개 4번째?
- 기존 Mary(편집자) / Haewol(작가) 처리 — 대체 / 추가 / 재매핑?
- "실용이" MBTI — ISTJ / ESTJ / ISFJ?
- 성격 시스템 = MBTI 통합 vs 단순 10종(lazy/diligent/sleepy 등) 분리?

#### M5-d 작업 항목 (M 결정 후)
| 단계 | 파일 | 메모 |
|---|---|---|
| 1. Personality 타입 + Employee 필드 | `src/shared/types.ts` | MBTI 또는 10종 |
| 2. 채용 모달에 성격 선택 | `src/components/HireModal.tsx` | |
| 3. 토큰 고갈 시 캐릭터별 반응 | `src/game/OfficeScene.ts` + `characters/` | 의자 뒤 기대기, 책상 엎드림, 자판기 이동 등 |
| 4. 회귀 테스트 | `tests/e2e/` | |

예상: 2~3일.

### 🚀 옵션 2 — **Phase 3 백엔드 셋업** (모바일 진입)

#### 참고할 md
- [`ideas/13-electron-and-mobile-strategy.md`](ideas/13-electron-and-mobile-strategy.md) §4-C — 백엔드 + BYOK 모델
- [`ideas/14-platform-adapter-rationale.md`](ideas/14-platform-adapter-rationale.md) — Adapter로 통합되는 흐름

#### 작업 항목
| 단계 | 메모 |
|---|---|
| 1. LLM 프록시 서버 (Vercel/Railway) | Claude·Gemini 둘 다 |
| 2. `src/platform/web.ts` 신규 | 백엔드 호출 어댑터 |
| 3. CORS / 인증 토큰 | BYOK 우선 (사용자 키를 백엔드로) |
| 4. 배포 + 도메인 | |

예상: 1주.

### 🎨 옵션 3 — **사무실 꾸미기 Lv2** (O 보류 결정 일부)

#### 참고할 md
- [`ideas/06-decisions-to-make.md`](ideas/06-decisions-to-make.md) 섹션 O (60~63번)

#### 작업 항목
- Lv2 테마 팩 (모던 / 클래식 / 우주 / 카페 등)
- 사용자가 직접 가구 배치 (드래그앤드롭)
- Lv3 (가구 ↔ 캐릭터 상호작용)는 후속

예상: 2일 (Lv2만).

### 🟡 옵션 4 — **L/N/O 나머지 보류 결정 답하기**

L (사내연애), N (2층), O (꾸미기 Lv2~3 정책) — 모두 기획 100%, 태블릿 OK, 1~2h.

---

## 🚦 5. 미래 방향성

### 결정된 큰 방향 — 모바일 출시 + 백엔드 결심 (2026-05-18 확정)

#### 비즈니스 모델: **백엔드 + BYOK**
- 사용자가 자기 API 키를 우리 백엔드에 등록 (사용자별 암호화 저장)
- 백엔드가 그 키로 LLM 호출 (프록시)
- LLM 비용 = 사용자 부담 (Anthropic/Google에서 직접 청구)
- 우리는 서버 운영비만 부담 (월 $10~50, 100~1000명 규모)
- 자세히는 [`ideas/12-business-model.md`](ideas/12-business-model.md) + [`ideas/13-electron-and-mobile-strategy.md`](ideas/13-electron-and-mobile-strategy.md) §4-C

#### 점진 도입 로드맵
| Phase | 작업 | 예상 |
|---|---|---|
| **현재 ~ M5 완성** | M5 시그니처 폴리시 마무리 (B-4, B-5, M5-c~e) | 1~2주 |
| **P1: Platform Adapter** | Electron API 추상화 (4~6시간) ⭐ 가장 빨리 할 작업 | 1일 |
| **P2: Web 빌드** | BYOK + localStorage 데모 (Gemini만 작동) | 1~2일 |
| **P3: 백엔드 최소** | LLM 프록시 (Claude 모바일 작동) + Vercel/Railway 배포 | 1주 |
| **P4: 인증 + 키 영구 저장** | 이메일 가입 + 사용자별 키 암호화 DB (Supabase) | 1주 |
| **P5: 모바일 빌드** | Tauri 2.0 또는 Capacitor → iOS/Android 배포 | 2주 |
| **P6 (선택): SaaS 전환** | 우리가 키 보유 + 월 구독 결제 | 1~2개월 |

#### 변환 비용 — 설계 다시 안 해도 됨
- 그대로 살릴 코드: **~85%** (React 컴포넌트, Phaser, LLM provider 추상화, 자리 시스템)
- Adapter 패턴으로 격리: **~15%** (Electron IPC, safeStorage, fs)
- 처음부터 다시: **0%** ✅

---

## 🟡 6. 보류 결정

`ideas/06-decisions-to-make.md`에 카테고리별 정리. 핵심 보류:

### P. 제품 차별점(해자) 방향 — v3로 보류 (2026-06-24 결정)
- **현황(정직)**: 현재 강점은 "픽셀 사무실 + 캐릭터 애착" = *감성적* 매력. 다만 "영속 페르소나"는 Claude Projects·Custom GPT에도 있어 **방어가 약하고**, "쓸수록 못 떠나게" 붙잡는 **retention 훅이 없음**(대화는 하지만 산출물이 안 쌓임).
- **검토했던 방향(3)**: ① 산출물 누적형(편집자=교정본·작가=설정집 → 전환비용) ② 영속 동료/세계(기억·진급·감정 누적) ③ "AI 동료" 포지셔닝(에이전트 관리가 아니라 성격·연속성 있는 동료).
- **결정**: v0.0.2에선 **PRD에 위 현황만 정직하게 기록**(과대포장 X). **실제 해자 전략 적용은 v3** — 출시 후 외부 피드백을 보고 ①~③ 중 선택.
- 근거: 단일 테스터(T1) 외 검증 없음 → 실데이터 전에 못 박지 않는다.
- ✅ **2026-06-24 반영 완료**: `portfolio/PixelAgentOffice/v0.0.2/PRD.md` 신규 작성 — §2.4(차별점 정직 평가)·§8.3(사업성 정직 평가)·§11.2(해자 미검증 위험)에 위 현황 그대로 기록. README 버전 인덱스도 v0.0.2 추가. (PRD 본문은 작성 완료, *시각/코드 산출물*만 EXE 빌드 시 보강.)
- ⚙️ **신규 룰**: PRD는 *버전 단위* 갱신 — `CONVENTIONS.md §7` + 메모리 `feedback_prd_versioned_update`. (Day 14 PRD 누락 재발 방지)

### Q. 유지보수 리팩토링 — v3로 보류 (2026-06-24 결정)
- **대상**: ① eventBus 타입화(이벤트 30개+·6파일에 걸친 `payload as` 캐스트 제거 → 컴파일 타임 안전, 런타임 비용 0) ② `useTutorial` 훅 추출(App.tsx 튜토리얼 상태기계 분리) ③ OfficeScene 인라인 스프라이트 데이터 → `sprites.ts` 분리.
- **결정**: 사용자 가치 0(유지보수 편의)인데 피드백 출시 직전 위험만 큼 → **출시 후 진행**. 이번에 만든 **테스트 그물(유닛 24 + E2E 9)** 덕분에 나중에 해도 회귀 자동 방어됨.
- 참고: eventBus 이벤트 목록은 grep `eventBus\.(emit|on)\(` 로 일괄 확인 가능. `settings:changed`(ChatPopup가 구독)는 emit하는 곳이 없어 보임 → 타입화 시 점검 후보(죽은 이벤트 의심).

### L. 사내연애 시그니처 폴리시 layer 2
- 에이전트 간 호감도/갈등도 시스템
- MBTI 조합 기반 기본 케미
- 토큰 고갈 밤모드와 결합 → 위로/짜증 자동 생성
- 자세히 → [`ideas/06-decisions-to-make.md`](ideas/06-decisions-to-make.md) 38~44번

### M. MBTI 페르소나 체계 (명확화 3개 미답)
- "기자"의 정체 — INTP 너드 / ENTP 개나댐 / 별개 4번째?
- 기존 Mary(편집자)/Haewol(작가) 처리 — 대체/추가/재매핑?
- "실용이" MBTI — ISTJ / ESTJ / ISFJ?
- 자세히 → [`ideas/06-decisions-to-make.md`](ideas/06-decisions-to-make.md) 45~49번 + [`ideas/00-brainstorming-log.md`](ideas/00-brainstorming-log.md) Day 4 섹션 42

### N. 사무실 구조 — 일부 미구현 (책상 회전, 줌, 2층)
- B-4/B-5 작업 예정
- 2층 (Team Office)은 1F 완성 후
- 자세히 → [`ideas/06-decisions-to-make.md`](ideas/06-decisions-to-make.md) 50~59번

### O. 사무실 꾸미기
- Lv1 가구 배치 / Lv2 테마 팩 / Lv3 캐릭터↔가구 상호작용
- 도입 시점 — M5 완성 후 또는 출시 직전
- 자세히 → [`ideas/06-decisions-to-make.md`](ideas/06-decisions-to-make.md) 60~63번

---

## 📂 7. 폴더 구조 + 어디 가야 하는지

```
myPrj/                            ← 레포 루트 (D:\myPrj)
├─ README.md                      ← 30초 개요 + HANDOFF 입석
├─ HANDOFF.md ⭐                   ← 본 문서 (단일 진입점)
│
├─ PixelAgentOffice/              ← 🛠 실제 앱 소스 (개발 작업장)
│  ├─ electron/                   ← Electron Main 프로세스 (Node.js)
│  │  ├─ main.ts                  ← 윈도우 생성 + IPC 핸들러
│  │  ├─ preload.ts               ← window.api 노출
│  │  ├─ data/store.ts            ← 직원 영속화 (JSON)
│  │  └─ llm/                     ← LLM Provider 추상화
│  │     ├─ dispatch.ts           ← provider 자동 선택 + 사전 차단
│  │     ├─ anthropic.ts          ← Claude SDK 래퍼
│  │     ├─ gemini.ts             ← Gemini SDK 래퍼
│  │     ├─ usage.ts              ← sliding window RPM + 세션 통계
│  │     ├─ errorMessages.ts      ← LLMError → 친절 한글
│  │     └─ apiKeys.ts            ← safeStorage 분리 저장
│  ├─ src/                        ← Renderer (Chromium, React + Phaser)
│  │  ├─ App.tsx                  ← 최상위 컴포넌트 + 모달들
│  │  ├─ components/              ← React UI
│  │  │  ├─ ChatPopup.tsx         ← 채팅창 (페르소나 자리비움 포함)
│  │  │  ├─ HireModal.tsx         ← 채용 모달
│  │  │  ├─ MemoModal.tsx         ← 메모지
│  │  │  ├─ SettingsModal.tsx     ← 설정
│  │  │  └─ SeatPickerModal.tsx   ← (미사용) 드래그앤드롭 대안
│  │  ├─ game/                    ← Phaser 게임 세계
│  │  │  ├─ OfficeScene.ts        ← 메인 씬 (자리/시간대/드래그)
│  │  │  ├─ PhaserGame.tsx        ← React→Phaser wrapper
│  │  │  ├─ timeOfDay.ts          ← 5단계 시간대 팔레트
│  │  │  ├─ characters/Clawd.ts   ← 캐릭터 픽셀아트
│  │  │  ├─ pixelArt.ts           ← drawPixelGrid 헬퍼
│  │  │  └─ eventBus.ts           ← React ↔ Phaser 이벤트
│  │  └─ shared/                  ← 두 환경 공유 타입/유틸
│  │     ├─ types.ts              ← Employee, Rank, Model, SeatId 등
│  │     └─ seats.ts              ← 자리 시스템 (16자리 + 헬퍼)
│  ├─ tests/e2e/                  ← Playwright E2E (4 시나리오)
│  └─ package.json
│
├─ ideas/                         ← 💡 기획·아이디어 (활성 작업장)
│  ├─ 00-brainstorming-log.md     ← 의사결정 흐름 (Day 1~6, 60+ 섹션)
│  ├─ 01-agent-visualizer-ideas.md
│  ├─ 02-phased-plan.md
│  ├─ 03-stack-and-distribution.md ← Electron 선택 초기 배경
│  ├─ 04-ui-options-comparison.md
│  ├─ 05-character-and-customization.md
│  ├─ 06-decisions-to-make.md ⭐   ← 보류 결정 (카테고리 A~O)
│  ├─ 07-dual-mode-architecture.md
│  ├─ 08-token-board-and-office-life.md ← 시그니처 폴리시 스펙
│  ├─ 09-memory-system.md
│  ├─ 10-character-emotions.md
│  ├─ 11-rank-system.md
│  ├─ 12-business-model.md ⭐      ← BYOK / 백엔드 / Groq 비교
│  ├─ 13-electron-and-mobile-strategy.md ⭐ ← Electron + 모바일 전환 (NEW)
│  ├─ office-mockup.html
│  └─ wireframes.html
│
└─ portfolio/                     ← 📦 포트폴리오 큐레이션 아카이브
   └─ PixelAgentOffice/
      ├─ README.md                ← 케이스 스터디 표지
      ├─ PRD.md ⭐                 ← 제품 요구사항 600줄
      ├─ planning/                ← 기획 문서 스냅샷 (ideas/ 복사본)
      ├─ visuals/                 ← HTML 시안
      └─ milestones/
         ├─ M1-basic-ui/          ← 마일스톤별 코드 스냅샷 + 회고
         ├─ M2-ui-channel/
         ├─ M3-multi-llm/
         ├─ M4-rate-limit-ux/
         └─ M5-signature-polish/  ← 가장 최근
```

### 작업 타입별 가야 할 곳

| 하려는 일 | 먼저 읽을 md | 건드릴 코드 |
|---|---|---|
| 기획 정리/브레인스토밍 | `ideas/00-brainstorming-log.md` (시간순 추가) | — |
| 보류 결정 답하기 | `ideas/06-decisions-to-make.md` | — |
| 새 기획 카테고리 | `ideas/13-*.md` 같이 번호 추가 | — |
| 새 UI 컴포넌트 | `portfolio/.../PRD.md` (Features 섹션) | `PixelAgentOffice/src/components/` |
| Phaser 씬 수정 | `ideas/08-token-board-and-office-life.md` 등 | `PixelAgentOffice/src/game/OfficeScene.ts` |
| LLM 관련 | `portfolio/.../milestones/M3-multi-llm/retrospective.md` | `PixelAgentOffice/electron/llm/` |
| Rate limit / 사용량 | `portfolio/.../milestones/M4-rate-limit-ux/retrospective.md` | `PixelAgentOffice/electron/llm/usage.ts` |
| 자리/팀 시스템 | `portfolio/.../milestones/M5-signature-polish/retrospective.md` | `PixelAgentOffice/src/shared/seats.ts` |
| 모바일 전환 | `ideas/13-electron-and-mobile-strategy.md` | `PixelAgentOffice/src/platform/` (신규 예정) |
| E2E 테스트 | `portfolio/.../milestones/M3-multi-llm/retrospective.md` E2E 섹션 | `PixelAgentOffice/tests/e2e/` |

---

## 📱 8. 태블릿 vs 데스크탑 가이드

### ✅ 태블릿에서 OK (브라우저 + GitHub 웹)
- `ideas/*.md` 갱신 (브레인스토밍, 결정 추가, 의사결정 로그)
- `ideas/06-decisions-to-make.md` 보류 항목 답변 입력
- `portfolio/.../PRD.md`, retrospective 글 수정
- `HANDOFF.md` (이 파일) 갱신
- 새 기획 문서 작성 — 캐릭터 시스템 v2 설계, 꾸미기 스펙 등
- 가벼운 코드 텍스트 수정 (메시지 문구, 색상 값 등) — GitHub 웹 에디터로 직접 commit

### ❌ 데스크탑 필요 (Phaser 시각 작업)
- Phaser 씬 디버깅 (B-4 책상 회전 등 시각 정밀)
- 드래그앤드롭 / 인터랙션 테스트
- `pnpm dev` / Electron 실제 실행
- Playwright E2E 실제 실행 (CI 없으므로 로컬에서)

### 주말 태블릿 워크플로우
1. 태블릿 → [github.com/k-haein/Pixel_AgentOffice](https://github.com/k-haein/Pixel_AgentOffice) 열기
2. `HANDOFF.md` (이 파일) → 30초 요약 + 다음 작업 한 번에 파악
3. claude.ai 새 채팅 → "이 파일 보고 이어서" + HANDOFF.md raw 텍스트 붙여넣기
4. 기획/문서 작업 → GitHub 웹 에디터로 직접 commit
5. 월요일 데스크탑에서 `git pull` → 코드 작업 이어감

→ **태블릿 = 기획·문서 / 데스크탑 = 코드·시각** 분담 권장.

---

## 🧰 9. 개발 환경 셋업

데스크탑에서 처음 클론할 때:

```powershell
git clone https://github.com/k-haein/Pixel_AgentOffice
cd Pixel_AgentOffice/PixelAgentOffice
pnpm install
cp .env.local.example .env.local
# .env.local에 GEMINI_API_KEY / ANTHROPIC_API_KEY 입력 (E2E 테스트용)

# 개발
pnpm dev      # Vite + Electron 자동 실행

# 테스트
pnpm test:e2e # Playwright E2E (4 시나리오)
```

### 트리거 명령어 / 룰 → `CONVENTIONS.md` 참조

Day 8에 사용자 말투·트리거·Day 룰을 별도 메타 문서로 정리. 새 세션은 `CONVENTIONS.md` + `CLAUDE.md` 같이 읽기. 핵심:
- **"세션 저장해"** → brainstorming-log Day 섹션 추가 (+ 마일스톤 닫힐 때 스냅샷)
- **"커밋해" / "푸시해"** — 사용자 사전 승인 후 진행. 태블릿(원격) 커밋은 `📱` 마커
- **Day 시작/종료** — 3단 합의 (사용자 마무리 문구 + Claude 확인 + 사용자 동의)
- **"분석해줘"** — 작업 *전* 옵션 N개 제시 + 추천, 사용자 결정까지 코드 X

---

## 📚 참고 — 빠른 컨텍스트 흡수 순서 (새 세션용)

새 Claude 또는 미래의 본인이 처음 본다면 이 순서로:

1. **이 파일 (`HANDOFF.md`)** — 30초 요약 + 타임라인 (지금 읽고 있음)
2. [`README.md`](README.md) — 폴더 구조
3. [`portfolio/PixelAgentOffice/PRD.md`](portfolio/PixelAgentOffice/PRD.md) — 제품 비전 + 페르소나 + 차별화
4. [`ideas/13-electron-and-mobile-strategy.md`](ideas/13-electron-and-mobile-strategy.md) — 기술 결정 + 미래 전략
5. [`portfolio/PixelAgentOffice/milestones/M5-signature-polish/retrospective.md`](portfolio/PixelAgentOffice/milestones/M5-signature-polish/retrospective.md) — 최근 마일스톤
6. [`ideas/06-decisions-to-make.md`](ideas/06-decisions-to-make.md) — 보류 결정
7. (깊이) [`ideas/00-brainstorming-log.md`](ideas/00-brainstorming-log.md) — 전체 의사결정 일지
