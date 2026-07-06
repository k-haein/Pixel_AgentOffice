import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { setDefaultResultOrder } from 'node:dns'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Node 18+ fetch가 IPv6 우선 → Windows에서 connect 실패 시 IPv4 fallback 안 함
// (브라우저는 Chromium net stack이라 자동 처리). dns 결과 IPv4 우선으로 강제.
setDefaultResultOrder('ipv4first')

// 회사망 SSL inspection (MITM CA) 대응 — dev에서만 SSL 검증 끔.
// 브라우저는 Windows 인증서 저장소(회사 CA 등록)를 쓰지만 Node는 자체 ca-bundle만 사용해 거부됨.
// production 빌드(.exe 배포)에서는 정상 SSL 검증 유지 — 사용자 PC는 회사망과 무관.
if (!app.isPackaged) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}
import {
  loadData,
  addEmployee,
  updateEmployee,
  incrementEmployeeStats,
  removeEmployee,
  updateSettings,
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
  loadMemory,
  saveMemory,
} from './data/store'
import {
  saveApiKey,
  hasApiKey,
  deleteApiKey,
  isAvailable as isApiKeyStorageAvailable,
} from './llm/apiKeys'
import { chat, getRateLimit } from './llm/dispatch'
import { invalidateAllCaches } from './llm/registry'
import { humanizeError } from './llm/errorMessages'
import { LLMError, type ChatRequest, type ProviderName } from './llm/types'
import type { Employee, Settings, Model, EmployeeStatsDelta } from '../src/shared/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

let win: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    title: 'PixelAgentOffice',
    backgroundColor: '#1a1a2e',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 외부 링크(target="_blank")는 OS 기본 브라우저로 열기 — 앱 안에서 새 창 안 띄움.
  // API 키 발급 페이지(aistudio.google.com / console.anthropic.com) 등 안내 링크용.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })
  // target 없는 링크로 앱 자체가 외부 URL로 이동하는 것 차단 (앱 화면 보존)
  win.webContents.on('will-navigate', (e, url) => {
    const current = VITE_DEV_SERVER_URL ?? 'file://'
    if (!url.startsWith(current)) {
      e.preventDefault()
      if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url)
    }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function registerIpc() {
  // === Data ===
  ipcMain.handle('data:load', async () => loadData())
  ipcMain.handle('employee:add', async (_e, employee: Employee) => addEmployee(employee))
  ipcMain.handle('employee:update', async (_e, id: string, patch: Partial<Employee>) =>
    updateEmployee(id, patch),
  )
  ipcMain.handle('employee:increment-stats', async (_e, id: string, delta: EmployeeStatsDelta) =>
    incrementEmployeeStats(id, delta),
  )
  ipcMain.handle('employee:remove', async (_e, id: string) => removeEmployee(id))
  ipcMain.handle('settings:update', async (_e, patch: Partial<Settings>) => updateSettings(patch))

  // 채팅 이력 영구화 (Day 11+ 풀 스펙)
  ipcMain.handle('chat:load-history', async (_e, employeeId: string) => loadChatHistory(employeeId))
  ipcMain.handle('chat:save-history', async (_e, employeeId: string, messages: unknown) =>
    saveChatHistory(employeeId, messages as never)
  )
  ipcMain.handle('chat:clear-history', async (_e, employeeId: string) => clearChatHistory(employeeId))

  // 메모리 (Phase 4)
  ipcMain.handle('memory:load', async (_e, employeeId: string) => loadMemory(employeeId))
  ipcMain.handle('memory:save', async (_e, employeeId: string, text: string) => saveMemory(employeeId, text))

  // === API Keys (provider별) ===
  ipcMain.handle('apikey:save', async (_e, provider: ProviderName, key: string) => {
    await saveApiKey(provider, key)
    invalidateAllCaches()
    return { ok: true }
  })

  ipcMain.handle('apikey:has', async (_e, provider: ProviderName) => hasApiKey(provider))

  ipcMain.handle('apikey:delete', async (_e, provider: ProviderName) => {
    await deleteApiKey(provider)
    invalidateAllCaches()
    return { ok: true }
  })

  ipcMain.handle('apikey:isAvailable', async () => isApiKeyStorageAvailable())

  // === LLM 호출 (provider 자동 추론) — requestId로 중단 가능 ===
  // 진행 중인 요청들의 AbortController 보관
  const activeAborts = new Map<string, AbortController>()

  ipcMain.handle('llm:chat', async (e, request: ChatRequest & { requestId?: string; stream?: boolean }) => {
    const requestId = request.requestId ?? `req-${Date.now()}`
    const ctrl = new AbortController()
    activeAborts.set(requestId, ctrl)
    // 스트리밍 (1층 폴리시) — stream: true면 생성 중 텍스트 조각을 'llm:chunk'로 push.
    // 최종 완성본은 기존과 동일하게 invoke 반환값으로 온다 (usage/비용 집계 경로 무변경).
    const onDelta = request.stream
      ? (delta: string) => {
          if (!e.sender.isDestroyed()) e.sender.send('llm:chunk', { requestId, delta })
        }
      : undefined
    try {
      const response = await chat(request, ctrl.signal, onDelta)
      const rateLimit = getRateLimit(request.model)
      return { ok: true, response, rateLimit }
    } catch (err) {
      const rateLimit = getRateLimit(request.model)
      if (err instanceof LLMError) {
        const friendly = humanizeError(err, {
          model: request.model,
          retryInMs: err.code === 'RATE_LIMIT_LOCAL' ? rateLimit.resetInMs : undefined,
        })
        return {
          ok: false,
          error: { code: err.code, message: err.message, provider: err.provider, friendly },
          rateLimit,
        }
      }
      // 분류 못 한 예외도 humanize 시도
      const fallback = new LLMError('anthropic', 'UNKNOWN', (err as Error).message ?? '알 수 없는 오류')
      const friendly = humanizeError(fallback, { model: request.model })
      return {
        ok: false,
        error: {
          code: fallback.code,
          message: fallback.message,
          provider: fallback.provider as ProviderName,
          friendly,
        },
        rateLimit,
      }
    } finally {
      activeAborts.delete(requestId)
    }
  })

  // === 진행 중인 LLM 호출 중단 ===
  ipcMain.handle('llm:abort', async (_e, requestId: string) => {
    const ctrl = activeAborts.get(requestId)
    if (ctrl) {
      ctrl.abort()
      return { ok: true }
    }
    return { ok: false, reason: 'not_found' }
  })

  // === Rate limit 조회 (UI에서 mount 시 + 주기적 polling) ===
  ipcMain.handle('llm:getRateLimit', async (_e, model: Model) => {
    return getRateLimit(model)
  })
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
