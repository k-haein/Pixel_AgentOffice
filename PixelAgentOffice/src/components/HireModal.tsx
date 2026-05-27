import { useState, useMemo, useEffect } from 'react'
import { platform } from '../platform'
import { eventBus } from '../game/eventBus'
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
  type MBTI,
  type MBTIGroup,
  TEMPLATES,
  MODEL_INFO,
  CHARACTER_PALETTE,
  CHARACTER_PATTERN_LABELS,
  INSTRUCTIONS_PLACEHOLDER,
  MBTI_PROFILES,
  MBTI_GROUP_LABELS,
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
  // Day 12 §3 +1: 기본 캐릭터(editor/writer)는 defaultName/Role 자동 채움 (수정 가능),
  // custom 템플릿만 비워둠 (사용자가 직접 입력해야 함).
  const [template, setTemplate] = useState<Template>('editor')
  const [name, setName] = useState(TEMPLATES.editor.defaultName)
  const [role, setRole] = useState(TEMPLATES.editor.defaultRole)
  // 커스텀 지침 초기값 — editor 기본 페르소나 (Day 12 §3 +1)
  const [customInstructions, setCustomInstructions] = useState(TEMPLATES.editor.defaultCustomInstructions ?? '')
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
  // MBTI 페르소나 (Day 12 §2) — 빈 문자열 = 미설정 (LLM 프롬프트 주입 X)
  const [mbtiInput, setMbtiInput] = useState<string>('')
  /** MBTI 입력값을 정규화 — 대문자 + 16종 화이트리스트 매칭 (자동 인식) */
  const mbti: MBTI | null = useMemo(() => {
    const normalized = mbtiInput.trim().toUpperCase()
    return normalized in MBTI_PROFILES ? (normalized as MBTI) : null
  }, [mbtiInput])
  // 16종 설명 모달
  const [showMbtiInfo, setShowMbtiInfo] = useState(false)
  // 커스텀 지침 예시 tip (Day 12 §3)
  const [showInstructionsTip, setShowInstructionsTip] = useState(false)
  // API key 보유 상태 (Day 12 §3) — 키 없으면 해당 provider 모델 비활성
  const [hasGoogleKey, setHasGoogleKey] = useState(true)
  const [hasAnthropicKey, setHasAnthropicKey] = useState(true)
  // 알림 모달 메시지 (Day 12 §3 +1) — window.alert 대체. 중첩 모달로 띄움.
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // 빈 input 강조 (Day 12 §3 +1) — 검증 실패 시 해당 칸 빨간 테두리
  const [fieldErrors, setFieldErrors] = useState<{ name?: boolean; role?: boolean }>({})
  useEffect(() => {
    void (async () => {
      const [g, a] = await Promise.all([
        platform.hasApiKey('google'),
        platform.hasApiKey('anthropic'),
      ])
      setHasGoogleKey(g)
      setHasAnthropicKey(a)
    })()
  }, [])

  const handleTemplateChange = (t: Template) => {
    setTemplate(t)
    // Day 12 §3 +1: 기본 캐릭터 자동 채움 (이름·역할·커스텀 지침·색·무늬), custom만 비움
    if (t === 'custom') {
      setName('')
      setRole('')
      setCustomInstructions('')
      setCustomColor('orange') // custom variant 기본
      setPattern('solid')
    } else {
      setName(TEMPLATES[t].defaultName)
      setRole(TEMPLATES[t].defaultRole)
      setCustomInstructions(TEMPLATES[t].defaultCustomInstructions ?? '')
      // Day 12 §3 +2: defaultCustomColor/defaultPattern 있으면 적용 (예: Cody = gray + stripes)
      if (TEMPLATES[t].defaultCustomColor) setCustomColor(TEMPLATES[t].defaultCustomColor)
      if (TEMPLATES[t].defaultPattern) setPattern(TEMPLATES[t].defaultPattern)
    }
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
    setErrorMessage(null) // 새 시도 시 이전 에러 초기화
    if (!name.trim() || !role.trim()) {
      setFieldErrors({ name: !name.trim(), role: !role.trim() })
      setErrorMessage('이름과 역할을 입력해주세요.')
      return
    }
    setFieldErrors({}) // 통과 시 강조 clear
    // Day 12 §3 — 선택된 모델의 provider 키 확인
    const isGoogleModel = FREE_MODELS.includes(model)
    if (isGoogleModel && !hasGoogleKey) {
      setErrorMessage('Google API 키가 없습니다. ⚙ 설정에서 키를 먼저 등록해주세요.')
      return
    }
    if (!isGoogleModel && !hasAnthropicKey) {
      setErrorMessage('Anthropic API 키가 없습니다. ⚙ 설정에서 키를 먼저 등록해주세요.')
      return
    }
    const seatRes = resolveSeatId()
    if (!seatRes.ok) {
      setErrorMessage(seatRes.reason)
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
        // v2 #17·#18 — variant가 'custom'일 때만 색 저장 (Cody의 'developer'도 custom variant)
        customColor: TEMPLATES[template].variant === 'custom' ? customColor : undefined,
        pattern,
        // Day 12 §2 — MBTI 페르소나 (입력값이 16종 화이트리스트에 매칭될 때만 저장)
        mbti: mbti ?? undefined,
        totalMessages: 0,
        totalMemoryUpdates: 0,
        totalPraises: 0,
      }
      const saved = await platform.addEmployee(employee)
      onHired(saved)
      onClose()
    } catch (err) {
      setErrorMessage('채용 실패: ' + (err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
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

          {/* Template — Day 12 §3: custom 카드는 "새 직원" 한 줄로 단순화 */}
          <section className="modal-section">
            <h3>👤 캐릭터 템플릿</h3>
            <div className="template-grid">
              {(Object.keys(TEMPLATES) as Template[]).map(t => {
                const tpl = TEMPLATES[t]
                const isCustom = t === 'custom'
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
                    {isCustom ? (
                      <div className="template-name">새 직원</div>
                    ) : (
                      <>
                        <div className="template-name">{tpl.defaultRole}</div>
                        <div className="template-desc">{tpl.defaultName}</div>
                      </>
                    )}
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

          {/* Identity — Day 12 §3 +1: 빈 칸 검증 시 빨간 테두리 + 옆 메시지 */}
          <section className="modal-section">
            <h3>🪪 정체성 <span style={{ color: '#c83838', fontSize: 12 }}>* 필수</span></h3>
            <label className="modal-label">이름</label>
            <input
              className="modal-input"
              value={name}
              onChange={e => {
                setName(e.target.value)
                if (fieldErrors.name) setFieldErrors(p => ({ ...p, name: false }))
              }}
              placeholder={`예: ${TEMPLATES[template].defaultName}`}
              required
              style={fieldErrors.name ? { borderColor: '#c83838', boxShadow: '0 0 0 1px #c83838' } : undefined}
            />
            {fieldErrors.name && (
              <div style={{ color: '#c83838', fontSize: 11, marginTop: 4, fontWeight: 'bold' }}>
                ⚠️ 이름을 입력하세요
              </div>
            )}
            <label className="modal-label">역할</label>
            <input
              className="modal-input"
              value={role}
              onChange={e => {
                setRole(e.target.value)
                if (fieldErrors.role) setFieldErrors(p => ({ ...p, role: false }))
              }}
              placeholder={`예: ${TEMPLATES[template].defaultRole}`}
              required
              style={fieldErrors.role ? { borderColor: '#c83838', boxShadow: '0 0 0 1px #c83838' } : undefined}
            />
            {fieldErrors.role && (
              <div style={{ color: '#c83838', fontSize: 11, marginTop: 4, fontWeight: 'bold' }}>
                ⚠️ 역할을 입력하세요
              </div>
            )}
            <details>
              <summary className="modal-summary">⚙️ 기본 지침 (자동 생성, 변경 가능 — 메모지에서)</summary>
              <pre className="modal-pre">{TEMPLATES[template].baseInstructions}</pre>
            </details>
            <label className="modal-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              커스텀 지침 (선택)
              <button
                type="button"
                onClick={() => setShowInstructionsTip(v => !v)}
                title="작성 예시 보기"
                style={{
                  background: '#fff2b8',
                  border: '1px solid #c8a878',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 11,
                  color: '#5a3a0f',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ⓘ
              </button>
            </label>
            <textarea
              className="modal-input"
              rows={6}
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              placeholder="예) 사색과 바다를 사랑합니다. 항상 존댓말을 쓰며, 물결을 좋아합니다."
            />
            {/* ⓘ 클릭 시 다른 형식 예시 tip 카드 */}
            {showInstructionsTip && (
              <div
                className="employee-hover-card"
                style={{
                  position: 'static',
                  marginTop: 8,
                  maxWidth: '100%',
                  pointerEvents: 'auto',
                }}
              >
                <div className="hover-card-name">💡 "직업 : 특징" 형식 예시</div>
                <pre
                  style={{
                    fontSize: 11,
                    lineHeight: 1.55,
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                  }}
                >
                  {INSTRUCTIONS_PLACEHOLDER}
                </pre>
              </div>
            )}
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

          {/* MBTI 페르소나 (Day 12 §2) — 16종 중 1 선택. LLM 시스템 프롬프트에 자동 주입 */}
          <section className="modal-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              🧬 MBTI 페르소나 (선택)
              <button
                type="button"
                onClick={() => setShowMbtiInfo(true)}
                title="16종 MBTI 설명 보기"
                style={{
                  background: '#fff2b8',
                  border: '1px solid #c8a878',
                  borderRadius: '50%',
                  width: 22,
                  height: 22,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  color: '#5a3a0f',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ⓘ
              </button>
            </h3>
            <p className="modal-hint">
              MBTI 4글자 입력 (예: INTP, ENFP) — 입력하면 LLM이 해당 페르소나로 응답합니다. 비워두면 페르소나 적용 X.
            </p>
            <div style={{ position: 'relative' }}>
              <input
                className="modal-input"
                value={mbtiInput}
                onChange={e => setMbtiInput(e.target.value)}
                placeholder="예: INTP (소문자 OK)"
                maxLength={4}
                style={{ textTransform: 'uppercase', width: 140 }}
              />
              {/* 자동 인식 tip — MBTI 매칭되면 옆에 카드로 대답 방식 표시. employee-hover-card 스타일 차용 */}
              {mbti && (
                <div
                  className="employee-hover-card"
                  style={{
                    position: 'static',
                    marginTop: 10,
                    maxWidth: '100%',
                    pointerEvents: 'auto',
                  }}
                >
                  <div className="hover-card-name">
                    {MBTI_PROFILES[mbti].emoji} {mbti} · {MBTI_PROFILES[mbti].nickname}
                  </div>
                  <div style={{ fontSize: 11, lineHeight: 1.55, marginTop: 4 }}>
                    <div style={{ marginBottom: 6 }}>
                      <span className="hover-card-label" style={{ display: 'block', marginBottom: 2 }}>
                        대답 방식
                      </span>
                      {MBTI_PROFILES[mbti].responseStyle}
                    </div>
                    <div>
                      <span className="hover-card-label" style={{ display: 'block', marginBottom: 2 }}>
                        성향
                      </span>
                      {MBTI_PROFILES[mbti].trait}
                    </div>
                  </div>
                </div>
              )}
              {mbtiInput.trim() !== '' && !mbti && (
                <p style={{ fontSize: 11, color: '#c83838', marginTop: 6 }}>
                  ⚠ 16종 MBTI가 아닙니다. (INTJ/INTP/ENTJ/ENTP/INFJ/INFP/ENFJ/ENFP/ISTJ/ISFJ/ESTJ/ESFJ/ISTP/ISFP/ESTP/ESFP 중 하나)
                </p>
              )}
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
              <strong style={{ color: '#c83838' }}>⭐ 과장 이상만 리더 자리에 앉을 수 있습니다.</strong>
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

          {/* Model — Day 12 §3: 키 없으면 비활성 + 빨간 안내 + 설정 열기 버튼 */}
          <section className="modal-section">
            <h3>🧠 대화 모델</h3>
            {!hasGoogleKey && !hasAnthropicKey && (
              <div
                style={{
                  background: '#ffe5e5',
                  border: '1px solid #c83838',
                  borderRadius: 4,
                  padding: '8px 12px',
                  marginBottom: 10,
                  fontSize: 12,
                  color: '#c83838',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <strong>⚠ API 키가 설정되지 않았습니다. 설정에서 키를 먼저 등록해주세요.</strong>
                <button
                  type="button"
                  onClick={() => {
                    // 채용 모달은 그대로 두고 설정 모달을 위에 중첩 (onClose 호출 X — 입력 보존).
                    // 키 등록 후 설정 닫으면 채용 모달 입력이 유지됨.
                    eventBus.emit('settings:open', { section: 'google-key' })
                  }}
                  style={{
                    background: '#c83838',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 10px',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ⚙ 설정 열기
                </button>
              </div>
            )}
            <div className="modal-subhead">
              🆓 무료 (Google){' '}
              {!hasGoogleKey && (
                <span style={{ color: '#c83838', fontSize: 11 }}>· 키 없음 (선택 불가)</span>
              )}
            </div>
            <div className="pill-row">
              {FREE_MODELS.map(m => (
                <button
                  key={m}
                  type="button"
                  className={`pill ${model === m ? 'selected' : ''}`}
                  onClick={() => setModel(m)}
                  disabled={!hasGoogleKey}
                  title={!hasGoogleKey ? 'Google API 키가 필요합니다' : undefined}
                  style={!hasGoogleKey ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                >
                  {MODEL_INFO[m].label}
                </button>
              ))}
            </div>
            <div className="modal-subhead">
              💸 유료 (Anthropic){' '}
              {!hasAnthropicKey && (
                <span style={{ color: '#c83838', fontSize: 11 }}>· 키 없음 (선택 불가)</span>
              )}
            </div>
            <div className="pill-row">
              {PAID_MODELS.map(m => (
                <button
                  key={m}
                  type="button"
                  className={`pill ${model === m ? 'selected' : ''}`}
                  onClick={() => setModel(m)}
                  disabled={!hasAnthropicKey}
                  title={!hasAnthropicKey ? 'Anthropic API 키가 필요합니다' : undefined}
                  style={!hasAnthropicKey ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
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

      {/* 알림 모달 (Day 12 §3 +1) — window.alert 대체. 필수값 누락·키 없음·채용 실패 등 */}
      {errorMessage && (
        <div
          className="modal-backdrop"
          onMouseDown={e => { if (e.target === e.currentTarget) setErrorMessage(null) }}
          style={{ zIndex: 150 }}
        >
          <div
            className="modal"
            style={{ maxWidth: 360 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 style={{ color: '#c83838' }}>⚠️ 알림</h2>
              <button className="modal-close" onClick={() => setErrorMessage(null)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#2a2118', margin: 0 }}>
                {errorMessage}
              </p>
            </div>
            <div className="modal-footer">
              <div style={{ flex: 1 }} />
              <button
                className="btn-primary"
                onClick={() => setErrorMessage(null)}
                autoFocus
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MBTI 16종 설명 모달 (Day 12 §2) — ⓘ 아이콘 클릭 시 */}
      {showMbtiInfo && (
        <div
          className="modal-backdrop"
          onMouseDown={e => { if (e.target === e.currentTarget) setShowMbtiInfo(false) }}
          style={{ zIndex: 100 }}
        >
          <div
            className="modal"
            style={{ maxWidth: 720, maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>🧬 MBTI 16종 페르소나 설명</h2>
              <button className="modal-close" onClick={() => setShowMbtiInfo(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-hint">
                채용 시 MBTI 입력칸에 4글자를 적으면 해당 페르소나로 LLM이 응답합니다.
              </p>
              {(['NT', 'NF', 'SJ', 'SP'] as MBTIGroup[]).map(group => (
                <section key={group} className="modal-section">
                  <h3 style={{ marginBottom: 8 }}>
                    {group === 'NT' && '🧠 '}
                    {group === 'NF' && '💚 '}
                    {group === 'SJ' && '🛡 '}
                    {group === 'SP' && '🎨 '}
                    {MBTI_GROUP_LABELS[group]} ({group})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(Object.keys(MBTI_PROFILES) as MBTI[])
                      .filter(m => MBTI_PROFILES[m].group === group)
                      .map(m => {
                        const p = MBTI_PROFILES[m]
                        return (
                          <div
                            key={m}
                            style={{
                              background: '#fff8e0',
                              border: '1px solid #c8a878',
                              borderRadius: 6,
                              padding: '10px 14px',
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 'bold',
                                color: '#5a3a0f',
                                fontSize: 13,
                                marginBottom: 6,
                              }}
                            >
                              {p.emoji} {m} · {p.nickname}
                            </div>
                            <div style={{ fontSize: 11, lineHeight: 1.55, color: '#2a2118' }}>
                              <div style={{ marginBottom: 4 }}>
                                <span style={{ color: '#6a5a3a', fontWeight: 'bold' }}>대답 방식</span>{' '}
                                — {p.responseStyle}
                              </div>
                              <div>
                                <span style={{ color: '#6a5a3a', fontWeight: 'bold' }}>성향</span>{' '}
                                — {p.trait}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </section>
              ))}
            </div>
            <div className="modal-footer">
              <div style={{ flex: 1 }} />
              <button className="btn-secondary" onClick={() => setShowMbtiInfo(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
