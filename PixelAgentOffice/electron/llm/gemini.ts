/**
 * Google (Gemini) provider — Vercel AI SDK 기반 (M-2F-0에서 @google/generative-ai 직접 호출을 대체).
 * 에러 매핑(quota 0 안내 포함)·클라이언트 캐시는 aiProvider.ts 공용 팩토리에서 처리.
 */

import { createGoogle } from '@ai-sdk/google'
import { makeAiSdkProvider } from './aiProvider'
import type { Model } from '../../src/shared/types'

/** 우리 alias → Google Generative AI 모델 ID */
function resolveModelId(model: Model): string {
  switch (model) {
    case 'gemini-2-5-pro':
      return 'gemini-2.5-pro'
    case 'gemini-2-5-flash':
      return 'gemini-2.5-flash'
    default:
      return model.replace(/-/g, '.') // 추측 매핑
  }
}

export const geminiProvider = makeAiSdkProvider({
  name: 'google',
  createFactory: apiKey => {
    const provider = createGoogle({ apiKey })
    return modelId => provider(modelId)
  },
  resolveModelId,
})
