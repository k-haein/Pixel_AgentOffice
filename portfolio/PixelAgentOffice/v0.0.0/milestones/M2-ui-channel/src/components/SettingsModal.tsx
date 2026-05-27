import { useState } from 'react'
import type { Model, Settings } from '../shared/types'

type Props = {
  onClose: () => void
  initialSettings: Settings
  onSaved: (settings: Settings) => void
}

const MODEL_OPTIONS: { value: Model; label: string; desc: string }[] = [
  { value: 'claude-opus-4-7', label: 'Opus', desc: '최고 성능 · 비쌈' },
  { value: 'claude-sonnet-4-7', label: 'Sonnet', desc: '균형 · 기본 권장' },
  { value: 'claude-haiku-4-7', label: 'Haiku', desc: '빠름 · 저렴' },
]

export function SettingsModal({ onClose, initialSettings, onSaved }: Props) {
  const [apiKey, setApiKey] = useState('')
  // TODO M3-a: load `hasStoredKey` from safeStorage and show "•••••• (저장됨)" placeholder
  const hasStoredKey = false
  const [defaultModel, setDefaultModel] = useState<Model>(initialSettings.defaultModel)
  const [memoryModel, setMemoryModel] = useState<Model>(initialSettings.defaultMemoryModel)
  const [dailyLimit, setDailyLimit] = useState<number>(initialSettings.dailyLimitUsd)
  const [saving, setSaving] = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await window.api.updateSettings({
        defaultModel,
        defaultMemoryModel: memoryModel,
        dailyLimitUsd: dailyLimit,
      })
      // TODO M3-a: API 키는 별도 safeStorage 저장
      onSaved(updated)
      // 저장 완료 피드백 잠깐 보여주고 닫기
      setSavedFeedback(true)
      setSaving(false)
      setTimeout(() => {
        onClose()
      }, 900)
    } catch (err) {
      console.error('Settings save failed', err)
      alert('저장 실패: ' + (err as Error).message)
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ 설정</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* API Key */}
          <section className="modal-section">
            <h3>🔑 API 키 (Anthropic)</h3>
            <div className="modal-alert">
              🚧 <strong>아직 작동 안 함</strong> — 입력해도 저장되지 않습니다. 다음 마일스톤(M3-a)에서 활성화 예정. 클로드 연결과 함께 작동합니다.
            </div>
            <p className="modal-hint">
              발급:{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
                console.anthropic.com
              </a>
            </p>
            <input
              type="password"
              className="modal-input"
              placeholder={hasStoredKey ? '•••••••••••• (저장됨)' : 'sk-ant-...'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              disabled
            />
          </section>

          {/* Default Model */}
          <section className="modal-section">
            <h3>🧠 기본 대화 모델</h3>
            <p className="modal-hint">
              새 직원을 채용할 때 기본으로 사용될 모델. 직원마다 메모지에서 변경 가능.
            </p>
            <div className="model-options">
              {MODEL_OPTIONS.map(opt => (
                <label key={opt.value} className={`model-option ${defaultModel === opt.value ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="defaultModel"
                    value={opt.value}
                    checked={defaultModel === opt.value}
                    onChange={() => setDefaultModel(opt.value)}
                  />
                  <span className="model-label">{opt.label}</span>
                  <span className="model-desc">{opt.desc}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Memory Model */}
          <section className="modal-section">
            <h3>💾 메모리 갱신 모델</h3>
            <p className="modal-hint">
              메모리 압축은 저렴한 Haiku 권장. 백그라운드 작업이라 빠르기만 하면 충분.
            </p>
            <div className="model-options">
              {MODEL_OPTIONS.map(opt => (
                <label key={opt.value} className={`model-option ${memoryModel === opt.value ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="memoryModel"
                    value={opt.value}
                    checked={memoryModel === opt.value}
                    onChange={() => setMemoryModel(opt.value)}
                  />
                  <span className="model-label">{opt.label}</span>
                  <span className="model-desc">{opt.desc}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Daily Limit */}
          <section className="modal-section">
            <h3>💰 일일 비용 한도 ($)</h3>
            <p className="modal-hint">
              하루 누적 API 사용액이 이 금액을 넘으면 호출을 차단합니다.
              실제 사용량은{' '}
              <a href="https://console.anthropic.com/settings/usage" target="_blank" rel="noreferrer">
                Anthropic 콘솔
              </a>
              에서 확인할 수 있어요.
            </p>
            <p className="modal-hint" style={{ color: '#aa6020' }}>
              🚧 자동 차단도 다음 마일스톤(M3-b)에서 활성화. 지금은 값만 저장됩니다.
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
