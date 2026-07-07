import { contextBridge, ipcRenderer } from 'electron'
import type { AppData, Employee, Settings, Model, ChatMessage, EmployeeStatsDelta } from '../src/shared/types'
import type { ChatRequest, ChatResponse, ProviderName, LLMErrorCode } from './llm/types'
import type { FriendlyError } from './llm/errorMessages'
import type { RateLimitStatus } from './llm/usage'
import type { TeamEvent, TeamRunResult } from './agent/team'

export type { FriendlyError, RateLimitStatus, TeamEvent, TeamRunResult }

export type ChatError = {
  code: LLMErrorCode
  message: string
  provider: ProviderName
  friendly: FriendlyError
}

export type ChatResult =
  | { ok: true; response: ChatResponse; rateLimit: RateLimitStatus }
  | { ok: false; error: ChatError; rateLimit: RateLimitStatus }

/** 2층 팀 협업 실행 결과 (Phase 3) — 'INVALID'는 팀 구성 검증 실패(팀장 아님·팀원 없음 등) */
export type TeamRunIpcResult =
  | { ok: true; result: TeamRunResult }
  | {
      ok: false
      error: {
        code: LLMErrorCode | 'INVALID'
        message: string
        provider?: ProviderName
        friendly?: FriendlyError
      }
    }

const api = {
  // === Data ===
  loadData: (): Promise<AppData> => ipcRenderer.invoke('data:load'),
  addEmployee: (employee: Employee): Promise<Employee> =>
    ipcRenderer.invoke('employee:add', employee),
  updateEmployee: (id: string, patch: Partial<Employee>): Promise<Employee | null> =>
    ipcRenderer.invoke('employee:update', id, patch),
  incrementEmployeeStats: (id: string, delta: EmployeeStatsDelta): Promise<Employee | null> =>
    ipcRenderer.invoke('employee:increment-stats', id, delta),
  removeEmployee: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('employee:remove', id),
  updateSettings: (patch: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke('settings:update', patch),

  // === 채팅 이력 영구화 (Day 11+ 풀 스펙) ===
  loadChatHistory: (employeeId: string): Promise<ChatMessage[]> =>
    ipcRenderer.invoke('chat:load-history', employeeId),
  saveChatHistory: (employeeId: string, messages: ChatMessage[]): Promise<void> =>
    ipcRenderer.invoke('chat:save-history', employeeId, messages),
  clearChatHistory: (employeeId: string): Promise<void> =>
    ipcRenderer.invoke('chat:clear-history', employeeId),

  // === 메모리 (Phase 4) ===
  loadMemory: (employeeId: string): Promise<string> =>
    ipcRenderer.invoke('memory:load', employeeId),
  saveMemory: (employeeId: string, text: string): Promise<void> =>
    ipcRenderer.invoke('memory:save', employeeId, text),

  // === API 키 (provider별) ===
  saveApiKey: (provider: ProviderName, key: string): Promise<{ ok: true }> =>
    ipcRenderer.invoke('apikey:save', provider, key),
  hasApiKey: (provider: ProviderName): Promise<boolean> =>
    ipcRenderer.invoke('apikey:has', provider),
  deleteApiKey: (provider: ProviderName): Promise<{ ok: true }> =>
    ipcRenderer.invoke('apikey:delete', provider),
  isApiKeyStorageAvailable: (): Promise<boolean> =>
    ipcRenderer.invoke('apikey:isAvailable'),

  // === LLM 호출 (requestId 동봉 시 중단 가능, stream: true면 llm:chunk 이벤트로 조각 push) ===
  chatWithLLM: (request: ChatRequest & { requestId?: string; stream?: boolean }): Promise<ChatResult> =>
    ipcRenderer.invoke('llm:chat', request),

  /** 스트리밍 청크 구독 — 반환값은 구독 해제 함수. requestId로 어느 요청의 조각인지 구분 */
  onChatChunk: (listener: (payload: { requestId: string; delta: string }) => void): (() => void) => {
    const handler = (_ev: Electron.IpcRendererEvent, payload: { requestId: string; delta: string }) =>
      listener(payload)
    ipcRenderer.on('llm:chunk', handler)
    return () => ipcRenderer.removeListener('llm:chunk', handler)
  },

  /** 진행 중인 chat 요청 중단 — 2층 팀 실행(runTeamTask requestId)도 같은 경로로 중단 */
  abortChat: (requestId: string): Promise<{ ok: boolean; reason?: string }> =>
    ipcRenderer.invoke('llm:abort', requestId),

  // === 2층 팀 협업 (Phase 3) ===
  /** 팀장에게 팀 단위 작업 지시 — 팀장이 팀원에게 위임하고 종합 보고를 반환 */
  runTeamTask: (payload: { leaderId: string; task: string; requestId?: string }): Promise<TeamRunIpcResult> =>
    ipcRenderer.invoke('agent:run-team', payload),

  /** 팀 실행 진행 이벤트 구독(위임 시작/완료·루프 스텝) — 반환값은 구독 해제 함수 */
  onTeamEvent: (
    listener: (payload: { requestId: string; event: TeamEvent }) => void,
  ): (() => void) => {
    const handler = (_ev: Electron.IpcRendererEvent, payload: { requestId: string; event: TeamEvent }) =>
      listener(payload)
    ipcRenderer.on('agent:team-event', handler)
    return () => ipcRenderer.removeListener('agent:team-event', handler)
  },

  // === Rate limit 조회 ===
  getRateLimit: (model: Model): Promise<RateLimitStatus> =>
    ipcRenderer.invoke('llm:getRateLimit', model),
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
