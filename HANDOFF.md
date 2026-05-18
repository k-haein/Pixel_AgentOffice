# 핸드오프 문서 — PixelAgentOffice

> 새 세션 또는 미래의 본인이 이 파일 *하나*만 봐도 즉시 컨텍스트가 잡히도록 정리한 단일 진입점.
> 태블릿/주말 작업 시 GitHub에서 이 파일부터 열면 됩니다.
>
> 최종 갱신: **2026-05-19** (Day 8 — Platform Adapter 도입)

---

## 📍 NAV — 어디로 갈지 빠른 메뉴

| 알고 싶은 것 | 가야 할 섹션 |
|---|---|
| 지금 어디까지 왔는지 30초로 | [§1 30초 요약](#-1-30초-요약) |
| 날짜별로 무엇을 했는지 | [§2 진행 타임라인](#-2-진행-타임라인) |
| **지금 당장 해야 할 일** | [§3 현재 위치 + 미커밋 작업](#-3-현재-위치--미커밋-작업) |
| 다음 작업 고르기 | [§4 다음 작업 가이드](#-4-다음-작업-가이드) |
| 미래 방향 (모바일/백엔드) | [§5 미래 방향성](#-5-미래-방향성) |
| 보류 중인 결정 | [§6 보류 결정](#-6-보류-결정) |
| 폴더/파일 구조 | [§7 폴더 구조 + 어디 가야 하는지](#-7-폴더-구조--어디-가야-하는지) |
| 태블릿에서 가능한 것 | [§8 태블릿 vs 데스크탑](#-8-태블릿-vs-데스크탑-가이드) |
| 셋업/환경 | [§9 개발 환경 셋업](#-9-개발-환경-셋업) |

---

## 🎯 1. 30초 요약

| | |
|---|---|
| **프로젝트** | 픽셀 아트 사무실에서 AI 에이전트를 직원처럼 채용·배치·명령하는 Electron 데스크탑 앱 |
| **스택** | Electron + Vite + React 19 + Phaser 4 + TypeScript + Anthropic/Google LLM SDK + Playwright E2E |
| **컨셉** | "Two Point Hospital + The Sims" 류 게임 메커니즘으로 AI 에이전트 관리 |
| **GitHub** | [k-haein/Pixel_AgentOffice](https://github.com/k-haein/Pixel_AgentOffice) |
| **현재 마일스톤** | **M5-b** + **B-3 자리 이동** + **Platform Adapter (Phase 1) 완료** |
| **다음 작업** | B-4 책상 회전 / B-5 줌·카메라 / M5-c 토큰 보드 / Phase 3 백엔드 셋업 중 택 |
| **큰 결정** | 모바일 출시 + 백엔드 + BYOK 확정. Platform Adapter Phase 1 완료 → 미래 모바일 진입 비용 ↓ |

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

#### 산출 커밋 (예정)
- Day 8 작업물 분할 커밋 + push

---

## 🛠 3. 현재 위치 + 미커밋 작업

### 미커밋 변경 요약 (Day 8)

| 파일 | 변경 내용 |
|---|---|
| `PixelAgentOffice/src/shared/types.ts` | `RANK_ORDER`, `canBeTeamLeader`, `SeatId`, Employee.seatId/deskOrientation 추가 (이전 작업) |
| `PixelAgentOffice/src/platform/types.ts` | 신규 — Platform 인터페이스 12 메서드 (Day 8) |
| `PixelAgentOffice/src/platform/electron.ts` | 신규 — window.api 1:1 wrap (Day 8) |
| `PixelAgentOffice/src/platform/mock.ts` | 신규 — 테스트/데모용 가짜 응답 (Day 8) |
| `PixelAgentOffice/src/platform/index.ts` | 신규 — 환경 감지 + 기본 export (Day 8) |
| `PixelAgentOffice/src/App.tsx` | `window.api.loadData` → `platform.loadData` (Day 8) |
| `PixelAgentOffice/src/components/ChatPopup.tsx` | `chatWithLLM`/`abortChat`/`getRateLimit` 전환 (Day 8) |
| `PixelAgentOffice/src/components/HireModal.tsx` | `addEmployee` 전환 (Day 8) |
| `PixelAgentOffice/src/components/MemoModal.tsx` | `updateEmployee`/`removeEmployee` 전환 (Day 8) |
| `PixelAgentOffice/src/components/SettingsModal.tsx` | API 키·설정 메서드 전환 (Day 8) |
| `PixelAgentOffice/src/components/SeatPickerModal.tsx` | `updateEmployee` 전환 (Day 8) |
| `PixelAgentOffice/src/game/OfficeScene.ts` | 드래그앤드롭 결과 `updateEmployee` 전환 (Day 8) |
| `PixelAgentOffice/index.html` | `<title>` 대소문자 fix (사전 결함 청산) |
| `PixelAgentOffice/tests/e2e/03-gemini-chat.spec.ts` | 모델 라벨 정규식 매칭 (사전 결함 청산) |
| `ideas/00-brainstorming-log.md` | Day 8 섹션 71~75 추가 |
| `ideas/14-platform-adapter-rationale.md` | 신규 — 결정 흐름·구현 회고 (Day 8) |
| `portfolio/PixelAgentOffice/planning/14-platform-adapter-rationale.md` | 스냅샷 복사 (Day 8) |
| `HANDOFF.md` | Day 8 갱신 |

---

## 🚀 4. 다음 작업 가이드

각 다음 작업 카드에 *읽어야 할 md* + *건드릴 코드 파일* 명시.

### ✅ 옵션 1 — **Platform Adapter 패턴** (Day 8에 완료)

> Day 8에 도입 완료. 4 신규 + 7 수정 파일, `window.api.*` 호출 약 20곳 → 0건 치환. Playwright B-3 우클릭/zone 4 시나리오 그대로 통과.
> 자세히는 [`ideas/14-platform-adapter-rationale.md`](ideas/14-platform-adapter-rationale.md) (결정 흐름, 검토 대안, 구현 디테일, 교훈).
> → 다음 단계: Phase 2 (Web 빌드) / Phase 3 (백엔드) / 또는 옵션 2~5 중 택.

### 🎨 옵션 2 — **B-4 책상 회전**

#### 참고할 md
- [`ideas/06-decisions-to-make.md`](ideas/06-decisions-to-make.md) 섹션 N — 책상 회전 결정 (54번 항목)
- [`portfolio/.../milestones/M5-signature-polish/retrospective.md`](portfolio/PixelAgentOffice/milestones/M5-signature-polish/retrospective.md) — B 시리즈 컨텍스트

#### 작업 항목
| 단계 | 파일 | 메모 |
|---|---|---|
| 1. `deskOrientation` 시각 반영 | `src/game/OfficeScene.ts` — `DESK` 스프라이트를 좌/우/정면 3 버전 | `deskOrientation` 필드는 `src/shared/types.ts`에 이미 있음 |
| 2. 우클릭 컨텍스트 메뉴에 "회전" 항목 | `src/App.tsx` — 기존 메뉴에 옵션 추가 | |
| 3. 회전 시 캐릭터 방향도 같이 변경 | `src/game/characters/Clawd.ts` — 좌/우 변형 추가 | |
| 4. 회귀 테스트 | `tests/e2e/05-desk-rotation.spec.ts` 신규 | |

예상: 1일.

### 🔍 옵션 3 — **B-5 줌 + 카메라**

#### 참고할 md
- [`ideas/06-decisions-to-make.md`](ideas/06-decisions-to-make.md) 섹션 N (55번 항목) — 줌 결정
- 모바일 핀치 줌 대비 — [`ideas/13-electron-and-mobile-strategy.md`](ideas/13-electron-and-mobile-strategy.md) §4.D (UI 반응형)

#### 작업 항목
| 단계 | 파일 | 메모 |
|---|---|---|
| 1. 마우스 휠 줌 | `src/game/OfficeScene.ts` — `this.input.on('wheel', ...)` + `cameras.main.setZoom` | |
| 2. 줌 토글 버튼 (한 화면 / 줌인) | `src/components/` 어딘가 (헤더?) | |
| 3. 모바일 핀치 줌 대비 | `src/game/OfficeScene.ts` — multi-touch handler | Touch event 추가 |
| 4. 회귀 테스트 | `tests/e2e/` 신규 | |

예상: 1일.

### 🌅 옵션 4 — **M5-c 토큰 보드** (사장석 뒤 LED)

#### 참고할 md
- [`ideas/08-token-board-and-office-life.md`](ideas/08-token-board-and-office-life.md) — 토큰 보드 원래 스펙
- [`portfolio/.../milestones/M4-rate-limit-ux/retrospective.md`](portfolio/PixelAgentOffice/milestones/M4-rate-limit-ux/retrospective.md) — M4 사용량 데이터 구조

#### 작업 항목
| 단계 | 파일 | 메모 |
|---|---|---|
| 1. LED 보드 스프라이트 | `src/game/OfficeScene.ts` — 사장석 뒤 벽에 추가 | 픽셀 아트 |
| 2. 실시간 사용량 표시 | `src/game/OfficeScene.ts` + `electron/llm/usage.ts` 연동 | M4의 `getRateLimit` 활용 |
| 3. 신호등 색 (🟢 0-60% / 🟡 60-85% / 🔴 85-100%) | `src/game/OfficeScene.ts` | |
| 4. 클릭 시 상세 모달 (어떤 직원이 얼마나 썼는지) | `src/components/UsageDetailModal.tsx` 신규 | |

예상: 1.5일.

### ⏰ 옵션 5 — **M5-d 성격 + 토큰 고갈 애니메이션**

#### 참고할 md
- [`ideas/08-token-board-and-office-life.md`](ideas/08-token-board-and-office-life.md) — 10가지 성격 반응 스펙 (lazy/diligent/sleepy 등)
- [`ideas/06-decisions-to-make.md`](ideas/06-decisions-to-make.md) 섹션 M — MBTI 페르소나와 통합 가능성

#### 결정 필요 (시작 전)
- 성격 시스템 = MBTI(섹션 M) vs 단순 10종(원래 스펙)? — 보류 결정 답해야 함

예상: 2~3일.

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

### 트리거 명령어 (사용자 습관)
- **"세션 저장해"** → `ideas/00-brainstorming-log.md` 갱신 + `portfolio/.../milestones/` 스냅샷 추가
- **"커밋해"** → 의미 단위로 분할 커밋 (한글 메시지, 무엇/왜/어떻게 구조)
- **"푸시해"** → `git push origin main`

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
