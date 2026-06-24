/**
 * 가구 픽셀 미리보기 — React 컴포넌트.
 *
 * Canvas 2D context에 furnitureCatalog의 픽셀 그리드를 그림.
 * Phaser 없이 동작 → 상점 모달 / placement ghost 양쪽에서 사용 가능.
 */

import { useEffect, useRef } from 'react'
import type { FurnitureId } from '../shared/types'
import {
  FURNITURE_CATALOG,
  renderFurnitureToCanvas,
  getFurnitureSize,
} from '../shared/furnitureCatalog'

type Props = {
  itemId: FurnitureId
  /** 화면 출력 배율 (1.0 = 그리드 원본 크기). 상점 카드에선 2~3 정도 권장 */
  scale?: number
  /** 캔버스 외곽 padding (그림자 등 여유 공간) */
  padding?: number
}

export function FurniturePreview({ itemId, scale = 2, padding = 4 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const spec = FURNITURE_CATALOG[itemId]
  if (!spec) return null

  const { width, height } = getFurnitureSize(spec, scale)
  const canvasW = Math.round(width + padding * 2)
  const canvasH = Math.round(height + padding * 2)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // 픽셀아트 — antialias off
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvasW, canvasH)
    renderFurnitureToCanvas(ctx, spec, scale, canvasW / 2, canvasH / 2)
  }, [itemId, scale, canvasW, canvasH, spec])

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
      style={{
        imageRendering: 'pixelated',
        display: 'block',
        margin: '0 auto',
      }}
    />
  )
}
