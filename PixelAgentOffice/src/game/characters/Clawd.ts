import Phaser from 'phaser'
import type { CharacterPattern, CharacterPalette } from '../../shared/types'
import { CHARACTER_PALETTE } from '../../shared/types'

export type ClawdVariant = 'basic' | 'headphones' | 'jellyfish' | 'custom'

// === Color palette ===
const PALETTE: Record<string, number> = {
  // Common dark (orange Clawd outline/eye)
  X: 0x2a1408,

  // Basic Clawd
  O: 0xe87a4a, // orange body

  // Headphones variant
  H: 0xffffff, // headphone cup white
  B: 0x2a3a8a, // headphone band blue

  // Jellyfish (Haewol) — translucent blue with rainbow shine
  J: 0x7ab5e0, // jellyfish blue body
  Y: 0x1a3050, // jellyfish dark outline + eye
  S: 0xc8f0ff, // cyan shine
  P: 0xe0c8ff, // pink/purple shine
  G: 0xfff5c8, // soft yellow shine (rainbow accent)

  // Custom octopus (v2 #17) — 'C' = 사용자 선택 색. 기본은 그림자 진 회색 (미리보기)
  C: 0x6a6878,
}

// === Pixel grids ===
// Each char = 1 art pixel. '.' = transparent.

// 12 wide × 12 tall (body 8 rows + legs 4 rows, orange legs)
const PIXELS_BASIC: string[] = [
  '..OOOOOOOO..',
  '.OOOOOOOOOO.',
  'OOXXOOOOXXOO',
  'OOXXOOOOXXOO',
  'OOOOOOOOOOOO',
  'OOOOOOOOOOOO',
  '.OOOOOOOOOO.',
  '..OOOOOOOO..',
  '.OO.OO.OO.OO',
  '.OO.OO.OO.OO',
  '.OO.OO.OO.OO',
  '.OO.OO.OO.OO',
]

// Headphones variant
const PIXELS_HEADPHONES: string[] = [
  '...BBBBBB...',
  '..BOOOOOOB..',
  '.BOOOOOOOOB.',
  'HHOOXXOOXXOH',
  'HHOOXXOOXXOH',
  'HHOOOOOOOOOH',
  '.OOOOOOOOOO.',
  '..OOOOOOOO..',
  '.OO.OO.OO.OO',
  '.OO.OO.OO.OO',
  '.OO.OO.OO.OO',
  '.OO.OO.OO.OO',
]

// Jellyfish (Haewol) — same shape, blue tones + scattered rainbow shines
const PIXELS_JELLYFISH: string[] = [
  '..JJJSJJJJ..', // S = cyan shine on top
  '.JJJJJJJJPJ.', // P = pink shine right
  'JJYYJJJJYYJJ',
  'JJYYJJJJYYJJ',
  'JJJJJJGJJJJJ', // G = yellow shine center
  'JSJJJJJJJJJJ',
  '.JJJJJJJJPJ.',
  '..JJJJSJJJ..',
  '.JJ.JJ.JJ.JJ',
  '.JJ.JJ.JJ.JJ',
  '.JJ.JJ.JJ.JJ',
  '.JJ.JJ.JJ.JJ',
]

// 커스텀 캐릭터 (v2 #17) — 그림자 진 문어. 베이스는 'C' = 커스텀 색.
// 'X' 외곽/눈, 'S' 하이라이트 (speckled에서 사용), 'D' 그림자 (gradient에서 사용)
const PIXELS_CUSTOM_OCTOPUS: string[] = [
  '..CCCCCCCC..',
  '.CCCCCCCCCC.',
  'CCXXCCCCXXCC', // 큰 눈 2개
  'CCXXCCCCXXCC',
  'CCCCCCCCCCCC',
  'CCCCCCCCCCCC',
  '.CCCCCCCCCC.',
  '..CCCCCCCC..',
  '.CC.CC.CC.CC', // 8 다리 (4쌍)
  '.CC.CC.CC.CC',
  '.CC.CC.CC.CC',
  '.CC.CC.CC.CC',
]

const PIXEL_SIZE = 2

/** 베이스 색에 무늬 적용 — 위치별 색 변형 (v2 #18) */
function computePatternColor(
  base: number,
  r: number,
  c: number,
  rows: number,
  pattern: CharacterPattern,
): number {
  if (pattern === 'solid') return base
  const baseColor = Phaser.Display.Color.IntegerToColor(base)
  if (pattern === 'speckled') {
    // 결정적 분산 — 일부 픽셀(약 1/9)을 밝게
    if ((r * 7 + c * 3) % 9 === 0) {
      const lighter = baseColor.clone().lighten(40)
      return lighter.color
    }
    return base
  }
  if (pattern === 'gradient') {
    // 위는 베이스 → 아래는 어둡게 (40% 다크)
    const ratio = rows > 1 ? r / (rows - 1) : 0
    const dark = baseColor.clone().darken(40)
    const blended = Phaser.Display.Color.Interpolate.ColorWithColor(baseColor, dark, 1, ratio)
    return Phaser.Display.Color.GetColor(blended.r, blended.g, blended.b)
  }
  if (pattern === 'stripes') {
    return r % 2 === 0 ? base : baseColor.clone().darken(20).color
  }
  return base
}

export function createClawd(
  scene: Phaser.Scene,
  x: number,
  y: number,
  variant: ClawdVariant = 'basic',
  options?: { customColor?: CharacterPalette; pattern?: CharacterPattern },
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y)

  const pixels =
    variant === 'headphones'
      ? PIXELS_HEADPHONES
      : variant === 'jellyfish'
        ? PIXELS_JELLYFISH
        : variant === 'custom'
          ? PIXELS_CUSTOM_OCTOPUS
          : PIXELS_BASIC

  // 무늬 적용 대상 = 'C'(custom) / 'O'(basic) / 'J'(jellyfish) (베이스 색 픽셀)
  const baseChar: string =
    variant === 'custom' ? 'C' : variant === 'jellyfish' ? 'J' : 'O'
  // 커스텀 색 적용 — palette의 'C' 키만 동적 변경
  const palette: Record<string, number> = { ...PALETTE }
  if (variant === 'custom' && options?.customColor) {
    palette.C = CHARACTER_PALETTE[options.customColor]
  }
  const pattern: CharacterPattern = options?.pattern ?? 'solid'

  const cols = pixels[0].length
  const rows = pixels.length
  const totalW = cols * PIXEL_SIZE
  const totalH = rows * PIXEL_SIZE

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < pixels[r].length; c++) {
      const ch = pixels[r][c]
      const baseColor = palette[ch]
      if (baseColor === undefined) continue
      // 베이스 색 픽셀에만 무늬 적용 (눈·외곽은 그대로)
      const color = ch === baseChar
        ? computePatternColor(baseColor, r, c, rows, pattern)
        : baseColor
      const px = (c - cols / 2 + 0.5) * PIXEL_SIZE
      const py = (r - rows / 2 + 0.5) * PIXEL_SIZE
      const rect = scene.add.rectangle(px, py, PIXEL_SIZE, PIXEL_SIZE, color)
      container.add(rect)
    }
  }

  const hitW = totalW + 2
  const hitH = totalH + 2
  container.setSize(hitW, hitH)
  container.setInteractive(
    new Phaser.Geom.Rectangle(-hitW / 2, -hitH / 2 + 2, hitW, hitH),
    Phaser.Geom.Rectangle.Contains,
  )

  return container
}
