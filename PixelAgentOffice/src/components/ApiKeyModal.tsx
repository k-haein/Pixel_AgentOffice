/**
 * API 키 설정 미니 팝업 (Day 14).
 *
 * 기존 SettingsModal 안에 인라인으로 있던 Google/Anthropic 키 입력을 *별도 팝업*으로 분리.
 * - 설정창의 "🔑 API 키 설정" 버튼 → 이 팝업
 * - 튜토리얼(T1)에서 첫 채용 전 키가 없으면 → 이 팝업
 *
 * 받는 방법 안내는 별도 창(ApiKeyGuideModal)으로 분리 — "❓ 받는 방법" 버튼으로 연다.
 */

import { useEffect, useState } from 'react'
import { platform } from '../platform'
import { eventBus } from '../game/eventBus'
import type { ProviderName } from '../../electron/llm/types'

type KeyState = { has: boolean; input: string }

type Props = {
  onClose: () => void
}

export function ApiKeyModal({ onClose }: Props) {
  const [keys, setKeys] = useState<Record<ProviderName, KeyState>>({
    anthropic: { has: false, input: '' },
    google: { has: false, input: '' },
    openai: { has: false, input: '' },
  })
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)

  useEffect(() => {
    let mounted = true
    Promise.all([
      platform.hasApiKey('anthropic'),
      platform.hasApiKey('google'),
      platform.hasApiKey('openai'),
      platform.isApiKeyStorageAvailable(),
    ]).then(([hasA, hasG, hasO, available]) => {
      if (!mounted) return
      setKeys({
        anthropic: { has: hasA, input: '' },
        google: { has: hasG, input: '' },
        openai: { has: hasO, input: '' },
      })
      setStorageAvailable(available)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const setInput = (provider: ProviderName, value: string) =>
    setKeys(prev => ({ ...prev, [provider]: { ...prev[provider], input: value } }))

  const PROVIDER_LABELS: Record<ProviderName, string> = {
    anthropic: 'Anthropic', google: 'Google', openai: 'OpenAI',
  }

  const handleDeleteKey = async (provider: ProviderName) => {
    if (!window.confirm(`${PROVIDER_LABELS[provider]} API 키를 삭제하시겠습니까?`)) return
    try {
      await platform.deleteApiKey(provider)
      setKeys(prev => ({ ...prev, [provider]: { has: false, input: '' } }))
    } catch (err) {
      alert('삭제 실패: ' + (err as Error).message)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const provider of ['anthropic', 'google', 'openai'] as ProviderName[]) {
        const k = keys[provider].input.trim()
        if (k) await platform.saveApiKey(provider, k)
      }
      const [hasA, hasG, hasO] = await Promise.all([
        platform.hasApiKey('anthropic'),
        platform.hasApiKey('google'),
        platform.hasApiKey('openai'),
      ])
      setKeys({
        anthropic: { has: hasA, input: '' },
        google: { has: hasG, input: '' },
        openai: { has: hasO, input: '' },
      })
      // 키가 하나라도 있으면 알림 — 튜토리얼이 다음 단계로 진행
      if (hasA || hasG || hasO) eventBus.emit('apikey:saved')
      setSavedFeedback(true)
      setSaving(false)
      setTimeout(() => onClose(), 800)
    } catch (err) {
      console.error('API key save failed', err)
      alert('저장 실패: ' + (err as Error).message)
      setSaving(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ zIndex: 350 }}
    >
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔑 API 키 설정</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="modal-hint" style={{ marginBottom: 10 }}>
            직원과 대화하려면 최소 1개의 키가 필요해요. <strong>무료 Gemini</strong>로 시작할 수 있어요.{' '}
            <button
              type="button"
              onClick={() => eventBus.emit('apikey:open-guide')}
              style={{
                background: 'none', border: 'none', color: '#2a6ad0', cursor: 'pointer',
                textDecoration: 'underline', fontFamily: 'inherit', fontSize: 'inherit', padding: 0,
              }}
            >
              ❓ 받는 방법
            </button>
          </p>

          {/* Google (무료) */}
          <section className="modal-section">
            <h3>🆓 Google AI API 키 <span style={{ color: '#2a8a2a', fontSize: 11 }}>(무료 권장)</span></h3>
            {keys.google.has && <div className="key-stored-badge">✓ 저장됨</div>}
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

          {/* Anthropic (유료) */}
          <section className="modal-section">
            <h3>💸 Anthropic API 키 <span style={{ color: '#aa6020', fontSize: 11 }}>(유료, 한국어 강함)</span></h3>
            {keys.anthropic.has && <div className="key-stored-badge">✓ 저장됨</div>}
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

          {/* OpenAI (유료) — M-2F-0 멀티모델 확장 */}
          <section className="modal-section">
            <h3>💸 OpenAI API 키 <span style={{ color: '#aa6020', fontSize: 11 }}>(유료)</span></h3>
            {keys.openai.has && <div className="key-stored-badge">✓ 저장됨</div>}
            <input
              type="password"
              className="modal-input"
              placeholder={keys.openai.has ? '새 키 입력 시 교체됨' : 'sk-...'}
              value={keys.openai.input}
              onChange={e => setInput('openai', e.target.value)}
              disabled={!storageAvailable}
            />
            {keys.openai.has && (
              <button type="button" className="key-delete-btn" onClick={() => handleDeleteKey('openai')}>
                🗑 삭제
              </button>
            )}
          </section>

          {!storageAvailable && (
            <div className="modal-alert">
              ⚠️ OS 키체인을 사용할 수 없는 환경입니다. API 키 안전 저장이 비활성화됨.
            </div>
          )}
        </div>
        <div className="modal-footer">
          {savedFeedback && (
            <span style={{ color: '#2a8a2a', fontWeight: 'bold', fontSize: 13 }}>✓ 저장되었습니다</span>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn-secondary" onClick={onClose} disabled={saving}>닫기</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || savedFeedback}>
            {saving ? '저장 중...' : savedFeedback ? '✓ 완료' : '💾 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
