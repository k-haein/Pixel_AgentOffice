/**
 * Phase 1 (tool-calling 인프라) 검증 — 더미 도구 get_current_time으로 실제 왕복 확인.
 *
 * 흐름 (핸드오프 §7 Phase 1의 ✅ 기준):
 *   1차 호출: 모델이 도구 호출을 반환하는지 (stopReason === 'tool_calls')
 *   2차 호출: 도구 결과(role:'tool')를 먹이면 그걸 반영한 최종 텍스트가 오는지
 *
 * provider는 electron을 import하지 않으므로 (§8) vitest에서 직접 실행 가능.
 * .env.local의 GEMINI_API_KEY 실키가 없으면 자동 skip.
 */

import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { geminiProvider } from '../../electron/llm/gemini'
import type { ChatRequest, ToolDef } from '../../electron/llm/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.join(__dirname, '..', '..', '.env.local') })

const key = process.env.GEMINI_API_KEY
// 실키가 아닌 placeholder(예: "AIza...")로 실행되지 않게 길이로 거른다
const hasRealKey = !!key && key.length >= 30

const TOOLS: ToolDef[] = [
  {
    name: 'get_current_time',
    description: '현재 시각을 반환한다. 사용자가 시간을 물으면 반드시 이 도구를 사용할 것.',
    parameters: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: 'IANA 타임존 (예: Asia/Seoul). 생략 시 로컬.' },
      },
    },
  },
]

const BASE: Omit<ChatRequest, 'messages'> = {
  model: 'gemini-2-5-flash',
  systemPrompt: '너는 사무실 직원이다. 시간 질문에는 반드시 get_current_time 도구를 호출해 확인한 뒤 답한다.',
  tools: TOOLS,
}

describe.skipIf(!hasRealKey)('tool-calling 왕복 (Gemini 실키 통합)', () => {
  it('1차: 모델이 get_current_time 도구 호출을 반환한다', { timeout: 60_000 }, async () => {
    const first = await geminiProvider.chat(
      { ...BASE, messages: [{ role: 'user', content: '지금 몇 시야? 도구로 확인해서 알려줘.' }] },
      key!,
    )
    console.log('1차 응답:', JSON.stringify({ stopReason: first.stopReason, toolCalls: first.toolCalls }))
    expect(first.stopReason).toBe('tool_calls')
    expect(first.toolCalls).toBeDefined()
    expect(first.toolCalls![0].name).toBe('get_current_time')
    expect(first.toolCalls![0].id).toBeTruthy()
  })

  it('2차: 도구 결과를 먹이면 그 값을 반영한 최종 답변이 온다', { timeout: 60_000 }, async () => {
    const question = { role: 'user' as const, content: '지금 몇 시야? 도구로 확인해서 알려줘.' }

    const first = await geminiProvider.chat({ ...BASE, messages: [question] }, key!)
    expect(first.stopReason).toBe('tool_calls')
    const call = first.toolCalls![0]

    // 도구 "실행" — Phase 2 루프가 할 일을 여기선 수동으로 (더미 결과 주입)
    const fakeTime = '2026-07-03 오후 3시 30분 (Asia/Seoul)'
    const second = await geminiProvider.chat(
      {
        ...BASE,
        messages: [
          question,
          { role: 'assistant', content: first.text, toolCalls: first.toolCalls },
          { role: 'tool', results: [{ toolCallId: call.id, name: call.name, result: { now: fakeTime } }] },
        ],
      },
      key!,
    )
    console.log('2차 응답:', JSON.stringify({ stopReason: second.stopReason, text: second.text }))
    expect(second.stopReason).toBe('end')
    expect(second.text.length).toBeGreaterThan(0)
    // 주입한 더미 시각(3시 30분)이 답변에 반영됐는지 — 모델이 결과를 실제로 읽었다는 증거
    expect(second.text).toMatch(/3\s*시|15\s*:?\s*30|3:30/)
    // 토큰 사용량도 정상 보고되는지 (비용 카운터의 입력값)
    expect(second.usage.inputTokens).toBeGreaterThan(0)
    expect(second.usage.outputTokens).toBeGreaterThan(0)
  })
})
