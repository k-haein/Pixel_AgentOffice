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
import { chat } from './llm/dispatch'
import { invalidateAllCaches } from './llm/registry'
import { LLMError, type ChatRequest, type ProviderName } from './llm/types'
import type { Employee, Settings } from '../src/shared/types'

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

  // === LLM 호출 (provider 자동 추론) ===
  ipcMain.handle('llm:chat', async (_e, request: ChatRequest) => {
    try {
      const response = await chat(request)
      return { ok: true, response }
    } catch (err) {
      if (err instanceof LLMError) {
        return {
          ok: false,
          error: { code: err.code, message: err.message, provider: err.provider },
        }
      }
      return {
        ok: false,
        error: {
          code: 'UNKNOWN' as const,
          message: (err as Error).message ?? '알 수 없는 오류',
          provider: 'anthropic' as ProviderName,
        },
      }
    }
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
