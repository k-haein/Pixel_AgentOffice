import Phaser from 'phaser'
import { eventBus, type Agent } from './eventBus'
import { createClawd, type ClawdVariant } from './characters/Clawd'
import { drawPixelGrid } from './pixelArt'

// ========================================================
// Pixel sprites (all PIXEL_SIZE = 2 → consistent dot scale)
// ========================================================

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

const CHAIR_PALETTE = { O: 0x2a1408, B: 0x6a4a30, S: 0x4a2a10 }
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

const DESK_PALETTE = {
  O: 0x5a3a0f,
  W: 0xc9a878,
  D: 0x8b5a2b,
  H: 0xe8c898,
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

const MONITOR_PALETTE = { K: 0x1a1a1a, C: 0x3a5a72, G: 0x90c0d0 }
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

const MOUSE_PALETTE = { O: 0x2a1408, M: 0x9a9a9a, H: 0xc8c8c8 }
const MOUSE = [
  '.OOOOO.',
  'OMMHMMO',
  'OMMMMMO',
  'OMMMMMO',
  '.OOOOO.',
]

const CLOUD_PALETTE = { W: 0xffffff, H: 0xe0eaf0 }
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

// ========================================================
// Workstation config (one desk + one character)
// ========================================================

type WorkstationConfig = {
  agent: Agent
  variant: ClawdVariant
  alpha?: number // jellyfish wants ~0.85
}

type Workstation = {
  agent: Agent
  clawd: Phaser.GameObjects.Container
  workingBubble: Phaser.GameObjects.Text
}

// ========================================================
// Scene
// ========================================================

const CLAWD_BASE_SCALE = 1.0

export class OfficeScene extends Phaser.Scene {
  private workstations = new Map<string, Workstation>()

  constructor() {
    super({ key: 'OfficeScene' })
  }

  create() {
    const width = this.scale.width
    const height = this.scale.height

    // === Floor ===
    this.cameras.main.setBackgroundColor('#e8dfd0')

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
    this.add.rectangle(width / 2, 34, width, 4, 0x5a4a36)

    // === Clouds (drifting) ===
    const cloud1 = drawPixelGrid(this, CLOUD_BIG, CLOUD_PALETTE, 180, 14, 2)
    const cloud2 = drawPixelGrid(this, CLOUD_SMALL, CLOUD_PALETTE, 460, 12, 2)
    const cloud3 = drawPixelGrid(this, CLOUD_BIG, CLOUD_PALETTE, 760, 18, 2)
    const cloud4 = drawPixelGrid(this, CLOUD_SMALL, CLOUD_PALETTE, 980, 14, 2)
    for (const cloud of [cloud1, cloud2, cloud3, cloud4]) {
      cloud.setDepth(1)
      this.tweens.add({
        targets: cloud,
        x: cloud.x + width + 100,
        duration: 80000,
        repeat: -1,
        onRepeat: () => {
          cloud.x = -100
        },
      })
    }

    // === Sun ===
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

    // === Workstations ===
    const deskY = height / 2 + 70

    this.createWorkstation(width / 2 - 120, deskY, {
      agent: { id: 'mary-001', name: 'Mary', role: '편집자', emoji: '✍️' },
      variant: 'basic',
    })

    this.createWorkstation(width / 2 + 120, deskY, {
      agent: { id: 'haewol-001', name: 'Haewol', role: '작가', emoji: '🪼' },
      variant: 'jellyfish',
      alpha: 0.85,
    })

    // === Listen for state changes from React ===
    eventBus.on(
      'agent:set-state',
      ({ agentId, state }: { agentId: string; state: 'idle' | 'working' }) => {
        const ws = this.workstations.get(agentId)
        if (ws) ws.workingBubble.setVisible(state === 'working')
      },
    )
  }

  private createWorkstation(x: number, deskY: number, config: WorkstationConfig) {
    const clawdY = deskY - 44

    // Chair behind
    const chair = drawPixelGrid(this, CHAIR, CHAIR_PALETTE, x, clawdY, 2)
    chair.setDepth(4)

    // Character
    const clawd = createClawd(this, x, clawdY, config.variant)
    clawd.setDepth(10)
    clawd.setScale(CLAWD_BASE_SCALE)
    if (config.alpha !== undefined) {
      clawd.setAlpha(config.alpha)
    }

    // Desk
    drawPixelGrid(this, DESK, DESK_PALETTE, x, deskY, 2).setDepth(8)

    // Monitor in front of character
    drawPixelGrid(this, MONITOR, MONITOR_PALETTE, x, deskY - 13, 2).setDepth(10)
    const flicker = this.add.rectangle(x, deskY - 17, 28, 14, 0xffffff, 0.08)
    flicker.setDepth(11)
    this.tweens.add({
      targets: flicker,
      alpha: { from: 0.04, to: 0.16 },
      yoyo: true,
      repeat: -1,
      duration: 800,
    })

    // Mouse right of monitor
    drawPixelGrid(this, MOUSE, MOUSE_PALETTE, x + 26, deskY - 6, 2).setDepth(10)

    // Working bubble above
    const workingBubble = this.add
      .text(x, clawdY - 22, '  ✦  ', {
        fontFamily: '"Courier New", monospace',
        fontSize: '14px',
        color: '#d97500',
        backgroundColor: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20)
    workingBubble.setPadding({ left: 4, right: 4, top: 2, bottom: 2 })
    this.tweens.add({
      targets: workingBubble,
      alpha: { from: 0.35, to: 1 },
      scale: { from: 0.9, to: 1.08 },
      yoyo: true,
      repeat: -1,
      duration: 700,
    })

    // Idle bob
    this.tweens.add({
      targets: clawd,
      y: { from: clawdY, to: clawdY - 2 },
      yoyo: true,
      repeat: -1,
      duration: 1400,
      ease: 'Sine.easeInOut',
    })

    // Nameplate
    const nameplate = this.add
      .text(x, deskY + 36, `${config.agent.emoji}  ${config.agent.name} · ${config.agent.role}`, {
        fontFamily: '"Courier New", monospace',
        fontSize: '12px',
        color: '#2a2118',
        backgroundColor: '#fff8e0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20)
    nameplate.setPadding({ left: 8, right: 8, top: 3, bottom: 3 })

    // Interactions
    let lastClick = 0
    clawd.on('pointerup', () => {
      const now = Date.now()
      if (now - lastClick < 350) {
        eventBus.emit('chat:open', config.agent)
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

    this.workstations.set(config.agent.id, { agent: config.agent, clawd, workingBubble })
  }
}
