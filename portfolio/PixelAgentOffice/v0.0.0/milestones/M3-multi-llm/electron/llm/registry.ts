import type { Model } from '../../src/shared/types'
import { anthropicProvider } from './anthropic'
import { geminiProvider } from './gemini'
import type { LLMProvider, ProviderName } from './types'

/** Model 이름으로 provider 추론 */
export function providerFromModel(model: Model): ProviderName {
  if (model.startsWith('claude')) return 'anthropic'
  if (model.startsWith('gemini')) return 'google'
  // 향후 groq, ollama 등 확장
  return 'anthropic' // fallback
}

/** Provider 인스턴스 가져오기 */
export function getProvider(name: ProviderName): LLMProvider {
  switch (name) {
    case 'anthropic':
      return anthropicProvider
    case 'google':
      return geminiProvider
    default:
      throw new Error(`Unknown provider: ${name}`)
  }
}

/** 모든 provider 캐시 무효화 */
export function invalidateAllCaches(): void {
  anthropicProvider.invalidateCache()
  geminiProvider.invalidateCache()
}
