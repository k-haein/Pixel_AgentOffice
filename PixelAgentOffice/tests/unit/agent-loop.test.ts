/**
 * Phase 2 에이전트 루프 유닛 테스트 — LLM 없이 각본(scripted) ChatFn으로 루프 로직만 검증.
 *
 * 검증 항목 (핸드오프 §7 Phase 2 기준):
 *  - 도구 호출 없으면 1스텝 종료 / 있으면 실행→결과 주입→재호출
 *  - MAX_STEPS 상한 (무한루프 방지)
 *  - 도구 오류·미등록 도구는 { error }로 모델에 되돌아가고 루프는 죽지 않음
 *  - 중단(abort)·이벤트 순서·원본 messages 불변
 */

import { describe, it, expect } from 'vitest'
import {
  runAgent,
  DEFAULT_MAX_STEPS,
  type AgentEvent,
  type AgentTool,
  type ChatFn,
} from '../../electron/agent/loop'
import { getCurrentTimeTool } from '../../electron/agent/tools/time'
import type { ChatRequest, ChatResponse, ToolCall } from '../../electron/llm/types'

// ───── 테스트 헬퍼 ─────

const endRes = (text: string): ChatResponse => ({
  text,
  stopReason: 'end',
  usage: { inputTokens: 10, outputTokens: 5 },
})

const toolRes = (calls: ToolCall[], text = ''): ChatResponse => ({
  text,
  toolCalls: calls,
  stopReason: 'tool_calls',
  usage: { inputTokens: 10, outputTokens: 5 },
})

/** 호출 순서대로 responses를 돌려주는 각본 ChatFn (마지막 각본을 반복) + 요청 기록 */
function scriptedChat(responses: ChatResponse[]) {
  const calls: ChatRequest[] = []
  const fn: ChatFn = async req => {
    calls.push(structuredClone(req))
    return responses[Math.min(calls.length - 1, responses.length - 1)]
  }
  return { fn, calls }
}

const echoTool: AgentTool = {
  def: {
    name: 'echo',
    description: '받은 msg를 그대로 반환',
    parameters: { type: 'object', properties: { msg: { type: 'string' } } },
  },
  execute: async args => ({ echoed: (args as { msg: string }).msg }),
}

const throwTool: AgentTool = {
  def: { name: 'boom', description: '항상 실패', parameters: { type: 'object', properties: {} } },
  execute: async () => {
    throw new Error('도구 내부 오류')
  },
}

const BASE = {
  model: 'gemini-2-5-flash' as const,
  systemPrompt: '테스트',
  messages: [{ role: 'user' as const, content: '안녕' }],
}

// ───── 루프 본체 ─────

describe('runAgent — 종료 조건', () => {
  it('도구 호출이 없으면 1스텝에 종료하고 최종 답변을 반환한다', async () => {
    const { fn, calls } = scriptedChat([endRes('최종 답변')])
    const result = await runAgent({ ...BASE, chat: fn, tools: [echoTool] })

    expect(calls).toHaveLength(1)
    expect(result).toMatchObject({ text: '최종 답변', steps: 1, stopped: 'end' })
    // 완결 기록: user + 최종 assistant
    expect(result.messages).toEqual([
      { role: 'user', content: '안녕' },
      { role: 'assistant', content: '최종 답변' },
    ])
  })

  it('stopReason이 tool_calls여도 호출 목록이 비면 방어적으로 종료한다', async () => {
    const { fn, calls } = scriptedChat([{ ...endRes('빈 호출'), stopReason: 'tool_calls' }])
    const result = await runAgent({ ...BASE, chat: fn, tools: [echoTool] })
    expect(calls).toHaveLength(1)
    expect(result.stopped).toBe('end')
  })

  it('MAX_STEPS에 도달하면 stopped=max_steps로 멈춘다 (무한루프 방지)', async () => {
    // 각본이 영원히 도구 호출만 반환 → 상한에서 끊겨야 함
    const { fn, calls } = scriptedChat([
      toolRes([{ id: 'c1', name: 'echo', args: { msg: 'x' } }]),
    ])
    const result = await runAgent({ ...BASE, chat: fn, tools: [echoTool], maxSteps: 3 })

    expect(calls).toHaveLength(3)
    expect(result.stopped).toBe('max_steps')
    expect(result.steps).toBe(3)
  })

  it('maxSteps 기본값은 DEFAULT_MAX_STEPS', async () => {
    const { fn, calls } = scriptedChat([
      toolRes([{ id: 'c1', name: 'echo', args: { msg: 'x' } }]),
    ])
    await runAgent({ ...BASE, chat: fn, tools: [echoTool] })
    expect(calls).toHaveLength(DEFAULT_MAX_STEPS)
  })
})

describe('runAgent — 도구 실행 왕복', () => {
  it('도구 호출 → 실행 → 결과 주입 → 재호출 → 종료 (핵심 왕복)', async () => {
    const { fn, calls } = scriptedChat([
      toolRes([{ id: 'c1', name: 'echo', args: { msg: '안녕' } }], '확인해볼게요'),
      endRes('echo 결과는 안녕'),
    ])
    const result = await runAgent({ ...BASE, chat: fn, tools: [echoTool] })

    expect(result).toMatchObject({ text: 'echo 결과는 안녕', steps: 2, stopped: 'end' })
    // 토큰은 두 스텝 합산
    expect(result.usage).toEqual({ inputTokens: 20, outputTokens: 10 })

    // 2차 호출에 도구 호출 턴 + 결과 턴이 들어갔는지
    expect(calls[1].messages).toEqual([
      { role: 'user', content: '안녕' },
      { role: 'assistant', content: '확인해볼게요', toolCalls: [{ id: 'c1', name: 'echo', args: { msg: '안녕' } }] },
      { role: 'tool', results: [{ toolCallId: 'c1', name: 'echo', result: { echoed: '안녕' } }] },
    ])
  })

  it('한 턴에 여러 도구 호출이 오면 전부 순서대로 실행해 한 tool 턴으로 주입한다', async () => {
    const { fn, calls } = scriptedChat([
      toolRes([
        { id: 'c1', name: 'echo', args: { msg: '하나' } },
        { id: 'c2', name: 'echo', args: { msg: '둘' } },
      ]),
      endRes('둘 다 완료'),
    ])
    await runAgent({ ...BASE, chat: fn, tools: [echoTool] })

    const toolTurn = calls[1].messages.at(-1)
    expect(toolTurn).toEqual({
      role: 'tool',
      results: [
        { toolCallId: 'c1', name: 'echo', result: { echoed: '하나' } },
        { toolCallId: 'c2', name: 'echo', result: { echoed: '둘' } },
      ],
    })
  })

  it('등록되지 않은 도구 호출은 { error }로 되돌아가고 루프는 계속된다', async () => {
    const { fn, calls } = scriptedChat([
      toolRes([{ id: 'c1', name: '없는도구', args: {} }]),
      endRes('복구했어요'),
    ])
    const events: AgentEvent[] = []
    const result = await runAgent({ ...BASE, chat: fn, tools: [echoTool], onEvent: e => events.push(e) })

    expect(result.stopped).toBe('end')
    const toolTurn = calls[1].messages.at(-1)
    expect(toolTurn).toMatchObject({
      role: 'tool',
      results: [{ toolCallId: 'c1', result: { error: expect.stringContaining('없는도구') } }],
    })
    expect(events.find(e => e.type === 'tool:done')).toMatchObject({ isError: true })
  })

  it('도구 execute가 throw해도 { error }로 되돌아가고 루프는 죽지 않는다', async () => {
    const { fn, calls } = scriptedChat([
      toolRes([{ id: 'c1', name: 'boom', args: {} }]),
      endRes('오류 확인 후 답변'),
    ])
    const result = await runAgent({ ...BASE, chat: fn, tools: [throwTool] })

    expect(result).toMatchObject({ text: '오류 확인 후 답변', stopped: 'end' })
    const toolTurn = calls[1].messages.at(-1)
    expect(toolTurn).toMatchObject({
      role: 'tool',
      results: [{ toolCallId: 'c1', result: { error: '도구 내부 오류' } }],
    })
  })
})

describe('runAgent — 부수 규약', () => {
  it('원본 messages 배열은 변형하지 않는다', async () => {
    const original = [{ role: 'user' as const, content: '안녕' }]
    const { fn } = scriptedChat([
      toolRes([{ id: 'c1', name: 'echo', args: { msg: 'x' } }]),
      endRes('끝'),
    ])
    await runAgent({ ...BASE, messages: original, chat: fn, tools: [echoTool] })
    expect(original).toEqual([{ role: 'user', content: '안녕' }])
  })

  it('tools 미지정이면 요청에 tools를 싣지 않는다 (1층 텍스트 대화와 동일 경로)', async () => {
    const { fn, calls } = scriptedChat([endRes('답')])
    await runAgent({ ...BASE, chat: fn })
    expect(calls[0].tools).toBeUndefined()
  })

  it('이벤트가 step → tool:start → tool:done → step 순으로 흐른다', async () => {
    const { fn } = scriptedChat([
      toolRes([{ id: 'c1', name: 'echo', args: { msg: 'x' } }]),
      endRes('끝'),
    ])
    const events: AgentEvent[] = []
    await runAgent({ ...BASE, chat: fn, tools: [echoTool], onEvent: e => events.push(e) })

    expect(events.map(e => e.type)).toEqual(['step', 'tool:start', 'tool:done', 'step'])
    expect(events[0]).toMatchObject({ step: 1, maxSteps: DEFAULT_MAX_STEPS })
    expect(events[3]).toMatchObject({ step: 2 })
  })

  it('이미 중단된 signal이면 chat을 부르지 않고 AbortError를 던진다', async () => {
    const controller = new AbortController()
    controller.abort()
    const { fn, calls } = scriptedChat([endRes('안 와야 함')])

    await expect(
      runAgent({ ...BASE, chat: fn, signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(calls).toHaveLength(0)
  })

  it('도구 실행 도중 abort되면 다음 도구를 실행하지 않고 중단한다', async () => {
    const controller = new AbortController()
    const abortingTool: AgentTool = {
      def: { name: 'aborter', description: '실행 중 사용자 취소 발생', parameters: { type: 'object', properties: {} } },
      execute: async () => {
        controller.abort()
        return { ok: true }
      },
    }
    const { fn } = scriptedChat([
      toolRes([
        { id: 'c1', name: 'aborter', args: {} },
        { id: 'c2', name: 'echo', args: { msg: '실행되면 안 됨' } },
      ]),
    ])
    let echoRan = false
    const spyEcho: AgentTool = {
      ...echoTool,
      execute: async args => {
        echoRan = true
        return echoTool.execute(args, {})
      },
    }

    await expect(
      runAgent({ ...BASE, chat: fn, tools: [abortingTool, spyEcho], signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(echoRan).toBe(false)
  })

  it('employeeId가 도구 ctx로 전달된다 (Phase 3 위임 검증의 통로)', async () => {
    let seenId: string | undefined
    const ctxTool: AgentTool = {
      def: { name: 'whoami', description: 'ctx 확인', parameters: { type: 'object', properties: {} } },
      execute: async (_args, ctx) => {
        seenId = ctx.employeeId
        return { ok: true }
      },
    }
    const { fn } = scriptedChat([
      toolRes([{ id: 'c1', name: 'whoami', args: {} }]),
      endRes('끝'),
    ])
    await runAgent({ ...BASE, chat: fn, tools: [ctxTool], employeeId: 'emp-42' })
    expect(seenId).toBe('emp-42')
  })
})

// ───── get_current_time 도구 ─────

describe('getCurrentTimeTool', () => {
  it('현재 시각을 now/iso/timezone으로 반환한다', async () => {
    const before = Date.now()
    const result = (await getCurrentTimeTool.execute({}, {})) as {
      now: string
      iso: string
      timezone: string
    }
    expect(result.now.length).toBeGreaterThan(0)
    expect(Math.abs(new Date(result.iso).getTime() - before)).toBeLessThan(5_000)
    expect(result.timezone.length).toBeGreaterThan(0)
  })

  it('timezone 인자를 반영한다', async () => {
    const result = (await getCurrentTimeTool.execute({ timezone: 'Asia/Seoul' }, {})) as {
      timezone: string
    }
    expect(result.timezone).toBe('Asia/Seoul')
  })

  it('잘못된 timezone이면 throw → 루프가 { error }로 감싸 모델에 되돌린다', async () => {
    await expect(getCurrentTimeTool.execute({ timezone: '이상한값' }, {})).rejects.toThrow()
  })
})
