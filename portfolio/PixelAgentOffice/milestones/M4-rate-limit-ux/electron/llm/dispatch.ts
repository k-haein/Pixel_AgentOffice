import { providerFromModel, getProvider } from './registry'
import { loadApiKey } from './apiKeys'
import { LLMError, type ChatRequest, type ChatResponse } from './types'
import * as usage from './usage'

/** Model에서 provider 자동 결정 → 사전 rate-limit 검사 → 키 로드 → provider.chat() 호출 */
export async function chat(request: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
  const providerName = providerFromModel(request.model)

  // 1) Sliding-window 사전 차단 — API 호출 전에 우리가 알 수 있는 한도라면 미리 끊는다
  const status = usage.canProceed(request.model)
  if (status.limit > 0 && status.remaining <= 0) {
    throw new LLMError(
      providerName,
      'RATE_LIMIT_LOCAL',
      `분당 한도 ${status.limit}회를 다 썼습니다. ${Math.ceil(status.resetInMs / 1000)}초 후 다시 시도해주세요.`,
    )
  }

  // 2) API 키 확인
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

  // 3) 실제 호출 — 시도 자체는 한도 카운터에 기록 (성공/실패 무관: 한도는 시도 횟수 기준)
  usage.record(request.model)
  const provider = getProvider(providerName)
  const response = await provider.chat(request, apiKey, signal)
  // 4) 성공 시 토큰 사용량 누적 (세션 통계)
  usage.recordTokens(request.model, response.usage.inputTokens, response.usage.outputTokens)
  return response
}

/** UI에서 호출하는 rate-limit 조회 */
export function getRateLimit(model: ChatRequest['model']) {
  return usage.getStatus(model)
}
