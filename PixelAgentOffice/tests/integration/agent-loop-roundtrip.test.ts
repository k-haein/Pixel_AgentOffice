/**
 * Phase 2 (에이전트 루프) 검증 — 실키로 "루프 전체"가 자동으로 도는지 확인.
 *
 * Phase 1 테스트(toolcall-roundtrip)는 도구 결과를 수동으로 주입했지만,
 * 여기서는 runAgent가 스스로 `호출 → get_current_time 실행 → 결과 주입 → 최종 답변`을
 * 왕복한다. 핸드오프 §7 Phase 2의 ✅ 기준: "단일 직원 + 도구 1~2개로 루프 동작 확인".
 *
 * chat은 geminiProvider를 직접 주입 (dispatch는 electron/store 의존이라 vitest 불가 — §8).
 * .env.local의 GEMINI_API_KEY 실키가 없으면 자동 skip.
 */

import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { geminiProvider } from '../../electron/llm/gemini'
import { runAgent, type AgentEvent, type ChatFn } from '../../electron/agent/loop'
import { getCurrentTimeTool } from '../../electron/agent/tools/time'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.join(__dirname, '..', '..', '.env.local') })

const key = process.env.GEMINI_API_KEY
// 실키가 아닌 placeholder(예: "AIza...")로 실행되지 않게 길이로 거른다
const hasRealKey = !!key && key.length >= 30

const chatViaGemini: ChatFn = (req, signal, onDelta) =>
  geminiProvider.chat(req, key!, signal, onDelta)

describe.skipIf(!hasRealKey)('에이전트 루프 왕복 (Gemini 실키 통합)', () => {
  it('시간 질문 → 루프가 도구를 스스로 실행하고 결과를 반영해 답한다', { timeout: 120_000 }, async () => {
    const events: AgentEvent[] = []
    const result = await runAgent({
      chat: chatViaGemini,
      model: 'gemini-2-5-flash',
      systemPrompt:
        '너는 사무실 직원이다. 시간 질문에는 반드시 get_current_time 도구를 호출해 확인한 뒤 답한다.',
      messages: [{ role: 'user', content: '지금 몇 시야? 도구로 확인해서 알려줘.' }],
      tools: [getCurrentTimeTool],
      onEvent: e => events.push(e),
    })
    console.log(
      '루프 결과:',
      JSON.stringify({ steps: result.steps, stopped: result.stopped, text: result.text, usage: result.usage }),
    )

    // 루프가 실제로 2스텝 이상 돌았고 (도구 왕복), 정상 종료했는지
    expect(result.stopped).toBe('end')
    expect(result.steps).toBeGreaterThanOrEqual(2)
    expect(result.text.length).toBeGreaterThan(0)

    // 도구가 오류 없이 실제 실행됐는지
    const done = events.filter((e): e is Extract<AgentEvent, { type: 'tool:done' }> => e.type === 'tool:done')
    expect(done.length).toBeGreaterThanOrEqual(1)
    expect(done[0].call.name).toBe('get_current_time')
    expect(done[0].isError).toBe(false)

    // 토큰 합산이 전 스텝 누적인지 (비용 카운터의 입력값)
    expect(result.usage.inputTokens).toBeGreaterThan(0)
    expect(result.usage.outputTokens).toBeGreaterThan(0)

    // 완결 기록에 도구 턴이 남았는지
    expect(result.messages.some(m => m.role === 'tool')).toBe(true)
  })
})
