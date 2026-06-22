/**
 * 튜토리얼 오버레이 (T1) — Day 14.
 *
 * 마스코트(Clawd) + 말풍선 + 대상 UI 스팟라이트로 첫 사용법을 단계별 안내.
 *
 * 핵심 설계:
 * - 컨테이너는 pointer-events:none → 뒤 UI 클릭 그대로 통과 (채용 단계에서 실제 버튼 클릭 가능).
 *   마스코트 카드만 pointer-events:auto (건너뛰기·다음 버튼 캡처).
 * - 스팟라이트는 box-shadow 컷아웃 — 대상 rect만 밝고 주변은 어둡게. (대상 없으면 전체 딤)
 * - zIndex 320 — 채용(z200)·설정(z300) 모달 위에서 필드를 하이라이트(상점·설정 트랙 포함).
 *   ApiKeyModal(350)/Guide(360)는 위로 떠 키 입력은 안 가림.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CLAWD_PIXELS_BASIC, CLAWD_PALETTE } from '../game/characters/Clawd'
import type { TutorialStep } from '../shared/tutorial'

type Props = {
  step: TutorialStep
  index: number
  total: number
  onNext: () => void
  /** 이전 단계로 (히스토리 pop) */
  onPrev?: () => void
  /** 되돌아갈 이전 단계가 있는지 — 있을 때만 "◂ 이전" 버튼 표시 */
  canPrev?: boolean
  onSkip: () => void
  /** apikey 단계 — "받는 방법" 안내 창 열기 */
  onApiKeyGuide?: () => void
  /** apikey 단계 — "나중에 할게"(키 없이 진행) */
  onApiKeyLater?: () => void
  /** 재시청("다시 보기") 모드 — 행동 단계도 "다음 ▸"로 넘길 수 있게 */
  replay?: boolean
}

type Rect = { top: number; left: number; width: number; height: number }

/** 대상 DOM 요소(data-tutorial)의 화면 위치를 추적. 줌·리사이즈 시 갱신 */
function useTargetRect(target: TutorialStep['target']): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null)
  useLayoutEffect(() => {
    if (!target) {
      setRect(null)
      return
    }
    // data-tutorial 우선, 없으면 기존 data-section(설정 섹션 등)도 타겟으로 재사용
    const selector = `[data-tutorial="${target}"], [data-section="${target}"]`
    const measure = () => {
      const el = document.querySelector(selector)
      if (!el) {
        setRect(null)
        return
      }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    measure()
    window.addEventListener('resize', measure)
    // 캔버스 줌/레이아웃 변화도 따라가도록 가볍게 폴링
    const timer = window.setInterval(measure, 400)
    return () => {
      window.removeEventListener('resize', measure)
      window.clearInterval(timer)
    }
  }, [target])
  return rect
}

/** 마스코트 Clawd 픽셀을 작은 캔버스에 그림 (EmotionPreviewModal과 동일 방식) */
function MascotCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, cv.width, cv.height)
    const pixels = CLAWD_PIXELS_BASIC
    const size = 4
    const cols = pixels[0].length
    const rows = pixels.length
    const startX = Math.floor((cv.width - cols * size) / 2)
    const startY = Math.floor((cv.height - rows * size) / 2)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = CLAWD_PALETTE[pixels[r][c]]
        if (color === undefined) continue
        ctx.fillStyle = '#' + color.toString(16).padStart(6, '0')
        ctx.fillRect(startX + c * size, startY + r * size, size, size)
      }
    }
  }, [])
  return (
    <canvas
      ref={ref}
      width={56}
      height={56}
      style={{ imageRendering: 'pixelated', flexShrink: 0 }}
    />
  )
}

export function TutorialOverlay({ step, index, total, onNext, onPrev, canPrev, onSkip, onApiKeyGuide, onApiKeyLater, replay }: Props) {
  const rect = useTargetRect(step.target)
  // 모달 안 필드(채용 폼 등)는 가려져 있을 수 있어 단계 전환 시 보이도록 스크롤
  useEffect(() => {
    if (!step.target) return
    const el = document.querySelector(`[data-tutorial="${step.target}"], [data-section="${step.target}"]`)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [step.target])
  const pad = step.target === 'canvas' ? 0 : 8
  const isApiKey = step.id === 'apikey'
  // 행동 단계는 직접 해야 진행. 평소 행동 단계는 재시청 땐 "다음"으로 넘기지만,
  // requireAction(예: 채용 완료) 단계는 재시청이어도 "다음" 불가 — 실제 버튼만 진행.
  const isAction = step.requireAction === true || (step.advanceOn !== 'next' && !replay)
  // 카드가 대상을 가리지 않게 — 화면 하단을 가리키는 "채용 완료"(footer) 단계에서만 카드를 위로.
  // (라이브 rect로 판단하면 스크롤 애니메이션 중 임계값을 넘나들며 카드가 위아래로 깜빡임 → 단계 기준 고정)
  const cardAtTop = step.id === 'hire-submit'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 320, pointerEvents: 'none' }}>
      {/* 딤 + 스팟라이트 */}
      {rect ? (
        <div
          style={{
            position: 'fixed',
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            borderRadius: 10,
            boxShadow: '0 0 0 9999px rgba(20, 20, 30, 0.6)',
            border: '2px solid #ffd700',
            pointerEvents: 'none',
            transition: 'top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease',
          }}
        />
      ) : (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20, 20, 30, 0.6)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 마스코트 카드 — 대상 안 가리게 상/하 배치 (대상이 아래쪽이면 위로) */}
      <div
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          ...(cardAtTop ? { top: 24 } : { bottom: 28 }),
          pointerEvents: 'auto',
          width: 'min(440px, calc(100vw - 32px))',
          background: '#fff8e0',
          border: '2px solid #8a6a30',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
          padding: 14,
          fontFamily: 'inherit',
          color: '#2a2118',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div
            style={{
              background: '#fffcf0',
              border: '1px solid #c8a878',
              borderRadius: 8,
              padding: 2,
              lineHeight: 0,
            }}
          >
            <MascotCanvas />
          </div>
          <div style={{ flex: 1, fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-line' }}>
            {step.text}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {/* 상단: 건너뛰기 + 진행 점 */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <button
              type="button"
              onClick={onSkip}
              style={{
                fontFamily: 'inherit', fontSize: 12, background: 'transparent',
                border: 'none', color: '#8a6a30', cursor: 'pointer',
                textDecoration: 'underline', padding: 0, whiteSpace: 'nowrap',
              }}
            >
              건너뛰기
            </button>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: total }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: i === index ? '#b8860b' : '#d8c8a8',
                  }}
                />
              ))}
            </div>
          </div>

          {/* 하단: ◂ 이전(좌) + 액션 버튼(우), 줄바꿈 방지 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            {canPrev ? (
              <button
                type="button"
                onClick={onPrev}
                style={{
                  fontFamily: 'inherit', fontSize: 13, background: '#fff8e0',
                  border: '1px solid #c8a878', borderRadius: 8, padding: '8px 14px',
                  cursor: 'pointer', color: '#5a3a0f', whiteSpace: 'nowrap',
                }}
              >
                ◂ 이전
              </button>
            ) : (
              <span />
            )}
            <div style={{ display: 'flex', gap: 8 }}>
            {isApiKey ? (
              <>
                <button
                  type="button"
                  onClick={onApiKeyLater}
                  style={{
                    fontFamily: 'inherit', fontSize: 13, background: '#fff8e0',
                    border: '1px solid #c8a878', borderRadius: 8, padding: '8px 14px',
                    cursor: 'pointer', color: '#5a3a0f', whiteSpace: 'nowrap',
                  }}
                >
                  나중에 할게
                </button>
                <button
                  type="button"
                  onClick={onApiKeyGuide}
                  autoFocus
                  style={{
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 'bold', background: '#ffd24a',
                    border: '1px solid #b8860b', borderRadius: 8, padding: '8px 16px',
                    cursor: 'pointer', color: '#2a2118', whiteSpace: 'nowrap',
                  }}
                >
                  🔑 API 키 받는 방법
                </button>
              </>
            ) : isAction ? (
              <span style={{ fontSize: 12, color: '#b8860b', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                👆 직접 해보세요
              </span>
            ) : (
              <button
                type="button"
                onClick={onNext}
                autoFocus
                style={{
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 'bold', background: '#ffd24a',
                  border: '1px solid #b8860b', borderRadius: 8, padding: '8px 18px',
                  cursor: 'pointer', color: '#2a2118', whiteSpace: 'nowrap',
                }}
              >
                {step.cta ?? '다음 ▸'}
              </button>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
