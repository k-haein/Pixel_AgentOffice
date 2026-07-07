/**
 * Mock 환경 adapter.
 *
 * 단위 테스트 / Storybook / 데모 모드용 가짜 응답.
 * 실제 LLM 호출이나 파일 저장 없이 *그럴싸한* 동작 흉내.
 *
 * 사용 예:
 *   - Playwright 테스트에서 LLM 응답을 결정론적으로 반환
 *   - 미래 "데모 모드" — API 키 없이 SNS 영상 촬영
 */

import type { Platform, TeamEvent } from './types'
import type { AppData, Settings, Employee, ChatMessage } from '../shared/types'
import { DEFAULT_SETTINGS, DEFAULT_MAX_EMPLOYEES, TEMPLATES } from '../shared/types'
import { SEAT_LOOKUP } from '../shared/seats'

// 메모리 상 가짜 저장소
const mockEmployees: Employee[] = []
const mockKeys = new Map<string, boolean>()
const mockChatHistories = new Map<string, ChatMessage[]>()
const mockMemories = new Map<string, string>()
let mockSettings: Settings = { ...DEFAULT_SETTINGS }

const FAKE_REPLIES = [
  '안녕! 잘 지냈어요?',
  '오 그건 흥미로운 질문이네요. 좀 더 생각해볼게요.',
  '오늘은 뭘 도와드릴까요?',
  '아 그거 좋은 아이디어 같아요.',
  '음, 잠시 정리해볼게요.',
]

let replyIdx = 0

// 스트리밍 구독자 (1층 폴리시) — chat({stream: true}) 시 조각을 흘려보낸다
const chunkListeners = new Set<(payload: { requestId: string; delta: string }) => void>()

// 2층 팀 실행 이벤트 구독자 (Phase 3) — runTeamTask 진행 연출용
const teamEventListeners = new Set<(payload: { requestId: string; event: TeamEvent }) => void>()

export const mockPlatform: Platform = {
  loadData: async (): Promise<AppData> => ({
    employees: [...mockEmployees],
    maxEmployees: DEFAULT_MAX_EMPLOYEES,
    settings: { ...mockSettings },
  }),

  addEmployee: async (emp) => {
    mockEmployees.push(emp)
    return emp
  },

  updateEmployee: async (id, patch) => {
    const idx = mockEmployees.findIndex(e => e.id === id)
    if (idx === -1) return null
    mockEmployees[idx] = { ...mockEmployees[idx], ...patch }
    return mockEmployees[idx]
  },

  incrementEmployeeStats: async (id, delta) => {
    const idx = mockEmployees.findIndex(e => e.id === id)
    if (idx === -1) return null
    const emp = mockEmployees[idx]
    mockEmployees[idx] = {
      ...emp,
      totalMessages: emp.totalMessages + (delta.totalMessages ?? 0),
      totalMemoryUpdates: emp.totalMemoryUpdates + (delta.totalMemoryUpdates ?? 0),
      totalPraises: emp.totalPraises + (delta.totalPraises ?? 0),
    }
    return mockEmployees[idx]
  },

  removeEmployee: async (id) => {
    const before = mockEmployees.length
    const filtered = mockEmployees.filter(e => e.id !== id)
    mockEmployees.length = 0
    mockEmployees.push(...filtered)
    return filtered.length < before
  },

  updateSettings: async (patch) => {
    mockSettings = { ...mockSettings, ...patch }
    return mockSettings
  },

  loadChatHistory: async (employeeId) => mockChatHistories.get(employeeId) ?? [],
  saveChatHistory: async (employeeId, messages) => {
    mockChatHistories.set(employeeId, messages)
  },
  clearChatHistory: async (employeeId) => {
    mockChatHistories.delete(employeeId)
  },

  loadMemory: async (employeeId) => mockMemories.get(employeeId) ?? '',
  saveMemory: async (employeeId, text) => {
    mockMemories.set(employeeId, text)
  },

  saveApiKey: async (provider) => {
    mockKeys.set(provider, true)
    return { ok: true }
  },

  hasApiKey: async (provider) => mockKeys.get(provider) ?? false,

  deleteApiKey: async (provider) => {
    mockKeys.delete(provider)
    return { ok: true }
  },

  isApiKeyStorageAvailable: async () => true,

  chat: async (request) => {
    // 의도적으로 살짝 지연 — 실제 LLM 호출 흉내
    await new Promise(r => setTimeout(r, 600))
    const text = FAKE_REPLIES[replyIdx % FAKE_REPLIES.length]
    replyIdx++
    // 스트리밍 흉내 — 4자씩 잘라 구독자에게 push (실제 provider와 동일한 체감)
    if (request.stream && request.requestId) {
      for (let i = 0; i < text.length; i += 4) {
        await new Promise(r => setTimeout(r, 30))
        const delta = text.slice(i, i + 4)
        chunkListeners.forEach(l => l({ requestId: request.requestId!, delta }))
      }
    }
    return {
      ok: true,
      response: {
        text,
        stopReason: 'end' as const,
        usage: { inputTokens: 50, outputTokens: 20 },
      },
      rateLimit: {
        model: request.model,
        limit: 10,
        used: 1,
        remaining: 9,
        resetInMs: 0,
        sessionRequests: replyIdx,
        sessionInputTokens: 50 * replyIdx,
        sessionOutputTokens: 20 * replyIdx,
        sessionCostUsd: 0.0001 * replyIdx,
      },
    }
  },

  onChatChunk: (listener) => {
    chunkListeners.add(listener)
    return () => { chunkListeners.delete(listener) }
  },

  abortChat: async () => ({ ok: true }),

  getRateLimit: async (model) => ({
    model,
    limit: 10,
    used: 0,
    remaining: 10,
    resetInMs: 0,
    sessionRequests: 0,
    sessionInputTokens: 0,
    sessionOutputTokens: 0,
    sessionCostUsd: 0,
  }),

  // === 2층 팀 협업 (Phase 3) — 위임 연출 흉내 후 캔 보고 반환 ===
  runTeamTask: async ({ leaderId, task, requestId }) => {
    const rid = requestId ?? `team-mock-${Date.now()}`
    const emit = (event: TeamEvent) => teamEventListeners.forEach(l => l({ requestId: rid, event }))
    const leader = mockEmployees.find(e => e.id === leaderId)
    if (!leader) {
      return { ok: false, error: { code: 'INVALID', message: `직원 id "${leaderId}"를 찾을 수 없습니다.` } }
    }
    const leaderSeat = leader.seatId ? SEAT_LOOKUP[leader.seatId] : null
    if (!leaderSeat || leaderSeat.role !== 'leader' || !leaderSeat.team) {
      return { ok: false, error: { code: 'INVALID', message: `${leader.name}은(는) 팀장 자리에 앉아있지 않습니다.` } }
    }
    const team = leaderSeat.team
    const members = mockEmployees.filter(e => {
      if (e.id === leader.id || !e.seatId) return false
      const s = SEAT_LOOKUP[e.seatId]
      return s?.team === team && s.role === 'member'
    })
    if (members.length === 0) {
      return { ok: false, error: { code: 'INVALID', message: `팀 ${team}에 팀원이 없습니다.` } }
    }
    // 첫 팀원에게 위임하는 척 — 이벤트 순서는 실제 구현과 동일
    const member = members[0]
    await new Promise(r => setTimeout(r, 400))
    emit({ type: 'delegation:start', leaderId: leader.id, memberId: member.id, memberName: member.name, task })
    await new Promise(r => setTimeout(r, 800))
    const report = `(데모) ${member.name}의 보고: "${task.slice(0, 30)}" 작업을 처리했습니다.`
    emit({ type: 'delegation:done', leaderId: leader.id, memberId: member.id, memberName: member.name, report, isError: false, usage: { inputTokens: 50, outputTokens: 20 } })
    await new Promise(r => setTimeout(r, 400))
    const text = `(데모) 팀 ${team} 최종 보고입니다.\n- ${member.name}: ${report}\n실제 위임 협업은 API 키를 연결하면 동작합니다.`
    return {
      ok: true,
      result: {
        text,
        steps: 2,
        stopped: 'end',
        usage: { inputTokens: 100, outputTokens: 40 },
        messages: [
          { role: 'user', content: task },
          { role: 'assistant', content: text },
        ],
        leaderId: leader.id,
        team,
        delegations: 1,
      },
    }
  },

  onTeamEvent: (listener) => {
    teamEventListeners.add(listener)
    return () => { teamEventListeners.delete(listener) }
  },
}

// TEMPLATES import 사용 명시 (lint) — mock 데이터 시드 시 활용 가능
void TEMPLATES
