import { describe, it, expect } from 'vitest'
import {
  findNextEmptyMemberSeat,
  findNextEmptyLeaderSeat,
  findNextEmptySeat,
  visibleTeams,
} from '../../src/shared/seats'
import type { SeatId } from '../../src/shared/types'

const ALL_MEMBERS = (['A', 'B', 'C'] as const).flatMap(t =>
  [0, 1, 2, 3].map(i => `member:${t}:${i}` as SeatId),
) // 12자리
const ALL_LEADERS = (['A', 'B', 'C'] as const).map(t => `leader:${t}` as SeatId) // 3자리

describe('findNextEmptyMemberSeat', () => {
  it('빈 사무실 → member:A:0', () => {
    expect(findNextEmptyMemberSeat(new Set())).toBe('member:A:0')
  })
  it('A:0 차면 A:1', () => {
    expect(findNextEmptyMemberSeat(new Set(['member:A:0' as SeatId]))).toBe('member:A:1')
  })
  it('팀원 12자리 다 차면 null (리더 자리는 보지 않음)', () => {
    expect(findNextEmptyMemberSeat(new Set(ALL_MEMBERS))).toBeNull()
  })
})

describe('findNextEmptyLeaderSeat', () => {
  it('빈 → leader:A', () => {
    expect(findNextEmptyLeaderSeat(new Set())).toBe('leader:A')
  })
  it('리더 3자리 다 차면 null', () => {
    expect(findNextEmptyLeaderSeat(new Set(ALL_LEADERS))).toBeNull()
  })
})

describe('findNextEmptySeat — G-1 유령직원 방지(팀원→리더 폴백)', () => {
  it('빈 사무실 → 팀원 우선(member:A:0)', () => {
    expect(findNextEmptySeat(new Set())).toBe('member:A:0')
  })
  it('팀원 12자리가 다 차면 리더로 폴백(leader:A) — null이 아니어야 함', () => {
    expect(findNextEmptySeat(new Set(ALL_MEMBERS))).toBe('leader:A')
  })
  it('15자리(팀원12 + 리더3) 전부 차야 비로소 null', () => {
    expect(findNextEmptySeat(new Set([...ALL_MEMBERS, ...ALL_LEADERS]))).toBeNull()
  })
})

describe('visibleTeams — 팀 등장 규칙', () => {
  it('빈 사무실 → A만', () => {
    expect(visibleTeams(new Set())).toEqual(['A'])
  })
  it('A팀 5자리(리더+팀원4) 다 차면 B 등장', () => {
    const teamAFull = new Set<SeatId>(
      ['leader:A', 'member:A:0', 'member:A:1', 'member:A:2', 'member:A:3'] as SeatId[],
    )
    expect(visibleTeams(teamAFull)).toEqual(['A', 'B'])
  })
})
