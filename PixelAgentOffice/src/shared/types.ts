// 공유 타입 — main process와 renderer 둘 다 사용

export type Template = 'editor' | 'writer' | 'custom'

/** 캐릭터 색 팔레트 (v2 — 커스텀 캐릭터 12색). hex 매핑은 CHARACTER_PALETTE에 */
export type CharacterPalette =
  | 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue'
  | 'purple' | 'pink' | 'brown' | 'gray' | 'white' | 'black'

export const CHARACTER_PALETTE: Record<CharacterPalette, number> = {
  red:    0xc83838,
  orange: 0xe87a4a,
  yellow: 0xe8c060,
  green:  0x4a8a4a,
  cyan:   0x7ab5e0,
  blue:   0x3868a8,
  purple: 0x8a48a8,
  pink:   0xd878a8,
  brown:  0x6a4030,
  gray:   0x7a7a7a,
  white:  0xe8e8e8,
  black:  0x2a2a2a,
}

/** 캐릭터 무늬 (v2 — 모든 템플릿 적용 가능) */
export type CharacterPattern = 'solid' | 'speckled' | 'gradient' | 'stripes'

export const CHARACTER_PATTERN_LABELS: Record<CharacterPattern, string> = {
  solid:    '단색',
  speckled: '점박이',
  gradient: '그라데이션',
  stripes:  '줄무늬',
}

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
  /** 커스텀 캐릭터 색 (template='custom' 일 때만 사용) — v2 #17 */
  customColor?: CharacterPalette
  /** 무늬 (모든 템플릿 적용 가능) — v2 #18. 기본 'solid' */
  pattern?: CharacterPattern
  /** 액세서리 (Day 11 v2.5 C) — 머리/얼굴에 입히는 아이템. null이면 없음 */
  accessoryId?: AccessoryId
  /** 책상 위 소품 (Day 11 v2.5 D) — 머그컵·화분·노트북. null이면 기본 (메모만) */
  deskItem?: DeskItemId
  /** 기본 idle emotion (Day 11 후속 +2) — 평소 말풍선에 표시. LLM 응답 시 일시 변경 후 복귀. 기본 'thinking' */
  idleEmotion?: BubbleEmotion
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

/** 팀 팻말 디자인 — Day 11 상점 카탈로그 (3종 시작) */
export type TeamPlateStyle = 'wood' | 'hanging' | 'stone'

/** 캐릭터 액세서리 (Day 11 v2.5 C) — 머리/얼굴에 추가되는 아이템 */
export type AccessoryId = 'glasses' | 'sunglasses' | 'cap'

/** 책상 위 소품 (Day 11 v2.5 D) — 캐릭터 옆 작은 디테일 */
export type DeskItemId = 'mug' | 'plant' | 'laptop'

/** 말풍선 안 emotion (Day 11 v2.5 A, Day 11 후속 +2 shared로 이동).
 *  12종 — OfficeScene.BUBBLE_INNER_PIXELS와 동기 유지. Employee.idleEmotion에서 사용. */
export type BubbleEmotion =
  | 'thinking' | 'happy' | 'surprised' | 'sleepy' | 'confused'
  | 'idea' | 'love' | 'angry' | 'sad' | 'sweat' | 'music' | 'wow'

/** 사용자 노출용 emotion 라벨 (MemoModal 선택 UI 등) */
export const EMOTION_LABELS: Record<BubbleEmotion, { emoji: string; name: string }> = {
  thinking:  { emoji: '⋯',  name: '생각 중 (기본)' },
  happy:     { emoji: '◡',  name: '기쁨' },
  surprised: { emoji: '‼',  name: '놀람' },
  sleepy:    { emoji: 'Z',  name: '졸음' },
  confused:  { emoji: '?',  name: '혼란' },
  idea:      { emoji: '💡', name: '아이디어' },
  love:      { emoji: '♥',  name: '사랑' },
  angry:     { emoji: '✗',  name: '화남' },
  sad:       { emoji: '💧', name: '슬픔' },
  sweat:     { emoji: '💦', name: '땀' },
  music:     { emoji: '♪',  name: '음악' },
  wow:       { emoji: '✨', name: '와우' },
}

/** 배치 가능한 가구 ID (P2 #25, Day 11 후속). 기존 3종 + 단순 픽셀 5종 = 8종 */
export type FurnitureId =
  | 'plant-large'      // 대형 화분 (PLANT 재사용)
  | 'bookshelf-tall'   // 큰 책장 5단 (BOOKSHELF 재사용)
  | 'vending-soda'     // 음료 자판기 (VENDING 재사용)
  | 'sofa'             // 소파 (신규)
  | 'calendar'         // 벽 캘린더 (신규)
  | 'frame'            // 액자 (신규)
  | 'trash-can'        // 휴지통 (신규)
  | 'lounge-table'     // 탕비실 테이블 (신규)

/** 사무실에 배치된 가구 인스턴스 — Settings에 배열로 저장. uid는 placed timestamp+rand */
export type PlacedFurniture = {
  uid: string          // 고유 ID (드래그·제거 식별)
  itemId: FurnitureId  // 카탈로그 itemId
  xRatio: number       // 0~1 (사무실 width 비율)
  yRatio: number       // 0~1 (사무실 height 비율)
}

export type Settings = {
  defaultModel: Model
  defaultMemoryModel: Model
  dailyLimitUsd: number
  /** 'chips' = 모델명 아래 칩 + 커스텀 툴팁 / 'toggle' = 사용량 버튼 + 펼침 스트립 */
  usageDisplayMode: UsageDisplayMode
  /** 팀 표시 이름 — 우클릭으로 사용자 편집 가능 (P1 #11) */
  teamNames: { A: string; B: string; C: string }
  /** 팀 팻말 디자인 — 전체 동일 (Day 11). 팀별 분리는 추후 확장 */
  teamPlateStyle?: TeamPlateStyle
  /** 사무실에 배치한 가구 — 사용자 자유 위치 (P2 #25, Day 11 후속) */
  placedFurniture?: PlacedFurniture[]
  // API 키는 safeStorage에 따로 저장
}

/** 채팅 메시지 (ChatPopup의 Message 타입 — shared로 이동, 영속화용) */
export type ChatMessage = {
  id: string
  role: 'user' | 'agent' | 'system'
  text: string
  /** system 메시지에 부가 힌트 (작게, 약하게 표시) */
  hint?: string
  severity?: 'info' | 'warning' | 'error'
  /** 디버그 단서 (예: HTTP 503) — 메시지 옆에 작게 표기 */
  debugCode?: string
}

export type AppData = {
  employees: Employee[]
  maxEmployees: number
  settings: Settings
  /** 채팅 이력 — employeeId → 메시지 배열 (P1 #13 풀 스펙, Day 11 후속) */
  chatHistories?: Record<string, ChatMessage[]>
}

// 템플릿 정의 (UI에서 채용 시 기본값)
export const TEMPLATES: Record<Template, {
  emoji: string
  defaultName: string
  defaultRole: string
  baseInstructions: string
  variant: 'basic' | 'jellyfish' | 'custom'
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
  custom: {
    emoji: '🐙',
    defaultName: '새 직원',
    defaultRole: '직업 입력',
    baseInstructions: '', // 사용자가 placeholder 보고 자기 형식으로 입력
    variant: 'custom',
  },
}

/** 지침 입력 placeholder — "직업 : 이름" 포맷 (v2 #20) */
export const INSTRUCTIONS_PLACEHOLDER = `예시 형식 — "직업 : 이름" :

디자이너 : 미니멀 톤으로 답변합니다.
개발자 : 코드 예시와 함께 짧게 설명합니다.
PM : 일정·우선순위 위주로 답합니다.
마케터 : 후킹 카피와 카테고리로 정리합니다.`

export const DEFAULT_SETTINGS: Settings = {
  defaultModel: 'gemini-2-5-flash', // 무료 우선
  defaultMemoryModel: 'gemini-2-5-flash',
  dailyLimitUsd: 5,
  usageDisplayMode: 'chips',
  teamNames: { A: '팀 A', B: '팀 B', C: '팀 C' },
  teamPlateStyle: 'wood',
  placedFurniture: [],
}

/** 사무실 총 자리 수 = 사장 1 + 3팀 × 5 = 16 (사장석은 일반 채용으로 안 채워짐) */
export const DEFAULT_MAX_EMPLOYEES = 15
