import Phaser from 'phaser'
import { eventBus } from './eventBus'
import { createClawd, type ClawdVariant } from './characters/Clawd'
import { drawPixelGrid } from './pixelArt'
import { type Employee, TEMPLATES } from '../shared/types'
import { TIME_PALETTES, getTimeOfDay, msUntilNextTransition, type TimeOfDay } from './timeOfDay'

// ========================================================
// Pixel sprites (PIXEL_SIZE = 2 통일)
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

// 메모지 — 책상 위 노란 포스트잇
const MEMO_PALETTE = { O: 0x8a6a20, Y: 0xfff4a6, L: 0x3a2a08 }
const MEMO = [
  'OOOOOOO',
  'OYYYYYO',
  'OYLLYLO',
  'OYYYYYO',
  'OYLLLYO',
  'OYYYYYO',
  'OOOOOOO',
]

// 💬 채팅 말풍선 — 캐릭터 머리 위, 클릭하면 채팅
const CHAT_BUBBLE_PALETTE = { O: 0x2a1408, W: 0xfafafa, D: 0x5a5a5a }
const CHAT_BUBBLE = [
  '.OOOOOOO.',
  'OWWWWWWWO',
  'OWDOWODWO',
  'OWWWWWWWO',
  'OWDOWODWO',
  'OWWWWWWWO',
  '.OOOOOO..',
  '...OO....',
  '....O....',
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
// Scene
// ========================================================

const CLAWD_BASE_SCALE = 1.0

type Workstation = {
  employee: Employee
  clawd: Phaser.GameObjects.Container
  workingBubble: Phaser.GameObjects.Text
  chatBubble: Phaser.GameObjects.Container
  memo: Phaser.GameObjects.Container
  nameplate: Phaser.GameObjects.Text
  // Phaser objects that need cleanup
  allObjects: Phaser.GameObjects.GameObject[]
}

export class OfficeScene extends Phaser.Scene {
  private workstations = new Map<string, Workstation>()
  private deskY = 0
  private isShutdown = false

  // === 시간대 시스템 ===
  /** 강제 야간 모드 (토큰 고갈 시 외부에서 true로 설정) */
  private forcedNight = false
  /** 현재 적용된 시간대 — 트랜지션 중복 방지용 */
  private currentTimeOfDay: TimeOfDay | null = null
  /** 다음 시간대 자동 체크 타이머 */
  private timeRefreshTimer?: Phaser.Time.TimerEvent
  /** 하늘 / 천체 / 구름 / 별 — 시간대마다 색 갱신해야 하는 요소들 참조 */
  private skyBand?: Phaser.GameObjects.Rectangle
  private skyDivider?: Phaser.GameObjects.Rectangle
  private celestialBody?: Phaser.GameObjects.Container
  private clouds: Phaser.GameObjects.Container[] = []
  private stars: Phaser.GameObjects.Rectangle[] = []
  /** 현재 시간대 라벨 (UI 표시용) */
  private timeLabel?: Phaser.GameObjects.Text

  // 리스너 참조 (cleanup 위해 보관) — payload: unknown으로 받고 내부에서 캐스팅
  private setEmployeesHandler = (payload: unknown) => {
    // 씬 tear down 중에 listener가 호출될 수 있어 다중 가드
    if (this.isShutdown || !this.add || !this.scene) return
    this.rebuildWorkstations(payload as Employee[])
  }
  private setStateHandler = (payload: unknown) => {
    if (this.isShutdown || !this.add) return
    const { agentId, state } = payload as { agentId: string; state: 'idle' | 'working' }
    const ws = this.workstations.get(agentId)
    if (ws && ws.workingBubble.active) {
      ws.workingBubble.setVisible(state === 'working')
      ws.chatBubble.setVisible(state !== 'working')
    }
  }
  /** 토큰 고갈 → 강제 밤 / 회복 → 평시 시간대 */
  private nightModeHandler = (payload: unknown) => {
    if (this.isShutdown) return
    const { forced } = payload as { forced: boolean }
    this.forcedNight = forced
    this.applyTimeOfDay(this.resolveTimeOfDay(), true)
  }

  constructor() {
    super({ key: 'OfficeScene' })
  }

  create() {
    this.isShutdown = false
    const width = this.scale.width
    const height = this.scale.height
    this.deskY = height / 2 + 70

    // Background
    this.cameras.main.setBackgroundColor('#e8dfd0')

    // Floor grid
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

    // Sky band — 색은 시간대 시스템이 결정 (applyTimeOfDay)
    this.skyBand = this.add.rectangle(width / 2, 16, width, 32, 0x87ceeb)
    this.skyDivider = this.add.rectangle(width / 2, 34, width, 4, 0x5a4a36)

    // Stars (밤 시간대에만 보이게 alpha 조정) — 살짝 깜빡이는 점들
    const STAR_POSITIONS: Array<[number, number, number]> = [
      [80, 8, 2], [220, 12, 1.5], [340, 6, 2], [510, 14, 1.5],
      [620, 9, 2], [780, 11, 1.5], [870, 6, 2], [1010, 13, 1.5],
    ]
    for (const [x, y, size] of STAR_POSITIONS) {
      const star = this.add.rectangle(x, y, size * 2, size * 2, 0xfff8d0, 0)
      star.setDepth(0)
      this.stars.push(star)
      // 별마다 약간씩 다른 깜빡임
      this.tweens.add({
        targets: star,
        scale: { from: 0.7, to: 1.2 },
        yoyo: true,
        repeat: -1,
        duration: 1500 + Math.random() * 1500,
      })
    }

    // Clouds
    const cloudPositions: Array<[number, number, string[]]> = [
      [180, 14, CLOUD_BIG],
      [460, 12, CLOUD_SMALL],
      [760, 18, CLOUD_BIG],
      [980, 14, CLOUD_SMALL],
    ]
    for (const [x, y, pixels] of cloudPositions) {
      const cloud = drawPixelGrid(this, pixels, CLOUD_PALETTE, x, y, 2)
      cloud.setDepth(1)
      this.clouds.push(cloud)
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

    // Sun / Moon — 시간대에 따라 색·표시 변경
    const sun = drawPixelGrid(this, SUN, SUN_PALETTE, width - 120, 16, 2)
    sun.setDepth(2)
    this.celestialBody = sun
    this.tweens.add({
      targets: sun,
      alpha: { from: 0.75, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 1500,
    })

    // Title
    this.add
      .text(width / 2, 60, 'PixelAgentOffice', {
        fontFamily: '"Courier New", monospace',
        fontSize: '20px',
        color: '#5a3a0f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    this.add
      .text(width / 2, 88, '💬 말풍선 클릭 → 채팅 · 📝 메모지 클릭 → 설정', {
        fontFamily: '"Courier New", monospace',
        fontSize: '12px',
        color: '#5a3a0f',
      })
      .setOrigin(0.5)

    // 시간대 라벨 — 우측 상단에 작게 (현재 사무실이 어느 시간대인지 표시)
    this.timeLabel = this.add
      .text(width - 18, 56, '', {
        fontFamily: '"Courier New", monospace',
        fontSize: '12px',
        color: '#5a3a0f',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(1, 0)
      .setDepth(5)

    // 시간대 초기 적용 (현재 시각 기반)
    this.applyTimeOfDay(this.resolveTimeOfDay(), false)
    this.scheduleNextTimeRefresh()

    // Listen for data changes from React (참조 보관해서 cleanup 가능)
    eventBus.on('office:set-employees', this.setEmployeesHandler)
    eventBus.on('agent:set-state', this.setStateHandler)
    eventBus.on('office:night-mode', this.nightModeHandler)

    // Scene shutdown 시 listener 자동 제거 (HMR/재마운트 안전)
    this.events.once('shutdown', () => {
      this.isShutdown = true
      this.cleanupListeners()
    })
    this.events.once('destroy', () => {
      this.isShutdown = true
      this.cleanupListeners()
    })

    // Signal ready
    eventBus.emit('office:ready')
  }

  private cleanupListeners() {
    eventBus.off('office:set-employees', this.setEmployeesHandler)
    eventBus.off('agent:set-state', this.setStateHandler)
    eventBus.off('office:night-mode', this.nightModeHandler)
    this.timeRefreshTimer?.remove(false)
    this.timeRefreshTimer = undefined
  }

  // ============================================================
  // 시간대 시스템
  // ============================================================

  /** 강제 야간이 켜져있으면 night, 아니면 실제 시각 기반 */
  private resolveTimeOfDay(): TimeOfDay {
    if (this.forcedNight) return 'night'
    return getTimeOfDay()
  }

  /** 시간대 색 팔레트를 모든 씬 요소에 적용 (tween으로 부드럽게) */
  private applyTimeOfDay(t: TimeOfDay, animate: boolean) {
    if (this.currentTimeOfDay === t) return
    this.currentTimeOfDay = t
    const p = TIME_PALETTES[t]
    const dur = animate ? 1500 : 0

    // 카메라 배경
    this.cameras.main.setBackgroundColor(p.cameraBg)

    // 하늘 띠 — 색은 즉시 + tween
    if (this.skyBand) this.tweenColor(this.skyBand, 'fillColor', p.sky, dur)
    if (this.skyDivider) this.tweenColor(this.skyDivider, 'fillColor', p.skyDivider, dur)

    // 별 — alpha 부드럽게
    for (const star of this.stars) {
      this.tweens.add({ targets: star, alpha: p.starAlpha, duration: dur })
    }

    // 구름 — alpha
    for (const cloud of this.clouds) {
      this.tweens.add({ targets: cloud, alpha: p.cloudAlpha, duration: dur })
    }

    // 천체 (sun/moon) — 픽셀 컬러 변경은 어려우니 tint 활용
    if (this.celestialBody) {
      // Container의 자식에 적용 — drawPixelGrid이 Container를 반환하지만 setTint 직접 안 됨.
      // 색조 효과는 alpha + Y/X 팔레트 글로벌 변경 대신, container alpha로 대신:
      // 밤이면 살짝 더 밝게 (대비)
      const targetAlpha = p.isCelestialMoon ? 0.9 : 1
      this.tweens.add({ targets: this.celestialBody, alpha: targetAlpha, duration: dur })
    }

    // 라벨 갱신
    if (this.timeLabel) {
      this.timeLabel.setText(this.forcedNight ? `${p.label} (한도 도달)` : p.label)
    }
  }

  /** Rectangle.fillColor 같은 숫자 색을 tween 으로 부드럽게 보간 */
  private tweenColor(
    obj: Phaser.GameObjects.Rectangle,
    prop: 'fillColor',
    targetColor: number,
    duration: number,
  ) {
    if (duration <= 0) {
      obj.setFillStyle(targetColor)
      return
    }
    const startColor = Phaser.Display.Color.IntegerToColor(obj.fillColor)
    const endColor = Phaser.Display.Color.IntegerToColor(targetColor)
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration,
      onUpdate: tw => {
        const t = tw.getValue() ?? 0
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(
          startColor,
          endColor,
          1,
          t,
        )
        obj.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b))
      },
    })
    // prop은 fillColor 고정 — 다른 prop 추가 시 확장
    void prop
  }

  /** 다음 시간대 트랜지션 시점에 자동 갱신 타이머 예약 */
  private scheduleNextTimeRefresh() {
    this.timeRefreshTimer?.remove(false)
    const delay = msUntilNextTransition()
    this.timeRefreshTimer = this.time.delayedCall(delay, () => {
      if (this.isShutdown) return
      this.applyTimeOfDay(this.resolveTimeOfDay(), true)
      this.scheduleNextTimeRefresh()
    })
  }

  private rebuildWorkstations(employees: Employee[]) {
    // Clear existing
    for (const ws of this.workstations.values()) {
      for (const obj of ws.allObjects) obj.destroy()
    }
    this.workstations.clear()

    // Rebuild from data
    const width = this.scale.width
    for (const emp of employees) {
      const x = width / 2 + emp.deskPosition.x
      this.createWorkstation(x, emp)
    }
  }

  private createWorkstation(x: number, employee: Employee) {
    const deskY = this.deskY
    const clawdY = deskY - 44

    const allObjects: Phaser.GameObjects.GameObject[] = []

    // Chair
    const chair = drawPixelGrid(this, CHAIR, CHAIR_PALETTE, x, clawdY, 2)
    chair.setDepth(4)
    allObjects.push(chair)

    // Character — variant from template
    const variant: ClawdVariant = TEMPLATES[employee.template].variant
    const alpha = TEMPLATES[employee.template].alpha
    const clawd = createClawd(this, x, clawdY, variant)
    clawd.setDepth(10)
    clawd.setScale(CLAWD_BASE_SCALE)
    if (alpha !== undefined) clawd.setAlpha(alpha)
    allObjects.push(clawd)

    // Desk
    const desk = drawPixelGrid(this, DESK, DESK_PALETTE, x, deskY, 2)
    desk.setDepth(8)
    allObjects.push(desk)

    // Monitor (center)
    const monitor = drawPixelGrid(this, MONITOR, MONITOR_PALETTE, x, deskY - 13, 2)
    monitor.setDepth(10)
    allObjects.push(monitor)
    const flicker = this.add.rectangle(x, deskY - 17, 28, 14, 0xffffff, 0.08)
    flicker.setDepth(11)
    allObjects.push(flicker)
    this.tweens.add({
      targets: flicker,
      alpha: { from: 0.04, to: 0.16 },
      yoyo: true,
      repeat: -1,
      duration: 800,
    })

    // Mouse (right of monitor)
    const mouse = drawPixelGrid(this, MOUSE, MOUSE_PALETTE, x + 26, deskY - 6, 2)
    mouse.setDepth(10)
    allObjects.push(mouse)

    // 📝 Memo (left of monitor — clickable)
    const memo = drawPixelGrid(this, MEMO, MEMO_PALETTE, x - 26, deskY - 6, 2)
    memo.setDepth(10)
    memo.setSize(14, 14)
    memo.setInteractive(
      new Phaser.Geom.Rectangle(-7, -7, 14, 14),
      Phaser.Geom.Rectangle.Contains,
    )
    memo.on('pointerover', () => {
      this.tweens.add({ targets: memo, scale: 1.2, duration: 100 })
      this.input.setDefaultCursor('pointer')
    })
    memo.on('pointerout', () => {
      this.tweens.add({ targets: memo, scale: 1, duration: 100 })
      this.input.setDefaultCursor('default')
    })
    memo.on('pointerup', () => {
      eventBus.emit('memo:open', { employeeId: employee.id })
    })
    allObjects.push(memo)

    // 💬 Chat bubble — 클릭하면 채팅 열림 (idle 상태일 때만 표시)
    const chatBubble = drawPixelGrid(
      this,
      CHAT_BUBBLE,
      CHAT_BUBBLE_PALETTE,
      x,
      clawdY - 28,
      2,
    )
    chatBubble.setDepth(19)
    chatBubble.setSize(20, 20)
    chatBubble.setInteractive(
      new Phaser.Geom.Rectangle(-10, -10, 20, 20),
      Phaser.Geom.Rectangle.Contains,
    )
    // 호버 효과
    chatBubble.on('pointerover', () => {
      if (this.isShutdown) return
      this.tweens.add({ targets: chatBubble, scale: 1.2, duration: 100 })
      this.input.setDefaultCursor('pointer')
    })
    chatBubble.on('pointerout', () => {
      if (this.isShutdown) return
      this.tweens.add({ targets: chatBubble, scale: 1, duration: 100 })
      this.input.setDefaultCursor('default')
    })
    // 클릭 → 채팅 열기 (단일 클릭)
    chatBubble.on('pointerup', () => {
      eventBus.emit('chat:open', employee)
    })
    // 부드럽게 떠다님
    this.tweens.add({
      targets: chatBubble,
      y: { from: clawdY - 28, to: clawdY - 32 },
      yoyo: true,
      repeat: -1,
      duration: 1800,
      ease: 'Sine.easeInOut',
    })
    allObjects.push(chatBubble)

    // Working bubble (작업 중일 때만, 같은 위치에 chat 대신 표시)
    const workingBubble = this.add
      .text(x, clawdY - 28, '  ✦  ', {
        fontFamily: '"Courier New", monospace',
        fontSize: '14px',
        color: '#d97500',
        backgroundColor: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false)
    workingBubble.setPadding({ left: 4, right: 4, top: 2, bottom: 2 })
    this.tweens.add({
      targets: workingBubble,
      alpha: { from: 0.35, to: 1 },
      scale: { from: 0.9, to: 1.08 },
      yoyo: true,
      repeat: -1,
      duration: 700,
    })
    allObjects.push(workingBubble)

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
      .text(x, deskY + 36, `${employee.emoji}  ${employee.name} · ${employee.role}`, {
        fontFamily: '"Courier New", monospace',
        fontSize: '12px',
        color: '#2a2118',
        backgroundColor: '#fff8e0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20)
    nameplate.setPadding({ left: 8, right: 8, top: 3, bottom: 3 })
    allObjects.push(nameplate)

    // Double-click → open chat
    let lastClick = 0
    clawd.on('pointerup', () => {
      const now = Date.now()
      if (now - lastClick < 350) {
        eventBus.emit('chat:open', employee)
      }
      lastClick = now
    })
    clawd.on('pointerover', () => {
      this.tweens.add({ targets: clawd, scale: CLAWD_BASE_SCALE * 1.08, duration: 120 })
    })
    clawd.on('pointerout', () => {
      this.tweens.add({ targets: clawd, scale: CLAWD_BASE_SCALE, duration: 120 })
    })

    this.workstations.set(employee.id, {
      employee,
      clawd,
      workingBubble,
      chatBubble,
      memo,
      nameplate,
      allObjects,
    })
  }
}
