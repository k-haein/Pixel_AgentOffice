import Phaser from 'phaser'
import { eventBus } from './eventBus'
import { createClawd } from './characters/Clawd'
import { drawPixelGrid } from './pixelArt'

// ========================================================
// Pixel sprites (all PIXEL_SIZE = 2 → consistent dot scale)
// ========================================================

// --- Sun (8×8) ---
const SUN_PALETTE = { X: 0xc9a850, Y: 0xffd700 }
const SUN = [
  '..XYYX..',
  '.XYYYYX.',
  'XYYYYYYX',
  'XYYYYYYX',
  'XYYYYYYX',
  'XYYYYYYX',
  '.XYYYYX.',
  '..XYYX..',
]

// --- Chair (16×16) — back + seat ---
const CHAIR_PALETTE = {
  O: 0x2a1408, // outline
  B: 0x6a4a30, // back medium
  S: 0x4a2a10, // seat dark
}
const CHAIR = [
  '..OOOOOOOOOOOO..',
  '.OBBBBBBBBBBBBO.',
  '.OBBBBBBBBBBBBO.',
  '.OBBBBBBBBBBBBO.',
  '.OBBBBBBBBBBBBO.',
  '.OBBBBBBBBBBBBO.',
  '.OBBBBBBBBBBBBO.',
  '.OBBBBBBBBBBBBO.',
  '.OBBBBBBBBBBBBO.',
  '.OBBBBBBBBBBBBO.',
  '.OBBBBBBBBBBBBO.',
  '..OOOOOOOOOOOO..',
  'OOOOOOOOOOOOOOOO',
  'OSSSSSSSSSSSSSSO',
  'OSSSSSSSSSSSSSSO',
  'OOOOOOOOOOOOOOOO',
]

// --- Desk (40×12) — wood top + front face ---
const DESK_PALETTE = {
  O: 0x5a3a0f, // outline
  W: 0xc9a878, // light wood (top)
  D: 0x8b5a2b, // dark wood (front)
  H: 0xe8c898, // top highlight
}
const DESK = [
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
  'OHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHO',
  'OWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWO',
  'OWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWO',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
  'ODDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDO',
  'ODDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDO',
  'ODDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDO',
  'ODDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDO',
  'ODDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDO',
  'ODDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDO',
  'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
]

// --- Monitor (16×12) — bezel + screen + stand ---
const MONITOR_PALETTE = {
  K: 0x1a1a1a, // bezel
  C: 0x3a5a72, // screen blue
  G: 0x90c0d0, // glare
}
const MONITOR = [
  'KKKKKKKKKKKKKKKK',
  'KCCCCCCCCCCCCCCK',
  'KCGCCCCCCCCCCCCK',
  'KCCCCCCCCCCCCCCK',
  'KCCCCCCCCCCCCCCK',
  'KCCCCCCCCCCCCCCK',
  'KCCCCCCCCCCCCCCK',
  'KCCCCCCCCCCCCCCK',
  'KKKKKKKKKKKKKKKK',
  '......KKKK......',
  '....KKKKKKKK....',
  '..KKKKKKKKKKKK..',
]

// --- Mouse (7×5) — top-down view ---
const MOUSE_PALETTE = {
  O: 0x2a1408, // outline
  M: 0x9a9a9a, // mouse body
  H: 0xc8c8c8, // highlight
}
const MOUSE = [
  '.OOOOO.',
  'OMMHMMO',
  'OMMMMMO',
  'OMMMMMO',
  '.OOOOO.',
]

// --- Cloud (small, 10×4) ---
const CLOUD_PALETTE = {
  W: 0xffffff, // cloud white
  H: 0xe0eaf0, // shadow underside (slight cool tone)
}
const CLOUD_SMALL = [
  '..WWWWWW..',
  '.WWWWWWWW.',
  'WWWWWWWWWW',
  '.HHHHHHHH.',
]
const CLOUD_BIG = [
  '...WWWWWW...',
  '..WWWWWWWWW.',
  '.WWWWWWWWWWW',
  'WWWWWWWWWWWW',
  '.HHHHHHHHHH.',
]

// --- Coffee cup (6×8) — simple white cup with coffee ---
const COFFEE_PALETTE = {
  O: 0x2a1408, // outline
  W: 0xf8f5ec, // cup white
  c: 0x6a3a10, // coffee
}
const COFFEE = [
  '.OOOO.',
  'OccccO',
  'OWWWWO',
  'OWWWWO',
  'OWWWWO',
  'OWWWWO',
  'OWWWWO',
  '.OOOO.',
]

// --- Window pane divider (vertical, 1×32) — for sky strip details ---

export class OfficeScene extends Phaser.Scene {
  private workingBubble?: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'OfficeScene' })
  }

  create() {
    const width = this.scale.width
    const height = this.scale.height

    // === Floor ===
    this.cameras.main.setBackgroundColor('#e8dfd0')

    // === Subtle floor grid ===
    const grid = this.add.graphics()
    grid.lineStyle(1, 0x6e5a3c, 0.08)
    for (let x = 0; x < width; x += 28) {
      grid.moveTo(x, 36)
      grid.lineTo(x, height)
    }
    for (let y = 36; y < height; y += 28) {
      grid.moveTo(0, y)
      grid.lineTo(width, y)
    }
    grid.strokePath()

    // === Sky band ===
    this.add.rectangle(width / 2, 16, width, 32, 0x87ceeb)
    // Bottom window frame
    this.add.rectangle(width / 2, 34, width, 4, 0x5a4a36)

    // === Clouds (drifting) ===
    const cloud1 = drawPixelGrid(this, CLOUD_BIG, CLOUD_PALETTE, 180, 14, 2)
    cloud1.setDepth(1)
    const cloud2 = drawPixelGrid(this, CLOUD_SMALL, CLOUD_PALETTE, 460, 12, 2)
    cloud2.setDepth(1)
    const cloud3 = drawPixelGrid(this, CLOUD_BIG, CLOUD_PALETTE, 760, 18, 2)
    cloud3.setDepth(1)
    const cloud4 = drawPixelGrid(this, CLOUD_SMALL, CLOUD_PALETTE, 980, 14, 2)
    cloud4.setDepth(1)

    // Slow drift right, wrap around
    for (const cloud of [cloud1, cloud2, cloud3, cloud4]) {
      this.tweens.add({
        targets: cloud,
        x: cloud.x + width + 100,
        duration: 80000, // very slow
        repeat: -1,
        onRepeat: () => {
          cloud.x = -100
        },
      })
    }

    // === Sun (pixel star) ===
    const sun = drawPixelGrid(this, SUN, SUN_PALETTE, width - 120, 16, 2)
    sun.setDepth(2)
    this.tweens.add({
      targets: sun,
      alpha: { from: 0.75, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 1500,
    })

    // === Title overlay ===
    this.add
      .text(width / 2, 60, 'PixelAgentOffice — M1 Demo', {
        fontFamily: '"Courier New", monospace',
        fontSize: '20px',
        color: '#5a3a0f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    this.add
      .text(width / 2, 88, '캐릭터를 더블클릭하면 채팅창이 열립니다', {
        fontFamily: '"Courier New", monospace',
        fontSize: '12px',
        color: '#5a3a0f',
      })
      .setOrigin(0.5)

    // === Layout coords ===
    const deskX = width / 2
    const deskY = height / 2 + 70
    const clawdY = deskY - 44 // lifted high so monitor doesn't overlap

    // === Chair (behind Clawd, depth 4) ===
    const chair = drawPixelGrid(this, CHAIR, CHAIR_PALETTE, deskX, clawdY, 2)
    chair.setDepth(4)

    // === Clawd (depth 10) ===
    const CLAWD_BASE_SCALE = 1.0
    const clawd = createClawd(this, deskX, clawdY, 'basic')
    clawd.setDepth(10)
    clawd.setScale(CLAWD_BASE_SCALE)

    // === Desk (depth 8) ===
    const desk = drawPixelGrid(this, DESK, DESK_PALETTE, deskX, deskY, 2)
    desk.setDepth(8)

    // === Monitor directly in front of Clawd (centered) ===
    const monitor = drawPixelGrid(
      this,
      MONITOR,
      MONITOR_PALETTE,
      deskX,
      deskY - 13,
      2,
    )
    monitor.setDepth(10)
    // Screen flicker overlay
    const flicker = this.add.rectangle(deskX, deskY - 17, 28, 14, 0xffffff, 0.08)
    flicker.setDepth(11)
    this.tweens.add({
      targets: flicker,
      alpha: { from: 0.04, to: 0.16 },
      yoyo: true,
      repeat: -1,
      duration: 800,
    })

    // === Mouse (right of monitor on desk top) ===
    const mouse = drawPixelGrid(
      this,
      MOUSE,
      MOUSE_PALETTE,
      deskX + 26,
      deskY - 6,
      2,
    )
    mouse.setDepth(10)

    // === Working bubble (above Clawd) ===
    this.workingBubble = this.add
      .text(deskX, clawdY - 22, '  ✦  ', {
        fontFamily: '"Courier New", monospace',
        fontSize: '14px',
        color: '#d97500',
        backgroundColor: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20)
    this.workingBubble.setPadding({ left: 4, right: 4, top: 2, bottom: 2 })
    this.tweens.add({
      targets: this.workingBubble,
      alpha: { from: 0.35, to: 1 },
      scale: { from: 0.9, to: 1.08 },
      yoyo: true,
      repeat: -1,
      duration: 700,
    })

    // === Idle bob for Clawd ===
    this.tweens.add({
      targets: clawd,
      y: { from: clawdY, to: clawdY - 2 },
      yoyo: true,
      repeat: -1,
      duration: 1400,
      ease: 'Sine.easeInOut',
    })

    // === Nameplate (on desk front) ===
    const nameplate = this.add
      .text(deskX, deskY + 36, '✍️  Mary · 편집자', {
        fontFamily: '"Courier New", monospace',
        fontSize: '12px',
        color: '#2a2118',
        backgroundColor: '#fff8e0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20)
    nameplate.setPadding({ left: 8, right: 8, top: 3, bottom: 3 })

    // === Interactions ===
    let lastClick = 0
    clawd.on('pointerup', () => {
      const now = Date.now()
      if (now - lastClick < 350) {
        eventBus.emit('chat:open', {
          id: 'mary-001',
          name: 'Mary',
          role: '편집자',
          emoji: '✍️',
        })
      }
      lastClick = now
    })

    clawd.on('pointerover', () => {
      this.tweens.add({
        targets: clawd,
        scale: CLAWD_BASE_SCALE * 1.08,
        duration: 120,
      })
    })
    clawd.on('pointerout', () => {
      this.tweens.add({
        targets: clawd,
        scale: CLAWD_BASE_SCALE,
        duration: 120,
      })
    })

    // === State sync from React ===
    eventBus.on('agent:set-state', (state: 'idle' | 'working') => {
      this.setCharacterState(state)
    })
  }

  private setCharacterState(state: 'idle' | 'working') {
    if (this.workingBubble) {
      this.workingBubble.setVisible(state === 'working')
    }
  }
}
