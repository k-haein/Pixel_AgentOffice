import { describe, it, expect } from 'vitest'
import {
  getNextRank,
  applyMultiplier,
  checkPromotionEligible,
  getAppointableRank,
} from '../../src/shared/promotion'
import type { Employee } from '../../src/shared/types'

/** 진급 판정에 필요한 필드만 채운 최소 Employee (나머지는 기본값) */
function makeEmp(p: Partial<Employee> = {}): Employee {
  return {
    id: 't1', template: 'editor', name: 'T', role: 'r', emoji: '🐙',
    baseInstructions: '', customInstructions: '',
    model: 'gemini-2-5-flash', memoryModel: 'gemini-2-5-flash', memoryMode: 'auto',
    rank: '알바', promotionMode: 'quantitative',
    hiredAt: new Date(0).toISOString(), seatId: 'member:A:0',
    deskOrientation: 'front',
    totalMessages: 0, totalMemoryUpdates: 0, totalPraises: 0,
    ...p,
  }
}

const NOW = Date.parse('2026-01-01T00:00:00Z')
const DAY = 86_400_000

describe('getNextRank', () => {
  it('한 단계 위 직급을 준다', () => {
    expect(getNextRank('알바')).toBe('사원')
    expect(getNextRank('부장')).toBe('이사')
  })
  it('최상위(레전드)는 null', () => {
    expect(getNextRank('레전드')).toBeNull()
  })
})

describe('applyMultiplier — 난이도 배율 + 방어 폴백', () => {
  it('정상 배율 적용(반올림)', () => {
    expect(applyMultiplier(100, 1)).toBe(100)
    expect(applyMultiplier(100, 0.5)).toBe(50)
    expect(applyMultiplier(100, 2)).toBe(200)
  })
  it('최소 1 보장 (0회로 떨어지지 않음)', () => {
    expect(applyMultiplier(1, 0.1)).toBe(1)
  })
  it('손상된 배율(NaN/0/음수/Infinity)은 1로 폴백 — 진급 전면차단 방지', () => {
    expect(applyMultiplier(50, NaN)).toBe(50)
    expect(applyMultiplier(50, 0)).toBe(50)
    expect(applyMultiplier(50, -3)).toBe(50)
    expect(applyMultiplier(50, Infinity)).toBe(50)
  })
})

describe('checkPromotionEligible', () => {
  it('정량 — 임계(알바→사원=50) 도달 시 진급, 미달이면 null', () => {
    expect(checkPromotionEligible(makeEmp({ promotionMode: 'quantitative', totalMessages: 50 }), 1, NOW)).toBe('사원')
    expect(checkPromotionEligible(makeEmp({ promotionMode: 'quantitative', totalMessages: 49 }), 1, NOW)).toBeNull()
  })
  it('배율 2배면 임계도 2배(100)', () => {
    expect(checkPromotionEligible(makeEmp({ promotionMode: 'quantitative', totalMessages: 99 }), 2, NOW)).toBeNull()
    expect(checkPromotionEligible(makeEmp({ promotionMode: 'quantitative', totalMessages: 100 }), 2, NOW)).toBe('사원')
  })
  it('정성 — 받은 칭찬(알바→사원=5)', () => {
    expect(checkPromotionEligible(makeEmp({ promotionMode: 'qualitative', totalPraises: 5 }), 1, NOW)).toBe('사원')
    expect(checkPromotionEligible(makeEmp({ promotionMode: 'qualitative', totalPraises: 4 }), 1, NOW)).toBeNull()
  })
  it('시간 — 경과일(알바→사원=3일)', () => {
    expect(checkPromotionEligible(makeEmp({ promotionMode: 'time', hiredAt: new Date(NOW - 3 * DAY).toISOString() }), 1, NOW)).toBe('사원')
    expect(checkPromotionEligible(makeEmp({ promotionMode: 'time', hiredAt: new Date(NOW - 2 * DAY).toISOString() }), 1, NOW)).toBeNull()
  })
  it('혼합 — 3개 중 2개 이상 충족 시 진급', () => {
    // 정량50 OK + 정성5 OK + 시간0일(미달) = 2개 → 진급
    expect(checkPromotionEligible(makeEmp({ promotionMode: 'mixed', totalMessages: 50, totalPraises: 5, hiredAt: new Date(NOW).toISOString() }), 1, NOW)).toBe('사원')
    // 정량50만 = 1개 → null
    expect(checkPromotionEligible(makeEmp({ promotionMode: 'mixed', totalMessages: 50, totalPraises: 0, hiredAt: new Date(NOW).toISOString() }), 1, NOW)).toBeNull()
  })
  it('off(수동)는 조건 무관 항상 null', () => {
    expect(checkPromotionEligible(makeEmp({ promotionMode: 'off', totalMessages: 99999, totalPraises: 99999 }), 1, NOW)).toBeNull()
  })
  it('부장→이사는 자동 진급 대상이 아님(수동 임명) → null', () => {
    expect(checkPromotionEligible(makeEmp({ rank: '부장', promotionMode: 'quantitative', totalMessages: 99999 }), 1, NOW)).toBeNull()
  })
})

describe('getAppointableRank — 수동 임명 대상', () => {
  it('부장 → 이사', () => {
    expect(getAppointableRank('부장')).toBe('이사')
  })
  it('그 외 직급은 임명 버튼 없음(null)', () => {
    expect(getAppointableRank('알바')).toBeNull()
    expect(getAppointableRank('과장')).toBeNull()
    expect(getAppointableRank('이사')).toBeNull()
  })
})
