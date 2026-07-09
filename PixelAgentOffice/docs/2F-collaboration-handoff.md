# PixelAgentOffice — 2층 "에이전트 팀 협업" + 멀티모델 개발 핸드오프

> 이 문서는 다른 개발 세션에 전달하기 위한 설계 지시서입니다.
>
> **참고(원본, 권장):** `oh-my-openagent` (omo) — https://github.com/code-yeongyu/oh-my-openagent
>   기반 엔진 **OpenAgent** 위에 올리는 멀티 에이전트 인격/협업 팩. 문서화가 잘 돼 있고
>   협업 원리는 여기서 배우는 게 가장 깨끗하다.
>   - 기능 개요: https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/reference/features.md
>   - 에이전트-모델 매칭: https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/guide/agent-model-matching.md
>
> **분석해서 원리만 추출**하며 코드를 그대로 이식하지 않는다(이유는 §5).

---

## 진행 현황 (2026-07-07 갱신)

| 단계 | 상태 | 비고 |
|---|---|---|
| **M-2F-0 멀티모델 기반** | ✅ **완료** | Vercel AI SDK(`ai@7`) 전환 + OpenAI(`gpt-5-mini`) provider. 완료 기준 3종 중 ①1층 대화·③비용 카운터는 Gemini 실키 e2e로 증명, ②OpenAI 실채팅은 키 준비 후 `tests/e2e/06-openai-chat.spec.ts`가 자동 검증 |
| **Phase 1 tool-calling 인프라** | ✅ **완료** | `ToolDef`/`ToolCall`/`stopReason` 확장 + provider tools 전달. 더미 도구 `get_current_time` 왕복 통합 테스트 통과(`tests/integration/toolcall-roundtrip.test.ts`) |
| **Phase 2 에이전트 루프** | ✅ **완료** | `electron/agent/loop.ts` `runAgent` — MAX_STEPS 상한(기본 20)·도구 실패 `{ error }` 격리·`AgentEvent` 훅·chat 주입식(프로덕션=dispatch.chat → §8 한도 경로 유지). 유닛 17케이스 + 실키 루프 왕복(`tests/integration/agent-loop-roundtrip.test.ts`, 키 없으면 skip) |
| **Phase 3 위임 협업** | ✅ **완료 (엔진)** | `delegate_to_member`(자식 루프 재귀·재위임 구조 차단) + `runTeamTask`(팀장 검증·팀원 명단 주입·usage 팀 전체 합산) + IPC `agent:run-team`(dispatch.chat 주입 → 한도 자동) + platform/mock. 유닛 12 + 실키 왕복 테스트(키 대기) |
| **Phase 4 게임 연출 + 팀 작업 UI** | ✅ **완료** | `TeamTaskModal`(팀장 우클릭 "🤝 팀 작업 시키기" → 위임 카드 실시간 + 최종 보고 + 중단) + delegation 이벤트를 기존 eventBus로 흘려 팀장·팀원 캐릭터 연출(OfficeScene 무변경). mock 데모 연출로 키 없이 체험. ⚠️ PC 시각 검증 대기 |

---

## 0. 🔒 잠금된 결정 (2026-07-02 확정 — 재논의 불필요)

| 결정 | 값 | 근거 |
|---|---|---|
| **멀티모델 방식** | **Vercel AI SDK 도입** (`ai` + `@ai-sdk/anthropic`·`@ai-sdk/google`·`@ai-sdk/openai`) | 멀티모델 + tool-calling 동시 해결. omo/OpenAgent 스택과 동일 검증 방식 |
| **구현 순서** | M-2F-0 → 1 → 2 → 3 → 4 (의존성 순, §7) | 앞 단계 없이 뒤 단계 불가 |
| **작업 방식** | 한 세션=한 단계. 각 단계 끝에 ✅확인 → 사용자 승인 후 커밋 | M1~M3에서 검증된 방식 |
| **서버** | 안 만듦. Electron main = 두뇌. `electron/llm`·`electron/agent`에 electron import 금지 | §8 |

---

## 1. 목표

PixelAgentOffice에 **2개 층(mode)** 을 만든다.

| 층 | 성격 | 구현 상태 |
|---|---|---|
| **1층 (light chat)** | 직원 1명과 1:1 대화. `chat()` 1회 호출로 끝 | ✅ 이미 있음 (`electron/llm/dispatch.ts`) |
| **2층 (team collaboration)** | 팀장 직원에게 일을 시키면, 팀장이 같은 팀 팀원들에게 **실제로 위임**하고 결과를 모아 응답 | 🔨 신규 구현 대상 |

동시에 **멀티모델**(Claude/Gemini 외 OpenAI·OpenRouter 등)을 붙인다. → ✅ M-2F-0에서 완료.

**핵심 제약: 서버를 만들지 않는다.** 모든 로직은 Electron main 프로세스(`electron/`)에서 돈다.
단, 나중에 서버로 들어올릴 수 있도록 `electron/llm/` 이하 "두뇌"는 Electron API를 import 하지 않는다(§8).

---

## 2. 이미 있는 자산 (이 위에 짓는다)

PixelAgentOffice는 협업에 필요한 뼈대를 이미 갖고 있다. **새로 만들지 말고 재사용**할 것.

| 자산 | 위치 | 협업에서의 역할 |
|---|---|---|
| `LLMProvider` 인터페이스 | `electron/llm/types.ts` | 멀티모델 확장 지점 |
| provider 레지스트리 | `electron/llm/registry.ts` | 모델명→provider 라우팅 |
| `dispatch.chat()` | `electron/llm/dispatch.ts` | 1층 호출 + rate/cost 한도 (2층도 재사용) |
| 사용량/비용 추적 | `electron/llm/usage.ts` | 위임으로 호출이 늘어도 그대로 집계됨 |
| **Employee 모델** | `src/shared/types.ts` | **팀장/팀원 = 직원.** `model`, `template`, `mbti`, `customInstructions`, `rank`, `seatId` 보유 |
| **팀 구조 A/B/C** | `src/shared/types.ts` `TeamId`, `SeatId` | 팀장(`leader:A`)·팀원(`member:A:0~3`) 자리 이미 정의됨 |
| 팀장 자격 판정 | `src/shared/types.ts` `canBeTeamLeader()` | 과장 이상만 팀장 (그대로 활용) |
| 게임 이벤트 버스 | `src/game/eventBus.ts` | 위임 진행상황을 캐릭터 애니메이션으로 시각화 |
| IPC 통신 | `electron/main.ts` `ipcMain.handle` | 2층 진입점 추가할 곳 |

> **개념 매핑**: omo의 "Sisyphus(오케스트레이터)→Hephaestus(솔버) 위임"이 여기서는
> **"팀장 직원 → 같은 팀 팀원 직원 위임"** 으로 자연스럽게 대응된다.
> 이미 있는 직급·팀·자리 시스템이 곧 협업 조직도가 된다. 이게 이 프로젝트의 강점.

---

## 3. 협업의 최소 골격 (omo/OpenAgent에서 추출한 원리)

omo/OpenAgent 조사 결론: **위임은 별도 프로세스가 아니라, 동일한 에이전트 루프를 "자식 대화"로 재귀 호출하는 것**이다.
아래 5개 개념만 있으면 팀장→팀원 협업이 성립한다. (원본 참조: `tool/delegate-task/delegate-task.ts`)

1. **대화 트리 (parent → child)**
   팀장의 대화가 부모. 위임할 때마다 팀원용 자식 대화를 만든다. (OpenAgent: `Session.create({ parentID })`)

2. **에이전트 루프 (agent loop)**
   `LLM 호출 → 도구 호출 있으면 실행 → 결과를 다시 LLM에 먹임 → 반복 → 도구 호출 없으면 종료`.
   팀장 대화도, 팀원 자식 대화도 **같은 루프**를 돈다. (OpenAgent: `SessionPrompt.prompt`)

3. **위임 도구 (delegate tool)**
   팀장에게만 쥐여주는 도구. 입력 `{ 팀원 지정, 지시 내용 }`. 실행되면 그 팀원 페르소나로
   자식 대화의 루프를 돌리고, 팀원의 최종 텍스트를 팀장에게 반환. (omo: `delegate_task`)

4. **재위임 방지 (권한 박탈)**
   자식(팀원)에게는 위임 도구를 **주지 않는다**. 무한 위임 방지. (omo: `BLOCKED_TOOLS`, `tool/delegate-task/constants.ts:219`)

5. **진행상황 스트리밍**
   위임 시작/팀원 작업 중/완료를 이벤트로 흘려서 UI(채팅창 + 게임 캐릭터)가 실시간 반영.
   (OpenAgent: `Bus.subscribe` → 여기서는 `src/game/eventBus.ts` + IPC 이벤트)

> 이 5개가 전부다. OpenAgent의 나머지(Storage·Compaction·Snapshot·tmux 등)는 **협업 필수 요소가 아니다.**

---

## 4. 만들어야 할 것 (구체적 갭 4개)

### 갭 1 — LLM 레이어에 tool-calling(함수 호출) 추가 ★핵심★ → ✅ 완료 (Phase 1)
`ChatRequest`/`ChatResponse`(`electron/llm/types.ts`)를 확장 완료:

```ts
// types.ts 확장 (구현 완료)
export type ToolDef = {
  name: string
  description: string
  parameters: Record<string, unknown>   // JSON Schema
}
export type ToolCall = { id: string; name: string; args: unknown }

export type ChatRequest = {
  model: Model
  systemPrompt: string
  messages: ChatMessage[]        // tool 역할(도구 결과) 메시지 포함
  tools?: ToolDef[]              // ← 추가됨
  maxTokens?: number
}
export type ChatResponse = {
  text: string
  toolCalls?: ToolCall[]         // ← 추가됨. 있으면 루프 계속
  usage: { inputTokens: number; outputTokens: number }
  stopReason: 'end' | 'tool_calls'  // ← 추가됨
}
```

→ 세 provider(`anthropic.ts`, `gemini.ts`, `openai.ts`)는 `aiProvider.ts` 공용 팩토리로 tools를 API에 전달하고 tool 호출을 파싱해 반환한다. 왕복 검증: `tests/integration/toolcall-roundtrip.test.ts`.

### 갭 2 — 에이전트 루프 → ✅ 완료 (Phase 2)
현재 `dispatch.chat()`은 1회 요청-응답. 2층용 **반복 루프**를 새 파일로:

```
// electron/agent/loop.ts (신규, 개념)
async function runAgent(employee, messages, tools, ctx):
  for step in 0..MAX_STEPS:                 // 안전 상한 (omo: 200)
    res = await dispatch.chat({ model, systemPrompt(employee), messages, tools })
    if res.stopReason != 'tool_calls': return res.text   // 종료
    for call in res.toolCalls:
      result = await tools[call.name].execute(call.args, ctx)
      messages.push(tool_result(call.id, result))
    // 루프 계속
```

`dispatch.chat()`를 그대로 재사용하므로 rate-limit·비용 한도가 자동 적용된다.

> ✅ 구현 노트 (2026-07-07): dispatch가 `store.ts`(→`app.getPath`, electron)를 물고 있어 vitest에서
> import 불가 → 루프는 동일 시그니처의 `ChatFn`을 **주입**받는 형태로 구현. 프로덕션 배선(Phase 3
> main.ts IPC)에서 `dispatch.chat`을 넘기면 위 문장 그대로 한도가 자동 적용된다. MAX_STEPS 도달은
> throw가 아니라 `stopped:'max_steps'` 반환, 도구 실패는 `{ error }`로 모델에 되돌려 루프 생존.

### 갭 3 — 위임 도구 `delegate_to_member` → ✅ 완료 (Phase 3)
팀장 루프에만 등록하는 도구:

```
// electron/agent/tools/delegate.ts (신규, 개념)
execute({ memberId, task }, ctx):
  member = findEmployee(memberId)              // 같은 팀 팀원인지 검증
  childMessages = [{ role:'user', text: task }]
  emit('delegation:start', { leader: ctx.employeeId, member: memberId })  // 게임 연출
  result = await runAgent(member, childMessages, toolsWithoutDelegate, ctx) // ← 재귀! 팀원엔 위임도구 제외 (갭4 방지)
  emit('delegation:done', { member: memberId })
  return result                                 // 팀장에게 반환
```

- **팀원 페르소나** = 그 직원의 `template`/`mbti`/`customInstructions`로 조립한 시스템 프롬프트
  (이미 `src/shared/types.ts`의 `TEMPLATES`, `MBTI_PROFILES`에 다 있음 — 재사용).
- 팀장이 어떤 팀원에게 시킬지는 **팀장 시스템 프롬프트에 "네 팀원 목록"을 주입**해서 AI가 고르게 한다
  (omo의 dynamic-agent-prompt-builder 원리).

### 갭 4 — 멀티모델 확장 → ✅ 완료 (M-2F-0, 선택지 B 채택)
- ~~A. 기존 방식 유지 + 확장~~: provider마다 tool-calling 파싱을 직접 구현해야 해서 탈락.
- **B. Vercel AI SDK 도입** (omo 방식): `ai` 패키지 + `@ai-sdk/anthropic`·`@ai-sdk/google`·`@ai-sdk/openai`.
  → 갭1(tool-calling)과 갭4(멀티모델)를 한 번에 해결. (OpenAgent 참조: `session/llm.ts` `streamText()`)

> B를 택한 결과: `LLMProvider` 구현체 내부를 AI SDK가 대체하고(인터페이스 형태는 유지),
> `registry.ts`는 "모델명 → provider" 라우팅으로 단순 유지. `dispatch.ts`의 한도 로직은 그대로.

---

## 5. 전략: 복사하지 말고 재구축하라 (중요)

omo/OpenAgent 협업 코드 조사 결과, **이식 난이도가 극과 극**이다.

| omo/OpenAgent 요소 | 파일 | 이식성 | 처리 방침 |
|---|---|---|---|
| 협업 심장부 (세션 루프) | `session/prompt.ts`(71KB)+`processor.ts`(18KB) | ❌ OpenAgent 인프라(Storage/Bus/Instance/Compaction)에 강결합 | **재작성** (§4 갭2로 새로 간결하게) |
| 위임 도구 | `tool/delegate-task/*`(~500줄) | ⚠️ 원리는 단순, 코드는 결합 | **원리만 차용** (§4 갭3) |
| 페르소나 본문 | `omo-agents/*.ts`(~270KB) | ✅ 순수 문자열 | **가져오지 말 것** — PixelAgentOffice는 자체 페르소나(TEMPLATES/MBTI) 보유 |
| 프로바이더/트랜스폼 | `provider/transform.ts`(39.5KB) | ✅ 대부분 순수 함수 | Vercel AI SDK 도입으로 대부분 불필요 (확정) |
| 카테고리→모델 라우팅 | `tool/delegate-task/constants.ts` | ✅ 순수 로직 | **참고**할 만함 (작업 성격별 모델 선택 아이디어) |

**결론**: omo/OpenAgent는 "복사 대상"이 아니라 **"살아있는 참고 구현(reference)"** 으로 쓴다.
협업의 5개 원리(§3)를 PixelAgentOffice의 깨끗한 구조(`LLMProvider`, Employee, 팀 시스템) 위에
**수백 줄 규모로 새로 짜는 것**이 통째 이식(수천 줄 + 인프라 스텁)보다 빠르고 유지보수 쉽다.

---

## 6. 참고 인덱스 (막힐 때 열어볼 곳)

### 6-A. omo 문서 (개념 학습용)
- 협업/위임 개념 전반: https://github.com/code-yeongyu/oh-my-openagent (`dev` 브랜치)
- 에이전트 목록·역할: `docs/reference/features.md`
- **작업 성격별 모델 배정**(팀장=고성능, 탐색=저렴): `docs/guide/agent-model-matching.md` ← 2층 비용 전략의 핵심 참고
- 에이전트 이름은 그리스 신화 계열: Sisyphus(오케스트레이터), Atlas(연속 작업), Hephaestus(솔버),
  Metis(분석), Momus(리뷰), Sisyphus-Junior(경량 오케스트레이터) + explore/oracle/librarian/multimodal-looker.

### 6-B. omo/OpenAgent 원본 코드 (코드 확인용)
경로: oh-my-openagent 리포지토리(`dev` 브랜치) + 기반 엔진 OpenAgent 소스 기준.

| 궁금할 때 | 파일:줄 |
|---|---|
| 위임이 자식 대화를 어떻게 만드나 | `tool/delegate-task/delegate-task.ts:69-104` (`Session.create({parentID})`) |
| 위임 실행 = 루프 재귀 호출 | `tool/delegate-task/delegate-task.ts:167,231` (`SessionPrompt.prompt`) |
| 재위임 방지 (자식 권한 박탈) | `tool/delegate-task/constants.ts:219` (`BLOCKED_TOOLS`) |
| 에이전트 루프 본체 | `session/prompt.ts:196~817`, 종료 판정 `:766-780` |
| 도구 실행 스트림 처리 | `session/processor.ts:47-` (`for await ... fullStream`) |
| 도구 정의 인터페이스 | `tool/tool.ts` (`Tool.define`, `{description, parameters, execute}`) |
| 도구 등록 | `tool/registry.ts:94-122` |
| LLM 호출 (AI SDK) | `session/llm.ts:227` (`streamText`) |
| 작업 성격별 모델 선택 | `tool/delegate-task/constants.ts:185-194` |
| 에이전트 정의 스키마 | `agent/agent.ts:200-230` (`mode`, `permission`, `model`, `steps`) |

---

## 7. 단계별 구현 계획

**M-2F-0 — 멀티모델 기반 (갭4)** ✅ **완료 (2026-07-03)**
- **Vercel AI SDK 도입 (결정됨, §0)**: `ai@7` + `@ai-sdk/anthropic` + `@ai-sdk/google` + `@ai-sdk/openai`.
- `anthropic.ts`/`gemini.ts` 내부를 AI SDK 호출로 대체하되 `LLMProvider` 인터페이스 유지. `openai.ts` 신설.
  세 provider가 공유하는 `aiProvider.ts` 팩토리(generateText + LLMError 매핑). `dispatch.ts` 한도 로직 무변경.
- `MODEL_INFO`에 `gpt-5-mini` + 단가 추가. 채용/메모/설정/API키 UI 확장.
- ⚠️ 빌드 함정 발견: `ai@7`의 CJS 의존성이 ESM 번들에서 `require("path")` 호출 → electron main 빌드에
  `createRequire` 배너 주입으로 해결(`vite.config.ts`).
- ✅ **확인**: (1) 1층 대화 Gemini 실키 e2e 통과 (2) OpenAI 채팅은 키 준비 후 06 스펙이 자동 검증 (3) 비용/한도 카운터 실측 assert 통과.

**Phase 1 — tool-calling 인프라 (갭1)** ✅ **완료 (2026-07-03)**
- `types.ts` 확장(ToolDef/ToolCall/stopReason + tool 역할 메시지). provider가 도구 호출 반환.
- 더미 도구 `get_current_time` 왕복 확인: 1차 호출 → `stopReason: 'tool_calls'` + 도구 호출 반환,
  도구 결과 주입 후 2차 호출 → 결과를 반영한 최종 텍스트. (`tests/integration/toolcall-roundtrip.test.ts`)

**Phase 2 — 에이전트 루프 (갭2)** ✅ **완료 (2026-07-07)**
- `electron/agent/loop.ts` `runAgent` — MAX_STEPS 상한(기본 20), 무한루프 방지, 도구 실패 `{ error }` 격리, `AgentEvent`(step/tool:start/tool:done) 훅, abort 체크.
- chat 주입식(§8 테스트 가능성 — 프로덕션 배선은 dispatch.chat). `get_current_time` 실행기(`agent/tools/time.ts`) 승격.
- ✅ **확인**: 유닛 17케이스(`tests/unit/agent-loop.test.ts`) + 실키 루프 왕복(`tests/integration/agent-loop-roundtrip.test.ts` — 루프가 스스로 도구 실행·반영, 키 없으면 자동 skip). vitest 55 통과/5 skip, tsc 무결.

**Phase 3 — 위임 협업 (갭3) ★2층 엔진 완성★** ✅ **완료 (2026-07-07)**
- `electron/agent/tools/delegate.ts` — 실행 시 팀원 페르소나로 자식 루프 **재귀 호출**, 보고 반환. 팀원 tools에 위임 도구가 구조적으로 안 들어가 재위임 원천 차단.
- `electron/agent/team.ts` — `runTeamTask`: 팀장 검증(리더 자리 + `canBeTeamLeader`) + 같은 팀 member 수집 + **팀장 프롬프트에 팀원 명단 주입** + `TeamEvent`(delegation:start/done·leader/member) 스트림. usage는 팀장+팀원 전체 합산(테스트가 잡은 갭 픽스).
- `electron/agent/persona.ts` — 팀장·팀원 공용 페르소나(정체성+지침+MBTI, 1층 전용 감정 태그 제외).
- IPC `agent:run-team`(main.ts, dispatch.chat 주입 → rate/일일 한도 자동) + preload `runTeamTask`/`onTeamEvent` + platform 3종(mock은 데모 위임 연출).
- ✅ **확인**: 유닛 12케이스(`tests/unit/agent-team.test.ts` — 팀 검증·위임 왕복·재위임 방지·오류 정정·2인 동시 위임) + 실키 왕복(`tests/integration/agent-team-roundtrip.test.ts`, 키 대기). vitest 67 통과/6 skip, tsc·pnpm build 무결.
- ⏳ 남은 것: UI 트리거·게임 연출(Phase 4), 실키 왕복 검증(키 준비 시 자동), 팀원 기억(memory) 주입 미연결.

**Phase 4 — 게임 연출 + 팀 작업 UI** ✅ **완료 (2026-07-09)**
- `src/components/TeamTaskModal.tsx` — 팀장 우클릭 "🤝 팀 작업 시키기"(리더 자리 + 과장↑ + 팀원 보유일 때만) → 작업 지시 → `runTeamTask`. `onTeamEvent`로 팀원별 위임 카드(⏳→✅/⚠️ + 보고) 실시간 + 최종 보고 + 중단.
- 위임 이벤트(`delegation:start/done`)를 기존 `eventBus`(`agent:set-state`·`agent:set-emotion`)로 흘려 팀장→팀원 캐릭터 연출(working·thinking·idea/confused·happy). **OfficeScene 핸들러 재사용 → 씬 코드 0줄 변경.**
- mock platform 데모 위임 연출로 API 키 없이도 체험 가능(포트폴리오·SNS 쇼케이스용).
- ⚠️ PC 시각 검증(모달 흐름·캐릭터 연출) + 실키 팀 위임 왕복은 다음 세션 대기. 이게 "게임 + 실제 협업"이 만나는 이 프로젝트만의 킬러 UX.

---

## 8. 지켜야 할 설계 원칙 (나중 서버 전환 대비)

1. **`electron/llm/`, `electron/agent/` 는 `electron` 을 import 하지 않는다.**
   순수 Node/TS로 유지 → 나중에 서버(Node/Bun)로 복사-이동 가능.
   (M-2F-0의 `aiProvider.ts`·Phase 1 확장 모두 이 원칙 준수 — 덕분에 vitest에서 직접 테스트 가능했음)
2. **저장은 반드시 함수를 거친다.** 루프/도구가 파일을 직접 읽지 않고 `store.ts` 함수 호출.
   현재 `usage.ts`/`store.ts`가 `app.getPath()`로 Electron에 묶여 있으니, 이 부분만
   "저장 경로 주입식"으로 리팩터하면 서버 전환 시 DB로 바꾸기 쉽다.
3. **비용 한도는 그대로.** 위임으로 LLM 호출이 늘어도 `dispatch.chat()` 경유라
   `dailyLimitUsd`·RPM 한도가 자동 적용된다 — 협업이 과금 폭주하지 않도록 이 경로를 우회하지 말 것.

---

## 참고: 과금 관련 (혼자 쓰는 동안)

- omo/OpenAgent 스택도 PixelAgentOffice도 **BYOK(자기 키 직접결제)** 철학이라 운영자 추가 비용 없음.
- 2층 협업은 위임 1회당 LLM 호출이 여러 번 일어나므로 **1층보다 토큰을 많이 쓴다.**
  팀원 수·MAX_STEPS·기본 모델(비싼 Opus 지양, 팀원엔 저렴/무료 모델 배정)로 비용을 통제할 것.
- 작업 성격별 모델 배정(팀장=고성능, 단순 팀원=Haiku/Flash)은 omo의 카테고리 라우팅 아이디어를 차용.
