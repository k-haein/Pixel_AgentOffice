/**
 * 팀 작업 모달 (2F Phase 4) — 사장이 팀장에게 팀 단위 작업을 지시하는 UI.
 *
 * 팀장이 같은 팀 팀원에게 위임(delegate_to_member)하고 결과를 종합해 보고한다.
 * 진행 상황(위임 시작/완료)을 실시간 카드로 보여주고, 동시에 eventBus로 흘려보내
 * Phaser 캐릭터 연출(팀장·팀원 working 상태 + 감정)을 트리거한다.
 *
 * 엔진·IPC는 Phase 3에서 완성 — 이 컴포넌트는 platform.runTeamTask / onTeamEvent만 쓴다.
 */

import { useEffect, useRef, useState } from 'react'
import { platform } from '../platform'
import type { TeamEvent } from '../platform/types'
import { eventBus } from '../game/eventBus'
import type { Employee } from '../shared/types'

type Props = {
  leader: Employee
  members: Employee[]
  onClose: () => void
}

type DelegationCard = {
  memberId: string
  memberName: string
  task: string
  status: 'running' | 'done' | 'error'
  report?: string
}

export function TeamTaskModal({ leader, members, onClose }: Props) {
  const [task, setTask] = useState('')
  const [running, setRunning] = useState(false)
  const [cards, setCards] = useState<DelegationCard[]>([])
  const [report, setReport] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef<string | null>(null)

  // 팀 진행 이벤트 구독 — 현재 요청의 이벤트만 반영 + 캐릭터 연출로 브리지
  useEffect(() => {
    const off = platform.onTeamEvent(({ requestId, event }) => {
      if (requestId !== requestIdRef.current) return
      handleTeamEvent(event)
    })
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 언마운트(닫기) 시 진행 중이면 중단
  useEffect(() => {
    return () => {
      if (requestIdRef.current) void platform.abortChat(requestIdRef.current)
    }
  }, [])

  function handleTeamEvent(event: TeamEvent) {
    if (event.type === 'delegation:start') {
      setCards(prev => [
        ...prev,
        { memberId: event.memberId, memberName: event.memberName, task: event.task, status: 'running' },
      ])
      // 게임 연출 — 위임받은 팀원이 일하기 시작
      eventBus.emit('agent:set-state', { agentId: event.memberId, state: 'working' })
      eventBus.emit('agent:set-emotion', { agentId: event.memberId, emotion: 'thinking', expireMs: 120_000 })
    } else if (event.type === 'delegation:done') {
      setCards(prev =>
        prev.map(c =>
          c.memberId === event.memberId && c.status === 'running'
            ? { ...c, status: event.isError ? 'error' : 'done', report: event.report }
            : c,
        ),
      )
      // 게임 연출 — 팀원 작업 종료 (성공=아이디어💡 / 실패=혼란)
      eventBus.emit('agent:set-emotion', {
        agentId: event.memberId,
        emotion: event.isError ? 'confused' : 'idea',
        expireMs: 4000,
      })
      eventBus.emit('agent:set-state', { agentId: event.memberId, state: 'idle' })
    }
    // 'leader' / 'member' 스텝 이벤트는 진행 세밀 표시용 — 현재 UI는 위임 카드만
  }

  async function runTask() {
    const trimmed = task.trim()
    if (!trimmed || running) return
    const requestId = `team-${Date.now()}`
    requestIdRef.current = requestId
    setRunning(true)
    setCards([])
    setReport(null)
    setError(null)
    // 게임 연출 — 팀장이 작업 지휘 시작
    eventBus.emit('agent:set-state', { agentId: leader.id, state: 'working' })

    try {
      const res = await platform.runTeamTask({ leaderId: leader.id, task: trimmed, requestId })
      if (res.ok) {
        setReport(res.result.text)
        eventBus.emit('agent:set-emotion', { agentId: leader.id, emotion: 'happy', expireMs: 6000 })
      } else {
        setError(res.error.friendly?.message ?? res.error.message)
        eventBus.emit('agent:set-emotion', { agentId: leader.id, emotion: 'confused', expireMs: 4000 })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
      eventBus.emit('agent:set-state', { agentId: leader.id, state: 'idle' })
      requestIdRef.current = null
    }
  }

  function stop() {
    if (requestIdRef.current) void platform.abortChat(requestIdRef.current)
  }

  const statusIcon = (s: DelegationCard['status']) =>
    s === 'running' ? '⏳' : s === 'done' ? '✅' : '⚠️'

  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => { if (e.target === e.currentTarget && !running) onClose() }}
      style={{ zIndex: 250 }}
    >
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🤝 팀 작업 — {leader.name} 팀장</h2>
          <button className="modal-close" onClick={onClose} disabled={running}>×</button>
        </div>
        <div className="modal-body" style={{ padding: 20 }}>
          {/* 팀원 명단 */}
          <div style={{ fontSize: 12, color: '#5a3a0f', marginBottom: 10 }}>
            팀원 {members.length}명:{' '}
            {members.map(m => `${m.emoji} ${m.name}(${m.role})`).join(', ')}
          </div>

          {/* 작업 지시 입력 */}
          <textarea
            value={task}
            onChange={e => setTask(e.target.value)}
            disabled={running}
            placeholder={`${leader.name} 팀장에게 팀 단위로 시킬 일을 적어주세요.\n예) 신제품 소개 글을 기획·초안·검토까지 팀원과 나눠서 완성해줘.`}
            rows={3}
            style={{
              width: '100%', resize: 'vertical', padding: 10, borderRadius: 8,
              border: '1px solid #c8a878', fontSize: 13, lineHeight: 1.5, boxSizing: 'border-box',
            }}
          />

          {/* 진행 상황 — 위임 카드 */}
          {cards.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 6, color: '#5a3a0f' }}>
                📋 위임 진행
              </div>
              {cards.map((c, i) => (
                <div
                  key={`${c.memberId}-${i}`}
                  style={{
                    background: c.status === 'error' ? '#fdecea' : '#faf3e0',
                    border: '1px solid #d8c090', borderRadius: 6,
                    padding: '8px 12px', marginBottom: 6, fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#2a2118' }}>
                    {statusIcon(c.status)} {c.memberName}
                  </div>
                  <div style={{ opacity: 0.75, marginTop: 2 }}>지시: {c.task}</div>
                  {c.report && (
                    <div style={{ marginTop: 4, whiteSpace: 'pre-wrap', color: '#333' }}>
                      ↳ {c.report}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 최종 보고 */}
          {report && (
            <div
              style={{
                marginTop: 14, background: '#eaf6ea', border: '1px solid #a5d6a7',
                borderRadius: 8, padding: '12px 14px', fontSize: 13, lineHeight: 1.6,
                whiteSpace: 'pre-wrap', color: '#1b3a1b',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: 6 }}>📣 {leader.name} 팀장의 최종 보고</div>
              {report}
            </div>
          )}

          {/* 오류 */}
          {error && (
            <div
              style={{
                marginTop: 14, background: '#fdecea', border: '1px solid #f5b1a8',
                borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#8a2318',
              }}
            >
              ⚠️ {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={running}>닫기</button>
          <div style={{ flex: 1 }} />
          {running ? (
            <button className="btn-secondary" onClick={stop}>⏹ 중단</button>
          ) : (
            <button className="btn-primary" onClick={runTask} disabled={!task.trim()} autoFocus>
              🚀 작업 시키기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
