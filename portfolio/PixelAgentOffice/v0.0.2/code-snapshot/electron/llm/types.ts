import type { Model } from '../../src/shared/types'

export type ProviderName = 'anthropic' | 'google'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ChatRequest = {
  model: Model
  systemPrompt: string
  messages: ChatMessage[]
  maxTokens?: number
}

export type ChatResponse = {
  text: string
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
