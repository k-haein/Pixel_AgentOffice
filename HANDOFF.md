# 핸드오프 문서 — PixelAgentOffice

> 새 세션 또는 미래의 본인이 이 파일 *하나*만 봐도 즉시 컨텍스트가 잡히도록 정리한 단일 진입점.
> 태블릿/주말 작업 시 GitHub에서 이 파일부터 열면 됩니다.
>
> 최종 갱신: **2026-05-22 (Day 12 §1)** — 감정 자동 트리거(LLM 응답에 `[emotion:xxx]` 태그 12종 강제 + 본문 파싱 후 말풍선 5초 변화) + idleEmotion(직원별 평소 표정 — MemoModal에서 12종 선택) + 가구 우클릭 컨텍스트 메뉴(옮기기/이 가구 삭제/전체 가구 삭제) + 배포 준비(`electron-builder` + `pnpm dist:exe` portable EXE). 다음: **사용자 시각 검증(Day 12 §1 3 커밋)** + portable EXE 빌드 1차.

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
| **PC 시각 테스트 체크리스트** | [`FEATURES.md`](FEATURES.md) (Day 8 신규) |
| **사용자 룰·말투·트리거** | [`CONVENTIONS.md`](CONVENTIONS.md) (Day 8 신규) + [`CLAUDE.md`](CLAUDE.md) |

---

## 🎯 1. 30초 요약

| | |
|---|---|
| **프로젝트** | 픽셀 아트 사무실에서 AI 에이전트를 직원처럼 채용·배치·명령하는 Electron 데스크탑 앱 |
| **스택** | Electron + Vite + React 19 + Phaser 4 + TypeScript + Anthropic/Google LLM SDK + Playwright E2E |
| **컨셉** | "Two Point Hospital + The Sims" 류 게임 메커니즘으로 AI 에이전트 관리 |
| **GitHub** | [k-haein/Pixel_AgentOffice](https://github.com/k-haein/Pixel_AgentOffice) |
| **현재 마일스톤** | **M5 시그니처 폴리시 완성** + Day 10 layout + Day 11 팻말·팀 중앙·12 emotion·v2.5 코드(시각 비활성, PNG 대기) + **Day 11 후속**: P2 #25 가구 배치 + 채팅 영구화 + 빈 자리 숨김 + **Day 11 후속 +1**: 상점 픽셀 미리보기 + 배치 모드 + 카메라 fix + MemoModal·hover 비활성 + **Day 12 §1**: 감정 자동 트리거 + idleEmotion + 가구 컨텍스트 메뉴 + electron-builder dist:exe |
| **다음 작업** | **사용자 시각 검증** (Day 11~Day 12 §1 통합) + portable EXE 빌드 1차 → M5-d 성격 / Phase 3 백엔드 / PNG asset 도입(사용자 그림 시) |
| **큰 결정** | 모바일 출시 + 백엔드 + BYOK 확정. Platform Adapter Phase 1 완료. **Day 11**: 팀 동적 중앙 정렬 / 팻말 + 이름 수정 모달 / 말풍선 emotion 5→12종 / v2.5 시각 구림 → 코드 유지 + 비활성. **Day 11 후속**: 그리드 확대 2번 시도 실패 → 원복 → G/A/B/C 4작업 완료. **Day 11 후속 +1**: 사용자 피드백 4건 한꺼번에 — 상점 픽셀 미리보기 + 배치 모드 + 카메라 분리 버그 fix + MemoModal 외형 편집 제거 + hover 카드 주석. **Day 12 §1**: 감정 시스템이 "있는데 안 쓰이던 상태" → 자동 태그 + idle 기본값 짝으로 살림. 가구 옮기기 (placement mode 재사용) + 전체 삭제. portable EXE 빌드 준비(electron-builder devDep + dist:exe 스크립트). |
| **검증 상태** | Day 11 전반 검증 완료. v2.5는 시각 비활성. **Day 11 후속 + 후속 +1 (19개 파일, 2개 커밋) + Day 12 §1 (7개 파일, 3개 커밋 예정) — 사용자 검증 대기**: 가구 배치 드래그·드롭 / 상점 픽셀 미리보기 / 배치 모드 클릭 / 채팅 앱 재시작 후 이력 / 빈 자리 모달 토글 / 자리 이동 카메라 / 메모 외형 편집 비활성 / hover 카드 비활성 / **감정 태그 자동 트리거(LLM 응답 마지막 줄)** / **MemoModal idle emotion 12종 선택** / **가구 우클릭 메뉴 3종** / **가구 옮기기 ghost** / **dist:exe portable EXE 빌드** |

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

---

## 🛠 3. 현재 위치 + 미커밋 작업

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

**다음 작업 (검증 후):**
1. **시각 검증** — 사용자 PC `pnpm dev` 실행. Day 11~12 §1 통합 검증 (FEATURES.md "기대 동작 ☐" 체크리스트)
2. **portable EXE 1차 빌드** — `pnpm dist:exe` → `release/PixelAgentOffice-x.y.z-portable.exe`. 다른 PC에서 더블클릭 실행 확인
3. **M5-d 성격 시스템** (MBTI 보류 결정 답변 먼저)
4. **Phase 3 백엔드 셋업** (모바일 진입)
5. **PNG asset 도입** (사용자가 그림 그리기 결정 시 → v2.5 부활)

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

## 🚀 4. 다음 작업 가이드

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

### ⏰ 옵션 1 (추천) — **M 보류 결정 → M5-d 성격 + 토큰 고갈 애니메이션**

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
