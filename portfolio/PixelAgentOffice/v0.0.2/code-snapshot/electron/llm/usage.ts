/**
 * 사용량 추적.
 *
 * 두 가지 축:
 *  1. RPM (분당 요청) — sliding 60s window. 사전 차단용. (메모리, 휘발성)
 *  2. 일일 누적 — 모델별 누적 횟수/토큰/비용. UI 표시 + 일일 비용 한도용.
 *     날짜(YYYY-MM-DD, 로컬) 키로 디스크에 영구화 → 앱을 재시작해도 그날 누적이 유지됨 (G-2 수정).
 *     날짜가 바뀌면 자동으로 0부터 새로 시작.
 *
 * 주의: getStatus의 sessionCostUsd 등 필드명은 호환 위해 유지하나, 의미는 이제 "오늘 누적"이다.
 */

import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { MODEL_INFO, estimateCostUsd, type Model } from '../../src/shared/types'

const WINDOW_MS = 60_000

/** 모델 → 최근 60초 내 요청 시각 (ms epoch) 큐 — RPM 판정용 (휘발성) */
const requestLog: Map<Model, number[]> = new Map()

/** 모델별 누적 통계 */
type Stats = {
  requests: number
  inputTokens: number
  outputTokens: number
}

/** 일일 누적 — 날짜(로컬 YYYY-MM-DD) + 모델별. 디스크 영구화 대상. */
type DailyUsage = { date: string; byModel: Record<string, Stats> }

let daily: DailyUsage | null = null

/** 로컬 자정 기준 "오늘" (사용자 체감 날짜) */
function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dailyFilePath(): string {
  return path.join(app.getPath('userData'), 'usage-daily.json')
}

/** 오늘자 일일 누적 확보 (메모리 캐시 → 디스크 → 신규). 날짜가 바뀌면 0부터 새로 시작. */
function loadDaily(): DailyUsage {
  const today = todayStr()
  if (daily && daily.date === today) return daily
  if (!daily) {
    // 첫 접근 — 디스크에서 복원 시도 (앱 재시작 후에도 그날 누적 유지)
    try {
      const raw = fs.readFileSync(dailyFilePath(), 'utf-8')
      const parsed = JSON.parse(raw) as DailyUsage
      if (parsed && parsed.date === today && parsed.byModel) {
        daily = parsed
        return daily
      }
    } catch {
      // 파일 없음/파싱 실패 → 신규로 진행
    }
  }
  // 날짜가 바뀌었거나(자정 경과) 오늘 데이터가 없으면 새 날로 리셋
  daily = { date: today, byModel: {} }
  persistDaily()
  return daily
}

function persistDaily(): void {
  if (!daily) return
  try {
    const fp = dailyFilePath()
    fs.mkdirSync(path.dirname(fp), { recursive: true })
    // 원자적 교체 — 임시 파일에 쓴 뒤 rename. 쓰기 중 크래시로 파일이 깨져 그날 누적이 0으로 리셋되는 것 방지.
    const tmp = fp + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(daily), 'utf-8')
    fs.renameSync(tmp, fp)
  } catch {
    // best-effort — 영구화 실패해도 메모리 추적은 계속
  }
}

function getOrCreateStats(model: Model): Stats {
  const d = loadDaily()
  let s = d.byModel[model]
  if (!s) {
    s = { requests: 0, inputTokens: 0, outputTokens: 0 }
    d.byModel[model] = s
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
  /** 오늘 누적 — 이 모델로 보낸 요청 수 */
  sessionRequests: number
  /** 오늘 누적 토큰 사용량 */
  sessionInputTokens: number
  sessionOutputTokens: number
  /** 오늘 누적 추정 비용 (USD) */
  sessionCostUsd: number
}

/** 모델의 현재 사용량 스냅샷 (RPM + 오늘 누적) */
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
  const d = loadDaily()
  const stats = d.byModel[model] ?? { requests: 0, inputTokens: 0, outputTokens: 0 }
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

/** 호출 시도 시 기록 (RPM 카운터 + 오늘 요청 수) */
export function record(model: Model): void {
  const now = Date.now()
  const arr = prune(model, now)
  arr.push(now)
  requestLog.set(model, arr)
  const stats = getOrCreateStats(model)
  stats.requests += 1
  persistDaily()
}

/** 호출 성공 후 토큰 사용량 누적 (오늘 누적 + 디스크 영구화) */
export function recordTokens(model: Model, inputTokens: number, outputTokens: number): void {
  const stats = getOrCreateStats(model)
  stats.inputTokens += inputTokens
  stats.outputTokens += outputTokens
  persistDaily()
}

/** 오늘 *유료(Claude)* 모델 누적 비용(USD) 합 — 일일 비용 한도 판정용 (G-2). 재시작해도 유지됨.
 *  일일 한도는 유료 모델에만 적용(설정 안내와 일치) → 무료 Gemini는 합산에서 제외해 잘못된 차단 방지. */
export function getDailyCostUsd(): number {
  const d = loadDaily()
  let total = 0
  for (const [model, s] of Object.entries(d.byModel)) {
    if (MODEL_INFO[model as Model]?.tier === 'free') continue
    total += estimateCostUsd(model as Model, s.inputTokens, s.outputTokens)
  }
  return total
}

/** 테스트/디버그용 — 카운터 초기화 (RPM + 오늘 누적 둘 다) */
export function reset(model?: Model): void {
  const d = loadDaily()
  if (model) {
    requestLog.delete(model)
    delete d.byModel[model]
  } else {
    requestLog.clear()
    d.byModel = {}
  }
  persistDaily()
}
