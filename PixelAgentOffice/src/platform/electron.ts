/**
 * Electron 환경 adapter.
 *
 * preload.ts가 contextBridge로 노출한 `window.api`를 그대로 wrap.
 * 데스크탑 빌드에서 사용되는 기본 구현.
 *
 * 주의: 이 파일은 `window.api` 접근 — 반드시 Electron renderer에서만 import.
 * 환경 분기는 platform/index.ts 에서 처리.
 */

import type { Platform } from './types'

// preload.ts의 contextBridge로 노출된 객체. 타입은 preload의 Api와 일치.
// global.d.ts 또는 vite-env.d.ts 에 `window.api` 타입 선언이 있어 자동 인식됨.
declare global {
  interface Window {
    api: {
      loadData: Platform['loadData']
      addEmployee: Platform['addEmployee']
      updateEmployee: Platform['updateEmployee']
      removeEmployee: Platform['removeEmployee']
      updateSettings: Platform['updateSettings']
      loadChatHistory: Platform['loadChatHistory']
      saveChatHistory: Platform['saveChatHistory']
      clearChatHistory: Platform['clearChatHistory']
      saveApiKey: Platform['saveApiKey']
      hasApiKey: Platform['hasApiKey']
      deleteApiKey: Platform['deleteApiKey']
      isApiKeyStorageAvailable: Platform['isApiKeyStorageAvailable']
      // chatWithLLM 은 메서드명만 platform과 다름 — adapter에서 alias
      chatWithLLM: Platform['chat']
      abortChat: Platform['abortChat']
      getRateLimit: Platform['getRateLimit']
    }
  }
}

/**
 * Electron 환경에서 동작하는 Platform 구현체.
 * 모든 메서드를 `window.api.*` 호출로 1:1 위임.
 */
export const electronPlatform: Platform = {
  // === Data ===
  loadData: () => window.api.loadData(),
  addEmployee: (employee) => window.api.addEmployee(employee),
  updateEmployee: (id, patch) => window.api.updateEmployee(id, patch),
  removeEmployee: (id) => window.api.removeEmployee(id),
  updateSettings: (patch) => window.api.updateSettings(patch),

  // === 채팅 이력 영구화 ===
  loadChatHistory: (employeeId) => window.api.loadChatHistory(employeeId),
  saveChatHistory: (employeeId, messages) => window.api.saveChatHistory(employeeId, messages),
  clearChatHistory: (employeeId) => window.api.clearChatHistory(employeeId),

  // === API 키 ===
  saveApiKey: (provider, key) => window.api.saveApiKey(provider, key),
  hasApiKey: (provider) => window.api.hasApiKey(provider),
  deleteApiKey: (provider) => window.api.deleteApiKey(provider),
  isApiKeyStorageAvailable: () => window.api.isApiKeyStorageAvailable(),

  // === LLM ===
  // preload에서 chatWithLLM으로 노출됐지만 Platform 인터페이스는 chat() — 이름만 alias
  chat: (request) => window.api.chatWithLLM(request),
  abortChat: (requestId) => window.api.abortChat(requestId),
  getRateLimit: (model) => window.api.getRateLimit(model),
}
