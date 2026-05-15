import { contextBridge, ipcRenderer } from 'electron'
import type { AppData, Employee, Settings, Model } from '../src/shared/types'
import type { ChatRequest, ChatResponse, ProviderName, LLMErrorCode } from './llm/types'
import type { FriendlyError } from './llm/errorMessages'
import type { RateLimitStatus } from './llm/usage'

export type { FriendlyError, RateLimitStatus }

export type ChatError = {
  code: LLMErrorCode
  message: string
  provider: ProviderName
  friendly: FriendlyError
}

export type ChatResult =
  | { ok: true; response: ChatResponse; rateLimit: RateLimitStatus }
  | { ok: false; error: ChatError; rateLimit: RateLimitStatus }

const api = {
  // === Data ===
  loadData: (): Promise<AppData> => ipcRenderer.invoke('data:load'),
  addEmployee: (employee: Employee): Promise<Employee> =>
    ipcRenderer.invoke('employee:add', employee),
  updateEmployee: (id: string, patch: Partial<Employee>): Promise<Employee | null> =>
    ipcRenderer.invoke('employee:update', id, patch),
  removeEmployee: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('employee:remove', id),
  updateSettings: (patch: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke('settings:update', patch),

  // === API 키 (provider별) ===
  saveApiKey: (provider: ProviderName, key: string): Promise<{ ok: true }> =>
    ipcRenderer.invoke('apikey:save', provider, key),
  hasApiKey: (provider: ProviderName): Promise<boolean> =>
    ipcRenderer.invoke('apikey:has', provider),
  deleteApiKey: (provider: ProviderName): Promise<{ ok: true }> =>
    ipcRenderer.invoke('apikey:delete', provider),
  isApiKeyStorageAvailable: (): Promise<boolean> =>
    ipcRenderer.invoke('apikey:isAvailable'),

  // === LLM 호출 (requestId 동봉 시 중단 가능) ===
  chatWithLLM: (request: ChatRequest & { requestId?: string }): Promise<ChatResult> =>
    ipcRenderer.invoke('llm:chat', request),

  /** 진행 중인 chat 요청 중단 */
  abortChat: (requestId: string): Promise<{ ok: boolean; reason?: string }> =>
    ipcRenderer.invoke('llm:abort', requestId),

  // === Rate limit 조회 ===
  getRateLimit: (model: Model): Promise<RateLimitStatus> =>
    ipcRenderer.invoke('llm:getRateLimit', model),
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
