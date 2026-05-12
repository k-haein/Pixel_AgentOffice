# AI Agent 시각화 / 테스트 프로그램 — 아이디어 노트

> 작성 시작: 2026-05-12
> 목적: AI 에이전트를 **시각화**하고 다양한 시나리오를 **테스트**할 수 있는 학습용 프로그램 설계
> 사용자: 공부 목적 — 추천되는 페이지를 전부 만들어보고 싶음

---

## 1. 사용자가 가진 사전 지식 (정리)

### Agent 기본
- LLM이 단순 채팅이 아니라, **스스로 도구를 골라 다단계 작업을 끝까지 수행**하는 시스템
- "계획 → 실행 → 검증 → 수정" 반복

### 구조 (Architecture)
- **Single Agent**: 하나가 처음부터 끝까지. 단순/빠름/디버깅 쉬움. 복잡 작업엔 약함.
- **Multi-Agent**: 여러 Agent 협업. 전문성 분담/병렬/컨텍스트 절약. 설계 복잡/비용 ↑.

### 역할 (Role)
- **Orchestrator / Leader / Coordinator** — 직접 일 안 하고 분배만 (예: `nxt-leader`)
- **Worker / Specialist** — 한 가지 특화 (예: `nxt-layout`, `nxt-grid`)
- **Reviewer / Critic** — 결과물 검수 (예: `nxt-reviewer`)
- **Tester / Verifier** — 실제 실행해서 확인 (예: `nxt-tester`, Playwright)
- **Router / Dispatcher** — 요청을 보고 누구에게 보낼지 결정
- **Planner** — 실행 전 계획만 수립

### 관계 (Relationship)
- **Parent / Sub-agent** — 호출하는 쪽이 부모. "sub-agent"는 절대 명칭이 아니라 상대 위치.
- **Peer** — 대등한 협업
- **Pipeline** — 컨베이어 벨트식 순차

### 대표 Multi-Agent 패턴 5가지
1. **Hierarchical (계층형)** — Leader가 분배. 군대식.
2. **Pipeline** — A → B → C → D 순차
3. **Peer / Debate** — 서로 토론하며 합의
4. **Router** — 요청 종류별 분기. 콜센터식.
5. **Reflection** — Actor → Critic → 재시도 반복 (Ralph Loop)

---

## 2. 사용자 요구사항

- **목적**: 공부 + 시각화 + 테스트
- **범위**: 추천되는 페이지를 전부 만들어보고 싶음 (학습 의지 ↑)
- **참조 프로젝트**: `D:\_git\seegene-mf-lis-react-new\` — 다양한 에이전트 활용. 여기서 아이디어 차용 희망.
- **선호하는 UX**: 게임 같은 비트(픽셀) UI
  - 사무실처럼 생긴 화면
  - 각 책상마다 에이전트가 명패 달고 앉아있음
  - 에이전트가 일하면 일하는 애니메이션
  - 더블클릭 → 채팅창 팝업 → 명령
  - 각 에이전트에게 병렬로 일을 시키는 구조

---

## 3. 후보 접근 방식 (1차 제안)

### A. Trace Viewer 중심 (LangSmith / Langfuse 스타일)
- 실행 기록 → 사후 트리/타임라인으로 분석
- 각 step(LLM 호출, tool 호출, 상태 변화)을 노드로 표시
- 토큰/지연시간/비용 표기
- 장: 디버깅에 강력
- 단: 실시간 상호작용 느낌 약함

### B. Live Graph 중심 (멀티에이전트 시각화)
- ReactFlow/Cytoscape로 에이전트=노드, 메시지=엣지
- WebSocket 스트리밍, 메시지 흐름 애니메이션
- 장: 시각적 화려, 데모/이해에 좋음
- 단: 단일 에이전트엔 과함

### C. Playground 중심 (프롬프트/시나리오 테스트)
- 좌: 입력/설정 패널, 중앙: 대화·도구 호출 흐름, 우: state/메모리 인스펙터
- A/B 비교, 동일 시나리오 여러 모델 동시 실행
- 장: 테스트에 직접적, 빠른 반복
- 단: 시각화는 평범

### D. 🎮 게임형 사무실 UI (사용자 선호) ← **메인 컨셉**
- 픽셀아트 / 비트 스타일 사무실
- 각 책상 = 에이전트, 명패에 역할 표시
- 에이전트 상태별 애니메이션 (대기/일하는중/완료/에러)
- 더블클릭 → 채팅 팝업
- 병렬 명령 가능
- **유사 선행 사례**:
  - **Stanford Generative Agents** ("Smallville", Park et al. 2023) — 25명 AI가 마을에서 생활
  - **AI Town** (a16z-infra) — 위 논문의 오픈소스 구현체. 픽셀아트 마을, 에이전트끼리 대화
  - **Convex AI Town** — AI Town의 Convex 백엔드 버전
  - **Project Sid / Altera** — 마인크래프트 안의 1,000 AI 에이전트 사회
  - 본 프로젝트의 차별점: "**시뮬레이션**이 아니라 **개발자가 명령하는 작업 도구**"
    → 사용자가 에이전트에게 실제 task를 시키고, 결과를 받아보는 것

---

## 4. 추천 방향 (현재 시점)

**메인 컨셉 = D (게임형 사무실 UI)** 를 메인으로 하되, 내부에 A/B/C 기능을 모드별 화면으로 통합:

- **사무실 뷰** (홈): 에이전트들이 책상에서 일함. 게임처럼 보이고 만지는 메인 UI.
- **Trace 뷰**: 특정 작업 더블클릭 → 그 작업의 실행 trace를 트리/타임라인으로
- **Graph 뷰**: 여러 에이전트가 협업할 때 메시지 흐름을 노드 그래프로
- **Playground 뷰**: 단일 에이전트에 시나리오 던지고 A/B 테스트

---

## 5. 기술 스택 후보

- **Frontend**: React + Vite
  - 픽셀 UI: Phaser.js / PixiJS / 또는 CSS sprite + Framer Motion
  - 그래프: ReactFlow
  - 차트: Recharts
- **Backend**: FastAPI (Python) — AI SDK 통합 쉬움 / 또는 Node.js
- **실시간**: WebSocket 또는 SSE
- **저장소**: SQLite (trace) + 파일 (config/scenario)
- **LLM**: Claude API 우선, OpenAI도 지원 (provider abstraction)

---

## 6. 미정 / 결정 필요

- [ ] LLM provider 선택 (Claude만? 멀티 provider?)
- [ ] 백엔드 언어 (Python vs Node)
- [ ] 픽셀 엔진 (Phaser vs 직접 CSS/Canvas)
- [ ] 에이전트 정의 방식 (YAML? TypeScript? UI 빌더?)
- [ ] seegene 프로젝트에서 가져올 구체적 패턴
- [ ] 페이지 전체 목록 확정

---

## 7. 다음 작업

1. `D:\_git\seegene-mf-lis-react-new\` 프로젝트 분석 — 어떤 에이전트들이 어떻게 구성되어 있는지 파악
2. 추천 페이지 전체 목록 작성 (학습용 = 빠짐없이 다 만들 수 있게)
3. 픽셀 UI 사무실 와이어프레임 / 화면 구성 설계
4. 에이전트 정의 스키마 초안
