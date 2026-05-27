# Phased Plan — 사용자의 2단계 비전

> 작성: 2026-05-12
> 핵심 아이디어: **"플랫폼을 먼저 만들고, 그 위에 에이전트 세트를 갈아끼우는 구조"**

---

## Phase 1 — 나만의 에이전트 + 사무실 시각화

1. 사용자가 **직접 정의한 에이전트**들을 만든다
2. 그 에이전트들을 **사무실 UI**에 책상별로 배치
3. 더블클릭 → 채팅창 → 명령 → 일하는 애니메이션
4. 점진적으로 → **자율 시뮬레이션**까지 확장 (업무 자동화)
   - "자율"의 의미: 사용자가 매번 명령하지 않아도 에이전트끼리 알아서 일을 분배·실행

## Phase 2 — Seegene 프로젝트 에이전트 임포트

1. Phase 1에서 만든 사무실 UI **포맷만 재활용**
2. `D:\_git\seegene-mf-lis-react-new\.claude\agents\` 의 에이전트들(16개)을 직원으로 세움
3. 더블클릭 명령 → 해당 에이전트 실행
4. Leader (`nxt-leader`)에 명령하면 → 하위 워커들이 각각 일함

---

## Seegene 프로젝트의 에이전트 (확인됨)

`.claude/agents/*.md` — **Claude Code subagent 방식**

| 역할 | 에이전트 |
|---|---|
| Leader | nxt-leader |
| Worker | nxt-layout, nxt-grid, nxt-script, nxt-i18n |
| Reviewer | nxt-reviewer, cmm-reviewer, cmmlib-reviewer, i18n-reviewer, ibsheet-reviewer, screen-reviewer |
| Tester | nxt-tester |
| Planner/Gen/Healer | playwright-test-planner, playwright-test-generator, playwright-test-healer |
| 기타 | nr |

→ Phase 2의 호출 방식 = **Claude Code subagent를 외부 앱에서 어떻게 invoke 할지**가 핵심 기술 결정 포인트.

---

## 결정 필요한 핵심 질문

### Phase 1 관련
1. 첫 에이전트로 어떤 역할/업무를 만들고 싶은가? (예: 이메일 요약, 일정 정리, 코드 리뷰, 뉴스 수집…)
2. "자율 시뮬레이션"의 트리거는? (시간 기반? 이벤트 기반? 다른 에이전트 호출?)
3. 에이전트의 입출력 형태는? (텍스트만? 파일 읽기/쓰기? 외부 API?)

### Phase 2 관련 — 에이전트 실행 방식
seegene 에이전트는 Claude Code subagent이므로, 외부 앱에서 호출하려면 3가지 옵션:

- **(a) Claude Code CLI 호출**: `claude` 명령을 subprocess로 실행, 결과 파싱
  - 장: 기존 subagent 정의 그대로 사용 가능
  - 단: 프로세스 오버헤드, 스트리밍 결과 다루기 까다로움
- **(b) Claude Agent SDK 사용** (Python/TypeScript)
  - 장: 프로그램적 통합 깔끔, 스트리밍 지원
  - 단: subagent 정의를 SDK 형식으로 변환 필요할 수 있음
- **(c) Claude API 직접 호출**
  - 장: 가장 가볍고 빠름
  - 단: subagent의 도구 호출/파일 접근 등을 모두 직접 재구현 필요

### 공통
- LLM provider (Claude만? OpenAI/로컬도?)
- 백엔드 언어 (Python? Node.js?)
- 결과 표시 방식 (채팅창 스트리밍? 별도 결과 패널?)
- 사용자의 코딩 경험/선호 언어

---

## 임시 결론 (사용자 응답 전)

가장 유력한 조합:
- **Phase 1**: Claude Agent SDK (Python) + FastAPI + React + Phaser/PixiJS
- **Phase 2**: 동일 플랫폼, agent 정의 로더만 추가 (seegene `.md` 파싱 → SDK agent 구성)
- 자율 시뮬레이션은 Phase 1.5쯤에 도입 (이벤트 큐 + 스케줄러)
