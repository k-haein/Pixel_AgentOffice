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

import type { Platform } from './types'
import type { AppData, Settings, Employee, ChatMessage } from '../shared/types'
import { DEFAULT_SETTINGS, DEFAULT_MAX_EMPLOYEES, TEMPLATES } from '../shared/types'

// 메모리 상 가짜 저장소
const mockEmployees: Employee[] = []
const mockKeys = new Map<string, boolean>()
const mockChatHistories = new Map<string, ChatMessage[]>()
let mockSettings: Settings = { ...DEFAULT_SETTINGS }

const FAKE_REPLIES = [
  '안녕! 잘 지냈어요?',
  '오 그건 흥미로운 질문이네요. 좀 더 생각해볼게요.',
  '오늘은 뭘 도와드릴까요?',
  '아 그거 좋은 아이디어 같아요.',
  '음, 잠시 정리해볼게요.',
]

let replyIdx = 0

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
    return {
      ok: true,
      response: {
        text,
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
}

// TEMPLATES import 사용 명시 (lint) — mock 데이터 시드 시 활용 가능
void TEMPLATES
