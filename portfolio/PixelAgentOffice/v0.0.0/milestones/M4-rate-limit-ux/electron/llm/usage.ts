/**
 * 사용량 추적.
 *
 * 두 가지 축:
 *  1. RPM (분당 요청) — sliding 60s window. 사전 차단용.
 *  2. 세션 누적 — 앱 시작 후 모델별 누적 횟수/토큰. UI 표시용.
 *
 * 메인 프로세스 메모리에만 존재 (앱 재시작 시 초기화).
 * 일일 영구화는 추후 (M3-c 이상).
 */

import { MODEL_INFO, estimateCostUsd, type Model } from '../../src/shared/types'

const WINDOW_MS = 60_000

/** 모델 → 최근 60초 내 요청 시각 (ms epoch) 큐 */
const requestLog: Map<Model, number[]> = new Map()

/** 모델 → 세션 누적 통계 */
type SessionStats = {
  requests: number
  inputTokens: number
  outputTokens: number
}
const sessionStats: Map<Model, SessionStats> = new Map()

function getOrCreateStats(model: Model): SessionStats {
  let s = sessionStats.get(model)
  if (!s) {
    s = { requests: 0, inputTokens: 0, outputTokens: 0 }
    sessionStats.set(model, s)
  }
  return s
}

/** 만료된 (60초보다 오래된) 기록을 잘라낸다 */
function prune(model: Model, now: number): number[] {
  const arr = requestLog.get(model) ?? []
  const cutoff = now - WINDOW_MS
  const trimmed = arr.filter(t => t > cutoff)
  if (trimmed.length !== arr.length) requestLog.set(model, trimmed)
  return trimmed
}

export type RateLimitStatus = {
  model: Model
  limit: number
  used: number
  remaining: number
  /** 한도가 풀릴 때까지의 밀리초. 한도 여유가 있으면 0. */
  resetInMs: number
  /** 세션 누적 — 앱 시작 후 이 모델로 보낸 요청 수 */
  sessionRequests: number
  /** 세션 누적 토큰 사용량 */
  sessionInputTokens: number
  sessionOutputTokens: number
  /** 세션 누적 추정 비용 (USD) */
  sessionCostUsd: number
}

/** 모델의 현재 사용량 스냅샷 (RPM + 세션 누적) */
export function getStatus(model: Model): RateLimitStatus {
  const limit = MODEL_INFO[model]?.rpm ?? 0
  const now = Date.now()
  const arr = prune(model, now)
  const used = arr.length
  const remaining = Math.max(0, limit - used)
  let resetInMs = 0
  if (remaining === 0 && arr.length > 0) {
    const oldest = arr[0]
    resetInMs = Math.max(0, oldest + WINDOW_MS - now)
  }
  const stats = sessionStats.get(model) ?? { requests: 0, inputTokens: 0, outputTokens: 0 }
  const sessionCostUsd = estimateCostUsd(model, stats.inputTokens, stats.outputTokens)
  return {
    model,
    limit,
    used,
    remaining,
    resetInMs,
    sessionRequests: stats.requests,
    sessionInputTokens: stats.inputTokens,
    sessionOutputTokens: stats.outputTokens,
    sessionCostUsd,
  }
}

/** 호출 직전: 한도 남았는지 확인 (true = 진행 가능) */
export function canProceed(model: Model): RateLimitStatus {
  return getStatus(model)
}

/** 호출 시도 시 기록 (RPM 카운터 + 세션 요청 수) */
export function record(model: Model): void {
  const now = Date.now()
  const arr = prune(model, now)
  arr.push(now)
  requestLog.set(model, arr)
  const stats = getOrCreateStats(model)
  stats.requests += 1
}

/** 호출 성공 후 토큰 사용량 누적 */
export function recordTokens(model: Model, inputTokens: number, outputTokens: number): void {
  const stats = getOrCreateStats(model)
  stats.inputTokens += inputTokens
  stats.outputTokens += outputTokens
}

/** 테스트/디버그용 — 특정 모델 카운터 초기화 (RPM + 세션 둘 다) */
export function reset(model?: Model): void {
  if (model) {
    requestLog.delete(model)
    sessionStats.delete(model)
  } else {
    requestLog.clear()
    sessionStats.clear()
  }
}
