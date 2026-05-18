/**
 * 자리 변경 모달 — 기존 직원의 자리를 옮길 때 사용.
 *
 * UX:
 *  - 직원 이름·현재 자리 표시
 *  - 자리 목록: 빈 자리 + (옵션) 다른 직원과 swap
 *  - 리더 자리 / 사장석은 직급 자격 검증 (선택 차단)
 */

import { useMemo, useState } from 'react'
import {
  type Employee,
  type SeatId,
  canBeTeamLeader,
  canBeBoss,
} from '../shared/types'
import { ALL_SEATS, SEAT_LOOKUP, visibleTeams } from '../shared/seats'

type Props = {
  employee: Employee
  allEmployees: Employee[]
  onClose: () => void
  onMoved: (updated: Employee) => void
}

export function SeatPickerModal({ employee, allEmployees, onClose, onMoved }: Props) {
  const [target, setTarget] = useState<SeatId | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 점유 자리 + 보이는 팀
  const { occupied, teamsSet } = useMemo(() => {
    const o = new Set<SeatId>()
    for (const e of allEmployees) if (e.seatId) o.add(e.seatId)
    return { occupied: o, teamsSet: new Set(visibleTeams(o)) }
  }, [allEmployees])

  const currentSeat = employee.seatId ? SEAT_LOOKUP[employee.seatId] : null

  // 선택 가능 자리 — 빈 자리만 (보이는 팀 + 사장석)
  const options = useMemo(() => {
    return ALL_SEATS.filter(s => {
      if (s.id === employee.seatId) return false // 본인 현재 자리
      if (s.id === 'boss') return canBeBoss(employee.rank)
      if (s.team && !teamsSet.has(s.team)) return false
      if (occupied.has(s.id)) return false
      return true
    })
  }, [occupied, teamsSet, employee.seatId, employee.rank])

  const handleMove = async () => {
    if (!target) {
      alert('자리를 선택해주세요')
      return
    }
    // 자격 검증
    if (target.startsWith('leader:') && !canBeTeamLeader(employee.rank)) {
      alert(`리더 자리는 과장 이상만 가능해요. (현재 직급: ${employee.rank})`)
      return
    }
    if (target === 'boss' && !canBeBoss(employee.rank)) {
      alert(`사장석은 사장 이상만 가능해요. (현재 직급: ${employee.rank})`)
      return
    }
    setSubmitting(true)
    try {
      const updated = await window.api.updateEmployee(employee.id, { seatId: target })
      if (updated) {
        onMoved(updated)
        onClose()
      }
    } catch (err) {
      alert('자리 변경 실패: ' + (err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2>🪑 자리 변경</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p className="modal-hint" style={{ fontSize: 13 }}>
            <b>{employee.emoji} {employee.name}</b> ({employee.role}, {employee.rank})
            <br />
            현재 자리: <code>{currentSeat?.label ?? '미배치'}</code>
          </p>

          <section className="modal-section">
            <h3>🎯 이동할 자리 ({options.length}개 빈 자리)</h3>
            {options.length === 0 ? (
              <p className="modal-hint">빈 자리가 없어요. 다른 직원을 해고하거나 팀이 다 차야 다음 팀이 열립니다.</p>
            ) : (
              <div className="seat-option-list">
                {options.map(s => {
                  const isLeader = s.role === 'leader'
                  const isBoss = s.role === 'boss'
                  const leaderBlocked = isLeader && !canBeTeamLeader(employee.rank)
                  const bossBlocked = isBoss && !canBeBoss(employee.rank)
                  const blocked = leaderBlocked || bossBlocked
                  return (
                    <label
                      key={s.id}
                      className={`seat-option ${target === s.id ? 'selected' : ''} ${blocked ? 'blocked' : ''}`}
                    >
                      <input
                        type="radio"
                        name="seat"
                        value={s.id}
                        checked={target === s.id}
                        disabled={blocked}
                        onChange={() => setTarget(s.id)}
                      />
                      <span className="seat-option-icon">
                        {isBoss ? '👑' : isLeader ? '⭐' : '🪑'}
                      </span>
                      <span className="seat-option-label">{s.label}</span>
                      {blocked && (
                        <span className="seat-option-hint">
                          {isBoss ? '사장 이상 필요' : '과장 이상 필요'}
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button
            className="btn-primary"
            onClick={handleMove}
            disabled={submitting || !target}
          >
            {submitting ? '이동 중...' : '✓ 자리 이동'}
          </button>
        </div>
      </div>
    </div>
  )
}
