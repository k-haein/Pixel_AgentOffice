/**
 * delegate_to_member — 팀장에게만 쥐여주는 위임 도구 (Phase 3, 핸드오프 §4 갭3).
 *
 * 실행되면 지정된 팀원 페르소나로 "자식 대화"의 에이전트 루프를 재귀 호출하고,
 * 팀원의 최종 보고 텍스트를 팀장에게 반환한다.
 *
 * 재위임 방지(갭4): 팀원 자식 루프의 tools에는 이 도구가 구조적으로 들어가지 않는다 —
 * makeDelegateTool이 만든 도구는 팀장 루프에만 등록되고, 팀원에겐 opts.memberTools만 전달.
 *
 * 이 파일은 electron을 import하지 않는다 (§8).
 */

import { runAgent, type AgentEvent, type AgentTool, type ChatFn } from '../loop'
import { buildAgentPersona } from '../persona'
import type { Employee } from '../../../src/shared/types'

export const DELEGATE_TOOL_NAME = 'delegate_to_member'

/** 팀 실행 진행 이벤트 — IPC로 렌더러(채팅창 + Phase 4 게임 연출)에 흘려보낸다 */
export type TeamEvent =
  | { type: 'leader'; event: AgentEvent }
  | { type: 'delegation:start'; leaderId: string; memberId: string; memberName: string; task: string }
  | { type: 'member'; memberId: string; event: AgentEvent }
  | {
      type: 'delegation:done'
      leaderId: string
      memberId: string
      memberName: string
      report: string
      isError: boolean
      /** 팀원 자식 루프가 소비한 토큰 — 팀 전체 usage 합산용 (오류 시 0) */
      usage: { inputTokens: number; outputTokens: number }
    }

export function makeDelegateTool(opts: {
  chat: ChatFn
  leader: Employee
  /** 위임 가능한 대상 — 같은 팀 팀원만 (검증은 team.ts resolveTeam이 수행) */
  members: Employee[]
  /** 팀원 자식 루프에 쥐여줄 도구 — 위임 도구는 여기 넣지 않는다 (재위임 방지) */
  memberTools?: AgentTool[]
  memberMaxSteps?: number
  signal?: AbortSignal
  emit?: (ev: TeamEvent) => void
}): AgentTool {
  return {
    def: {
      name: DELEGATE_TOOL_NAME,
      description:
        '같은 팀 팀원에게 작업을 위임하고 그 팀원의 최종 보고를 돌려받는다. memberId는 시스템 프롬프트의 팀원 목록에 있는 id를 그대로 사용할 것.',
      parameters: {
        type: 'object',
        properties: {
          memberId: {
            type: 'string',
            description: '위임받을 팀원의 id (팀원 목록의 id 그대로)',
          },
          task: {
            type: 'string',
            description:
              '팀원에게 시킬 작업 지시. 팀원은 이 지시문만 보므로 필요한 맥락을 모두 담을 것.',
          },
        },
        required: ['memberId', 'task'],
      },
    },

    // throw는 루프가 { error }로 감싸 팀장 모델에 되돌린다 (잘못된 memberId 등 → 모델이 정정 재시도)
    async execute(args) {
      const { memberId, task } = (args ?? {}) as { memberId?: string; task?: string }
      if (!memberId || !task || !task.trim()) {
        throw new Error('memberId와 task는 둘 다 필수입니다.')
      }
      const member = opts.members.find(m => m.id === memberId)
      if (!member) {
        const roster = opts.members.map(m => `${m.id}(${m.name})`).join(', ')
        throw new Error(`팀원 id "${memberId}"를 찾을 수 없습니다. 위임 가능한 팀원: ${roster}`)
      }

      opts.emit?.({
        type: 'delegation:start',
        leaderId: opts.leader.id,
        memberId: member.id,
        memberName: member.name,
        task,
      })
      try {
        // ← 재귀: 팀원 페르소나로 같은 루프를 자식 대화로 돌린다
        const result = await runAgent({
          chat: opts.chat,
          model: member.model,
          systemPrompt:
            buildAgentPersona(member) +
            `\n\n# 팀 작업 맥락\n팀장 ${opts.leader.name}(${opts.leader.role})이 당신에게 위임한 작업입니다. 완결된 보고 형식으로 답하세요.`,
          messages: [{ role: 'user', content: task }],
          tools: opts.memberTools,
          maxSteps: opts.memberMaxSteps,
          employeeId: member.id,
          signal: opts.signal,
          onEvent: ev => opts.emit?.({ type: 'member', memberId: member.id, event: ev }),
        })
        const report =
          result.stopped === 'max_steps' && !result.text.trim()
            ? '(팀원이 단계 상한에 걸려 최종 보고를 완성하지 못했습니다)'
            : result.text
        opts.emit?.({
          type: 'delegation:done',
          leaderId: opts.leader.id,
          memberId: member.id,
          memberName: member.name,
          report,
          isError: false,
          usage: result.usage,
        })
        return { memberId: member.id, member: member.name, report, steps: result.steps, stopped: result.stopped }
      } catch (err) {
        opts.emit?.({
          type: 'delegation:done',
          leaderId: opts.leader.id,
          memberId: member.id,
          memberName: member.name,
          report: err instanceof Error ? err.message : String(err),
          isError: true,
          usage: { inputTokens: 0, outputTokens: 0 },
        })
        throw err
      }
    },
  }
}
