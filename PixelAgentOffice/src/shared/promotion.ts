/**
 * 진급(승진) 판정 — Phase 3.
 *
 * 직원의 활동 카운터(Phase 1·2: totalMessages / totalMemoryUpdates / totalPraises)와
 * 입사 경과 시간을 직원별 promotionMode에 따라 평가해 *다음 직급* 자격을 판정한다.
 *
 * 순수 함수 — eventBus·platform 의존 없음. 단위 테스트 가능.
 * 기준값 출처: ideas/11-rank-system.md §2 (모드별 기본 조건값).
 */

import { type Employee, type Rank, RANK_ORDER } from './types'

/** 정량형 — 다음 직급이 되기 위한 누적 대화·메모 갱신 임계 */
type QuantThreshold = { messages: number; memos: number }
const QUANT_THRESHOLDS: Partial<Record<Rank, QuantThreshold>> = {
  사원: { messages: 5, memos: 0 },
  대리: { messages: 50, memos: 1 },
  과장: { messages: 150, memos: 5 },
  부장: { messages: 400, memos: 15 },
  이사: { messages: 800, memos: 30 },
  사장: { messages: 2000, memos: 100 },
}

/** 시간형 — 채용 후 누적 경과일 임계 */
const TIME_DAYS: Partial<Record<Rank, number>> = {
  사원: 3,
  대리: 14,
  과장: 30,
  부장: 90,
  이사: 180,
  사장: 365,
}

/** 정성형 — 받은 칭찬(👍) 누적 임계 (기획상 이사까지) */
const PRAISE_THRESHOLDS: Partial<Record<Rank, number>> = {
  사원: 1,
  대리: 5,
  과장: 15,
  부장: 40,
  이사: 100,
}

/** 현재 직급의 다음 직급. 최상위(레전드)거나 미정의면 null */
export function getNextRank(rank: Rank): Rank | null {
  const i = RANK_ORDER.indexOf(rank)
  if (i === -1 || i + 1 >= RANK_ORDER.length) return null
  return RANK_ORDER[i + 1]
}

function daysSince(iso: string, now: number): number {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return 0
  return (now - t) / 86_400_000
}

/**
 * 진급 자격 판정. 다음 직급으로 올라갈 자격이 되면 그 Rank, 아니면 null.
 * @param now 현재 시각 ms (테스트 시 주입 가능, 기본 Date.now())
 */
export function checkPromotionEligible(emp: Employee, now: number = Date.now()): Rank | null {
  if (emp.promotionMode === 'off') return null
  const next = getNextRank(emp.rank)
  if (!next) return null

  const q = QUANT_THRESHOLDS[next]
  const t = TIME_DAYS[next]
  const p = PRAISE_THRESHOLDS[next]
  const meetsQuant = q ? emp.totalMessages >= q.messages && emp.totalMemoryUpdates >= q.memos : false
  const meetsTime = t != null ? daysSince(emp.hiredAt, now) >= t : false
  const meetsPraise = p != null ? emp.totalPraises >= p : false

  switch (emp.promotionMode) {
    case 'quantitative':
      return meetsQuant ? next : null
    case 'time':
      return meetsTime ? next : null
    case 'qualitative':
      return meetsPraise ? next : null
    case 'mixed': {
      // 정량·시간·정성 중 2개 이상 충족
      const count = [meetsQuant, meetsTime, meetsPraise].filter(Boolean).length
      return count >= 2 ? next : null
    }
    default:
      return null
  }
}

/** 진급 요청 모달에 띄울 캐릭터 voice 한 줄. MBTI/성격별 변형은 후속 — MVP는 기본 정중체 */
export function promotionRequestLine(toRank: Rank): string {
  return `사장님, 잠시 시간 괜찮으세요? 제가 입사한 지도 꽤 됐네요. 혹시 ${toRank}(으)로 진급할 수 있을까요?`
}
