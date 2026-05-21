import { app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  type AppData,
  type Employee,
  type Settings,
  type Model,
  type SeatId,
  type ChatMessage,
  TEMPLATES,
  DEFAULT_SETTINGS,
  DEFAULT_MAX_EMPLOYEES,
  DEPRECATED_MODELS,
} from '../../src/shared/types'
import { findNextEmptyMemberSeat, SEAT_LOOKUP } from '../../src/shared/seats'

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
      seatId: 'member:A:0',  // 팀 A 첫 자리
      deskOrientation: 'front',
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
      seatId: 'member:A:1',  // 팀 A 두 번째 자리
      deskOrientation: 'front',
      totalMessages: 0,
      totalMemoryUpdates: 0,
      totalPraises: 0,
    },
  ]
  return {
    employees,
    maxEmployees: DEFAULT_MAX_EMPLOYEES,
    settings: { ...DEFAULT_SETTINGS },
    chatHistories: {},
  }
}

/** Employee 단일 필드 마이그레이션 (seatId는 별도 단계에서 결정) */
function migrateEmployeeFields(emp: Partial<Employee>): Omit<Employee, 'seatId'> {
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
    deskOrientation: emp.deskOrientation ?? 'front',
    totalMessages: emp.totalMessages ?? 0,
    totalMemoryUpdates: emp.totalMemoryUpdates ?? 0,
    totalPraises: emp.totalPraises ?? 0,
  }
}

/**
 * 직원 목록 전체 마이그레이션.
 * 1) 각 직원 필드 보강
 * 2) seatId가 이미 있으면 유지 (단, 중복 발생 시 뒤쪽 직원은 무자리로)
 * 3) seatId 없는 직원은 빈 자리에 순차 자동 배치 (팀 A 팀원부터)
 */
function migrateEmployees(raws: Partial<Employee>[]): Employee[] {
  const occupied = new Set<SeatId>()
  // 1차: 이미 seatId 있는 직원 처리 (중복 검출)
  const stage1: Array<{ raw: Partial<Employee>; existingSeat: SeatId | null }> = raws.map(r => {
    const sid = r.seatId
    if (sid && SEAT_LOOKUP[sid] && !occupied.has(sid)) {
      occupied.add(sid)
      return { raw: r, existingSeat: sid }
    }
    return { raw: r, existingSeat: null }
  })
  // 2차: 자리 없는 직원에게 다음 빈 팀원 자리 할당
  return stage1.map(({ raw, existingSeat }) => {
    let seat: SeatId | null = existingSeat
    if (!seat) {
      seat = findNextEmptyMemberSeat(occupied)
      if (seat) occupied.add(seat)
    }
    return {
      ...migrateEmployeeFields(raw),
      seatId: seat,
    }
  })
}

export async function loadData(): Promise<AppData> {
  if (cachedData) return cachedData
  const filePath = dataFilePath()
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppData>
    // 필드 누락 시 default 채우기 + 폐기된 모델 마이그레이션
    const settingsRaw = (parsed.settings ?? {}) as Partial<Settings>
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      ...settingsRaw,
      defaultModel: migrateModel(settingsRaw.defaultModel, DEFAULT_SETTINGS.defaultModel),
      defaultMemoryModel: migrateModel(settingsRaw.defaultMemoryModel, DEFAULT_SETTINGS.defaultMemoryModel),
    }
    const data: AppData = {
      employees: migrateEmployees(parsed.employees ?? []),
      maxEmployees: parsed.maxEmployees ?? DEFAULT_MAX_EMPLOYEES,
      settings,
      chatHistories: parsed.chatHistories ?? {},
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
  // seatId 변경 시 중복 검증 — 다른 직원이 그 자리에 있으면 거부
  if (patch.seatId && patch.seatId !== data.employees[idx].seatId) {
    const conflict = data.employees.find(e => e.id !== id && e.seatId === patch.seatId)
    if (conflict) {
      throw new Error(`자리 충돌: '${patch.seatId}'는 이미 ${conflict.name}가 사용 중입니다.`)
    }
  }
  data.employees[idx] = { ...data.employees[idx], ...patch }
  await saveData(data)
  return data.employees[idx]
}

export async function addEmployee(employee: Employee): Promise<Employee> {
  const data = await loadData()
  if (data.employees.length >= data.maxEmployees) {
    throw new Error(`최대 직원 수(${data.maxEmployees}명)에 도달했습니다`)
  }
  // seatId 중복 검증
  if (employee.seatId) {
    const conflict = data.employees.find(e => e.seatId === employee.seatId)
    if (conflict) {
      throw new Error(`자리 충돌: '${employee.seatId}'는 이미 ${conflict.name}가 사용 중입니다.`)
    }
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
  // 해고 시 채팅 이력도 같이 삭제 (Day 11+)
  if (data.chatHistories) {
    delete data.chatHistories[id]
  }
  await saveData(data)
  return true
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const data = await loadData()
  data.settings = { ...data.settings, ...patch }
  await saveData(data)
  return data.settings
}

/** 특정 직원 채팅 이력 로드 (Day 11+ — 채팅 영구화 풀 스펙) */
export async function loadChatHistory(employeeId: string): Promise<ChatMessage[]> {
  const data = await loadData()
  return data.chatHistories?.[employeeId] ?? []
}

/** 특정 직원 채팅 이력 저장 — 메시지 1개 추가마다 호출 가능 */
export async function saveChatHistory(employeeId: string, messages: ChatMessage[]): Promise<void> {
  const data = await loadData()
  if (!data.chatHistories) data.chatHistories = {}
  data.chatHistories[employeeId] = messages
  await saveData(data)
}

/** 특정 직원 채팅 이력 삭제 — 해고 시 호출 */
export async function clearChatHistory(employeeId: string): Promise<void> {
  const data = await loadData()
  if (!data.chatHistories) return
  delete data.chatHistories[employeeId]
  await saveData(data)
}
