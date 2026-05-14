import { useState } from 'react'
import {
  type Employee,
  type Model,
  type Rank,
  type Template,
  type PromotionMode,
  TEMPLATES,
  MODEL_INFO,
} from '../shared/types'

type Props = {
  onClose: () => void
  existingEmployees: Employee[]
  maxCount: number
  defaultModel: Model
  defaultMemoryModel: Model
  onHired: (employee: Employee) => void
}

// 책상 가능 위치 (좌·우). 최대 2명 가정.
const DESK_POSITIONS = [-120, 120]

const RANK_OPTIONS: Rank[] = ['알바', '사원', '대리', '과장', '부장']

const PROMOTION_MODES: { value: PromotionMode; label: string; desc: string }[] = [
  { value: 'time', label: '⏰ 시간', desc: '입사 후 일정 기간' },
  { value: 'quantitative', label: '📊 정량', desc: '대화·메모 횟수' },
  { value: 'qualitative', label: '⭐ 정성', desc: '칭찬·👍 횟수' },
  { value: 'mixed', label: '🔀 혼합', desc: '여러 조건 충족' },
  { value: 'off', label: '🛑 수동', desc: '자동 제안 OFF' },
]

const FREE_MODELS: Model[] = ['gemini-2-5-flash', 'gemini-2-5-pro']
const PAID_MODELS: Model[] = ['claude-opus-4-7', 'claude-sonnet-4-7', 'claude-haiku-4-7']

function makeId(template: Template): string {
  return `${template}-${Date.now().toString(36)}`
}

export function HireModal({
  onClose,
  existingEmployees,
  maxCount,
  defaultModel,
  defaultMemoryModel,
  onHired,
}: Props) {
  // 컴포넌트가 마운트될 때 (모달 열림 시점) state가 초기화됨
  const [template, setTemplate] = useState<Template>('editor')
  const [name, setName] = useState(TEMPLATES.editor.defaultName)
  const [role, setRole] = useState(TEMPLATES.editor.defaultRole)
  const [customInstructions, setCustomInstructions] = useState('')
  const [rank, setRank] = useState<Rank>('알바')
  const [promotionMode, setPromotionMode] = useState<PromotionMode>('time')
  const [model, setModel] = useState<Model>(defaultModel)
  const [submitting, setSubmitting] = useState(false)

  const existingCount = existingEmployees.length
  const isAtMax = existingCount >= maxCount

  const handleTemplateChange = (t: Template) => {
    setTemplate(t)
    setName(TEMPLATES[t].defaultName)
    setRole(TEMPLATES[t].defaultRole)
  }

  // 빈 자리 찾기 (기존 직원들이 차지하지 않은 위치)
  const findAvailablePosition = (): number => {
    const used = new Set(existingEmployees.map(e => e.deskPosition.x))
    return DESK_POSITIONS.find(x => !used.has(x)) ?? 0
  }

  const handleHire = async () => {
    if (!name.trim() || !role.trim()) {
      alert('이름과 역할을 입력해주세요')
      return
    }
    setSubmitting(true)
    try {
      const employee: Employee = {
        id: makeId(template),
        template,
        name: name.trim(),
        role: role.trim(),
        emoji: TEMPLATES[template].emoji,
        baseInstructions: TEMPLATES[template].baseInstructions,
        customInstructions: customInstructions.trim(),
        model,
        memoryModel: defaultMemoryModel,
        memoryMode: 'auto',
        rank,
        promotionMode,
        hiredAt: new Date().toISOString(),
        deskPosition: { x: findAvailablePosition() },
        totalMessages: 0,
        totalMemoryUpdates: 0,
        totalPraises: 0,
      }
      const saved = await window.api.addEmployee(employee)
      onHired(saved)
      onClose()
    } catch (err) {
      alert('채용 실패: ' + (err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 새 직원 채용</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {isAtMax && (
            <div className="modal-alert">
              ⚠️ 최대 직원 수 ({maxCount}명)에 도달했습니다. 기존 직원을 해고해야 새로 채용할 수 있어요.
            </div>
          )}

          {/* Template */}
          <section className="modal-section">
            <h3>👤 캐릭터 템플릿</h3>
            <div className="template-grid">
              {(Object.keys(TEMPLATES) as Template[]).map(t => {
                const tpl = TEMPLATES[t]
                return (
                  <label
                    key={t}
                    className={`template-card ${template === t ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="template"
                      value={t}
                      checked={template === t}
                      onChange={() => handleTemplateChange(t)}
                      style={{ display: 'none' }}
                    />
                    <div className="template-emoji">{tpl.emoji}</div>
                    <div className="template-name">{tpl.defaultRole}</div>
                    <div className="template-desc">{tpl.defaultName}</div>
                  </label>
                )
              })}
            </div>
          </section>

          {/* Identity */}
          <section className="modal-section">
            <h3>🪪 정체성</h3>
            <label className="modal-label">이름</label>
            <input
              className="modal-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: Mary"
            />
            <label className="modal-label">역할</label>
            <input
              className="modal-input"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="예: 편집자"
            />
            <details>
              <summary className="modal-summary">⚙️ 기본 지침 (자동 생성, 변경 가능 — 메모지에서)</summary>
              <pre className="modal-pre">{TEMPLATES[template].baseInstructions}</pre>
            </details>
            <label className="modal-label">커스텀 지침 (선택)</label>
            <textarea
              className="modal-input"
              rows={3}
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              placeholder="예: 반말 금지, 비유는 최대 2개"
            />
          </section>

          {/* Rank */}
          <section className="modal-section">
            <h3>🏆 초기 직급</h3>
            <div className="pill-row">
              {RANK_OPTIONS.map(r => (
                <button
                  key={r}
                  type="button"
                  className={`pill ${rank === r ? 'selected' : ''}`}
                  onClick={() => setRank(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </section>

          {/* Promotion Mode */}
          <section className="modal-section">
            <h3>📈 진급 방식</h3>
            <div className="promotion-grid">
              {PROMOTION_MODES.map(m => (
                <button
                  type="button"
                  key={m.value}
                  className={`promotion-option ${promotionMode === m.value ? 'selected' : ''}`}
                  onClick={() => setPromotionMode(m.value)}
                >
                  <div className="promotion-label">{m.label}</div>
                  <div className="promotion-desc">{m.desc}</div>
                </button>
              ))}
            </div>
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
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>취소</button>
          <button
            className="btn-primary"
            onClick={handleHire}
            disabled={submitting || isAtMax}
          >
            {submitting ? '채용 중...' : '✓ 채용 완료'}
          </button>
        </div>
      </div>
    </div>
  )
}
