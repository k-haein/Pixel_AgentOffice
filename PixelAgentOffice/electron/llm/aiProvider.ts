/**
 * Vercel AI SDK 공용 provider 팩토리 (M-2F-0).
 *
 * anthropic/google/openai 세 provider는 "SDK 인스턴스 생성 → generateText → 에러 매핑"
 * 흐름이 동일해서 여기 한 곳에 모은다. 밖으로 드러나는 LLMProvider 인터페이스는
 * 기존과 동일 — dispatch.ts의 rate-limit·일일 비용 한도 경로는 그대로 유지된다.
 *
 * 주의: 이 파일은 electron을 import하지 않는다 (§8 — 나중에 서버로 들어올릴 두뇌).
 */

import { generateText, APICallError, jsonSchema, tool } from 'ai'
import type { JSONSchema7, LanguageModel, ModelMessage, ToolSet } from 'ai'
import type { Model } from '../../src/shared/types'
import {
  LLMError,
  type ChatMessage,
  type ChatRequest,
  type ChatResponse,
  type LLMProvider,
  type ProviderName,
  type ToolDef,
} from './types'

/** modelId → AI SDK LanguageModel 인스턴스 */
type ModelFactory = (modelId: string) => LanguageModel

/** 우리 ToolDef[] → AI SDK ToolSet. execute를 안 주므로 모델의 도구 호출이 그대로 반환된다
 *  (실행은 Phase 2 에이전트 루프의 몫 — 여기서 SDK 내부 루프를 돌리지 않는다) */
function toSdkTools(tools?: ToolDef[]): ToolSet | undefined {
  if (!tools || tools.length === 0) return undefined
  const set: ToolSet = {}
  for (const t of tools) {
    set[t.name] = tool({
      description: t.description,
      inputSchema: jsonSchema(t.parameters as JSONSchema7),
    })
  }
  return set
}

/** 우리 ChatMessage[] → AI SDK ModelMessage[] (tool-call/tool-result 파트 변환) */
function toSdkMessages(messages: ChatMessage[]): ModelMessage[] {
  return messages.map((m): ModelMessage => {
    if (m.role === 'user') {
      return { role: 'user', content: m.content }
    }
    if (m.role === 'assistant') {
      if (!m.toolCalls || m.toolCalls.length === 0) {
        return { role: 'assistant', content: m.content }
      }
      return {
        role: 'assistant',
        content: [
          ...(m.content ? [{ type: 'text' as const, text: m.content }] : []),
          ...m.toolCalls.map(tc => ({
            type: 'tool-call' as const,
            toolCallId: tc.id,
            toolName: tc.name,
            input: tc.args,
          })),
        ],
      }
    }
    // role === 'tool' — 도구 실행 결과를 모델에 되돌려주는 턴
    return {
      role: 'tool',
      content: m.results.map(r => ({
        type: 'tool-result' as const,
        toolCallId: r.toolCallId,
        toolName: r.name,
        output: { type: 'json' as const, value: r.result as never },
      })),
    }
  })
}

/** 에러 메시지에 붙일 provider별 API 이름 (extractDebugCode의 "(NNN)" 파싱 형식 유지) */
const API_LABEL: Record<ProviderName, string> = {
  anthropic: 'Claude API',
  google: 'Gemini API',
  openai: 'OpenAI API',
}

/** err → 체인 어딘가의 APICallError (AI SDK가 RetryError 등으로 감싸는 케이스 대응) */
function findApiCallError(err: unknown): APICallError | null {
  let current: unknown = err
  for (let depth = 0; depth < 4 && current; depth++) {
    if (APICallError.isInstance(current)) return current
    const e = current as { cause?: unknown; lastError?: unknown }
    current = e.cause ?? e.lastError
  }
  return null
}

/** 진짜 네트워크/DNS/연결 거부 신호 (HTTP status가 없을 때만 판단) */
function looksLikeNetwork(detail: string): boolean {
  const lower = detail.toLowerCase()
  return (
    detail.includes('fetch failed') ||
    detail.includes('ENOTFOUND') ||
    detail.includes('ECONNREFUSED') ||
    detail.includes('ETIMEDOUT') ||
    detail.includes('EAI_AGAIN') ||
    lower.includes('network request failed') ||
    lower.includes('getaddrinfo')
  )
}

/** AI SDK 에러 → 우리 LLMError 분류 (기존 anthropic.ts/gemini.ts의 규칙 통합) */
function mapError(name: ProviderName, err: unknown, onAuthFail: () => void): LLMError {
  const apiErr = findApiCallError(err)
  const status = apiErr?.statusCode
  const msg = (err as Error)?.message ?? '알 수 없는 오류'
  // 분류 판정은 메시지 + 응답 본문 둘 다 본다 (SDK가 본문을 message에 안 실어줄 때 대비)
  const detail = `${msg}\n${apiErr?.responseBody ?? ''}`
  const lower = detail.toLowerCase()

  // 1) 네트워크/DNS/연결 거부 — status 없이 Node fetch가 던지는 구체적 신호일 때만
  if (!status && looksLikeNetwork(detail)) {
    return new LLMError(name, 'NETWORK', '네트워크 연결을 확인해주세요. (DNS/방화벽/프록시 차단 가능성)')
  }

  // 2) 인증 실패 — 키 자체가 잘못됐으니 클라이언트 캐시도 버린다
  if (
    status === 401 ||
    status === 403 ||
    detail.includes('API_KEY_INVALID') ||
    detail.includes('API key not valid') ||
    detail.includes('invalid x-api-key') ||
    detail.includes('Incorrect API key')
  ) {
    onAuthFail()
    return new LLMError(name, 'INVALID_KEY', 'API 키가 유효하지 않거나 권한이 없습니다.')
  }

  // 3) 잔액/충전 부족 — Anthropic credit_balance_too_low, OpenAI insufficient_quota(429로 옴) 등
  if (
    detail.includes('credit_balance_too_low') ||
    detail.includes('insufficient_quota') ||
    (status === 400 && (lower.includes('insufficient') || lower.includes('billing')))
  ) {
    return new LLMError(name, 'INSUFFICIENT_CREDIT', msg)
  }

  // 4) 레이트리밋/할당량
  if (status === 429 || detail.includes('quota') || detail.includes('Resource has been exhausted')) {
    // Gemini 신규 프로젝트 quota 0 케이스 — 안내가 다르다 (기존 gemini.ts 동작 유지)
    if (name === 'google' && detail.includes('limit: 0')) {
      return new LLMError(
        name,
        'API_ERROR',
        '🚫 이 프로젝트의 Gemini API quota가 0입니다.\n해결: ① aistudio.google.com/apikey 에서 "Default Gemini Project" 같은 기존 프로젝트로 키를 재발급하거나, ② Google Cloud Console에서 현재 프로젝트에 결제 계정을 연결해주세요.',
      )
    }
    if (name === 'google') {
      return new LLMError(name, 'RATE_LIMIT', 'Gemini 무료 한도 초과. 1분 후 다시 시도하거나 다른 모델을 써보세요.')
    }
    return new LLMError(name, 'RATE_LIMIT', '요청이 많아요. 잠시 후 다시.')
  }

  // 5) 서비스 일시 과부하 (5xx / overloaded)
  if (
    status === 500 || status === 503 || status === 504 || status === 529 ||
    lower.includes('overloaded') ||
    lower.includes('service unavailable') ||
    lower.includes('high demand') ||
    lower.includes('experiencing high')
  ) {
    return new LLMError(name, 'SERVICE_BUSY', `${API_LABEL[name]} busy (${status ?? '5xx'})`)
  }

  // 6) 분류 못 한 API 에러
  return new LLMError(name, 'API_ERROR', `${API_LABEL[name]} (${status ?? 'no-status'}): ${msg}`)
}

/** AI SDK 기반 LLMProvider 생성 */
export function makeAiSdkProvider(opts: {
  name: ProviderName
  /** apiKey → 그 키로 초기화된 모델 팩토리 (createAnthropic/createGoogle/createOpenAI 래핑) */
  createFactory: (apiKey: string) => ModelFactory
  /** 우리 alias → 실제 API 모델 ID */
  resolveModelId: (model: Model) => string
}): LLMProvider {
  let factoryCache: { key: string; factory: ModelFactory } | null = null

  function getFactory(apiKey: string): ModelFactory {
    if (factoryCache && factoryCache.key === apiKey) return factoryCache.factory
    const factory = opts.createFactory(apiKey)
    factoryCache = { key: apiKey, factory }
    return factory
  }

  return {
    name: opts.name,

    async chat(request: ChatRequest, apiKey: string, signal?: AbortSignal): Promise<ChatResponse> {
      const factory = getFactory(apiKey)
      const modelId = opts.resolveModelId(request.model)

      try {
        const result = await generateText({
          model: factory(modelId),
          system: request.systemPrompt,
          messages: toSdkMessages(request.messages),
          tools: toSdkTools(request.tools),
          maxOutputTokens: request.maxTokens ?? 4096,
          abortSignal: signal,
        })
        const toolCalls = result.toolCalls.map(tc => ({
          id: tc.toolCallId,
          name: tc.toolName,
          args: tc.input,
        }))
        return {
          text: result.text,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          stopReason: result.finishReason === 'tool-calls' ? 'tool_calls' : 'end',
          usage: {
            inputTokens: result.usage.inputTokens ?? 0,
            outputTokens: result.usage.outputTokens ?? 0,
          },
        }
      } catch (err) {
        // 사용자 취소 — 시그널이 abort 됐다면 ABORTED로 분류
        if (signal?.aborted || (err as Error)?.name === 'AbortError') {
          throw new LLMError(opts.name, 'ABORTED', 'cancelled')
        }
        // ───── 진단 로그 — fetch 실패·SSL·DNS 재발 시 첫 단서 (ideas/18 진단 절차 참고) ─────
        console.error(`[${opts.name}] raw error:`, err)
        const cause = (err as { cause?: unknown })?.cause
        if (cause) console.error(`[${opts.name}] cause:`, cause)
        // ──────────────────────────────────────────────────────────────
        throw mapError(opts.name, err, () => { factoryCache = null })
      }
    },

    invalidateCache() {
      factoryCache = null
    },
  }
}
