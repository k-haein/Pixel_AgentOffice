/**
 * 2층 팀 협업 진입점 (Phase 3, 핸드오프 §4 갭3) — "팀장에게 일을 시키면
 * 팀장이 같은 팀 팀원들에게 실제로 위임하고 결과를 모아 보고한다".
 *
 * - 팀장 검증: 리더 자리(leader:A/B/C) + 과장 이상 (기존 canBeTeamLeader 재사용)
 * - 팀원 = 같은 팀 member 자리에 앉은 직원들 — 기존 좌석 시스템이 곧 조직도
 * - 팀장 시스템 프롬프트에 팀원 목록(id·이름·역할·직급·MBTI)을 주입해 AI가 위임 대상을 고른다
 * - 팀장 루프에만 delegate_to_member 등록. 팀원 자식 루프엔 제외 (재위임 방지)
 *
 * chat은 주입식 — 프로덕션(main.ts IPC)은 dispatch.chat을 넘겨 rate/일일 한도 자동 적용 (§8).
 * 이 파일은 electron을 import하지 않는다 (§8).
 */

import { runAgent, type AgentRunResult, type AgentTool, type ChatFn } from './loop'
import { makeDelegateTool, DELEGATE_TOOL_NAME, type TeamEvent } from './tools/delegate'
import { buildAgentPersona } from './persona'
import { SEAT_LOOKUP } from '../../src/shared/seats'
import { canBeTeamLeader, type Employee, type TeamId } from '../../src/shared/types'

export type { TeamEvent }

export type RunTeamTaskOptions = {
  chat: ChatFn
  /** 작업을 지시받는 팀장 직원 id */
  leaderId: string
  /** 사장(사용자)이 팀장에게 내리는 작업 지시 */
  task: string
  /** 전체 직원 목록 — 팀장·같은 팀 팀원을 여기서 찾는다 (호출부가 store에서 로드해 전달) */
  employees: Employee[]
  /** 팀장 루프 상한 (기본 DEFAULT_MAX_STEPS) */
  maxSteps?: number
  /** 팀원 자식 루프 상한 */
  memberMaxSteps?: number
  /** 팀원 루프에 쥐여줄 도구 (위임 도구는 구조적으로 제외됨) */
  memberTools?: AgentTool[]
  /** 팀장 루프에 위임 도구 외에 추가할 도구 */
  leaderTools?: AgentTool[]
  signal?: AbortSignal
  onEvent?: (ev: TeamEvent) => void
  /** 팀장 텍스트 스트리밍 (모든 스텝 관통 — 경계는 onEvent 'leader'로 구분) */
  onDelta?: (delta: string) => void
}

export type TeamRunResult = AgentRunResult & {
  leaderId: string
  team: TeamId
  /** 이번 실행에서 성사된 위임 횟수 (오류로 끝난 위임 제외) */
  delegations: number
  // usage는 팀장 루프 + 모든 팀원 자식 루프의 합산 (2층 총 소비량 정직 보고)
}

/** 팀장 검증 + 같은 팀 팀원 수집. 잘못된 요청(모델 아님 — 호출부 실수)은 즉시 throw */
export function resolveTeam(
  employees: Employee[],
  leaderId: string,
): { leader: Employee; team: TeamId; members: Employee[] } {
  const leader = employees.find(e => e.id === leaderId)
  if (!leader) {
    throw new Error(`직원 id "${leaderId}"를 찾을 수 없습니다.`)
  }
  const seat = leader.seatId ? SEAT_LOOKUP[leader.seatId] : null
  if (!seat || seat.role !== 'leader' || !seat.team) {
    throw new Error(
      `${leader.name}은(는) 팀장 자리에 앉아있지 않습니다. 팀 작업은 리더 자리(팀 A/B/C) 직원에게만 시킬 수 있습니다.`,
    )
  }
  if (!canBeTeamLeader(leader.rank)) {
    throw new Error(`${leader.name}(${leader.rank})은(는) 팀장 자격(과장 이상)이 아닙니다.`)
  }
  const team = seat.team
  const members = employees.filter(e => {
    if (e.id === leader.id || !e.seatId) return false
    const s = SEAT_LOOKUP[e.seatId]
    return s?.team === team && s.role === 'member'
  })
  if (members.length === 0) {
    throw new Error(`팀 ${team}에 팀원이 없습니다. 팀원을 먼저 채용/배치해주세요.`)
  }
  return { leader, team, members }
}

/** 팀장 페르소나 + 팀 협업 모드 지침 + 팀원 명단 주입 (omo dynamic-agent-prompt-builder 원리) */
function buildLeaderSystemPrompt(leader: Employee, team: TeamId, members: Employee[]): string {
  const roster = members
    .map(
      m =>
        `- id: ${m.id} | 이름: ${m.name} | 역할: ${m.role} | 직급: ${m.rank}${m.mbti ? ` | MBTI: ${m.mbti}` : ''}`,
    )
    .join('\n')
  return (
    buildAgentPersona(leader) +
    `

# 팀 협업 모드 — 당신은 팀 ${team}의 팀장입니다
사장님이 팀 단위 작업을 지시했습니다. 아래 팀원들에게 ${DELEGATE_TOOL_NAME} 도구로 작업을 위임하고, 결과를 모아 최종 보고하세요.

## 당신의 팀원
${roster}

## 위임 규칙
- 작업을 적절히 나눠 팀원에게 위임하세요. memberId는 위 목록의 id를 *그대로* 사용합니다.
- 팀원은 당신이 준 지시문만 봅니다 — 필요한 맥락을 지시문에 모두 담으세요.
- 팀원의 역할·직급·성향에 맞는 작업을 골라주세요.
- 모든 위임 결과가 모이면, 종합해 사장님께 최종 보고를 작성하세요.
- 위임이 불필요한 간단한 질문이면 직접 답해도 됩니다.`
  )
}

export async function runTeamTask(opts: RunTeamTaskOptions): Promise<TeamRunResult> {
  const { leader, team, members } = resolveTeam(opts.employees, opts.leaderId)

  let delegations = 0
  const memberUsage = { inputTokens: 0, outputTokens: 0 }
  const emit = (ev: TeamEvent) => opts.onEvent?.(ev)
  const delegateTool = makeDelegateTool({
    chat: opts.chat,
    leader,
    members,
    memberTools: opts.memberTools,
    memberMaxSteps: opts.memberMaxSteps,
    signal: opts.signal,
    emit: ev => {
      if (ev.type === 'delegation:done') {
        if (!ev.isError) delegations++
        memberUsage.inputTokens += ev.usage.inputTokens
        memberUsage.outputTokens += ev.usage.outputTokens
      }
      emit(ev)
    },
  })

  const result = await runAgent({
    chat: opts.chat,
    model: leader.model,
    systemPrompt: buildLeaderSystemPrompt(leader, team, members),
    messages: [{ role: 'user', content: opts.task }],
    tools: [delegateTool, ...(opts.leaderTools ?? [])],
    maxSteps: opts.maxSteps,
    employeeId: leader.id,
    signal: opts.signal,
    onDelta: opts.onDelta,
    onEvent: ev => emit({ type: 'leader', event: ev }),
  })

  return {
    ...result,
    usage: {
      inputTokens: result.usage.inputTokens + memberUsage.inputTokens,
      outputTokens: result.usage.outputTokens + memberUsage.outputTokens,
    },
    leaderId: leader.id,
    team,
    delegations,
  }
}
