/**
 * OpenAI (GPT) provider — M-2F-0 멀티모델 확장으로 신설. Vercel AI SDK 기반.
 * 에러 매핑(insufficient_quota → INSUFFICIENT_CREDIT 포함)은 aiProvider.ts 공용 팩토리에서 처리.
 */

import { createOpenAI } from '@ai-sdk/openai'
import { makeAiSdkProvider } from './aiProvider'
import type { Model } from '../../src/shared/types'

/** 우리 alias → OpenAI API model ID (gpt-5-mini는 API ID 그대로) */
function resolveModelId(model: Model): string {
  return model
}

export const openaiProvider = makeAiSdkProvider({
  name: 'openai',
  createFactory: apiKey => {
    const provider = createOpenAI({ apiKey })
    return modelId => provider(modelId)
  },
  resolveModelId,
})
