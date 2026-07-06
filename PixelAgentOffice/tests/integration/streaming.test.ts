/**
 * 1층 폴리시 — 토큰 스트리밍 통합 테스트 (Gemini 실키).
 *
 * provider.chat에 onDelta를 주면 조각이 실시간으로 오고,
 * 조각을 전부 이어붙이면 최종 반환 텍스트와 정확히 같아야 한다
 * (스트림과 완성본이 갈라지면 UI가 마지막에 "텍스트가 바뀌는" 깜빡임 발생).
 *
 * .env.local의 GEMINI_API_KEY 실키가 없으면 자동 skip.
 */

import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { geminiProvider } from '../../electron/llm/gemini'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.join(__dirname, '..', '..', '.env.local') })

const key = process.env.GEMINI_API_KEY
const hasRealKey = !!key && key.length >= 30

describe.skipIf(!hasRealKey)('채팅 토큰 스트리밍 (Gemini 실키 통합)', () => {
  it('onDelta 조각의 합 === 최종 텍스트, usage도 정상', { timeout: 60_000 }, async () => {
    const deltas: string[] = []
    const response = await geminiProvider.chat(
      {
        model: 'gemini-2-5-flash',
        systemPrompt: '두 문장으로 답하세요.',
        messages: [{ role: 'user', content: '바다가 파랗게 보이는 이유를 알려줘.' }],
      },
      key!,
      undefined,
      delta => deltas.push(delta),
    )
    console.log(`스트리밍 조각 ${deltas.length}개, 최종 ${response.text.length}자`)
    expect(deltas.length).toBeGreaterThan(0)
    expect(deltas.join('')).toBe(response.text)
    expect(response.stopReason).toBe('end')
    expect(response.usage.inputTokens).toBeGreaterThan(0)
    expect(response.usage.outputTokens).toBeGreaterThan(0)
  })

  it('onDelta 없으면 기존 비스트리밍 경로 그대로 (회귀 확인)', { timeout: 60_000 }, async () => {
    const response = await geminiProvider.chat(
      {
        model: 'gemini-2-5-flash',
        systemPrompt: '한 문장으로만 답하세요.',
        messages: [{ role: 'user', content: '안녕이라고만 답해줘.' }],
      },
      key!,
    )
    expect(response.text.length).toBeGreaterThan(0)
    expect(response.stopReason).toBe('end')
  })
})
