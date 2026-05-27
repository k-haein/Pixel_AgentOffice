import Phaser from 'phaser'

export type ClawdVariant = 'basic' | 'headphones' | 'jellyfish'

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

const PIXEL_SIZE = 2

export function createClawd(
  scene: Phaser.Scene,
  x: number,
  y: number,
  variant: ClawdVariant = 'basic',
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y)

  const pixels =
    variant === 'headphones'
      ? PIXELS_HEADPHONES
      : variant === 'jellyfish'
        ? PIXELS_JELLYFISH
        : PIXELS_BASIC

  const cols = pixels[0].length
  const rows = pixels.length
  const totalW = cols * PIXEL_SIZE
  const totalH = rows * PIXEL_SIZE

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < pixels[r].length; c++) {
      const ch = pixels[r][c]
      const color = PALETTE[ch]
      if (color === undefined) continue
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
