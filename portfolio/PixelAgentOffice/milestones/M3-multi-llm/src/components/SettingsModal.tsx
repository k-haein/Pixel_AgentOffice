import { useEffect, useState } from 'react'
import { type Model, type Settings, MODEL_INFO } from '../shared/types'
import type { ProviderName } from '../../electron/llm/types'

type Props = {
  onClose: () => void
  initialSettings: Settings
  onSaved: (settings: Settings) => void
}

const ALL_MODELS: Model[] = [
  'gemini-2-5-flash',
  'gemini-2-5-pro',
  'claude-opus-4-7',
  'claude-sonnet-4-7',
  'claude-haiku-4-7',
]

type KeyState = { has: boolean; input: string }

export function SettingsModal({ onClose, initialSettings, onSaved }: Props) {
  const [keys, setKeys] = useState<Record<ProviderName, KeyState>>({
    anthropic: { has: false, input: '' },
    google: { has: false, input: '' },
  })
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [defaultModel, setDefaultModel] = useState<Model>(initialSettings.defaultModel)
  const [memoryModel, setMemoryModel] = useState<Model>(initialSettings.defaultMemoryModel)
  const [dailyLimit, setDailyLimit] = useState<number>(initialSettings.dailyLimitUsd)
  const [saving, setSaving] = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)

  useEffect(() => {
    let mounted = true
    Promise.all([
      window.api.hasApiKey('anthropic'),
      window.api.hasApiKey('google'),
      window.api.isApiKeyStorageAvailable(),
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
      const updated = await window.api.updateSettings({
        defaultModel,
        defaultMemoryModel: memoryModel,
        dailyLimitUsd: dailyLimit,
      })
      onSaved(updated)

      // Provider별 키 저장
      for (const provider of ['anthropic', 'google'] as ProviderName[]) {
        const k = keys[provider].input.trim()
        if (k) {
          await window.api.saveApiKey(provider, k)
        }
      }

      // 키 상태 새로고침
      const [hasA, hasG] = await Promise.all([
        window.api.hasApiKey('anthropic'),
        window.api.hasApiKey('google'),
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
      await window.api.deleteApiKey(provider)
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ 설정</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* === Google API Key (무료) === */}
          <section className="modal-section">
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
          <section className="modal-section">
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
          <section className="modal-section">
            <h3>🧠 기본 대화 모델</h3>
            <p className="modal-hint">새 직원 채용 시 기본값. 직원마다 메모지에서 변경 가능.</p>
            <div className="modal-subhead">🆓 무료 (Google)</div>
            {renderModelGroup('free', defaultModel, setDefaultModel)}
            <div className="modal-subhead">💸 유료 (Anthropic)</div>
            {renderModelGroup('paid', defaultModel, setDefaultModel)}
          </section>

          {/* === Memory Model === */}
          <section className="modal-section">
            <h3>💾 메모리 갱신 모델</h3>
            <p className="modal-hint">
              메모 압축용 (M4부터 동작). 빠르고 저렴한 모델 권장.
            </p>
            <div className="modal-subhead">🆓 무료 (Google)</div>
            {renderModelGroup('free', memoryModel, setMemoryModel)}
            <div className="modal-subhead">💸 유료 (Anthropic)</div>
            {renderModelGroup('paid', memoryModel, setMemoryModel)}
          </section>

          {/* === Daily Limit === */}
          <section className="modal-section">
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
