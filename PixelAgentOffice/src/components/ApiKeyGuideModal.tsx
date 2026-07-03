/**
 * API 키 "받는 방법" 안내 창 (Day 14) — 입력 창(ApiKeyModal)과 분리된 별도 안내 창.
 *
 * 무료 Gemini / 유료 Anthropic 키 발급 절차를 단계별로 설명.
 * "키 입력하러 가기" → ApiKeyModal을 연다 (apikey:open).
 */

import { useEffect } from 'react'
import { eventBus } from '../game/eventBus'

type Props = {
  onClose: () => void
}

export function ApiKeyGuideModal({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ zIndex: 360 }}
    >
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>❓ API 키 받는 방법</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="modal-hint" style={{ marginBottom: 12 }}>
            AI 직원과 대화하려면 API 키가 필요해요. 셋 중 하나만 있어도 시작할 수 있어요.
          </p>

          <section className="modal-section">
            <h3>🆓 무료 — Google Gemini <span style={{ color: '#2a8a2a', fontSize: 11 }}>(추천)</span></h3>
            <ol style={{ margin: '6px 0 0', paddingLeft: 20, fontSize: 13, lineHeight: 1.7 }}>
              <li>
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                  aistudio.google.com/apikey
                </a>{' '}
                접속
              </li>
              <li>Google 계정으로 로그인</li>
              <li>"Create API key" 클릭 → 키 복사</li>
              <li>아래 "키 입력하러 가기"에 붙여넣기</li>
            </ol>
            <p style={{ fontSize: 12, color: '#2a8a2a', marginTop: 6 }}>✓ 신용카드 불필요, 즉시 발급</p>
          </section>

          <section className="modal-section">
            <h3>💸 유료 — Anthropic Claude</h3>
            <ol style={{ margin: '6px 0 0', paddingLeft: 20, fontSize: 13, lineHeight: 1.7 }}>
              <li>
                <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
                  console.anthropic.com
                </a>{' '}
                접속 후 가입
              </li>
              <li>결제 수단 등록 + 선불 충전 (학습용 월 $1~5)</li>
              <li>API Keys → "Create Key" → 키 복사</li>
            </ol>
            <p style={{ fontSize: 12, color: '#aa6020', marginTop: 6 }}>한국어 품질이 특히 좋아요</p>
          </section>

          <section className="modal-section">
            <h3>💸 유료 — OpenAI GPT</h3>
            <ol style={{ margin: '6px 0 0', paddingLeft: 20, fontSize: 13, lineHeight: 1.7 }}>
              <li>
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
                  platform.openai.com/api-keys
                </a>{' '}
                접속 후 가입
              </li>
              <li>결제 수단 등록 + 선불 충전</li>
              <li>"Create new secret key" → 키 복사</li>
            </ol>
          </section>
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn-secondary" onClick={onClose}>닫기</button>
          <button className="btn-primary" onClick={() => { eventBus.emit('apikey:open'); onClose() }}>
            ✏️ 키 입력하러 가기
          </button>
        </div>
      </div>
    </div>
  )
}
