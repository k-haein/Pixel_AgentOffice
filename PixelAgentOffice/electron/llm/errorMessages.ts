/**
 * LLMError → 사용자 친화적 한글 메시지.
 *
 * 일반 사용자 타겟 — raw API 메시지는 무서움.
 * 그래도 디버깅 단서가 필요할 땐 (UNKNOWN 등) 원본을 살짝 노출.
 */

import type { LLMError, ProviderName } from './types'
import type { Model } from '../../src/shared/types'
import { MODEL_INFO } from '../../src/shared/types'

function providerLabel(p: ProviderName): string {
  if (p === 'anthropic') return 'Claude'
  if (p === 'google') return 'Gemini'
  return 'GPT'
}

/** 원본 에러 메시지에서 HTTP status 추출 (예: "Claude API (503): ..." → "HTTP 503") */
function extractDebugCode(err: LLMError): string | undefined {
  const m = err.message.match(/\((\d{3})\)/)
  if (m) return `HTTP ${m[1]}`
  // status 없으면 우리 코드 그대로
  return err.code
}

export type FriendlyError = {
  /** 사용자에게 보일 짧은 한글 메시지 */
  message: string
  /** 사용자가 취할 수 있는 액션 (있으면) */
  hint?: string
  /** 카운트다운이 의미 있는 경우 (RATE_LIMIT*) — ms */
  retryInMs?: number
  /** 어떤 종류의 에러인지 — UI에서 색상/아이콘 선택용 */
  severity: 'info' | 'warning' | 'error'
  /** 디버깅 단서 — HTTP status / 에러 코드 (배너 한쪽 구석에 작게 표시) */
  debugCode?: string
}

export function humanizeError(
  err: LLMError,
  context?: { model?: Model; retryInMs?: number },
): FriendlyError {
  const label = providerLabel(err.provider)
  const modelLabel = context?.model ? (MODEL_INFO[context.model]?.label ?? context.model) : ''
  const debugCode = extractDebugCode(err)

  switch (err.code) {
    case 'NO_API_KEY':
      return {
        message: `${label} API 키가 없어요.`,
        hint: '⚙️ 설정 모달에서 키를 입력해주세요.',
        severity: 'warning',
        debugCode,
      }

    case 'INVALID_KEY':
      return {
        message: `${label} API 키가 유효하지 않아요.`,
        hint: '⚙️ 설정에서 키를 다시 확인하거나 새로 발급해보세요.',
        severity: 'error',
        debugCode,
      }

    case 'RATE_LIMIT_LOCAL': {
      const seconds = Math.ceil((context?.retryInMs ?? 60_000) / 1000)
      return {
        message: `${modelLabel || label}의 분당 한도를 다 썼어요. 잠깐 쉬어가요 ☕`,
        hint: `약 ${seconds}초 후에 다시 보낼 수 있어요.`,
        retryInMs: context?.retryInMs,
        severity: 'warning',
        debugCode: 'LOCAL_RPM',
      }
    }

    case 'RATE_LIMIT':
      // 서버가 직접 429를 반환한 경우 — 보통 분당이 아니라 *일일* 또는 토큰 한도
      if (err.provider === 'google') {
        return {
          message: `${modelLabel || 'Gemini'}이 지금 한도에 걸렸어요.`,
          hint: '1분쯤 기다리거나, ⚙️에서 더 한도 큰 모델로 바꿔보세요.',
          retryInMs: 60_000,
          severity: 'warning',
          debugCode: debugCode ?? 'HTTP 429',
        }
      }
      return {
        message: `${label}이 지금 바빠요.`,
        hint: '잠시 후 다시 시도해주세요.',
        retryInMs: 30_000,
        severity: 'warning',
        debugCode: debugCode ?? 'HTTP 429',
      }

    case 'DAILY_LIMIT':
      return {
        message: '오늘 사용 한도에 도달했어요. 🌙',
        hint: '내일 자동으로 초기화돼요. 더 쓰시려면 ⚙️ 설정에서 일일 한도를 올려주세요.',
        severity: 'warning',
        debugCode: 'DAILY_LIMIT',
      }

    case 'INSUFFICIENT_CREDIT':
      return {
        message: `${label} 크레딧이 부족해요.`,
        hint: err.provider === 'anthropic'
          ? 'console.anthropic.com에서 크레딧을 충전해주세요.'
          : err.provider === 'openai'
            ? 'platform.openai.com에서 크레딧을 충전해주세요.'
            : 'Google Cloud Console에서 결제 상태를 확인해주세요.',
        severity: 'error',
        debugCode,
      }

    case 'NETWORK':
      return {
        message: '인터넷 연결이 불안정해요.',
        hint: '네트워크/방화벽/VPN 설정을 확인해보세요.',
        severity: 'error',
        debugCode: debugCode ?? 'NETWORK',
      }

    case 'SERVICE_BUSY':
      return {
        message: `${label} 서버가 지금 바빠요`,
        hint: '몇 초만 기다렸다가 다시 보내보세요.',
        retryInMs: 5_000,
        severity: 'warning',
        debugCode: debugCode ?? 'HTTP 5xx',
      }

    case 'API_ERROR':
      // 우리가 분류 못 한 API 에러 — raw 메시지 노출하지 않고 한 줄 안내
      return {
        message: `${label}이 응답을 거부했어요.`,
        hint: '잠시 후 다시 시도하거나, 다른 모델로 바꿔보세요.',
        severity: 'error',
        debugCode,
      }

    case 'ABORTED':
      return {
        message: '응답을 중단했어요.',
        hint: '다음 메시지를 보내면 새 대화로 이어갈 수 있어요.',
        severity: 'info',
        debugCode: 'ABORTED',
      }

    case 'UNKNOWN':
    default:
      return {
        message: '예상치 못한 문제가 발생했어요.',
        hint: '잠시 후 다시 시도해주세요.',
        severity: 'error',
        debugCode: debugCode ?? 'UNKNOWN',
      }
  }
}
