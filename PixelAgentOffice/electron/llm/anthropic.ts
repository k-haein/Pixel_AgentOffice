/**
 * Anthropic (Claude) provider — Vercel AI SDK 기반 (M-2F-0에서 @anthropic-ai/sdk 직접 호출을 대체).
 * 에러 매핑·클라이언트 캐시는 aiProvider.ts 공용 팩토리에서 처리.
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import { makeAiSdkProvider } from './aiProvider'
import type { Model } from '../../src/shared/types'

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

export const anthropicProvider = makeAiSdkProvider({
  name: 'anthropic',
  createFactory: apiKey => {
    const provider = createAnthropic({ apiKey })
    return modelId => provider(modelId)
  },
  resolveModelId,
})
