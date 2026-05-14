import { app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  type AppData,
  type Employee,
  type Settings,
  type Model,
  TEMPLATES,
  DEFAULT_SETTINGS,
  DEFAULT_MAX_EMPLOYEES,
  DEPRECATED_MODELS,
} from '../../src/shared/types'

/** 저장된 모델이 폐기된 ID면 살아있는 ID 로 교체 */
function migrateModel(m: string | undefined | null, fallback: Model): Model {
  if (!m) return fallback
  if (m in DEPRECATED_MODELS) return DEPRECATED_MODELS[m]
  return m as Model
}

const DATA_FILE_NAME = 'app-data.json'

let cachedData: AppData | null = null

function dataFilePath(): string {
  return path.join(app.getPath('userData'), DATA_FILE_NAME)
}

/** 첫 실행 시 기본 직원 2명 (Mary, Haewol) */
function createDefaultData(): AppData {
  const now = new Date().toISOString()
  const employees: Employee[] = [
    {
      id: 'mary-001',
      template: 'editor',
      name: 'Mary',
      role: '편집자',
      emoji: TEMPLATES.editor.emoji,
      baseInstructions: TEMPLATES.editor.baseInstructions,
      customInstructions: '',
      model: DEFAULT_SETTINGS.defaultModel,
      memoryModel: DEFAULT_SETTINGS.defaultMemoryModel,
      memoryMode: 'auto',
      rank: '사원',
      promotionMode: 'time',
      hiredAt: now,
      deskPosition: { x: -120 },
      totalMessages: 0,
      totalMemoryUpdates: 0,
      totalPraises: 0,
    },
    {
      id: 'haewol-001',
      template: 'writer',
      name: 'Haewol',
      role: '작가',
      emoji: TEMPLATES.writer.emoji,
      baseInstructions: TEMPLATES.writer.baseInstructions,
      customInstructions: '',
      model: DEFAULT_SETTINGS.defaultModel,
      memoryModel: DEFAULT_SETTINGS.defaultMemoryModel,
      memoryMode: 'auto',
      rank: '사원',
      promotionMode: 'time',
      hiredAt: now,
      deskPosition: { x: 120 },
      totalMessages: 0,
      totalMemoryUpdates: 0,
      totalPraises: 0,
    },
  ]
  return {
    employees,
    maxEmployees: DEFAULT_MAX_EMPLOYEES,
    settings: { ...DEFAULT_SETTINGS },
  }
}

/** Employee에 새 필드 추가 시 기본값으로 채우기 */
function migrateEmployee(emp: Partial<Employee>): Employee {
  return {
    id: emp.id ?? `unknown-${Date.now()}`,
    template: emp.template ?? 'editor',
    name: emp.name ?? '이름 없음',
    role: emp.role ?? '역할 없음',
    emoji: emp.emoji ?? '👤',
    baseInstructions: emp.baseInstructions ?? '',
    customInstructions: emp.customInstructions ?? '',
    model: migrateModel(emp.model, DEFAULT_SETTINGS.defaultModel),
    memoryModel: migrateModel(emp.memoryModel, DEFAULT_SETTINGS.defaultMemoryModel),
    memoryMode: emp.memoryMode ?? 'auto',
    rank: emp.rank ?? '사원',
    promotionMode: emp.promotionMode ?? 'time',
    hiredAt: emp.hiredAt ?? new Date().toISOString(),
    deskPosition: emp.deskPosition ?? { x: 0 },
    totalMessages: emp.totalMessages ?? 0,
    totalMemoryUpdates: emp.totalMemoryUpdates ?? 0,
    totalPraises: emp.totalPraises ?? 0,
  }
}

export async function loadData(): Promise<AppData> {
  if (cachedData) return cachedData
  const filePath = dataFilePath()
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppData>
    // 필드 누락 시 default 채우기 + 폐기된 모델 마이그레이션
    const settingsRaw = parsed.settings ?? {}
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      ...settingsRaw,
      defaultModel: migrateModel(settingsRaw.defaultModel, DEFAULT_SETTINGS.defaultModel),
      defaultMemoryModel: migrateModel(settingsRaw.defaultMemoryModel, DEFAULT_SETTINGS.defaultMemoryModel),
    }
    const data: AppData = {
      employees: (parsed.employees ?? []).map(migrateEmployee),
      maxEmployees: parsed.maxEmployees ?? DEFAULT_MAX_EMPLOYEES,
      settings,
    }
    // 마이그레이션 결과를 디스크에 다시 쓰기 (영구화)
    await saveData(data)
    return data
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      // 파일 없음 → 기본 데이터 생성
      const data = createDefaultData()
      await saveData(data)
      cachedData = data
      return data
    }
    throw err
  }
}

export async function saveData(data: AppData): Promise<void> {
  const filePath = dataFilePath()
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  cachedData = data
}

export async function updateEmployee(
  id: string,
  patch: Partial<Employee>,
): Promise<Employee | null> {
  const data = await loadData()
  const idx = data.employees.findIndex(e => e.id === id)
  if (idx === -1) return null
  data.employees[idx] = { ...data.employees[idx], ...patch }
  await saveData(data)
  return data.employees[idx]
}

export async function addEmployee(employee: Employee): Promise<Employee> {
  const data = await loadData()
  if (data.employees.length >= data.maxEmployees) {
    throw new Error(`최대 직원 수(${data.maxEmployees}명)에 도달했습니다`)
  }
  data.employees.push(employee)
  await saveData(data)
  return employee
}

export async function removeEmployee(id: string): Promise<boolean> {
  const data = await loadData()
  const before = data.employees.length
  data.employees = data.employees.filter(e => e.id !== id)
  if (data.employees.length === before) return false
  await saveData(data)
  return true
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const data = await loadData()
  data.settings = { ...data.settings, ...patch }
  await saveData(data)
  return data.settings
}
