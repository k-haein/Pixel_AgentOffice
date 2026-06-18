/**
 * 진급(승진) 판정 — Phase 3.
 *
 * 직원의 활동 카운터(Phase 1·2: totalMessages / totalPraises)와 입사 경과 시간을
 * 직원별 promotionMode에 따라 평가해 *다음 직급* 자격을 판정한다.
 *
 * 순수 함수 — eventBus·platform 의존 없음. 단위 테스트 가능.
 *
 * 정책 (Day 13 사용자 결정):
 *   - 자동 진급은 **부장까지만**. 이사·사장은 사용자가 직접 임명.
 *   - 사장 임명은 "회사를 넘긴다"는 특별 동작(사장=사용자 본인) — 별도(다음 세션).
 *   - 정량형은 대화 누적 횟수만 본다 (메모 조건 없음).
 */

import { type Employee, type Rank, type PromotionMode, RANK_ORDER } from './types'

/** 자동 진급 상한 — 이 직급까지만 조건 충족 시 자동 제안. 그 위(이사·사장)는 수동 임명 */
export const AUTO_MAX_RANK: Rank = '부장'

/** 정량형 — 다음 직급이 되기 위한 누적 대화 횟수 (메모 조건 없음) */
const QUANT_MESSAGES: Partial<Record<Rank, number>> = {
  사원: 50,
  대리: 100,
  과장: 200,
  부장: 400,
}

/** 시간형 — 채용 후 누적 경과일 */
const TIME_DAYS: Partial<Record<Rank, number>> = {
  사원: 3,
  대리: 14,
  과장: 30,
  부장: 90,
}

/** 정성형 — 받은 칭찬(👍) 누적 (Day 13 사용자 재정의: 5/20/50/100) */
const PRAISE_COUNT: Partial<Record<Rank, number>> = {
  사원: 5,
  대리: 20,
  과장: 50,
  부장: 100,
}

/** 현재 직급의 다음 직급. 최상위(레전드)거나 미정의면 null */
export function getNextRank(rank: Rank): Rank | null {
  const i = RANK_ORDER.indexOf(rank)
  if (i === -1 || i + 1 >= RANK_ORDER.length) return null
  return RANK_ORDER[i + 1]
}

/** 다음 직급이 자동 진급 대상인지 (부장 이하) — 임계 테이블에 정의된 직급 */
function isAutoRank(rank: Rank): boolean {
  return rank in QUANT_MESSAGES || rank in TIME_DAYS || rank in PRAISE_COUNT
}

function daysSince(iso: string, now: number): number {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return 0
  return (now - t) / 86_400_000
}

/** 난이도 배율을 기준 임계에 적용 — 최소 1 (배율 0.5라도 0회로 떨어지지 않게).
 *  손상된 배율(NaN/undefined/0/음수)은 1로 폴백해 진급이 전면 차단되지 않게 방어. */
export function applyMultiplier(base: number, multiplier: number): number {
  const m = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1
  return Math.max(1, Math.round(base * m))
}

/**
 * 자동 진급 자격 판정. 다음 직급으로 자동 승급할 자격이 되면 그 Rank, 아니면 null.
 * 이사·사장(수동 임명 대상)은 항상 null.
 * @param multiplier 진급 난이도 배율 (Settings.promotionSpeedMultiplier). 임계에 곱함. 기본 1
 * @param now 현재 시각 ms (테스트 시 주입 가능)
 */
export function checkPromotionEligible(
  emp: Employee,
  multiplier: number = 1,
  now: number = Date.now(),
): Rank | null {
  if (emp.promotionMode === 'off') return null
  const next = getNextRank(emp.rank)
  if (!next || !isAutoRank(next)) return null // 이사·사장은 자동 X

  const q = QUANT_MESSAGES[next]
  const t = TIME_DAYS[next]
  const p = PRAISE_COUNT[next]
  const meetsQuant = q != null ? emp.totalMessages >= applyMultiplier(q, multiplier) : false
  const meetsTime = t != null ? daysSince(emp.hiredAt, now) >= applyMultiplier(t, multiplier) : false
  const meetsPraise = p != null ? emp.totalPraises >= applyMultiplier(p, multiplier) : false

  switch (emp.promotionMode) {
    case 'quantitative':
      return meetsQuant ? next : null
    case 'time':
      return meetsTime ? next : null
    case 'qualitative':
      return meetsPraise ? next : null
    case 'mixed': {
      const count = [meetsQuant, meetsTime, meetsPraise].filter(Boolean).length
      return count >= 2 ? next : null
    }
    default:
      return null
  }
}

/**
 * 수동 임명 가능한 다음 직급 — 자동 진급 상한(부장)에 도달한 직원을 사용자가 직접 올릴 때.
 * 부장 → 이사. (이사 → 사장 "회사 넘기기"는 별도/다음 세션이라 여기선 제외)
 */
export function getAppointableRank(rank: Rank): Rank | null {
  const next = getNextRank(rank)
  if (!next) return null
  // 자동 대상이 아닌(=수동) 직급만 임명 버튼 대상. 단 사장은 이번 제외 → 이사까지
  if (next === '이사') return '이사'
  return null
}

/** 진급방식 사람이 읽는 라벨 */
export function promotionModeLabel(mode: PromotionMode): string {
  switch (mode) {
    case 'quantitative': return '📊 정량 (대화 누적)'
    case 'time': return '⏰ 시간 (입사 경과)'
    case 'qualitative': return '⭐ 정성 (받은 칭찬)'
    case 'mixed': return '🔀 혼합 (2개 이상)'
    case 'off': return '🛑 수동 (자동 진급 끔)'
  }
}

/** 특정 모드에서 다음 직급까지의 기준 텍스트 (이사·사장은 '임명'). multiplier 반영 */
export function promotionCriteriaText(mode: PromotionMode, toRank: Rank, multiplier: number = 1): string {
  if (mode === 'off') return '자동 진급 꺼짐 (수동)'
  if (!isAutoRank(toRank)) return `${toRank}는 사장이 직접 임명`
  const q = QUANT_MESSAGES[toRank] != null ? applyMultiplier(QUANT_MESSAGES[toRank]!, multiplier) : 0
  const t = TIME_DAYS[toRank] != null ? applyMultiplier(TIME_DAYS[toRank]!, multiplier) : 0
  const p = PRAISE_COUNT[toRank] != null ? applyMultiplier(PRAISE_COUNT[toRank]!, multiplier) : 0
  switch (mode) {
    case 'quantitative': return `대화 ${q}회`
    case 'time': return `입사 ${t}일 경과`
    case 'qualitative': return `받은 칭찬 ${p}회`
    case 'mixed': return `대화 ${q} / 입사 ${t}일 / 칭찬 ${p} 중 2개`
  }
}

export type PromotionProgress = {
  toRank: Rank
  label: string   // 예: '대화'
  current: number
  target: number
  manual?: boolean // 이사·사장 등 수동 임명 대상
}

/**
 * 다음 직급까지의 진행도 (메모 모달 표시용).
 * 자동 대상이 아니면(이사·사장) manual:true로 반환, off면 null.
 */
export function promotionProgress(
  emp: Employee,
  multiplier: number = 1,
  now: number = Date.now(),
): PromotionProgress | null {
  if (emp.promotionMode === 'off') return null
  const next = getNextRank(emp.rank)
  if (!next) return null
  if (!isAutoRank(next)) {
    return { toRank: next, label: '임명', current: 0, target: 0, manual: true }
  }
  switch (emp.promotionMode) {
    case 'quantitative':
      return { toRank: next, label: '대화', current: emp.totalMessages, target: applyMultiplier(QUANT_MESSAGES[next]!, multiplier) }
    case 'time':
      return { toRank: next, label: '경과일', current: Math.floor(daysSince(emp.hiredAt, now)), target: applyMultiplier(TIME_DAYS[next]!, multiplier) }
    case 'qualitative':
      return { toRank: next, label: '칭찬', current: emp.totalPraises, target: applyMultiplier(PRAISE_COUNT[next]!, multiplier) }
    case 'mixed': {
      const q = emp.totalMessages >= applyMultiplier(QUANT_MESSAGES[next]!, multiplier)
      const t = daysSince(emp.hiredAt, now) >= applyMultiplier(TIME_DAYS[next]!, multiplier)
      const p = emp.totalPraises >= applyMultiplier(PRAISE_COUNT[next]!, multiplier)
      const count = [q, t, p].filter(Boolean).length
      return { toRank: next, label: '충족 조건', current: count, target: 2 }
    }
    default:
      return null
  }
}

/** 진급 요청 모달에 띄울 캐릭터 voice 한 줄. MBTI/성격별 변형은 후속 — MVP는 기본 정중체 */
export function promotionRequestLine(toRank: Rank): string {
  return `사장님, 잠시 시간 괜찮으세요? 제가 입사한 지도 꽤 됐네요. 혹시 ${toRank}(으)로 진급할 수 있을까요?`
}
