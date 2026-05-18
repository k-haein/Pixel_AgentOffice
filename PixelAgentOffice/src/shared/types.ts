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

/** 직급 서열 — 인덱스 작을수록 낮은 직급 */
export const RANK_ORDER: Rank[] = [
  '알바', '사원', '대리', '과장', '부장', '이사', '사장', '회장', '레전드',
]

/** 직급 순위 비교 (a >= b 이면 a가 b 이상) */
export function rankGte(a: Rank, b: Rank): boolean {
  return RANK_ORDER.indexOf(a) >= RANK_ORDER.indexOf(b)
}

/** 팀 리더 자격 — 과장 이상부터 가능 (사장은 사장석 전용이므로 팀 리더 X) */
export function canBeTeamLeader(rank: Rank): boolean {
  return rankGte(rank, '과장') && rank !== '사장'
}

/** 사장석에 앉을 자격 — 사장/회장/레전드 (최상위 직급) */
export function canBeBoss(rank: Rank): boolean {
  return rankGte(rank, '사장')
}

export type Model =
  // Anthropic (유료, BYOK)
  | 'claude-opus-4-7'
  | 'claude-sonnet-4-7'
  | 'claude-haiku-4-7'
  // Google (무료 티어)
  | 'gemini-2-5-pro'
  | 'gemini-2-5-flash'

/** 모델별 메타 정보 — UI에서 활용 */
export type ModelTier = 'paid' | 'free'
export type ModelPricing = {
  /** 입력 1M 토큰당 USD */
  inputPerM: number
  /** 출력 1M 토큰당 USD */
  outputPerM: number
}
export const MODEL_INFO: Record<Model, {
  label: string
  tier: ModelTier
  provider: 'anthropic' | 'google'
  desc: string
  /** 분당 요청 한도 (Requests Per Minute). 0이면 사실상 무제한 */
  rpm: number
  /** 가격 (USD per 1M tokens). 무료 모델도 표기상 0 또는 paid tier 가격. */
  pricing: ModelPricing
}> = {
  'claude-opus-4-7':   { label: 'Claude Opus',      tier: 'paid', provider: 'anthropic', desc: '최고 성능 · 비쌈',            rpm: 50, pricing: { inputPerM: 15,    outputPerM: 75   } },
  'claude-sonnet-4-7': { label: 'Claude Sonnet',    tier: 'paid', provider: 'anthropic', desc: '균형 · 권장',                rpm: 50, pricing: { inputPerM: 3,     outputPerM: 15   } },
  'claude-haiku-4-7':  { label: 'Claude Haiku',     tier: 'paid', provider: 'anthropic', desc: '빠름 · 저렴',                rpm: 50, pricing: { inputPerM: 0.80,  outputPerM: 4    } },
  'gemini-2-5-pro':    { label: 'Gemini 2.5 Pro',   tier: 'free', provider: 'google',    desc: '⚠️ 무료 한도 빡빡 (분당 5회)',  rpm: 5,  pricing: { inputPerM: 1.25,  outputPerM: 5    } },
  'gemini-2-5-flash':  { label: 'Gemini 2.5 Flash', tier: 'free', provider: 'google',    desc: '⭐ 무료 · 균형 (분당 10회)',    rpm: 10, pricing: { inputPerM: 0.075, outputPerM: 0.30 } },
}

/** USD → KRW 환율 추정값 (1 USD ≈ ₩X). 정확치 않아도 사용자 직관용. */
export const USD_TO_KRW = 1400

/** 토큰 사용량 → 비용 ($) */
export function estimateCostUsd(model: Model, inputTokens: number, outputTokens: number): number {
  const p = MODEL_INFO[model]?.pricing
  if (!p) return 0
  return (inputTokens * p.inputPerM + outputTokens * p.outputPerM) / 1_000_000
}

/** 폐기된 모델 ID → 살아있는 모델 ID 매핑.
 *  저장 데이터에 옛 모델이 남아있으면 로드 시 자동 치환된다. */
export const DEPRECATED_MODELS: Record<string, Model> = {
  // 2026년 시점에 Google이 신규 사용자에게 차단함 (404)
  'gemini-2-0-flash': 'gemini-2-5-flash',
}

/** 팀 식별자 — 최대 3팀 */
export type TeamId = 'A' | 'B' | 'C'

/** 책상 회전 방향 — 좌·우·정면 (정면이 사장석 쪽을 봄) */
export type DeskOrientation = 'front' | 'left' | 'right'

/** 자리(seat) 식별자 — 사장석 1 + 팀별 5(리더 1 + 팀원 4) × 3팀 = 총 16자리
 *  · 'boss'         — 사장석 (위 중앙)
 *  · 'leader:A'     — 팀 A 리더 자리
 *  · 'member:A:0~3' — 팀 A 팀원 자리 4개 */
export type SeatId =
  | 'boss'
  | `leader:${TeamId}`
  | `member:${TeamId}:${0 | 1 | 2 | 3}`

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
  /** 현재 앉은 자리 (null이면 미배치 — 향후 신입 대기 등) */
  seatId: SeatId | null
  /** 책상 회전 — 기본 'front' */
  deskOrientation: DeskOrientation
  // 진급 추적
  totalMessages: number
  totalMemoryUpdates: number
  totalPraises: number
  // === 레거시 (구버전 호환) ===
  /** @deprecated 자유 배치 모드 시절 X 좌표. seatId 도입 후 폐기. 마이그레이션 후 무시. */
  deskPosition?: { x: number }
}

/** 채팅창 상단 사용량 표시 모드 */
export type UsageDisplayMode = 'chips' | 'toggle'

export type Settings = {
  defaultModel: Model
  defaultMemoryModel: Model
  dailyLimitUsd: number
  /** 'chips' = 모델명 아래 칩 + 커스텀 툴팁 / 'toggle' = 사용량 버튼 + 펼침 스트립 */
  usageDisplayMode: UsageDisplayMode
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
  defaultModel: 'gemini-2-5-flash', // 무료 우선
  defaultMemoryModel: 'gemini-2-5-flash',
  dailyLimitUsd: 5,
  usageDisplayMode: 'chips',
}

/** 사무실 총 자리 수 = 사장 1 + 3팀 × 5 = 16 (사장석은 일반 채용으로 안 채워짐) */
export const DEFAULT_MAX_EMPLOYEES = 15
