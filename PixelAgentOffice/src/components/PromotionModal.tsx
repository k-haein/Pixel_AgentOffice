/**
 * 진급 요청 모달 (Phase 3).
 *
 * 직원이 진급 자격에 도달하면 *캐릭터가 사장(사용자)에게 진급을 요청*하는 모달.
 * 자동 진급이 아니라 사용자 승인 방식 (ideas/11 §4 — "캐릭터가 자기 입장에서 요청").
 */

import type { Employee, Rank } from '../shared/types'
import { promotionRequestLine } from '../shared/promotion'

type Props = {
  employee: Employee
  toRank: Rank
  onApprove: () => void
  onDismiss: () => void
}

function daysSinceLabel(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '-'
  const days = Math.floor((Date.now() - t) / 86_400_000)
  if (days <= 0) return '오늘 입사'
  if (days < 30) return `${days}일`
  if (days < 365) return `${Math.floor(days / 30)}개월`
  return `${Math.floor(days / 365)}년`
}

export function PromotionModal({ employee, toRank, onApprove, onDismiss }: Props) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => { if (e.target === e.currentTarget) onDismiss() }}
      style={{ zIndex: 250 }}
    >
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎉 진급 요청</h2>
          <button className="modal-close" onClick={onDismiss}>×</button>
        </div>
        <div className="modal-body" style={{ padding: 20 }}>
          {/* 캐릭터 + voice */}
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 40, lineHeight: 1 }}>{employee.emoji}</div>
            <div style={{ fontWeight: 'bold', marginTop: 6 }}>{employee.name}</div>
          </div>
          <div
            style={{
              background: '#fff8e0',
              border: '1px solid #c8a878',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              lineHeight: 1.6,
              color: '#2a2118',
            }}
          >
            “{promotionRequestLine(toRank)}”
          </div>

          {/* 현재 → 희망 직급 */}
          <div style={{ textAlign: 'center', margin: '16px 0', fontSize: 15 }}>
            <span style={{ opacity: 0.7 }}>{employee.rank}</span>
            <span style={{ margin: '0 10px', color: '#b8860b' }}>→</span>
            <span style={{ fontWeight: 'bold', color: '#b8860b' }}>⭐ {toRank}</span>
          </div>

          {/* 성과 */}
          <div style={{ fontSize: 12, color: '#5a3a0f', background: '#faf3e0', borderRadius: 6, padding: '8px 12px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>📈 그간 성과</div>
            <div>• 대화 {employee.totalMessages}회</div>
            <div>• 메모 갱신 {employee.totalMemoryUpdates}회</div>
            <div>• 받은 칭찬 {employee.totalPraises}회</div>
            <div>• 입사 {daysSinceLabel(employee.hiredAt)}</div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onDismiss}>🤔 다음에</button>
          <div style={{ flex: 1 }} />
          <button className="btn-primary" onClick={onApprove} autoFocus>😊 진급시키기</button>
        </div>
      </div>
    </div>
  )
}
