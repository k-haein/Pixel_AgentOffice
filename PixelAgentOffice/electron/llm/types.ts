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
  | 'RATE_LIMIT'
  | 'API_ERROR'
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
  /** 대화 요청 (비-스트리밍) */
  chat(request: ChatRequest, apiKey: string): Promise<ChatResponse>
  /** 키 캐시 무효화 */
  invalidateCache(): void
}
