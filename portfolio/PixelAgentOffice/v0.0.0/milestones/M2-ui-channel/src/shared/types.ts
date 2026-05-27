// 공유 타입 — main process와 renderer 둘 다 사용

export type Template = 'editor' | 'writer'

export type MemoryMode = 'off' | 'manual' | 'ask' | 'auto'

export type PromotionMode = 'quantitative' | 'qualitative' | 'time' | 'mixed' | 'off'

export type Rank =
  | '알바'
  | '사원'
  | '대리'
  | '과장'
  | '부장'
  | '이사'
  | '사장'
  | '회장'
  | '레전드'

export type Model =
  | 'claude-opus-4-7'
  | 'claude-sonnet-4-7'
  | 'claude-haiku-4-7'

export type Employee = {
  id: string
  template: Template
  name: string
  role: string
  emoji: string
  baseInstructions: string
  customInstructions: string
  model: Model
  memoryModel: Model
  memoryMode: MemoryMode
  rank: Rank
  promotionMode: PromotionMode
  hiredAt: string // ISO date
  deskPosition: { x: number }
  // 진급 추적
  totalMessages: number
  totalMemoryUpdates: number
  totalPraises: number
}

export type Settings = {
  defaultModel: Model
  defaultMemoryModel: Model
  dailyLimitUsd: number
  // API 키는 safeStorage에 따로 저장
}

export type AppData = {
  employees: Employee[]
  maxEmployees: number
  settings: Settings
}

// 템플릿 정의 (UI에서 채용 시 기본값)
export const TEMPLATES: Record<Template, {
  emoji: string
  defaultName: string
  defaultRole: string
  baseInstructions: string
  variant: 'basic' | 'jellyfish'
  alpha?: number
}> = {
  editor: {
    emoji: '✍️',
    defaultName: 'Mary',
    defaultRole: '편집자',
    baseInstructions: `당신은 꼼꼼한 편집자입니다.
사용자의 글을 받으면 짧고 또렷한 문장으로 다듬어 주세요.
비유는 절제하고, 톤은 차분하게 유지합니다.`,
    variant: 'basic',
  },
  writer: {
    emoji: '🪼',
    defaultName: 'Haewol',
    defaultRole: '작가',
    baseInstructions: `당신은 창의적인 작가입니다.
바다와 별이 등장하는 비유를 즐겨 쓰며,
글의 정서적 흐름을 가장 중요하게 봅니다.`,
    variant: 'jellyfish',
    alpha: 0.85,
  },
}

export const DEFAULT_SETTINGS: Settings = {
  defaultModel: 'claude-sonnet-4-7',
  defaultMemoryModel: 'claude-haiku-4-7',
  dailyLimitUsd: 5,
}

export const DEFAULT_MAX_EMPLOYEES = 2
