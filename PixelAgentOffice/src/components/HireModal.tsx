import { useState, useMemo } from 'react'
import { platform } from '../platform'
import {
  type Employee,
  type Model,
  type Rank,
  type Template,
  type PromotionMode,
  type SeatId,
  type TeamId,
  type CharacterPalette,
  type CharacterPattern,
  TEMPLATES,
  MODEL_INFO,
  CHARACTER_PALETTE,
  CHARACTER_PATTERN_LABELS,
  INSTRUCTIONS_PLACEHOLDER,
  canBeTeamLeader,
} from '../shared/types'
import {
  findNextEmptyMemberSeat,
  findNextEmptyLeaderSeat,
} from '../shared/seats'

type Props = {
  onClose: () => void
  existingEmployees: Employee[]
  maxCount: number
  defaultModel: Model
  defaultMemoryModel: Model
  onHired: (employee: Employee) => void
}

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

  // 점유 자리 — 자동 배치용 lookup
  const occupied = useMemo(() => {
    const s = new Set<SeatId>()
    for (const e of existingEmployees) if (e.seatId) s.add(e.seatId)
    return s
  }, [existingEmployees])

  // 활성 팀 계산 (P1 #16) — 직원 있는 팀 + 기본 A
  const activeTeams = useMemo(() => {
    const teams = new Set<TeamId>(['A'])
    for (const e of existingEmployees) {
      if (!e.seatId || e.seatId === 'boss') continue
      const parts = e.seatId.split(':')
      const team = parts[1] as TeamId | undefined
      if (team) teams.add(team)
    }
    return teams
  }, [existingEmployees])

  // 사용자가 선택 가능한 팀 = 활성 팀 + 다음 새 팀 1개 (최대 3)
  const teamOptions = useMemo(() => {
    const opts: { team: TeamId; isNew: boolean }[] = []
    for (const t of ['A', 'B', 'C'] as const) {
      if (activeTeams.has(t)) opts.push({ team: t, isNew: false })
      else {
        opts.push({ team: t, isNew: true })
        break // 새 팀은 한 번에 하나만 시작 가능
      }
    }
    return opts
  }, [activeTeams])

  const [selectedTeam, setSelectedTeam] = useState<TeamId>('A')
  // 커스텀 캐릭터 색 + 무늬 (v2 #17·#18)
  const [customColor, setCustomColor] = useState<CharacterPalette>('orange')
  const [pattern, setPattern] = useState<CharacterPattern>('solid')

  const handleTemplateChange = (t: Template) => {
    setTemplate(t)
    setName(TEMPLATES[t].defaultName)
    setRole(TEMPLATES[t].defaultRole)
  }

  /** 자리 자동 결정 — 선택한 팀 안에서 과장 이상이면 빈 리더 자리 먼저, 아니면 빈 팀원 자리.
   *  사용자는 채용 후 우클릭 → 자리 이동 (드래그앤드롭)으로 자유 배치 가능. (P1 #16 — 팀 선택 반영) */
  const resolveSeatId = (): { ok: true; seatId: SeatId } | { ok: false; reason: string } => {
    const leaderOk = canBeTeamLeader(rank)
    const findInTeam = (team: TeamId): SeatId | null => {
      if (leaderOk) {
        const leaderId = `leader:${team}` as SeatId
        if (!occupied.has(leaderId)) return leaderId
      }
      for (let i = 0; i < 4; i++) {
        const memberId = `member:${team}:${i}` as SeatId
        if (!occupied.has(memberId)) return memberId
      }
      return null
    }
    // 1차: 선택한 팀에서 찾기
    let seat = findInTeam(selectedTeam)
    // 2차 fallback: 다른 팀
    if (!seat) {
      seat = leaderOk
        ? (findNextEmptyLeaderSeat(occupied) ?? findNextEmptyMemberSeat(occupied))
        : findNextEmptyMemberSeat(occupied)
    }
    if (!seat) return { ok: false, reason: '빈 자리가 없어요. 최대 채용 도달.' }
    return { ok: true, seatId: seat }
  }

  const handleHire = async () => {
    if (!name.trim() || !role.trim()) {
      alert('이름과 역할을 입력해주세요')
      return
    }
    const seatRes = resolveSeatId()
    if (!seatRes.ok) {
      alert(seatRes.reason)
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
        seatId: seatRes.seatId,
        deskOrientation: 'front',
        // v2 #17·#18 — 커스텀 캐릭터일 때만 색 저장. 무늬는 모든 템플릿 적용
        customColor: template === 'custom' ? customColor : undefined,
        pattern,
        totalMessages: 0,
        totalMemoryUpdates: 0,
        totalPraises: 0,
      }
      const saved = await platform.addEmployee(employee)
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

          {/* 팀 배정 (P1 #16) */}
          <section className="modal-section">
            <h3>👥 팀 배정</h3>
            <p className="modal-hint">
              팀에 첫 직원이 배정되면 사무실에 그 팀 영역이 표시됩니다. 최대 3팀.
            </p>
            <div className="model-options">
              {teamOptions.map(({ team, isNew }) => (
                <label
                  key={team}
                  className={`model-option ${selectedTeam === team ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="team"
                    checked={selectedTeam === team}
                    onChange={() => setSelectedTeam(team)}
                  />
                  <span className="model-label">팀 {team}</span>
                  <span className="model-desc">
                    {isNew ? '🆕 새 팀 시작' : `현재 활성 팀`}
                  </span>
                </label>
              ))}
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
              rows={6}
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              placeholder={INSTRUCTIONS_PLACEHOLDER}
            />
          </section>

          {/* 캐릭터 외형 (v2 #17·#18) — 커스텀 색 + 무늬 */}
          <section className="modal-section">
            <h3>🎨 캐릭터 외형</h3>
            <p className="modal-hint">
              {template === 'custom'
                ? '그림자 진 문어에 색·무늬를 골라주세요. 채용 후 사무실에서 바로 보입니다.'
                : '무늬는 모든 캐릭터에 적용 가능합니다. 색 선택은 커스텀 템플릿 전용.'}
            </p>

            {template === 'custom' && (
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
                    name="pattern"
                    checked={pattern === p}
                    onChange={() => setPattern(p)}
                  />
                  <span className="model-label">{CHARACTER_PATTERN_LABELS[p]}</span>
                </label>
              ))}
            </div>
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
            <p className="modal-hint" style={{ marginTop: 6 }}>
              💡 자리는 자동 배치돼요. 채용 후 <b>캐릭터 우클릭 → 자리 이동</b>으로 드래그해서 옮길 수 있어요.
              <br />
              과장 이상은 리더 자리에 앉을 수 있습니다.
            </p>
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
