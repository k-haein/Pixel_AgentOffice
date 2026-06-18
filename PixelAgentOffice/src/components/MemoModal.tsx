import { useState } from 'react'
import { platform } from '../platform'
import { eventBus } from '../game/eventBus'
import {
  type Employee,
  type MemoryMode,
  type Model,
  type BubbleEmotion,
  type PromotionMode,
  type Settings,
  MODEL_INFO,
  INSTRUCTIONS_PLACEHOLDER,
  EMOTION_LABELS,
} from '../shared/types'
import {
  checkPromotionEligible,
  promotionProgress,
  getAppointableRank,
  promotionModeLabel,
} from '../shared/promotion'

type Props = {
  onClose: () => void
  employee: Employee
  settings: Settings
  onUpdated: (employee: Employee) => void
  onFired: (id: string) => void
}

const MEMORY_MODES: { value: MemoryMode; label: string; desc: string }[] = [
  { value: 'off', label: '⚙️ OFF', desc: '메모리 사용 안 함' },
  { value: 'manual', label: '✋ MANUAL', desc: 'Ctrl+S로만 갱신' },
  { value: 'ask', label: '💬 ASK', desc: '갱신 전 미리보기' },
  { value: 'auto', label: '🤖 AUTO', desc: '자동 갱신 (기본)' },
]

const FREE_MODELS: Model[] = ['gemini-2-5-flash', 'gemini-2-5-pro']
const PAID_MODELS: Model[] = ['claude-opus-4-7', 'claude-sonnet-4-7', 'claude-haiku-4-7']

const PROMOTION_MODES: PromotionMode[] = ['quantitative', 'time', 'qualitative', 'mixed', 'off']

export function MemoModal({ onClose, employee, settings, onUpdated, onFired }: Props) {
  // employee props로 초기화 (key prop으로 다른 employee 시 재마운트됨)
  const [name, setName] = useState(employee.name)
  const [role, setRole] = useState(employee.role)
  const [emoji, setEmoji] = useState(employee.emoji)
  const [baseInstructions, setBaseInstructions] = useState(employee.baseInstructions)
  const [customInstructions, setCustomInstructions] = useState(employee.customInstructions)
  const [model, setModel] = useState<Model>(employee.model)
  const [memoryMode, setMemoryMode] = useState<MemoryMode>(employee.memoryMode)
  // 진급방식 (Day 13) — 메모에서 변경 가능
  const [promotionMode, setPromotionMode] = useState<PromotionMode>(employee.promotionMode)
  // v2 #17·#18 — 외형 (Day 11 후속 +2: 메모에서 편집 비활성, 기존 값 read-only로 저장 시 전달)
  const customColor = employee.customColor
  const pattern = employee.pattern
  // 기본 idle emotion (Day 11 후속 +2) — 평소 말풍선에 표시할 감정
  const [idleEmotion, setIdleEmotion] = useState<BubbleEmotion>(employee.idleEmotion ?? 'thinking')
  const [saving, setSaving] = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await platform.updateEmployee(employee.id, {
        name: name.trim() || employee.name,
        role: role.trim() || employee.role,
        emoji: emoji.trim() || employee.emoji,
        baseInstructions: baseInstructions.trim(),
        customInstructions: customInstructions.trim(),
        model,
        memoryMode,
        // Day 13 — 진급방식 변경
        promotionMode,
        // v2 — 외형 편집 (커스텀 템플릿만 색 저장)
        customColor: employee.template === 'custom' ? customColor : employee.customColor,
        pattern,
        // Day 11 후속 +2 — 기본 idle emotion
        idleEmotion,
      })
      // Phase 1 — 활동 카운터: 지침(customInstructions)이 실제로 바뀌었을 때만 메모 갱신 1회 누적.
      // 모델/이모지만 바꾼 저장은 카운트 X (진급 정량형 조건의 '메모 갱신' 지표).
      const instructionsChanged = customInstructions.trim() !== employee.customInstructions
      if (updated && instructionsChanged) {
        const counted = await platform.incrementEmployeeStats(employee.id, { totalMemoryUpdates: 1 })
        const latest = counted ?? updated
        onUpdated(latest)
        // Phase 3 — 메모 갱신으로 정량/혼합 진급 자격 도달 시 요청 emit
        const toRank = checkPromotionEligible(latest, settings.promotionSpeedMultiplier ?? 1)
        if (toRank) eventBus.emit('promotion:request', { employee: latest, toRank })
      } else if (updated) {
        onUpdated(updated)
      }
      setSavedFeedback(true)
      setSaving(false)
      setTimeout(() => onClose(), 900)
    } catch (err) {
      alert('저장 실패: ' + (err as Error).message)
      setSaving(false)
    }
  }

  // Day 13 — 이사 수동 임명 (부장 → 이사). 자동 진급 상한 위는 사장이 직접 임명
  const handleAppoint = async () => {
    const toRank = getAppointableRank(employee.rank)
    if (!toRank) return
    if (!window.confirm(`${employee.name}을(를) ${toRank}(으)로 임명하시겠습니까?`)) return
    const updated = await platform.updateEmployee(employee.id, { rank: toRank })
    if (updated) {
      eventBus.emit('agent:set-emotion', { agentId: updated.id, emotion: 'happy', expireMs: 6000 })
      onUpdated(updated)
      onClose()
    }
  }

  const handleFire = async () => {
    const ok = window.confirm(
      `정말로 ${employee.name}(${employee.role})를 해고하시겠습니까?\n` +
      `대화 기록과 메모리도 함께 삭제됩니다.`
    )
    if (!ok) return
    setSaving(true)
    try {
      await platform.removeEmployee(employee.id)
      onFired(employee.id)
      onClose()
    } catch (err) {
      alert('해고 실패: ' + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📝 {employee.emoji}  {employee.name}의 메모</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Identity (v2 #19 — 자유 편집) */}
          <section className="modal-section">
            <h3>🪪 정체성 <span className="modal-tag">편집 가능</span></h3>
            <p className="modal-hint">
              🏆 {employee.rank} · 입사 {new Date(employee.hiredAt).toLocaleDateString('ko-KR')}
            </p>
            <label className="modal-label">이름</label>
            <input
              className="modal-input"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <label className="modal-label">역할</label>
            <input
              className="modal-input"
              value={role}
              onChange={e => setRole(e.target.value)}
            />
            <label className="modal-label">이모지</label>
            <input
              className="modal-input"
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              maxLength={4}
            />
          </section>

          {/* Base instructions (v2 #19 — editable) */}
          <section className="modal-section">
            <h3>⚙️ 기본 지침 <span className="modal-tag">편집 가능</span></h3>
            <textarea
              className="modal-input"
              rows={6}
              value={baseInstructions}
              onChange={e => setBaseInstructions(e.target.value)}
              placeholder={INSTRUCTIONS_PLACEHOLDER}
            />
            <p className="modal-hint">
              채용 시 정한 캐릭터 정체성. "직업 : 이름" 포맷 권장.
            </p>
          </section>

          {/* Custom instructions (editable) */}
          <section className="modal-section">
            <h3>✏️ 커스텀 지침 <span className="modal-tag">편집 가능</span></h3>
            <textarea
              className="modal-input"
              rows={5}
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              placeholder="예: 반말 금지, 비유는 최대 2개"
            />
            <p className="modal-hint">
              이 직원만의 행동 규칙. 매 대화에 적용됩니다.
            </p>
          </section>

          {/* Model */}
          <section className="modal-section">
            <h3>🧠 대화 모델</h3>
            <div className="modal-subhead">🆓 무료 (Google)</div>
            <div className="pill-row">
              {FREE_MODELS.map(m => (
                <button
                  key={m}
                  type="button"
                  className={`pill ${model === m ? 'selected' : ''}`}
                  onClick={() => setModel(m)}
                >
                  {MODEL_INFO[m].label}
                </button>
              ))}
            </div>
            <div className="modal-subhead">💸 유료 (Anthropic)</div>
            <div className="pill-row">
              {PAID_MODELS.map(m => (
                <button
                  key={m}
                  type="button"
                  className={`pill ${model === m ? 'selected' : ''}`}
                  onClick={() => setModel(m)}
                >
                  {MODEL_INFO[m].label}
                </button>
              ))}
            </div>
          </section>

          {/* Memory mode — button-based (radio 문제 회피) */}
          <section className="modal-section">
            <h3>💾 메모리 모드</h3>
            <div className="promotion-grid">
              {MEMORY_MODES.map(m => (
                <button
                  type="button"
                  key={m.value}
                  className={`promotion-option ${memoryMode === m.value ? 'selected' : ''}`}
                  onClick={() => setMemoryMode(m.value)}
                >
                  <div className="promotion-label">{m.label}</div>
                  <div className="promotion-desc">{m.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* 외형 편집 (v2 #17·#18) — Day 11 후속 +2: 메모에서 비활성화 (최초 채용 시에만 변경 가능).
              사용자 결정 — 캐릭터 외형은 채용 후 고정. customColor/pattern state는 저장 시 기존값 전달용으로 보존.
              UI는 주석 — 나중에 다른 위치(예: 별도 외형 편집 모달)로 옮길지 검토. */}
          {/*
          <section className="modal-section">
            <h3>🎨 캐릭터 외형</h3>
            {employee.template === 'custom' && (
              <>
                <label className="modal-label">색</label>
                <div className="color-palette">
                  {(Object.keys(CHARACTER_PALETTE) as CharacterPalette[]).map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`color-chip ${customColor === c ? 'selected' : ''}`}
                      style={{ background: `#${CHARACTER_PALETTE[c].toString(16).padStart(6, '0')}` }}
                      onClick={() => setCustomColor(c)}
                      title={c}
                    />
                  ))}
                </div>
              </>
            )}
            <label className="modal-label" style={{ marginTop: 10 }}>무늬</label>
            <div className="model-options">
              {(Object.keys(CHARACTER_PATTERN_LABELS) as CharacterPattern[]).map(p => (
                <label key={p} className={`model-option ${pattern === p ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="memo-pattern"
                    checked={pattern === p}
                    onChange={() => setPattern(p)}
                  />
                  <span className="model-label">{CHARACTER_PATTERN_LABELS[p]}</span>
                </label>
              ))}
            </div>
          </section>
          */}

          {/* 기본 감정 (Day 11 후속 +2) — 평소 말풍선에 표시. LLM 응답에 따라 일시 변화 후 복귀 */}
          <section className="modal-section">
            <h3>🎭 기본 감정 (말풍선)</h3>
            <p style={{ fontSize: 12, opacity: 0.7, margin: '4px 0 8px' }}>
              평소 이 직원의 말풍선에 표시될 감정입니다. 채팅 응답에 따라 잠깐 다른 감정이 떴다가 이 기본값으로 돌아옵니다.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                gap: 6,
              }}
            >
              {(Object.keys(EMOTION_LABELS) as BubbleEmotion[]).map(em => {
                const { emoji, name } = EMOTION_LABELS[em]
                const selected = idleEmotion === em
                return (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setIdleEmotion(em)}
                    style={{
                      padding: '8px 4px',
                      border: selected ? '2px solid #8a5a2a' : '1px solid #c8a878',
                      borderRadius: 4,
                      background: selected ? '#fff2b8' : '#fff8e0',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 11,
                      textAlign: 'center',
                      lineHeight: 1.3,
                    }}
                    title={name}
                  >
                    <div style={{ fontSize: 18, marginBottom: 2 }}>{emoji}</div>
                    <div style={{ color: '#5a3a0f' }}>{name}</div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Stats */}
          <section className="modal-section">
            <h3>📊 그간 활동</h3>
            <ul className="memo-stats">
              <li>총 대화: {employee.totalMessages}회</li>
              <li>메모 갱신: {employee.totalMemoryUpdates}회</li>
              <li>받은 칭찬: {employee.totalPraises}회</li>
            </ul>
          </section>

          {/* 진급 (Day 13) */}
          <section className="modal-section">
            <h3>📈 진급 — 현재 🏆 {employee.rank}</h3>
            <p style={{ fontSize: 12, opacity: 0.7, margin: '4px 0 8px' }}>
              진급 방식을 고르면 조건 충족 시 캐릭터가 진급을 요청합니다.
              <b> 이사·사장은 사장(나)이 직접 임명</b>합니다.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6 }}>
              {PROMOTION_MODES.map(m => (
                <button
                  key={m}
                  type="button"
                  className={`promotion-option ${promotionMode === m ? 'selected' : ''}`}
                  onClick={() => setPromotionMode(m)}
                  style={{ fontSize: 11, padding: '6px 4px', textAlign: 'center' }}
                >
                  {promotionModeLabel(m)}
                </button>
              ))}
            </div>
            {/* 다음 직급 진행도 (선택한 방식 기준) */}
            <div style={{ marginTop: 10, fontSize: 13 }}>
              {(() => {
                const prog = promotionProgress({ ...employee, promotionMode }, settings.promotionSpeedMultiplier ?? 1)
                if (!prog) return <span style={{ opacity: 0.7 }}>🛑 자동 진급 꺼짐 (수동)</span>
                if (prog.manual) {
                  return <span>다음 단계 <b style={{ color: '#b8860b' }}>{prog.toRank}</b>는 사장이 직접 임명합니다.</span>
                }
                const pct = Math.min(100, Math.round((prog.current / prog.target) * 100))
                return (
                  <div>
                    <div>다음 직급 <b style={{ color: '#b8860b' }}>{prog.toRank}</b>까지: {prog.label} <b>{prog.current}</b> / {prog.target}</div>
                    <div style={{ height: 8, background: '#eee3c8', borderRadius: 4, marginTop: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#3a8a3a' : '#b8860b' }} />
                    </div>
                  </div>
                )
              })()}
            </div>
            {/* 이사 수동 임명 (부장일 때) */}
            {getAppointableRank(employee.rank) && (
              <button
                type="button"
                onClick={handleAppoint}
                style={{
                  marginTop: 10, width: '100%', padding: '8px', fontSize: 13, fontFamily: 'inherit',
                  background: '#fff2b8', border: '2px solid #b8860b', borderRadius: 6, cursor: 'pointer',
                  color: '#5a3a0f', fontWeight: 'bold',
                }}
              >
                ⬆ {getAppointableRank(employee.rank)}(으)로 임명하기
              </button>
            )}
          </section>
        </div>

        <div className="modal-footer">
          <button className="btn-danger" onClick={handleFire} disabled={saving || savedFeedback}>
            🗑 해고
          </button>
          {savedFeedback && (
            <span style={{ color: '#2a8a2a', fontWeight: 'bold', fontSize: 13, marginLeft: 12 }}>
              ✓ 저장되었습니다
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn-secondary" onClick={onClose} disabled={saving}>취소</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || savedFeedback}>
            {saving ? '저장 중...' : savedFeedback ? '✓ 완료' : '💾 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
