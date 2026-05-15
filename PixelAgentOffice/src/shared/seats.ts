/**
 * 사무실 자리(seat) 시스템 — 좌표·팀·역할 정의.
 *
 * 구조 (사용자 설계):
 *   - 위쪽 중앙: 사장석 (1자리, 명패)
 *   - 아래 3팀 (A 좌, B 중앙, C 우) × 각 팀 5명 (리더 1 + 팀원 4)
 *   - 총 16자리. 빈 자리는 비어있게 표시.
 *
 * 팀 확장 규칙: 1팀(A) → 2팀(A+B) → 3팀(A+B+C). 직원이 늘면서 팀이 생긴다.
 *
 * 자리 좌표는 *상대 단위*로 정의 (0~1). Phaser 렌더링 시 캔버스 width/height 곱해서 사용.
 */

import type { SeatId, TeamId } from './types'

export type SeatPosition = {
  /** 캔버스 가로 비율 (0 = 왼쪽, 1 = 오른쪽) */
  xRatio: number
  /** 캔버스 세로 비율 (0 = 위, 1 = 아래) */
  yRatio: number
}

export type SeatMeta = {
  id: SeatId
  position: SeatPosition
  team: TeamId | null    // boss = null
  /** 'boss' | 'leader' | 'member' */
  role: 'boss' | 'leader' | 'member'
  /** 팀 내에서의 표시 라벨 (UI 디버그/툴팁용) */
  label: string
}

// === 레이아웃 상수 — 한 화면에 다 들어가는 비율 ===
// 사장석: 화면 가로 중앙, 상단 1/4 지점
const BOSS_X = 0.5
const BOSS_Y = 0.22

// 팀별 X 중심 — 좌(A) · 중(B) · 우(C)
const TEAM_X: Record<TeamId, number> = {
  A: 0.20,
  B: 0.50,
  C: 0.80,
}

// 리더 자리 Y (사장석과 팀원 사이)
const LEADER_Y = 0.45

// 팀원 4명 — 2x2 격자 (리더 아래)
// 각 팀 안에서 팀원 4명은 leader 좌표 기준 좌상·우상·좌하·우하
const MEMBER_OFFSETS: Array<{ dx: number; dy: number }> = [
  { dx: -0.06, dy: 0.15 }, // 0: 좌상
  { dx:  0.06, dy: 0.15 }, // 1: 우상
  { dx: -0.06, dy: 0.30 }, // 2: 좌하
  { dx:  0.06, dy: 0.30 }, // 3: 우하
]

/** 모든 자리 정의 (사장석 + 3팀 × 5) */
export const ALL_SEATS: readonly SeatMeta[] = (() => {
  const out: SeatMeta[] = []
  // 사장석
  out.push({
    id: 'boss',
    position: { xRatio: BOSS_X, yRatio: BOSS_Y },
    team: null,
    role: 'boss',
    label: '사장석',
  })
  // 팀별
  for (const team of ['A', 'B', 'C'] as const) {
    const baseX = TEAM_X[team]
    // 리더
    out.push({
      id: `leader:${team}`,
      position: { xRatio: baseX, yRatio: LEADER_Y },
      team,
      role: 'leader',
      label: `팀${team} 리더`,
    })
    // 팀원 4명
    for (let idx = 0 as 0 | 1 | 2 | 3; idx <= 3; idx = (idx + 1) as 0 | 1 | 2 | 3) {
      const offset = MEMBER_OFFSETS[idx]
      out.push({
        id: `member:${team}:${idx}`,
        position: { xRatio: baseX + offset.dx, yRatio: LEADER_Y + offset.dy },
        team,
        role: 'member',
        label: `팀${team} 팀원 ${idx + 1}`,
      })
    }
  }
  return out
})()

/** SeatId → SeatMeta lookup */
export const SEAT_LOOKUP: Record<SeatId, SeatMeta> = Object.fromEntries(
  ALL_SEATS.map(s => [s.id, s]),
) as Record<SeatId, SeatMeta>

/** 팀 단위 자리 묶음 — 특정 팀의 자리들 */
export function seatsOfTeam(team: TeamId): SeatMeta[] {
  return ALL_SEATS.filter(s => s.team === team)
}

/** 팀이 현재 사용 중인지 (한 명이라도 그 팀에 앉아있는지) — Employee 배열 기반 판단 */
export function isTeamActive(
  team: TeamId,
  occupiedSeats: ReadonlySet<SeatId>,
): boolean {
  return seatsOfTeam(team).some(s => occupiedSeats.has(s.id))
}

/** 팀 등장 순서 — A 먼저, B는 A가 있을 때만, C는 A+B가 있을 때만 */
export function visibleTeams(occupiedSeats: ReadonlySet<SeatId>): TeamId[] {
  const out: TeamId[] = ['A'] // A는 항상 보임 (기본)
  if (isTeamActive('A', occupiedSeats) || occupiedSeats.size > 0) {
    // B는 A의 5자리가 다 차면 등장
    const teamAFilled = seatsOfTeam('A').every(s => occupiedSeats.has(s.id))
    if (teamAFilled) out.push('B')
    // C는 A+B 모두 차면
    const teamBFilled = seatsOfTeam('B').every(s => occupiedSeats.has(s.id))
    if (teamAFilled && teamBFilled) out.push('C')
  }
  return out
}

/** 다음 빈 자리 추천 — 채용 시 자동 배치
 *  순서: 팀 A 팀원 → 팀 A 리더 → 팀 B 팀원 → ...
 *  리더 자리는 *과장 이상*만 자동 추천 (호출 측에서 rank 체크) */
export function findNextEmptyMemberSeat(
  occupiedSeats: ReadonlySet<SeatId>,
): SeatId | null {
  for (const team of ['A', 'B', 'C'] as const) {
    for (let idx = 0; idx <= 3; idx++) {
      const seatId = `member:${team}:${idx}` as SeatId
      if (!occupiedSeats.has(seatId)) return seatId
    }
  }
  return null
}

/** 다음 빈 리더 자리 — 과장 이상이면 여기 추천 */
export function findNextEmptyLeaderSeat(
  occupiedSeats: ReadonlySet<SeatId>,
): SeatId | null {
  for (const team of ['A', 'B', 'C'] as const) {
    const seatId = `leader:${team}` as SeatId
    if (!occupiedSeats.has(seatId)) return seatId
  }
  return null
}
