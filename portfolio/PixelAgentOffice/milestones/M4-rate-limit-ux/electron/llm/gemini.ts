import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  type LLMProvider,
  type ChatRequest,
  type ChatResponse,
  LLMError,
} from './types'
import type { Model } from '../../src/shared/types'

let clientCache: { key: string; client: GoogleGenerativeAI } | null = null

function getClient(apiKey: string): GoogleGenerativeAI {
  if (clientCache && clientCache.key === apiKey) return clientCache.client
  const client = new GoogleGenerativeAI(apiKey)
  clientCache = { key: apiKey, client }
  return client
}

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

export const geminiProvider: LLMProvider = {
  name: 'google',

  async chat(request: ChatRequest, apiKey: string, signal?: AbortSignal): Promise<ChatResponse> {
    const client = getClient(apiKey)
    const modelId = resolveModelId(request.model)

    try {
      // Gemini는 system instruction을 model 생성 시 옵션으로 받음
      const model = client.getGenerativeModel({
        model: modelId,
        systemInstruction: request.systemPrompt,
        generationConfig: {
          maxOutputTokens: request.maxTokens ?? 4096,
        },
      })

      // Gemini history 형식 변환: role='user'|'model', parts=[{text}]
      // 마지막 user 메시지는 sendMessage로 보냄, 그 외는 history로
      const history = request.messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))
      const last = request.messages[request.messages.length - 1]
      if (!last || last.role !== 'user') {
        throw new LLMError('google', 'API_ERROR', '마지막 메시지는 user여야 합니다.')
      }

      const chat = model.startChat({ history })
      const result = await chat.sendMessage(last.content, { signal })
      const response = result.response

      const text = response.text()
      const usage = response.usageMetadata
      return {
        text,
        usage: {
          inputTokens: usage?.promptTokenCount ?? 0,
          outputTokens: usage?.candidatesTokenCount ?? 0,
        },
      }
    } catch (err) {
      // 사용자 취소 — 시그널이 abort 됐다면 ABORTED로 분류
      if (signal?.aborted || (err as Error)?.name === 'AbortError') {
        throw new LLMError('google', 'ABORTED', 'cancelled')
      }
      // 원본 에러를 main process 콘솔에 출력 (개발자 디버깅용)
      console.error('[gemini] raw error:', err)
      const e = err as { status?: number; message?: string; statusText?: string; cause?: unknown }
      const msg = e?.message ?? '알 수 없는 오류'
      const status = e?.status

      // 1) 진짜 네트워크/DNS/연결 거부 — HTTP status 가 없고 Node fetch 가 던지는 구체적 신호일 때만
      //    (SDK 의 'Error fetching from <url>' 프리픽스는 모든 API 에러에 붙으므로 'fetch' 단어만으로는 판단 X)
      const looksLikeRealNetwork =
        !status &&
        (msg === 'fetch failed' ||
          msg.includes('ENOTFOUND') ||
          msg.includes('ECONNREFUSED') ||
          msg.includes('ETIMEDOUT') ||
          msg.includes('EAI_AGAIN') ||
          msg.includes('network request failed') ||
          msg.toLowerCase().includes('getaddrinfo'))
      if (looksLikeRealNetwork) {
        throw new LLMError('google', 'NETWORK', '네트워크 연결을 확인해주세요. (DNS/방화벽/프록시 차단 가능성)')
      }

      // 2) 인증
      if (status === 401 || status === 403 || msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
        clientCache = null
        throw new LLMError('google', 'INVALID_KEY', 'Google API 키가 유효하지 않거나 권한이 없습니다.')
      }

      // 3) 할당량 / 레이트 리밋
      if (status === 429 || msg.includes('quota') || msg.includes('RATE_LIMIT') || msg.includes('Resource has been exhausted')) {
        if (msg.includes('limit: 0')) {
          throw new LLMError(
            'google',
            'API_ERROR',
            '🚫 이 프로젝트의 Gemini API quota가 0입니다.\n해결: ① aistudio.google.com/apikey 에서 "Default Gemini Project" 같은 기존 프로젝트로 키를 재발급하거나, ② Google Cloud Console에서 현재 프로젝트에 결제 계정을 연결해주세요.',
          )
        }
        throw new LLMError('google', 'RATE_LIMIT', 'Gemini 무료 한도 초과. 1분 후 다시 시도하거나 다른 모델을 써보세요.')
      }

      // 4) Google 서비스 일시 과부하 (자주 발생)
      if (
        status === 503 ||
        status === 500 ||
        status === 504 ||
        msg.includes('Service Unavailable') ||
        msg.includes('overloaded') ||
        msg.toLowerCase().includes('high demand') ||
        msg.toLowerCase().includes('experiencing high')
      ) {
        throw new LLMError('google', 'SERVICE_BUSY', `Gemini server busy (${status ?? '5xx'})`)
      }

      // 5) 모델/요청 자체가 잘못된 경우 (404 = 모델 ID 오류 등)
      throw new LLMError('google', 'API_ERROR', `Gemini API (${status ?? 'no-status'}): ${msg}`)
    }
  },

  invalidateCache() {
    clientCache = null
  },
}
