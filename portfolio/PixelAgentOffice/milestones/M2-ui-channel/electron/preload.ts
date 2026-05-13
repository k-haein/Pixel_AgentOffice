import { contextBridge, ipcRenderer } from 'electron'
import type { AppData, Employee, Settings } from '../src/shared/types'

const api = {
  loadData: (): Promise<AppData> => ipcRenderer.invoke('data:load'),

  addEmployee: (employee: Employee): Promise<Employee> =>
    ipcRenderer.invoke('employee:add', employee),

  updateEmployee: (id: string, patch: Partial<Employee>): Promise<Employee | null> =>
    ipcRenderer.invoke('employee:update', id, patch),

  removeEmployee: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('employee:remove', id),

  updateSettings: (patch: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke('settings:update', patch),
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
