# PixelAgentOffice — 기획 케이스 스터디

> 픽셀 아트 사무실에서 AI 에이전트를 직원처럼 채용·배치·명령할 수 있는 데스크톱 앱의 기획 아카이브.

**Status**: M3 코드 완성 — 다중 LLM (Claude + Gemini) + E2E 테스트
**Period**: 2026-05-12 (기획+M1) → 2026-05-13 (M2) → 2026-05-14 (M3 + PRD/와이어프레임)

---

## 📋 핵심 문서 (포트폴리오 평가용)

| 문서 | 설명 | 읽는 시간 |
|---|---|---|
| 📄 **[PRD.md](PRD.md)** | 프로덕트 요구사항 문서 (기획자 시점) | 8~10분 |
| 📐 **[wireframes-v2.html](visuals/wireframes-v2.html)** | 9개 화면 와이어프레임 + annotations | 5분 |
| 📓 [planning/00-brainstorming-log.md](planning/00-brainstorming-log.md) | 의사결정 흐름 일지 (Day 1~3, 37 세션) | 15분 |

→ **시간 없으시면 PRD부터.** 30초 요약 + 차별화 3가지 + 사용자 페르소나 + 키 features 한눈에.
**Target stack**: Electron + React + Phaser.js + TypeScript
**Distribution**: 사용자 본인 Claude API 키 입력 방식의 `.exe` 인스톨러

---

## 🎯 30초 요약

PixelAgentOffice는 AI 에이전트 관리를 **"Two Point Hospital + The Sims"** 류의 게임 메커니즘으로 풀어낸 데스크톱 앱입니다.

사용자는:
- 🐙 픽셀 캐릭터(Clawd 패밀리 + 인간형)를 골라 **에이전트로 채용**
- ✏️ 이름·역할·성격·도구 권한을 **시각적으로 지정**
- 🏢 책상을 드래그해 **나만의 사무실 디자인**
- 💬 캐릭터 더블클릭으로 **즉시 채팅·명령**
- 👑 Leader 에이전트에게 명령하면 **하위 팀에 자동 분배** (Team 모드)
- 📺 사장석 뒤 **토큰 보드**로 실시간 사용량 확인
- 🌙 토큰 소진 시 **직원들이 성격별로 반응** — 게으른 캐릭터는 "앗싸 퇴근!", 성실한 캐릭터는 시무룩, 누구는 잠 (시그니처 기능)

---

## 💡 해결하려는 문제

AI 에이전트는 강력하지만, 일반 사용자에게 **진입 장벽이 너무 높습니다**:

- YAML/JSON으로 에이전트 정의해야 함
- 터미널 명령으로 실행
- 추상적인 오케스트레이션 개념
- 멀티 에이전트는 개발자조차 관리가 번거로움

→ **시각적이고 직관적인 워크스페이스**가 필요하다.

## ✨ 핵심 아이디어 — "설정 = 커스터마이징"

| 기존 도구 | PixelAgentOffice |
|---|---|
| 에이전트 정의 = 코드/설정 파일 작성 | **캐릭터 선택 + 이름 짓기** |
| 팀 조직 = JSON 그래프 작성 | **책상을 끌어다 배치** |
| 상태 모니터링 = 로그 파일 응시 | **사무실 둘러보기 + 토큰 보드** |
| 에러 = 빨간 메시지 | **직원이 시무룩해함** |

→ **재미와 사용성을 동시 추구**. 단순 기능 도구가 아니라 *애착이 생기는 환경*.

---

## 🏗️ 핵심 디자인 결정

| 결정 | 이유 | 트레이드오프 |
|---|---|---|
| **Electron 채택 (Python 배제)** | 일반 사용자가 `.exe` 더블클릭으로 설치 가능. Python 설치/pip 명령 없음. | 바이너리 크기 ↑, Electron 학습 필요 |
| **Phaser + React 하이브리드** | 사무실 씬(드래그/스프라이트 애니/그리드 스냅)은 Phaser, UI 오버레이(모달/채팅/메뉴)는 React. 각자 잘 하는 영역. | 두 시스템 간 이벤트 브릿지 필요 |
| **Solo + Team 이중 모드** | "페르소나 채팅"(편집자, 칸트 등)과 "팀 협업"은 멘탈 모델이 완전히 다름 → 같은 건물 다른 층 + 엘리베이터 전환 | UI 두 벌 |
| **Swappable 캐릭터 팩** | 개발은 Clawd로, 배포 시 자체 캐릭터로 폴더 한 줄 교체. 라이선스 위험 격리. | 에셋 추상화 레이어 |
| **사용자 본인 API 키 모델** | 우리는 과금 인프라/책임 없음. 배포에 깔끔. | 일반 사용자에게 "API 키" 개념 안내 필요 |
| **Solo 모드 우선 개발** | Phase 1 단순화. 페르소나 채팅 = 시스템 프롬프트 + 단일 호출. Team 협업 로직은 Phase 2로. | 첫 출시 시 멀티에이전트 기능 없음 (의도된 미니멈) |

---

## 🎨 시각 산출물

다음 HTML 파일을 브라우저로 직접 열어보실 수 있습니다.

| 파일 | 내용 |
|---|---|
| 🖼️ [`visuals/office-mockup.html`](visuals/office-mockup.html) | **Floor 1 사무실 시안** — 부서 클러스터, 엘리베이터, 토큰 보드, 창밖 태양 |
| 🖼️ [`visuals/wireframes.html`](visuals/wireframes.html) | **6개 화면 시안** — 채용 모달, 채팅+Preview 패널, 권한 UI, 설정, Floor 2(Team), 토큰 고갈 밤 모드 |

> 📷 스크린샷은 [`screenshots/`](screenshots/) 폴더에 추가 예정 (HOW-TO 가이드 포함)

---

## 📚 기획 문서 읽기 가이드

깊이 보고 싶으시면 다음 순서를 추천:

1. **[브레인스토밍 흐름 로그](planning/00-brainstorming-log.md)** ⭐ — 모든 의사결정이 어떻게 진화했는지 한눈에 (이 프로젝트의 *사고 과정* 자체)
2. **[비전·컨셉](planning/01-agent-visualizer-ideas.md)** — 처음의 문제 정의와 후보 접근들
3. **[Phase 1/2 계획](planning/02-phased-plan.md)** — 단계별 비전과 Seegene 프로젝트 인벤토리
4. **[이중 모드 아키텍처](planning/07-dual-mode-architecture.md)** — Solo + Team 구조의 결정 배경
5. **[캐릭터 시스템·커스터마이징](planning/05-character-and-customization.md)** — Clawd 패밀리, 채용 흐름, swappable 팩
6. **[시그니처 폴리시 기능](planning/08-token-board-and-office-life.md)** — 토큰 보드 + 성격 반응 + 시간대 변화
7. **[스택·배포 전략](planning/03-stack-and-distribution.md)** — Electron 선택 이유, API 키 정책
8. **[UI 옵션 비교](planning/04-ui-options-comparison.md)** — Phaser vs PixiJS vs React+CSS
9. **[보류된 결정 항목](planning/06-decisions-to-make.md)** — 의도적으로 남겨둔 결정들 (체계적 분류의 증거)

---

## 🛤️ 단계별 로드맵

| Phase | 핵심 작업 |
|---|---|
| **1.0** | 정적 mockup ✓ (이 폴더의 HTML) |
| **1.1** | Electron + Phaser 스캐폴드, 첫 Clawd 스프라이트, 일하는 애니메이션 |
| **1.2** | 채용 모달 + 캐릭터 갤러리 |
| **1.3** | 책상/에이전트 드래그 재배치 |
| **1.4** | Claude API 연결 + 권한 UI + 비용 한도 |
| **1.5** | 결과 Preview 패널 (Artifact 스타일) |
| **1.6** | 채팅 히스토리, 영구 메모리 |
| **1.7** | 🎨 토큰 보드 + 성격 반응 + 시간대 (시그니처 폴리시) |
| **2.0** | Team Office (2층) + Leader 분배 로직 |
| **2.1** | Seegene 프로젝트 에이전트 임포트 |
| **3.0** | 자율 시뮬레이션 (자율 의사결정 + 트리거 자동화) |

---

## 🔍 기획 과정에서 가장 자랑스러운 순간

1. **제약이 결정을 명확하게 만든 순간** — "배포 자동화 필요"가 추가된 즉시 Python 후보가 자동 탈락하고 Electron 채택이 명확해짐
2. **사용자 인사이트가 아키텍처를 단순화시킨 순간** — "동생은 페르소나 채팅 쓴다"는 한마디가 → 이중 모드 도입 → Phase 1을 *단순화* (멀티에이전트 로직 Phase 2로 미룸)
3. **에러를 폴리시로 격상시킨 순간** — "토큰 다 쓰면 직원들이 성격대로 반응" 아이디어 → 단순 에러 메시지가 *시그니처 기능*이 됨 (SNS 콘텐츠 자체 생성)

---

## 📌 이 케이스 스터디에 대해

본 폴더는 2026-05-12 단일 세션의 기획 결과물 스냅샷입니다. 모든 의사결정 흐름, 시각 시안, 보류 항목까지 큐레이션 없이 보존되어 있습니다. 활성 작업은 별도 폴더(`D:\myPrj\ideas\`)에서 계속되며, 의미 있는 마일스톤마다 본 포트폴리오에 추가 스냅샷이 누적됩니다.

**연락처 / 추가 정보**: (작성 시 추가)

---

## 📁 폴더 구조

```
PixelAgentOffice/
├─ README.md                    ← 본 문서 (케이스 스터디 표지)
├─ planning/                    ← 기획 문서 9건 (시간순 보존)
│   └─ 00 ~ 08
├─ visuals/                     ← 작동하는 HTML 시안
│   ├─ office-mockup.html
│   └─ wireframes.html
├─ screenshots/                 ← 스크린샷 + 캡처 가이드
│   └─ HOW-TO-CAPTURE.md
└─ milestones/                  ← 마일스톤별 코드 스냅샷
    ├─ M1-basic-ui/             ← Electron + Phaser 기본 UI (2026-05-12)
    ├─ M2-ui-channel/           ← 채용·메모·설정 모달 + 영속화 (2026-05-13)
    └─ M3-multi-llm/            ← Claude + Gemini + E2E 테스트 + Dead-model 마이그레이션 (2026-05-14)
        ├─ retrospective.md
        ├─ electron/  (+ llm/ 6개 파일, store.ts 마이그레이션 포함)
        ├─ src/       (+ Model 5종 + MODEL_INFO + DEPRECATED_MODELS)
        └─ tests/e2e/ (+ Playwright 3 시나리오)
```
