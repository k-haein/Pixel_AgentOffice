/**
 * 감정 미리보기 모달 (Day 12 §3) — ShopModal의 "감정 표현 미리보기" 위에 작게 띄움.
 *
 * 게임 캐릭터 (Clawd basic) + 머리 위 말풍선 + emotion 픽셀을 Canvas로 그림.
 * 12종 버튼 클릭으로 다른 emotion 미리보기 가능.
 *
 * 픽셀 데이터는 게임 코드에서 import (Phaser 의존 없음 — 그리드 문자열만).
 */

import { useEffect, useRef, useState } from 'react'
import type { BubbleEmotion } from '../shared/types'
import { EMOTION_LABELS } from '../shared/types'
import { CLAWD_PIXELS_BASIC, CLAWD_PALETTE } from '../game/characters/Clawd'
import {
  CHAT_BUBBLE,
  CHAT_BUBBLE_PALETTE,
} from '../game/OfficeScene'

type Props = {
  initialEmotion: BubbleEmotion
  onClose: () => void
}

/** Canvas 2D context에 픽셀 그리드 그리기 — 단순 헬퍼.
 *  sleepy(closed)만 눈 위에 가로선 추가, 나머지는 픽셀 그대로. */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  pixels: string[],
  palette: Record<string, number>,
  pixelSize: number,
  centerX: number,
  centerY: number,
): void {
  const cols = pixels[0].length
  const rows = pixels.length
  const totalW = cols * pixelSize
  const totalH = rows * pixelSize
  const startX = Math.floor(centerX - totalW / 2)
  const startY = Math.floor(centerY - totalH / 2)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = pixels[r][c]
      const color = palette[ch]
      if (color === undefined) continue
      ctx.fillStyle = '#' + color.toString(16).padStart(6, '0')
      ctx.fillRect(startX + c * pixelSize, startY + r * pixelSize, pixelSize, pixelSize)
    }
  }
}

export function EmotionPreviewModal({ initialEmotion, onClose }: Props) {
  const [emotion, setEmotion] = useState<BubbleEmotion>(initialEmotion)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // ESC 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // 캐릭터 + 말풍선 + emotion 픽셀 그리기
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false

    const W = canvas.width
    const H = canvas.height
    // 배경 — 부드러운 베이지
    ctx.fillStyle = '#fffcf0'
    ctx.fillRect(0, 0, W, H)

    // 격자 무늬 (부드럽게)
    ctx.fillStyle = '#f0e0c0'
    for (let y = 0; y < H; y += 8) {
      for (let x = 0; x < W; x += 8) {
        if ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0) {
          ctx.fillRect(x, y, 8, 8)
        }
      }
    }

    // 캐릭터 (Clawd basic) — sleepy일 때만 눈 픽셀 hide + 가로선
    const charPixelSize = 4
    const charCenterX = W / 2
    const charCenterY = H / 2 + 24
    const isSleepy = emotion === 'sleepy'
    if (isSleepy) {
      // 눈 X 픽셀 제외하고 그리기
      const drawNoEyes = (r: number, c: number) => pixels[r][c] !== 'X'
      const pixels = CLAWD_PIXELS_BASIC
      const cols = pixels[0].length
      const rows = pixels.length
      const totalW = cols * charPixelSize
      const totalH = rows * charPixelSize
      const startX = Math.floor(charCenterX - totalW / 2)
      const startY = Math.floor(charCenterY - totalH / 2)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!drawNoEyes(r, c)) continue
          const ch = pixels[r][c]
          const color = CLAWD_PALETTE[ch]
          if (color === undefined) continue
          ctx.fillStyle = '#' + color.toString(16).padStart(6, '0')
          ctx.fillRect(startX + c * charPixelSize, startY + r * charPixelSize, charPixelSize, charPixelSize)
        }
      }
      // 가로선 — 눈 row 2.5, col 2.5(왼) / 8.5(오른), 폭 6 두께 2 (PIXEL_SIZE 4 기준)
      ctx.fillStyle = '#2a1408'
      const eyeLocalY = (2.5 - 12 / 2 + 0.5) * charPixelSize
      const eyeY = Math.floor(charCenterY + eyeLocalY - charPixelSize / 2)
      const leftLocalX = (2.5 - 12 / 2 + 0.5) * charPixelSize
      const leftX = Math.floor(charCenterX + leftLocalX - (charPixelSize * 3) / 2)
      ctx.fillRect(leftX, eyeY, charPixelSize * 3, charPixelSize)
      const rightLocalX = (8.5 - 12 / 2 + 0.5) * charPixelSize
      const rightX = Math.floor(charCenterX + rightLocalX - (charPixelSize * 3) / 2)
      ctx.fillRect(rightX, eyeY, charPixelSize * 3, charPixelSize)
    } else {
      drawGrid(ctx, CLAWD_PIXELS_BASIC, CLAWD_PALETTE, charPixelSize, charCenterX, charCenterY)
    }

    // 말풍선 — 캐릭터 머리 위. CHAT_BUBBLE 픽셀, PIXEL_SIZE 4
    const bubblePixelSize = 4
    const bubbleCenterX = charCenterX
    const bubbleCenterY = charCenterY - 56
    drawGrid(ctx, CHAT_BUBBLE, CHAT_BUBBLE_PALETTE, bubblePixelSize, bubbleCenterX, bubbleCenterY)

    // emotion 이모지 — 말풍선 안 흰 영역 중앙. Phaser Text 대신 Canvas fillText (Day 12 §3)
    const emotionCenterY = bubbleCenterY - 6 // 흰 영역 중앙
    ctx.font = '20px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#000'
    ctx.fillText(EMOTION_LABELS[emotion].emoji, bubbleCenterX, emotionCenterY)
  }, [emotion])

  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ zIndex: 200 }}
    >
      <div
        className="modal"
        style={{ maxWidth: 460 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>🎭 감정 미리보기 — {EMOTION_LABELS[emotion].emoji} {EMOTION_LABELS[emotion].name}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="modal-hint" style={{ marginBottom: 10 }}>
            아래 캐릭터의 말풍선이 선택한 감정으로 표시됩니다. 12종 중 클릭하면 바로 바뀝니다.
          </p>

          {/* 캐릭터 + 말풍선 캔버스 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <canvas
              ref={canvasRef}
              width={280}
              height={220}
              style={{
                imageRendering: 'pixelated',
                border: '2px solid #c8a878',
                borderRadius: 8,
                background: '#fffcf0',
              }}
            />
          </div>

          {/* 12 emotion 버튼 grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6,
            }}
          >
            {(Object.keys(EMOTION_LABELS) as BubbleEmotion[]).map(em => {
              const { emoji, name } = EMOTION_LABELS[em]
              const selected = emotion === em
              return (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmotion(em)}
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
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn-secondary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}
