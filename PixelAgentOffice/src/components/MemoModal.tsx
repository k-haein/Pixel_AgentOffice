import { useState, useEffect } from 'react'
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
  // 메모리 모드 셀렉터는 숨김(위 주석 참고) — 값은 기존값 유지하고 저장 시 그대로 보존
  const [memoryMode] = useState<MemoryMode>(employee.memoryMode)
  // 진급방식 (Day 13) — 메모에서 변경 가능
  const [promotionMode, setPromotionMode] = useState<PromotionMode>(employee.promotionMode)
  // 메모리 (Phase 4) — 누적 기억. mount 시 로드, 직접 편집 + "기억 정리"(LLM 요약)
  const [memoryText, setMemoryText] = useState('')
  const [summarizing, setSummarizing] = useState(false)

  useEffect(() => {
    platform.loadMemory(employee.id).then(setMemoryText)
  }, [employee.id])

  /** "지금 기억 정리" — 대화 이력 + 기존 기억을 memoryModel로 요약해 갱신 (Phase 4) */
  const handleSummarize = async () => {
    setSummarizing(true)
    try {
      const history = await platform.loadChatHistory(employee.id)
      // 긴 대화는 토큰 한도 초과 → 최근 40개만 요약 (최신 대화가 기억에 더 중요)
      const convo = history
        .filter(m => m.role !== 'system')
        .slice(-40)
        .map(m => `${m.role === 'agent' ? employee.name : '사용자'}: ${m.text}`)
        .join('\n')
      if (!convo.trim()) {
        alert('아직 대화 기록이 없어요. 채팅을 나눈 뒤 정리해보세요.')
        setSummarizing(false)
        return
      }
      const result = await platform.chat({
        model: employee.memoryModel,
        systemPrompt:
          '당신은 메모리 요약기입니다. 대화에서 *사용자에 대해* 기억할 사실(이름·선호·진행 중인 작업·반복 주제)만 간결한 3인칭 메모로 추출해 기존 기억과 병합하세요. 추측·창작 금지. 메모 본문만 출력하세요.',
        messages: [
          {
            role: 'user',
            content: `기존 기억:\n${memoryText || '(없음)'}\n\n새 대화:\n${convo}\n\n병합된 기억을 출력하세요:`,
          },
        ],
      })
      if (result.ok) {
        const newMem = result.response.text.trim()
        // 빈/무의미 결과가 기존 기억을 덮어쓰지 않게 방어
        const meta = /^[(（]?\s*(없음|기억\s*없음|n\/?a|none)\s*[)）]?$/i
        if (newMem.length < 2 || meta.test(newMem)) {
          alert('정리 결과가 비어 있어 기존 기억을 그대로 유지합니다.')
        } else {
          setMemoryText(newMem)
          await platform.saveMemory(employee.id, newMem)
        }
      } else {
        alert('기억 정리 실패: ' + result.error.message)
      }
    } catch (err) {
      alert('기억 정리 실패: ' + (err as Error).message)
    } finally {
      setSummarizing(false)
    }
  }
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
      // Phase 4 — 직접 편집한 기억도 저장 (요약 버튼은 즉시 저장하지만 수동 편집분 반영)
      await platform.saveMemory(employee.id, memoryText)
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
          <button
            type="button"
            className="modal-close"
            onClick={() => eventBus.emit('tutorial:start', { track: 'memo' })}
            title="메모지 사용법 보기 (튜토리얼)"
            style={{ fontSize: 18 }}
          >
            🎓
          </button>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Identity (v2 #19 — 자유 편집) */}
          <section className="modal-section" data-section="memo-identity">
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
          <section className="modal-section" data-section="memo-base">
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
          <section className="modal-section" data-section="memo-custom">
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
          <section className="modal-section" data-section="memo-model">
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

          {/* 메모리 모드 셀렉터 숨김 (출시 정리) — off/manual/ask/auto가 아직 실제 동작에 연결돼 있지 않음
              (기억은 항상 주입, 수동 [기억 정리] 버튼만 트리거). 오해 방지차 비공개. 값은 기본값 유지(저장 시 보존).
              추후 모드를 실제로 연결하면 이 섹션을 복원한다. */}

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
          <section className="modal-section" data-section="memo-emotion">
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

          {/* 기억 (Phase 4) */}
          <section className="modal-section" data-section="memo-memory">
            <h3>🧠 기억</h3>
            <p style={{ fontSize: 12, opacity: 0.7, margin: '4px 0 8px' }}>
              이 직원이 대화에서 기억하는 내용입니다. 채팅 시 자동으로 참고합니다.
              직접 편집하거나, 대화 내용을 바탕으로 자동 정리할 수 있어요.
            </p>
            <textarea
              className="modal-input"
              value={memoryText}
              onChange={e => setMemoryText(e.target.value)}
              rows={4}
              disabled={summarizing}
              placeholder="아직 기억이 없습니다. 채팅을 나눈 뒤 '기억 정리'를 눌러보세요."
              style={{ resize: 'vertical', fontFamily: 'inherit', opacity: summarizing ? 0.6 : 1 }}
            />
            <button
              type="button"
              onClick={handleSummarize}
              disabled={summarizing}
              style={{
                marginTop: 6, padding: '7px 12px', fontFamily: 'inherit', fontSize: 12,
                background: '#e8f0ff', border: '1px solid #8aa8d8', borderRadius: 6,
                cursor: summarizing ? 'default' : 'pointer', color: '#2a3a5a', fontWeight: 'bold',
              }}
            >
              {summarizing ? '⏳ 정리 중…' : '🧠 대화에서 기억 정리'}
            </button>
            <p style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
              메모리 모델({MODEL_INFO[employee.memoryModel].label})로 요약합니다. 편집 내용은 저장 시 반영됩니다.
            </p>
          </section>

          {/* Stats */}
          <section className="modal-section" data-section="memo-stats">
            <h3>📊 그간 활동</h3>
            <ul className="memo-stats">
              <li>총 대화: {employee.totalMessages}회</li>
              <li>지침 수정: {employee.totalMemoryUpdates}회</li>
              <li>받은 칭찬: {employee.totalPraises}회</li>
            </ul>
          </section>

          {/* 진급 (Day 13) */}
          <section className="modal-section" data-section="memo-promotion">
            <h3>📈 진급 — 현재 🏆 {employee.rank}</h3>
            <p style={{ fontSize: 12, opacity: 0.7, margin: '4px 0 8px' }}>
              진급 방식을 고르면 조건 충족 시 캐릭터가 진급을 요청합니다.
              <b> 이사 직급은 사장(나)이 직접 임명</b>합니다.
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
          <button className="btn-danger" data-tutorial="memo-fire" onClick={handleFire} disabled={saving || savedFeedback || summarizing}>
            🗑 해고
          </button>
          {savedFeedback && (
            <span style={{ color: '#2a8a2a', fontWeight: 'bold', fontSize: 13, marginLeft: 12 }}>
              ✓ 저장되었습니다
            </span>
          )}
          <div style={{ flex: 1 }} />
          {/* 요약 중에는 저장·닫기 차단 — saveMemory 경쟁(last-writer-wins) 방지 */}
          <button className="btn-secondary" onClick={onClose} disabled={saving || summarizing}>취소</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || savedFeedback || summarizing}>
            {saving ? '저장 중...' : savedFeedback ? '✓ 완료' : '💾 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
