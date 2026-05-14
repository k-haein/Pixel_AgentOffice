import { contextBridge, ipcRenderer } from 'electron'
import type { AppData, Employee, Settings } from '../src/shared/types'
import type { ChatRequest, ChatResponse, ProviderName, LLMErrorCode } from './llm/types'

export type ChatError = {
  code: LLMErrorCode
  message: string
  provider: ProviderName
}

export type ChatResult =
  | { ok: true; response: ChatResponse }
  | { ok: false; error: ChatError }

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

  // === LLM 호출 ===
  chatWithLLM: (request: ChatRequest): Promise<ChatResult> =>
    ipcRenderer.invoke('llm:chat', request),
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
