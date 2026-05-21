import { useState } from 'react'
import { platform } from '../platform'
import {
  type Employee,
  type MemoryMode,
  type Model,
  MODEL_INFO,
  INSTRUCTIONS_PLACEHOLDER,
} from '../shared/types'

type Props = {
  onClose: () => void
  employee: Employee
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

export function MemoModal({ onClose, employee, onUpdated, onFired }: Props) {
  // employee props로 초기화 (key prop으로 다른 employee 시 재마운트됨)
  const [name, setName] = useState(employee.name)
  const [role, setRole] = useState(employee.role)
  const [emoji, setEmoji] = useState(employee.emoji)
  const [baseInstructions, setBaseInstructions] = useState(employee.baseInstructions)
  const [customInstructions, setCustomInstructions] = useState(employee.customInstructions)
  const [model, setModel] = useState<Model>(employee.model)
  const [memoryMode, setMemoryMode] = useState<MemoryMode>(employee.memoryMode)
  // v2 #17·#18 — 외형 (Day 11 후속 +2: 메모에서 편집 비활성, 기존 값 read-only로 저장 시 전달)
  const customColor = employee.customColor
  const pattern = employee.pattern
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
        // v2 — 외형 편집 (커스텀 템플릿만 색 저장)
        customColor: employee.template === 'custom' ? customColor : employee.customColor,
        pattern,
      })
      if (updated) onUpdated(updated)
      setSavedFeedback(true)
      setSaving(false)
      setTimeout(() => onClose(), 900)
    } catch (err) {
      alert('저장 실패: ' + (err as Error).message)
      setSaving(false)
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
    <div className="modal-backdrop" onClick={onClose}>
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

          {/* Stats */}
          <section className="modal-section">
            <h3>📊 그간 활동</h3>
            <ul className="memo-stats">
              <li>총 대화: {employee.totalMessages}회</li>
              <li>메모 갱신: {employee.totalMemoryUpdates}회</li>
              <li>받은 칭찬: {employee.totalPraises}회</li>
            </ul>
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
