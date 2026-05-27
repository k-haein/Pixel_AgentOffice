import { useEffect, useRef, useState } from 'react'
import { platform, type RateLimitStatus } from '../platform'
import { type Model, type Settings, type UsageDisplayMode, MODEL_INFO } from '../shared/types'
import type { ProviderName } from '../../electron/llm/types'
import { eventBus } from '../game/eventBus'

/** 설정 섹션 식별자 — 우클릭 메뉴 등에서 직접 점프할 수 있는 위치 */
export type SettingsSection =
  | 'google-key'
  | 'anthropic-key'
  | 'default-model'
  | 'memory-model'
  | 'usage-display'
  | 'daily-limit'
  | 'usage-detail'

type Props = {
  onClose: () => void
  initialSettings: Settings
  onSaved: (settings: Settings) => void
  /** 열릴 때 자동 스크롤 + 강조할 섹션 (선택) */
  focusSection?: SettingsSection | string
}

const ALL_MODELS: Model[] = [
  'gemini-2-5-flash',
  'gemini-2-5-pro',
  'claude-opus-4-7',
  'claude-sonnet-4-7',
  'claude-haiku-4-7',
]

type KeyState = { has: boolean; input: string }

export function SettingsModal({ onClose, initialSettings, onSaved, focusSection }: Props) {
  const [keys, setKeys] = useState<Record<ProviderName, KeyState>>({
    anthropic: { has: false, input: '' },
    google: { has: false, input: '' },
  })
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [defaultModel, setDefaultModel] = useState<Model>(initialSettings.defaultModel)
  const [memoryModel, setMemoryModel] = useState<Model>(initialSettings.defaultMemoryModel)
  const [dailyLimit, setDailyLimit] = useState<number>(initialSettings.dailyLimitUsd)
  const [usageDisplayMode, setUsageDisplayMode] = useState<UsageDisplayMode>(
    initialSettings.usageDisplayMode ?? 'chips',
  )
  /** focusSection 적용 시 일시 강조 */
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  // 외부에서 focusSection 받으면 모달 열린 직후 해당 섹션으로 스크롤 + 잠깐 하이라이트
  useEffect(() => {
    if (!focusSection) return
    // DOM 그려진 다음 프레임에 스크롤 (모달 backdrop 페이드 인 후)
    const timer = setTimeout(() => {
      const el = bodyRef.current?.querySelector<HTMLElement>(`[data-section="${focusSection}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setHighlightedSection(focusSection)
        // 2초 후 하이라이트 끄기
        setTimeout(() => setHighlightedSection(null), 2000)
      }
    }, 80)
    return () => clearTimeout(timer)
  }, [focusSection])
  const [saving, setSaving] = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)
  /** 모델별 사용량 — 1초 polling (모달 열려있는 동안만) */
  const [usageRows, setUsageRows] = useState<RateLimitStatus[]>([])

  useEffect(() => {
    let mounted = true
    const fetchUsage = async () => {
      const rows = await Promise.all(
        ALL_MODELS.map(m =>
          platform.getRateLimit(m).catch(() => null),
        ),
      )
      if (mounted) {
        setUsageRows(rows.filter((r): r is RateLimitStatus => r !== null))
      }
    }
    void fetchUsage()
    const id = setInterval(fetchUsage, 1000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    Promise.all([
      platform.hasApiKey('anthropic'),
      platform.hasApiKey('google'),
      platform.isApiKeyStorageAvailable(),
    ]).then(([hasA, hasG, available]) => {
      if (!mounted) return
      setKeys({
        anthropic: { has: hasA, input: '' },
        google: { has: hasG, input: '' },
      })
      setStorageAvailable(available)
    })
    return () => {
      mounted = false
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await platform.updateSettings({
        defaultModel,
        defaultMemoryModel: memoryModel,
        dailyLimitUsd: dailyLimit,
        usageDisplayMode,
      })
      onSaved(updated)
      eventBus.emit('settings:changed', updated)

      // Provider별 키 저장
      for (const provider of ['anthropic', 'google'] as ProviderName[]) {
        const k = keys[provider].input.trim()
        if (k) {
          await platform.saveApiKey(provider, k)
        }
      }

      // 키 상태 새로고침
      const [hasA, hasG] = await Promise.all([
        platform.hasApiKey('anthropic'),
        platform.hasApiKey('google'),
      ])
      setKeys({
        anthropic: { has: hasA, input: '' },
        google: { has: hasG, input: '' },
      })

      setSavedFeedback(true)
      setSaving(false)
      setTimeout(() => onClose(), 900)
    } catch (err) {
      console.error('Settings save failed', err)
      alert('저장 실패: ' + (err as Error).message)
      setSaving(false)
    }
  }

  const handleDeleteKey = async (provider: ProviderName) => {
    if (!window.confirm(`${provider === 'anthropic' ? 'Anthropic' : 'Google'} API 키를 삭제하시겠습니까?`)) {
      return
    }
    try {
      await platform.deleteApiKey(provider)
      setKeys(prev => ({ ...prev, [provider]: { has: false, input: '' } }))
    } catch (err) {
      alert('삭제 실패: ' + (err as Error).message)
    }
  }

  const setInput = (provider: ProviderName, value: string) => {
    setKeys(prev => ({ ...prev, [provider]: { ...prev[provider], input: value } }))
  }

  const renderModelGroup = (tier: 'free' | 'paid', current: Model, onSelect: (m: Model) => void) => (
    <div className="model-options">
      {ALL_MODELS.filter(m => MODEL_INFO[m].tier === tier).map(m => (
        <label key={m} className={`model-option ${current === m ? 'selected' : ''}`}>
          <input
            type="radio"
            value={m}
            checked={current === m}
            onChange={() => onSelect(m)}
          />
          <span className="model-label">{MODEL_INFO[m].label}</span>
          <span className="model-desc">{MODEL_INFO[m].desc}</span>
        </label>
      ))}
    </div>
  )

  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ 설정</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" ref={bodyRef}>
          {/* === Google API Key (무료) === */}
          <section
            className={`modal-section ${highlightedSection === 'google-key' ? 'modal-section-focus' : ''}`}
            data-section="google-key"
          >
            <h3>🆓 Google AI API 키 <span style={{ color: '#2a8a2a', fontSize: 11 }}>(무료 권장)</span></h3>
            <p className="modal-hint">
              발급:{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                aistudio.google.com/apikey
              </a>
              {' '}— Google 계정만 있으면 즉시 발급, 신용카드 불필요.
            </p>
            {keys.google.has && (
              <div className="key-stored-badge">✓ 저장됨</div>
            )}
            <input
              type="password"
              className="modal-input"
              placeholder={keys.google.has ? '새 키 입력 시 교체됨' : 'AIza... 형식'}
              value={keys.google.input}
              onChange={e => setInput('google', e.target.value)}
              disabled={!storageAvailable}
            />
            {keys.google.has && (
              <button type="button" className="key-delete-btn" onClick={() => handleDeleteKey('google')}>
                🗑 삭제
              </button>
            )}
          </section>

          {/* === Anthropic API Key (유료) === */}
          <section
            className={`modal-section ${highlightedSection === 'anthropic-key' ? 'modal-section-focus' : ''}`}
            data-section="anthropic-key"
          >
            <h3>💸 Anthropic API 키 <span style={{ color: '#aa6020', fontSize: 11 }}>(유료, 한국어 강함)</span></h3>
            <p className="modal-hint">
              발급:{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
                console.anthropic.com
              </a>
              {' '}— 신용카드 + 선불 충전 필요 (학습용 월 $1~5).
            </p>
            {keys.anthropic.has && (
              <div className="key-stored-badge">✓ 저장됨</div>
            )}
            <input
              type="password"
              className="modal-input"
              placeholder={keys.anthropic.has ? '새 키 입력 시 교체됨' : 'sk-ant-...'}
              value={keys.anthropic.input}
              onChange={e => setInput('anthropic', e.target.value)}
              disabled={!storageAvailable}
            />
            {keys.anthropic.has && (
              <button type="button" className="key-delete-btn" onClick={() => handleDeleteKey('anthropic')}>
                🗑 삭제
              </button>
            )}
          </section>

          {!storageAvailable && (
            <div className="modal-alert">
              ⚠️ OS 키체인을 사용할 수 없는 환경입니다. API 키 안전 저장이 비활성화됨.
            </div>
          )}

          {/* === Default Model === */}
          <section
            className={`modal-section ${highlightedSection === 'default-model' ? 'modal-section-focus' : ''}`}
            data-section="default-model"
          >
            <h3>🧠 기본 대화 모델</h3>
            <p className="modal-hint">새 직원 채용 시 기본값. 직원마다 메모지에서 변경 가능.</p>
            <div className="modal-subhead">🆓 무료 (Google)</div>
            {renderModelGroup('free', defaultModel, setDefaultModel)}
            <div className="modal-subhead">💸 유료 (Anthropic)</div>
            {renderModelGroup('paid', defaultModel, setDefaultModel)}
          </section>

          {/* === Memory Model === */}
          <section
            className={`modal-section ${highlightedSection === 'memory-model' ? 'modal-section-focus' : ''}`}
            data-section="memory-model"
          >
            <h3>💾 메모리 갱신 모델</h3>
            <p className="modal-hint">
              메모 압축용 (M4부터 동작). 빠르고 저렴한 모델 권장.
            </p>
            <div className="modal-subhead">🆓 무료 (Google)</div>
            {renderModelGroup('free', memoryModel, setMemoryModel)}
            <div className="modal-subhead">💸 유료 (Anthropic)</div>
            {renderModelGroup('paid', memoryModel, setMemoryModel)}
          </section>

          {/* === 사용량 표시 모드 === */}
          <section
            className={`modal-section ${highlightedSection === 'usage-display' ? 'modal-section-focus' : ''}`}
            data-section="usage-display"
          >
            <h3>📊 채팅창 사용량 표시 방식</h3>
            <p className="modal-hint">
              한도/세션/비용 정보를 어떻게 보일지 선택하세요. 채팅창 열려있어도 즉시 반영됩니다.
            </p>
            <div className="model-options">
              <label className={`model-option ${usageDisplayMode === 'chips' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value="chips"
                  checked={usageDisplayMode === 'chips'}
                  onChange={() => setUsageDisplayMode('chips')}
                />
                <span className="model-label">칩 (Chips)</span>
                <span className="model-desc">모델명 아래 작은 아이콘 칩 · 마우스 올리면 자세히</span>
              </label>
              <label className={`model-option ${usageDisplayMode === 'toggle' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value="toggle"
                  checked={usageDisplayMode === 'toggle'}
                  onChange={() => setUsageDisplayMode('toggle')}
                />
                <span className="model-label">토글 (Toggle)</span>
                <span className="model-desc">"사용량" 버튼 클릭 시 펼침 · 사용량 자주 확인하는 사람용</span>
              </label>
            </div>
          </section>

          {/* === Daily Limit === */}
          <section
            className={`modal-section ${highlightedSection === 'daily-limit' ? 'modal-section-focus' : ''}`}
            data-section="daily-limit"
          >
            <h3>💰 일일 비용 한도 ($)</h3>
            <p className="modal-hint">
              유료 모델(Claude)에만 적용. 실제 사용량은 Anthropic 콘솔에서 확인. 자동 차단은 M3-b에서.
            </p>
            <input
              type="number"
              className="modal-input"
              min={0}
              step={0.5}
              value={dailyLimit}
              onChange={e => setDailyLimit(Number(e.target.value))}
            />
          </section>

          {/* === 사용량 상세 (E) — 모델별 분포 + RPM 막대 === */}
          <section
            className={`modal-section ${highlightedSection === 'usage-detail' ? 'modal-section-focus' : ''}`}
            data-section="usage-detail"
          >
            <h3>📈 모델별 사용량 (이번 세션)</h3>
            <p className="modal-hint">
              앱 시작 후 누적 (앱 재시작 시 초기화). RPM은 최근 60초 윈도우 기준.
            </p>
            <table className="usage-table">
              <thead>
                <tr>
                  <th>모델</th>
                  <th>요청</th>
                  <th>입력 토큰</th>
                  <th>출력 토큰</th>
                  <th>비용 ($)</th>
                  <th>RPM</th>
                </tr>
              </thead>
              <tbody>
                {usageRows.map(row => {
                  const info = MODEL_INFO[row.model]
                  const rpmRatio = row.limit > 0 ? Math.min(1, row.used / row.limit) : 0
                  const rpmClass = rpmRatio >= 0.85 ? 'rpm-red' : rpmRatio >= 0.6 ? 'rpm-yellow' : 'rpm-green'
                  return (
                    <tr key={row.model}>
                      <td>
                        <span className="usage-model-label">{info?.label ?? row.model}</span>
                        <span className={`usage-tier-chip tier-${info?.tier ?? 'free'}`}>
                          {info?.tier === 'paid' ? '유료' : '무료'}
                        </span>
                      </td>
                      <td className="usage-num">{row.sessionRequests}</td>
                      <td className="usage-num">{row.sessionInputTokens.toLocaleString()}</td>
                      <td className="usage-num">{row.sessionOutputTokens.toLocaleString()}</td>
                      <td className="usage-num">${row.sessionCostUsd.toFixed(4)}</td>
                      <td>
                        <div className="rpm-bar-bg">
                          <div className={`rpm-bar-fill ${rpmClass}`} style={{ width: `${rpmRatio * 100}%` }} />
                        </div>
                        <span className="rpm-text">{row.used}/{row.limit}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="usage-total">
              💰 세션 누적 총 비용:{' '}
              <strong>
                ${usageRows.reduce((s, r) => s + r.sessionCostUsd, 0).toFixed(4)}
              </strong>{' '}
              / 한도 ${dailyLimit.toFixed(2)}
            </div>
          </section>
        </div>

        <div className="modal-footer">
          {savedFeedback && (
            <span style={{ color: '#2a8a2a', fontWeight: 'bold', fontSize: 13 }}>
              ✓ 저장되었습니다
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            취소
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || savedFeedback}>
            {saving ? '저장 중...' : savedFeedback ? '✓ 완료' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
