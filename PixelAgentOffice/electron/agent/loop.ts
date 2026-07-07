/**
 * 2층 협업 — Phase 2 에이전트 루프 (핸드오프 §4 갭2).
 *
 * `LLM 호출 → 도구 호출 있으면 실행 → 결과를 다시 먹임 → 반복 → 도구 호출 없으면 종료`.
 * 팀장 대화도, (Phase 3의) 팀원 자식 대화도 전부 이 하나의 루프를 돈다.
 *
 * chat 함수는 주입식이다 — 프로덕션(main.ts)에서는 반드시 `dispatch.chat`을 넘겨서
 * rate-limit·일일 비용 한도가 자동 적용되게 한다 (§8 원칙 3).
 * 직접 import하지 않는 이유: dispatch가 store.ts(app.getPath)를 물고 있어
 * electron 밖(vitest)에서 import 자체가 안 됨 — Phase 1 테스트가 provider를
 * 직접 호출한 것과 같은 사정.
 *
 * 이 파일은 electron을 import하지 않는다 (§8 원칙 1 — 나중에 서버로 들어올릴 두뇌).
 */

import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ToolCall,
  ToolResultMsg,
  ToolDef,
} from '../llm/types'
import type { Model } from '../../src/shared/types'

/** dispatch.chat과 시그니처 동일 — 프로덕션에서는 dispatch.chat을 그대로 넘긴다 */
export type ChatFn = (
  request: ChatRequest,
  signal?: AbortSignal,
  onDelta?: (delta: string) => void,
) => Promise<ChatResponse>

/** 도구 execute에 전달되는 실행 맥락 (Phase 3: 위임 검증·깊이 제한 등으로 확장 예정) */
export type AgentContext = {
  /** 이 루프를 돌고 있는 직원 id — 위임 도구가 "같은 팀인지" 검증할 때 사용 */
  employeeId?: string
  signal?: AbortSignal
}

/** 에이전트에게 쥐여주는 도구 = 스펙(def) + 실행기(execute) */
export type AgentTool = {
  def: ToolDef
  /** JSON 직렬화 가능한 값을 반환할 것 — 그대로 role:'tool' 메시지로 모델에 들어간다.
   *  throw하면 루프가 { error } 결과로 감싸 모델에 되돌려준다 (루프는 죽지 않음) */
  execute: (args: unknown, ctx: AgentContext) => Promise<unknown>
}

/** 루프 진행 이벤트 — Phase 3 위임 중계, Phase 4 게임 연출(캐릭터 애니메이션)의 훅 */
export type AgentEvent =
  | { type: 'step'; step: number; maxSteps: number }
  | { type: 'tool:start'; step: number; call: ToolCall }
  | { type: 'tool:done'; step: number; call: ToolCall; result: unknown; isError: boolean }

export type RunAgentOptions = {
  chat: ChatFn
  model: Model
  systemPrompt: string
  /** 시작 대화. 원본 배열은 변형하지 않는다 (복사 후 사용) */
  messages: ChatMessage[]
  tools?: AgentTool[]
  /** LLM 호출 횟수 상한 — 무한루프 방지 (기본 DEFAULT_MAX_STEPS) */
  maxSteps?: number
  maxTokens?: number
  /** 도구 ctx로 전달되는 직원 id */
  employeeId?: string
  signal?: AbortSignal
  /** 텍스트 스트리밍 — 모든 스텝의 조각이 흘러온다. 스텝 경계는 onEvent 'step'으로 구분 */
  onDelta?: (delta: string) => void
  onEvent?: (ev: AgentEvent) => void
}

export type AgentRunResult = {
  /** 최종 응답 텍스트. stopped==='max_steps'면 마지막 스텝 텍스트라 비어 있을 수 있음 —
   *  호출부(위임 도구·IPC)가 stopped를 보고 안내 문구를 결정한다 */
  text: string
  /** 실제 소비한 LLM 호출 수 */
  steps: number
  stopped: 'end' | 'max_steps'
  /** 전 스텝 합산 토큰 — 보고용. 비용 집계 자체는 dispatch.chat 경유 시 자동 */
  usage: { inputTokens: number; outputTokens: number }
  /** 완결된 대화 기록 (도구 호출 턴·결과 턴·최종 답변 포함) */
  messages: ChatMessage[]
}

/** omo는 200이지만 우리는 사무실 규모(도구 왕복 몇 번 + Phase 3 위임)면 충분 — 폭주 시 비용 방어 */
export const DEFAULT_MAX_STEPS = 20

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const err = new Error('cancelled')
    err.name = 'AbortError'
    throw err
  }
}

/** 도구 하나 실행 — 실패해도 루프가 죽지 않게 { error }로 감싼다 */
async function executeTool(
  tool: AgentTool | undefined,
  call: ToolCall,
  ctx: AgentContext,
): Promise<{ result: unknown; isError: boolean }> {
  if (!tool) {
    return { result: { error: `등록되지 않은 도구: ${call.name}` }, isError: true }
  }
  try {
    return { result: await tool.execute(call.args, ctx), isError: false }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { result: { error: message }, isError: true }
  }
}

export async function runAgent(opts: RunAgentOptions): Promise<AgentRunResult> {
  const maxSteps = Math.max(1, opts.maxSteps ?? DEFAULT_MAX_STEPS)
  const messages = [...opts.messages]
  const tools = opts.tools ?? []
  const toolMap = new Map(tools.map(t => [t.def.name, t]))
  const toolDefs = tools.length > 0 ? tools.map(t => t.def) : undefined
  const ctx: AgentContext = { employeeId: opts.employeeId, signal: opts.signal }
  const usage = { inputTokens: 0, outputTokens: 0 }

  let lastText = ''
  for (let step = 1; step <= maxSteps; step++) {
    throwIfAborted(opts.signal)
    opts.onEvent?.({ type: 'step', step, maxSteps })

    const res = await opts.chat(
      {
        model: opts.model,
        systemPrompt: opts.systemPrompt,
        messages,
        tools: toolDefs,
        maxTokens: opts.maxTokens,
      },
      opts.signal,
      opts.onDelta,
    )
    usage.inputTokens += res.usage.inputTokens
    usage.outputTokens += res.usage.outputTokens
    lastText = res.text

    // 도구 호출이 없으면 종료 — stopReason이 tool_calls여도 호출 목록이 비면 방어적으로 종료
    if (res.stopReason !== 'tool_calls' || !res.toolCalls || res.toolCalls.length === 0) {
      messages.push({ role: 'assistant', content: res.text })
      return { text: res.text, steps: step, stopped: 'end', usage, messages }
    }

    // 도구 호출 턴 기록 → 순차 실행 → 결과를 한 tool 턴으로 주입
    messages.push({ role: 'assistant', content: res.text, toolCalls: res.toolCalls })
    const results: ToolResultMsg[] = []
    for (const call of res.toolCalls) {
      throwIfAborted(opts.signal)
      opts.onEvent?.({ type: 'tool:start', step, call })
      const { result, isError } = await executeTool(toolMap.get(call.name), call, ctx)
      results.push({ toolCallId: call.id, name: call.name, result })
      opts.onEvent?.({ type: 'tool:done', step, call, result, isError })
    }
    messages.push({ role: 'tool', results })
  }

  return { text: lastText, steps: maxSteps, stopped: 'max_steps', usage, messages }
}
