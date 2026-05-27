/**
 * 가구 카탈로그 — 픽셀 그리드 + 팔레트 + 사이즈 정의 (Day 11 후속 +1).
 *
 * 기존엔 OfficeScene.ts에만 있었지만 ShopModal에서도 미리보기를 그리려면 import 필요.
 * Phaser 의존 없이 *순수 데이터*만 — Canvas 2D / Phaser 양쪽에서 동일하게 사용.
 */

import type { FurnitureId } from './types'

export type FurnitureSpec = {
  /** 픽셀 그리드 — 각 char = 1 art pixel. '.' = transparent */
  pixels: string[]
  /** char → 색(0xRRGGBB) */
  palette: Record<string, number>
  /** 한 art pixel을 몇 px로 그릴지 (Phaser 기준). Canvas 미리보기도 동일 비례 */
  pixelSize: number
  /** 사람이 보는 이름 (catalog 표시용) */
  displayName: string
  /** 짧은 설명 */
  desc: string
  /** 카테고리 */
  category: '가구' | '꾸미기' | '비품'
}

// 기존 가구 3종 — OfficeScene.ts의 PLANT/BOOKSHELF/VENDING 재사용
const PLANT = [
  '..LLLLL..',
  '.LGGGGGL.',
  'LGSGGGSGL',
  'LGGGGGGGL',
  '.LGGGGGL.',
  '..LGGGL..',
  '...PPP...',
  '..PPPPP..',
  '.PPPPPPP.',
  '.PDDDDDP.',
  '.PPPPPPP.',
  '..PPPPP..',
]
const PLANT_PALETTE = { L: 0x2a5a2a, G: 0x4a8a4a, S: 0x7ac87a, P: 0x6a4030, D: 0x4a2818 }

const BOOKSHELF = [
  'OOOOOOOOOO',
  'ORYBRYBRYO',
  'OYRBYRBYRO',
  'OOOOOOOOOO',
  'OWWWWWWWWO',
  'OBYGRBYGRO',
  'OYRBGYBRRO',
  'OOOOOOOOOO',
  'OWWWWWWWWO',
  'OGYBRRYBYO',
  'OYBBRGYRBO',
  'OOOOOOOOOO',
]
const BOOKSHELF_PALETTE = { O: 0x3a2008, R: 0xa83838, Y: 0xc8b048, B: 0x3868a8, G: 0x488a48, W: 0xc8a070 }

const VENDING = [
  'OOOOOOOOO',
  'OKKKKKKKO',
  'OKWWWWWKO',
  'OKWRBYRWKO',
  'OKWRBYRWKO',
  'OKWRBYRWKO',
  'OKKKKKKKO',
  'OPPPPPPPO',
  'OPSPSPSPO',
  'OPPPPPPPO',
  'OOOOOOOOO',
  'OOO...OOO',
]
const VENDING_PALETTE = { O: 0x2a1a04, K: 0x101010, W: 0x484858, R: 0xc83030, B: 0x3060c8, Y: 0xc8b030, P: 0x5a4030, S: 0xa87830 }

// === 추가 가구 5종 (단순 픽셀, 8~16 wide) ===

// 소파 — 등받이 + 쿠션 + 다리. 폭 14, 높이 8
const SOFA = [
  '..BBBBBBBBBB..',
  '.BCCCCCCCCCCB.',
  'BCSCCCCCCCSCBB', // S 쿠션 하이라이트
  'BCCCCCCCCCCCCB',
  'BCCCCCCCCCCCCB',
  'BBBBBBBBBBBBBB',
  'O.O........O.O',
  'O.O........O.O',
]
const SOFA_PALETTE = { O: 0x2a1a04, B: 0x6a4030, C: 0x4a78a8, S: 0x7098c8 }

// 벽 캘린더 — 빨강 헤더 + 흰 본체 + 회색 격자. 폭 8, 높이 9
const CALENDAR = [
  'OOOOOOOO',
  'ORRRRRRO',
  'ORRRRRRO',
  'OWWWWWWO',
  'OWXXXXWO',
  'OWXXXXWO',
  'OWXXXXWO',
  'OWXXXXWO',
  'OOOOOOOO',
]
const CALENDAR_PALETTE = { O: 0x2a1a04, R: 0xd03048, W: 0xfafafa, X: 0x6a6a6a }

// 액자 — 두꺼운 외곽 + 안에 풍경. 폭 8, 높이 9
const FRAME = [
  'OOOOOOOO',
  'OOOOOOOO',
  'OOBBBBOO',
  'OOBBBBOO',
  'OOGSGSGO',
  'OOGGGGOO',
  'OOGGGGOO',
  'OOOOOOOO',
  'OOOOOOOO',
]
const FRAME_PALETTE = { O: 0x5a3a0f, G: 0x60a040, S: 0x6a4030, B: 0x80c0e0 }

// 휴지통 — 어두운 뚜껑 + 밝은 본체. 폭 6, 높이 8
const TRASH_CAN = [
  '.SSSS.',
  'SSSSSS',
  'SBBBBS',
  'SBBBBS',
  'SBBBBS',
  'SBBBBS',
  'SBBBBS',
  'SSSSSS',
]
const TRASH_CAN_PALETTE = { O: 0x2a2a2a, S: 0x4a4a4a, B: 0x8a8a8a }

// 탕비실 테이블 — 긴 상판 + 다리 4개. 폭 16, 높이 6
const LOUNGE_TABLE = [
  'OOOOOOOOOOOOOOOO',
  'OWWWWWWWWWWWWWWO',
  'OWWWWWWWWWWWWWWO',
  'OOOOOOOOOOOOOOOO',
  '.D............D.',
  '.D............D.',
]
const LOUNGE_TABLE_PALETTE = { O: 0x3a2008, W: 0xc9a878, D: 0x8b5a2b }

/** 가구 8종 카탈로그 — itemId → spec. OfficeScene과 ShopModal에서 공통 import */
export const FURNITURE_CATALOG: Record<FurnitureId, FurnitureSpec> = {
  'plant-large': {
    pixels: PLANT,
    palette: PLANT_PALETTE,
    pixelSize: 3,
    displayName: '대형 화분',
    desc: '코너에 두면 분위기 ↑',
    category: '꾸미기',
  },
  'bookshelf-tall': {
    pixels: BOOKSHELF,
    palette: BOOKSHELF_PALETTE,
    pixelSize: 3,
    displayName: '큰 책장 5단',
    desc: '책 더 많이 표시',
    category: '가구',
  },
  'vending-soda': {
    pixels: VENDING,
    palette: VENDING_PALETTE,
    pixelSize: 3,
    displayName: '음료 자판기',
    desc: '청량음료 추가',
    category: '비품',
  },
  'sofa': {
    pixels: SOFA,
    palette: SOFA_PALETTE,
    pixelSize: 3,
    displayName: '소파',
    desc: '휴게 공간 시각화',
    category: '가구',
  },
  'calendar': {
    pixels: CALENDAR,
    palette: CALENDAR_PALETTE,
    pixelSize: 3,
    displayName: '벽 캘린더',
    desc: '실시간 날짜 표시 (예정)',
    category: '꾸미기',
  },
  'frame': {
    pixels: FRAME,
    palette: FRAME_PALETTE,
    pixelSize: 3,
    displayName: '액자 (그림)',
    desc: '벽 액자 추가',
    category: '꾸미기',
  },
  'trash-can': {
    pixels: TRASH_CAN,
    palette: TRASH_CAN_PALETTE,
    pixelSize: 3,
    displayName: '휴지통',
    desc: '사무실 디테일',
    category: '비품',
  },
  'lounge-table': {
    pixels: LOUNGE_TABLE,
    palette: LOUNGE_TABLE_PALETTE,
    pixelSize: 3,
    displayName: '탕비실 테이블',
    desc: '점심·휴식 공간',
    category: '가구',
  },
}

/** Canvas 2D context에 픽셀 그리드 렌더링 (ShopModal 미리보기·placement ghost용) */
export function renderFurnitureToCanvas(
  ctx: CanvasRenderingContext2D,
  spec: FurnitureSpec,
  scale: number,
  centerX: number,
  centerY: number,
): void {
  const cols = spec.pixels[0].length
  const rows = spec.pixels.length
  const pixSize = spec.pixelSize * scale
  const totalW = cols * pixSize
  const totalH = rows * pixSize
  const startX = centerX - totalW / 2
  const startY = centerY - totalH / 2

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = spec.pixels[r][c]
      const color = spec.palette[ch]
      if (color === undefined) continue
      // 0xRRGGBB → '#rrggbb'
      const hex = '#' + color.toString(16).padStart(6, '0')
      ctx.fillStyle = hex
      ctx.fillRect(
        Math.floor(startX + c * pixSize),
        Math.floor(startY + r * pixSize),
        Math.ceil(pixSize),
        Math.ceil(pixSize),
      )
    }
  }
}

/** 가구 그리드의 화면 크기(px) — preview canvas 크기 계산용 */
export function getFurnitureSize(spec: FurnitureSpec, scale = 1): { width: number; height: number } {
  return {
    width: spec.pixels[0].length * spec.pixelSize * scale,
    height: spec.pixels.length * spec.pixelSize * scale,
  }
}
