/**
 * Phase 3 위임 협업 유닛 테스트 — LLM 없이 각본 ChatFn으로 팀 러너·위임 도구 검증.
 *
 * 검증 항목 (핸드오프 §4 갭3 + §7 Phase 3 기준):
 *  - resolveTeam: 팀장 검증(존재·리더 자리·직급) + 같은 팀 팀원만 수집
 *  - 팀장 시스템 프롬프트에 팀원 목록(id·이름) 주입 + delegate_to_member 등록
 *  - 위임 왕복: 팀장 도구 호출 → 팀원 자식 루프 → 보고가 팀장 tool 턴으로 주입 → 최종 보고
 *  - 재위임 방지: 팀원 자식 루프 tools에 delegate_to_member 없음
 *  - 잘못된 memberId → { error }로 팀장 모델에 되돌아가 정정 기회
 */

import { describe, it, expect } from 'vitest'
import { runTeamTask, resolveTeam, type TeamEvent } from '../../electron/agent/team'
import { DELEGATE_TOOL_NAME } from '../../electron/agent/tools/delegate'
import { buildAgentPersona } from '../../electron/agent/persona'
import type { AgentTool, ChatFn } from '../../electron/agent/loop'
import type { ChatRequest, ChatResponse, ToolCall } from '../../electron/llm/types'
import type { Employee } from '../../src/shared/types'

// ───── 픽스처 ─────

const LEADER_MODEL = 'gemini-2-5-flash' as const
const MEMBER_MODEL = 'gpt-5-mini' as const

function makeEmp(
  over: Partial<Employee> & Pick<Employee, 'id' | 'name' | 'rank' | 'seatId' | 'model'>,
): Employee {
  return {
    template: 'custom',
    role: '직원',
    emoji: '🤖',
    baseInstructions: '테스트 직원입니다.',
    customInstructions: '',
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

const 메리 = makeEmp({
  id: 'lead-1', name: '메리', role: '편집자', rank: '과장',
  seatId: 'leader:A', model: LEADER_MODEL, mbti: 'ISTJ',
})
const 하월 = makeEmp({
  id: 'mem-1', name: '하월', role: '작가', rank: '사원',
  seatId: 'member:A:0', model: MEMBER_MODEL,
})
const 코디 = makeEmp({
  id: 'mem-2', name: '코디', role: '개발자', rank: '사원',
  seatId: 'member:A:1', model: MEMBER_MODEL,
})
const 타팀원 = makeEmp({
  id: 'other-1', name: '타팀', rank: '사원',
  seatId: 'member:B:0', model: MEMBER_MODEL,
})
const 무자격팀장 = makeEmp({
  id: 'lead-low', name: '신입', rank: '사원',
  seatId: 'leader:C', model: LEADER_MODEL,
})

const TEAM = [메리, 하월, 코디, 타팀원, 무자격팀장]

// ───── 각본 ChatFn — 모델로 팀장/팀원 호출 구분 ─────

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
const delegateCall = (id: string, memberId: string, task: string): ToolCall => ({
  id,
  name: DELEGATE_TOOL_NAME,
  args: { memberId, task },
})

function teamChat(script: { leader: ChatResponse[]; member: ChatResponse[] }) {
  const leaderCalls: ChatRequest[] = []
  const memberCalls: ChatRequest[] = []
  const fn: ChatFn = async req => {
    if (req.model === LEADER_MODEL) {
      leaderCalls.push(structuredClone(req))
      return script.leader[Math.min(leaderCalls.length - 1, script.leader.length - 1)]
    }
    memberCalls.push(structuredClone(req))
    return script.member[Math.min(memberCalls.length - 1, script.member.length - 1)]
  }
  return { fn, leaderCalls, memberCalls }
}

// ───── resolveTeam — 팀 구성 검증 ─────

describe('resolveTeam', () => {
  it('팀장 + 같은 팀 팀원만 수집한다 (타팀·본인 제외)', () => {
    const { leader, team, members } = resolveTeam(TEAM, 'lead-1')
    expect(leader.id).toBe('lead-1')
    expect(team).toBe('A')
    expect(members.map(m => m.id)).toEqual(['mem-1', 'mem-2'])
  })

  it('없는 직원 id면 throw', () => {
    expect(() => resolveTeam(TEAM, 'ghost')).toThrow('찾을 수 없습니다')
  })

  it('리더 자리가 아닌 직원이면 throw', () => {
    expect(() => resolveTeam(TEAM, 'mem-1')).toThrow('팀장 자리')
  })

  it('리더 자리여도 직급 미달(과장 미만)이면 throw', () => {
    expect(() => resolveTeam(TEAM, 'lead-low')).toThrow('과장 이상')
  })

  it('팀원이 없는 팀이면 throw', () => {
    const 외톨이팀장 = makeEmp({
      id: 'lead-c', name: '외톨이', rank: '부장', seatId: 'leader:C', model: LEADER_MODEL,
    })
    expect(() => resolveTeam([외톨이팀장], 'lead-c')).toThrow('팀원이 없습니다')
  })
})

// ───── runTeamTask — 위임 왕복 ─────

describe('runTeamTask', () => {
  it('팀장 프롬프트에 팀원 명단이 주입되고 delegate_to_member가 등록된다', async () => {
    const { fn, leaderCalls } = teamChat({ leader: [endRes('직접 답변')], member: [] })
    const result = await runTeamTask({ chat: fn, leaderId: 'lead-1', task: '간단 질문', employees: TEAM })

    expect(result).toMatchObject({ text: '직접 답변', team: 'A', leaderId: 'lead-1', delegations: 0 })
    const req = leaderCalls[0]
    // 명단 주입 (omo dynamic-agent-prompt-builder 원리)
    expect(req.systemPrompt).toContain('팀 협업 모드')
    expect(req.systemPrompt).toContain('mem-1')
    expect(req.systemPrompt).toContain('하월')
    expect(req.systemPrompt).toContain('mem-2')
    // 팀장 페르소나도 포함
    expect(req.systemPrompt).toContain('메리')
    // 위임 도구 등록
    expect(req.tools?.map(t => t.name)).toContain(DELEGATE_TOOL_NAME)
    expect(req.messages).toEqual([{ role: 'user', content: '간단 질문' }])
  })

  it('위임 왕복: 팀장 도구 호출 → 팀원 자식 루프 → 보고 주입 → 최종 보고', async () => {
    const { fn, leaderCalls, memberCalls } = teamChat({
      leader: [
        toolRes([delegateCall('c1', 'mem-1', '문장을 다듬어 보고해줘')], '하월에게 맡길게요'),
        endRes('사장님, 최종 보고입니다'),
      ],
      member: [endRes('하월의 보고: 다듬었습니다')],
    })
    const events: TeamEvent[] = []
    const result = await runTeamTask({
      chat: fn, leaderId: 'lead-1', task: '이 문서 다듬어줘', employees: TEAM,
      onEvent: e => events.push(e),
    })

    // 팀원 자식 루프 — 페르소나 + 팀 맥락 + 지시문만
    expect(memberCalls).toHaveLength(1)
    expect(memberCalls[0].systemPrompt).toContain('하월')
    expect(memberCalls[0].systemPrompt).toContain('팀 작업 맥락')
    expect(memberCalls[0].systemPrompt).toContain('메리') // 누가 시켰는지
    expect(memberCalls[0].messages).toEqual([{ role: 'user', content: '문장을 다듬어 보고해줘' }])
    // ★ 재위임 방지 — 팀원 루프엔 위임 도구가 없다
    expect(memberCalls[0].tools).toBeUndefined()

    // 팀장 2차 호출에 팀원 보고가 tool 결과로 주입
    const toolTurn = leaderCalls[1].messages.at(-1)
    expect(JSON.stringify(toolTurn)).toContain('하월의 보고: 다듬었습니다')

    // 최종 결과 + 위임 카운트 + 토큰 합산 (팀장 2회 + 팀원 1회 = 30/15)
    expect(result).toMatchObject({ text: '사장님, 최종 보고입니다', delegations: 1, steps: 2 })
    expect(result.usage).toEqual({ inputTokens: 30, outputTokens: 15 })

    // 이벤트 순서 — 위임 시작 → 팀원 진행 → 위임 완료
    const types = events.map(e => e.type)
    const start = types.indexOf('delegation:start')
    const memberStep = types.indexOf('member')
    const done = types.indexOf('delegation:done')
    expect(start).toBeGreaterThan(-1)
    expect(memberStep).toBeGreaterThan(start)
    expect(done).toBeGreaterThan(memberStep)
    const doneEv = events.find(e => e.type === 'delegation:done')
    expect(doneEv).toMatchObject({ memberName: '하월', report: '하월의 보고: 다듬었습니다', isError: false })
  })

  it('memberTools는 팀원에게 전달되지만 위임 도구는 끼어들지 않는다', async () => {
    const extraTool: AgentTool = {
      def: { name: 'extra', description: '추가 도구', parameters: { type: 'object', properties: {} } },
      execute: async () => ({ ok: true }),
    }
    const { fn, memberCalls } = teamChat({
      leader: [toolRes([delegateCall('c1', 'mem-1', '작업')]), endRes('끝')],
      member: [endRes('보고')],
    })
    await runTeamTask({
      chat: fn, leaderId: 'lead-1', task: '작업', employees: TEAM, memberTools: [extraTool],
    })
    const names = memberCalls[0].tools?.map(t => t.name)
    expect(names).toContain('extra')
    expect(names).not.toContain(DELEGATE_TOOL_NAME)
  })

  it('잘못된 memberId는 { error }로 팀장에게 되돌아가 정정 기회를 준다', async () => {
    const { fn, leaderCalls, memberCalls } = teamChat({
      leader: [
        toolRes([delegateCall('c1', 'ghost', '작업')]),
        endRes('정정하겠습니다'),
      ],
      member: [],
    })
    const events: TeamEvent[] = []
    const result = await runTeamTask({
      chat: fn, leaderId: 'lead-1', task: '작업', employees: TEAM, onEvent: e => events.push(e),
    })

    expect(memberCalls).toHaveLength(0) // 팀원 루프는 돌지 않음
    const toolTurn = JSON.stringify(leaderCalls[1].messages.at(-1))
    expect(toolTurn).toContain('찾을 수 없습니다')
    expect(toolTurn).toContain('mem-1') // 가능한 팀원 명단 포함 (정정 힌트)
    expect(result.delegations).toBe(0)
    // 존재 검증 실패는 delegation:start 전에 throw — 시작 이벤트 없음
    expect(events.some(e => e.type === 'delegation:start')).toBe(false)
  })

  it('한 턴에 두 팀원 위임 → 순차 실행 후 결과 2건이 한 tool 턴으로 주입', async () => {
    const { fn, leaderCalls, memberCalls } = teamChat({
      leader: [
        toolRes([
          delegateCall('c1', 'mem-1', '글 작성'),
          delegateCall('c2', 'mem-2', '코드 검토'),
        ]),
        endRes('종합 보고'),
      ],
      member: [endRes('하월 보고'), endRes('코디 보고')],
    })
    const events: TeamEvent[] = []
    const result = await runTeamTask({
      chat: fn, leaderId: 'lead-1', task: '분업 작업', employees: TEAM, onEvent: e => events.push(e),
    })

    expect(memberCalls).toHaveLength(2)
    expect(result.delegations).toBe(2)
    const toolTurn = leaderCalls[1].messages.at(-1)
    expect(toolTurn?.role).toBe('tool')
    const asJson = JSON.stringify(toolTurn)
    expect(asJson).toContain('하월 보고')
    expect(asJson).toContain('코디 보고')
    // 위임 이벤트가 mem-1 → mem-2 순서로 2쌍
    const starts = events.filter(e => e.type === 'delegation:start')
    expect(starts.map(e => e.memberId)).toEqual(['mem-1', 'mem-2'])
  })
})

// ───── buildAgentPersona ─────

describe('buildAgentPersona', () => {
  it('정체성·지침·MBTI를 포함하고 1층 전용(감정 태그) 섹션은 없다', () => {
    const prompt = buildAgentPersona(메리)
    expect(prompt).toContain('메리')
    expect(prompt).toContain('편집자')
    expect(prompt).toContain('과장')
    expect(prompt).toContain('테스트 직원입니다.')
    expect(prompt).toContain('ISTJ')
    expect(prompt).not.toContain('[emotion:')
  })

  it('mbti 없으면 MBTI 섹션 생략', () => {
    const prompt = buildAgentPersona(하월)
    expect(prompt).not.toContain('MBTI 페르소나')
  })
})
