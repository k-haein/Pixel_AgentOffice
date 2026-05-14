import Anthropic from '@anthropic-ai/sdk'
import {
  type LLMProvider,
  type ChatRequest,
  type ChatResponse,
  LLMError,
} from './types'
import type { Model } from '../../src/shared/types'

let clientCache: { key: string; client: Anthropic } | null = null

function getClient(apiKey: string): Anthropic {
  if (clientCache && clientCache.key === apiKey) return clientCache.client
  const client = new Anthropic({ apiKey })
  clientCache = { key: apiKey, client }
  return client
}

/** 우리 alias → Anthropic API model ID 매핑 */
function resolveModelId(model: Model): string {
  switch (model) {
    case 'claude-opus-4-7':
      return 'claude-opus-4-5'
    case 'claude-sonnet-4-7':
      return 'claude-sonnet-4-5'
    case 'claude-haiku-4-7':
      return 'claude-haiku-4-5'
    default:
      return model
  }
}

export const anthropicProvider: LLMProvider = {
  name: 'anthropic',

  async chat(request: ChatRequest, apiKey: string): Promise<ChatResponse> {
    const client = getClient(apiKey)
    const modelId = resolveModelId(request.model)

    try {
      const response = await client.messages.create({
        model: modelId,
        max_tokens: request.maxTokens ?? 4096,
        system: request.systemPrompt,
        messages: request.messages,
      })

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(b => b.text)
        .join('\n')

      return {
        text,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      }
    } catch (err) {
      if (err instanceof Anthropic.APIError) {
        if (err.status === 401) {
          clientCache = null
          throw new LLMError('anthropic', 'INVALID_KEY', 'API 키가 유효하지 않습니다.')
        }
        if (err.status === 429) {
          throw new LLMError('anthropic', 'RATE_LIMIT', '요청이 많아요. 잠시 후 다시.')
        }
        throw new LLMError('anthropic', 'API_ERROR', `Claude API (${err.status}): ${err.message}`)
      }
      if (err instanceof Anthropic.APIConnectionError) {
        throw new LLMError('anthropic', 'NETWORK', '네트워크 연결을 확인해주세요.')
      }
      throw new LLMError('anthropic', 'UNKNOWN', (err as Error).message ?? '알 수 없는 오류')
    }
  },

  invalidateCache() {
    clientCache = null
  },
}
