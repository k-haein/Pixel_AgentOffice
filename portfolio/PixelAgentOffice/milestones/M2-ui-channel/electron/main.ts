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

// === IPC 핸들러 ===
function registerIpc() {
  ipcMain.handle('data:load', async () => {
    return await loadData()
  })

  ipcMain.handle('employee:add', async (_event, employee: Employee) => {
    return await addEmployee(employee)
  })

  ipcMain.handle('employee:update', async (_event, id: string, patch: Partial<Employee>) => {
    return await updateEmployee(id, patch)
  })

  ipcMain.handle('employee:remove', async (_event, id: string) => {
    return await removeEmployee(id)
  })

  ipcMain.handle('settings:update', async (_event, patch: Partial<Settings>) => {
    return await updateSettings(patch)
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
