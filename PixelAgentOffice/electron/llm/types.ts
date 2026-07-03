import type { Model } from '../../src/shared/types'

export type ProviderName = 'anthropic' | 'google' | 'openai'

// ───── tool-calling (Phase 1 — 2층 협업의 갭1) ─────

/** 도구 정의 — AI가 호출할 수 있는 함수 스펙. parameters는 JSON Schema (루트 type: 'object') */
export type ToolDef = {
  name: string
  description: string
  parameters: Record<string, unknown>
}

/** AI가 요청한 도구 호출 */
export type ToolCall = {
  id: string
  name: string
  args: unknown
}

/** 도구 실행 결과 — role:'tool' 메시지로 모델에 되돌려준다 */
export type ToolResultMsg = {
  toolCallId: string
  name: string
  /** JSON 직렬화 가능한 결과 값 */
  result: unknown
}

export type ChatMessage =
  | { role: 'user'; content: string }
  /** toolCalls가 있으면 "모델이 도구를 호출한 턴"의 기록 — 다음 요청에 그대로 되돌려줘야 함 */
  | { role: 'assistant'; content: string; toolCalls?: ToolCall[] }
  /** 도구 실행 결과 턴 (Phase 2 에이전트 루프가 생성) */
  | { role: 'tool'; results: ToolResultMsg[] }

export type ChatRequest = {
  model: Model
  systemPrompt: string
  messages: ChatMessage[]
  /** 모델에게 쥐여줄 도구 목록 (없으면 기존 1층 텍스트 대화와 동일) */
  tools?: ToolDef[]
  maxTokens?: number
}

export type ChatResponse = {
  text: string
  /** 모델이 도구 호출을 요청했으면 채워짐 — stopReason === 'tool_calls' */
  toolCalls?: ToolCall[]
  /** 'tool_calls'면 루프 계속 (도구 실행 후 재호출), 'end'면 종료 */
  stopReason: 'end' | 'tool_calls'
  usage: {
    inputTokens: number
    outputTokens: number
  }
}

export type LLMErrorCode =
  | 'NO_API_KEY'
  | 'INVALID_KEY'
  | 'NETWORK'
  | 'RATE_LIMIT'           // 서버가 429 응답 (실제 한도 초과)
  | 'RATE_LIMIT_LOCAL'     // 우리 sliding window 카운터 사전 차단
  | 'DAILY_LIMIT'          // 오늘 누적 비용이 일일 한도 도달 (G-2 — 디스크 영구화 기반, 재시작 우회 불가)
  | 'INSUFFICIENT_CREDIT'  // 잔액/충전 부족 (Anthropic credit_balance_too_low 등)
  | 'SERVICE_BUSY'         // 503 / overloaded / high demand — Google·Anthropic 일시 과부하
  | 'API_ERROR'
  | 'ABORTED'              // 사용자가 도중에 취소
  | 'UNKNOWN'

export class LLMError extends Error {
  code: LLMErrorCode
  provider: ProviderName

  constructor(provider: ProviderName, code: LLMErrorCode, message: string) {
    super(message)
    this.code = code
    this.provider = provider
    this.name = 'LLMError'
  }
}

/** Provider 공통 인터페이스 — Anthropic, Google, (추후) Groq 모두 구현 */
export interface LLMProvider {
  readonly name: ProviderName
  /** 대화 요청 (비-스트리밍). signal로 중간 취소 가능 */
  chat(request: ChatRequest, apiKey: string, signal?: AbortSignal): Promise<ChatResponse>
  /** 키 캐시 무효화 */
  invalidateCache(): void
}
