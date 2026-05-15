import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  loadData,
  addEmployee,
  updateEmployee,
  removeEmployee,
  updateSettings,
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
import type { Employee, Settings, Model } from '../src/shared/types'

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
  ipcMain.handle('employee:remove', async (_e, id: string) => removeEmployee(id))
  ipcMain.handle('settings:update', async (_e, patch: Partial<Settings>) => updateSettings(patch))

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

  ipcMain.handle('llm:chat', async (_e, request: ChatRequest & { requestId?: string }) => {
    const requestId = request.requestId ?? `req-${Date.now()}`
    const ctrl = new AbortController()
    activeAborts.set(requestId, ctrl)
    try {
      const response = await chat(request, ctrl.signal)
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
