import { providerFromModel, getProvider } from './registry'
import { loadApiKey } from './apiKeys'
import { LLMError, type ChatRequest, type ChatResponse } from './types'

/** Model에서 provider 자동 결정 → API 키 로드 → provider.chat() 호출 */
export async function chat(request: ChatRequest): Promise<ChatResponse> {
  const providerName = providerFromModel(request.model)
  const apiKey = await loadApiKey(providerName)
  if (!apiKey) {
    const labels: Record<typeof providerName, string> = {
      anthropic: 'Anthropic (Claude)',
      google: 'Google (Gemini)',
    }
    throw new LLMError(
      providerName,
      'NO_API_KEY',
      `${labels[providerName]} API 키가 설정되지 않았습니다. 설정에서 입력해주세요.`,
    )
  }
  const provider = getProvider(providerName)
  return await provider.chat(request, apiKey)
}
