/**
 * Phase 3 (위임 협업) 검증 — 실키로 "팀장 → 팀원 위임 → 종합 보고" 전체가 도는지 확인.
 *
 * 핸드오프 §3의 5개 원리 중 1(대화 트리)·2(루프)·3(위임 도구)·4(재위임 방지)를 실키로 관통:
 * 팀장이 delegate_to_member를 호출하면 팀원 페르소나의 자식 루프가 실제로 돌고,
 * 그 보고가 팀장의 최종 답변에 반영된다.
 *
 * chat은 geminiProvider 직접 주입 (dispatch는 electron/store 의존이라 vitest 불가 — §8).
 * .env.local의 GEMINI_API_KEY 실키가 없으면 자동 skip.
 */

import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { geminiProvider } from '../../electron/llm/gemini'
import { runTeamTask, type TeamEvent } from '../../electron/agent/team'
import type { ChatFn } from '../../electron/agent/loop'
import type { Employee } from '../../src/shared/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.join(__dirname, '..', '..', '.env.local') })

const key = process.env.GEMINI_API_KEY
// 실키가 아닌 placeholder(예: "AIza...")로 실행되지 않게 길이로 거른다
const hasRealKey = !!key && key.length >= 30

const chatViaGemini: ChatFn = (req, signal, onDelta) =>
  geminiProvider.chat(req, key!, signal, onDelta)

function makeEmp(
  over: Partial<Employee> & Pick<Employee, 'id' | 'name' | 'role' | 'rank' | 'seatId'>,
): Employee {
  return {
    template: 'custom',
    emoji: '🤖',
    baseInstructions: '당신은 사무실 직원입니다. 맡은 작업을 짧고 정확하게 처리합니다.',
    customInstructions: '',
    model: 'gemini-2-5-flash',
    memoryModel: 'gemini-2-5-flash',
    memoryMode: 'manual',
    promotionMode: 'off',
    hiredAt: '2026-07-07',
    deskOrientation: 'front',
    totalMessages: 0,
    totalMemoryUpdates: 0,
    totalPraises: 0,
    ...over,
  }
}

const 메리 = makeEmp({ id: 'lead-1', name: '메리', role: '편집자', rank: '과장', seatId: 'leader:A' })
const 하월 = makeEmp({ id: 'mem-1', name: '하월', role: '작가', rank: '사원', seatId: 'member:A:0' })

describe.skipIf(!hasRealKey)('팀 위임 협업 왕복 (Gemini 실키 통합)', () => {
  it('팀장이 팀원에게 실제로 위임하고 보고를 종합해 답한다', { timeout: 180_000 }, async () => {
    const events: TeamEvent[] = []
    const result = await runTeamTask({
      chat: chatViaGemini,
      leaderId: 'lead-1',
      task:
        '하월(mem-1)에게 delegate_to_member 도구로 위임해서 "바다가 파랗게 보이는 이유"를 한 문장으로 보고받으세요. 반드시 위임 도구를 사용한 뒤, 그 보고를 인용해 최종 보고해주세요.',
      employees: [메리, 하월],
      onEvent: e => events.push(e),
    })
    console.log(
      '팀 실행 결과:',
      JSON.stringify({
        steps: result.steps,
        stopped: result.stopped,
        delegations: result.delegations,
        text: result.text,
        usage: result.usage,
      }),
    )

    // 위임이 실제로 성사됐는지
    expect(result.delegations).toBeGreaterThanOrEqual(1)
    expect(result.stopped).toBe('end')
    expect(result.steps).toBeGreaterThanOrEqual(2)
    expect(result.text.length).toBeGreaterThan(0)

    // 이벤트 흐름 — 위임 시작/완료 + 팀원 루프 진행
    const start = events.find(e => e.type === 'delegation:start')
    const done = events.find(e => e.type === 'delegation:done')
    expect(start).toMatchObject({ memberId: 'mem-1', memberName: '하월' })
    expect(done).toMatchObject({ memberId: 'mem-1', isError: false })
    expect(events.some(e => e.type === 'member')).toBe(true)

    // 팀원 보고가 비어있지 않고, 토큰 합산(팀장+팀원 전체)이 보고됨
    if (done?.type === 'delegation:done') {
      expect(done.report.length).toBeGreaterThan(0)
    }
    expect(result.usage.inputTokens).toBeGreaterThan(0)
    expect(result.usage.outputTokens).toBeGreaterThan(0)
  })
})
