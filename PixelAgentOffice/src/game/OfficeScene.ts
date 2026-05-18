import Phaser from 'phaser'
import { eventBus } from './eventBus'
import { platform } from '../platform'
import { createClawd, type ClawdVariant } from './characters/Clawd'
import { drawPixelGrid } from './pixelArt'
import { type Employee, type SeatId, type DeskOrientation, TEMPLATES, canBeTeamLeader, canBeBoss } from '../shared/types'
import { ALL_SEATS, type SeatMeta } from '../shared/seats'
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

/**
 * 자리(seat) 시각화 단위. 비어있는 자리도 Workstation으로 그리지만
 * employee가 null이면 캐릭터/채팅/메모를 그리지 않는다.
 */
type Workstation = {
  seatMeta: SeatMeta
  employee: Employee | null
  clawd?: Phaser.GameObjects.Container
  workingBubble?: Phaser.GameObjects.Text
  chatBubble?: Phaser.GameObjects.Container
  memo?: Phaser.GameObjects.Container
  nameplate?: Phaser.GameObjects.Text
  // Phaser objects that need cleanup
  allObjects: Phaser.GameObjects.GameObject[]
}

export class OfficeScene extends Phaser.Scene {
  // 자리 단위로 키 (사장석 + 팀 × 자리). 빈 자리도 포함.
  private workstations = new Map<SeatId, Workstation>()
  private isShutdown = false

  // === 자리 이동 모드 ===
  /** 현재 드래그 중인 직원 ID (null이면 비활성) */
  private movingEmployeeId: string | null = null
  /** 이동 모드 안내 텍스트 */
  private moveModeHint?: Phaser.GameObjects.Text
  /** 빈 자리 강조 펄스 효과 객체들 */
  private dropTargetHighlights: Phaser.GameObjects.Rectangle[] = []
  /** 드래그 중인 캐릭터의 원래 좌표 (취소 시 복귀용) */
  private dragOriginPos: { x: number; y: number } | null = null

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
    // employee.id로 워크스테이션 찾기 (seatId 키로 저장돼 있어서 iterate)
    let ws: Workstation | undefined
    for (const w of this.workstations.values()) {
      if (w.employee?.id === agentId) { ws = w; break }
    }
    if (ws && ws.workingBubble?.active && ws.chatBubble) {
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

  /** 외부에서 자리 이동 시작 트리거 (App.tsx 컨텍스트 메뉴 → 우리에게 emit) */
  private startSeatMoveHandler = (payload: unknown) => {
    if (this.isShutdown) return
    const { employeeId } = payload as { employeeId: string }
    this.enterMoveMode(employeeId)
  }

  constructor() {
    super({ key: 'OfficeScene' })
  }

  create() {
    this.isShutdown = false
    // 우클릭 시 브라우저 기본 컨텍스트 메뉴 차단 (캐릭터 자리 변경 메뉴를 우리가 띄움)
    this.input.mouse?.disableContextMenu()
    const width = this.scale.width
    const height = this.scale.height
    // (이전 직선 배치 시절의 deskY 멤버는 자리 시스템 도입으로 미사용 — seat.position 사용)

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
    eventBus.on('seat:start-move', this.startSeatMoveHandler)

    // 자리 이동 — Phaser 전역 드래그 핸들러 + ESC 취소
    // 포인터 worldX/Y 직접 사용 (Container + 커스텀 hitArea 환경에서 dragX/Y 계산 이슈 회피)
    this.input.on('drag', (pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container) => {
      obj.x = pointer.worldX
      obj.y = pointer.worldY
    })
    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container) => {
      this.handleSeatDrop(obj)
    })
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.movingEmployeeId) this.exitMoveMode(false)
    })

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
    eventBus.off('seat:start-move', this.startSeatMoveHandler)
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

    // employee.seatId 기반 lookup
    const empBySeat = new Map<SeatId, Employee>()
    for (const emp of employees) {
      if (emp.seatId) empBySeat.set(emp.seatId, emp)
    }

    const width = this.scale.width
    const height = this.scale.height

    // 모든 16자리 항상 표시 (사장석 + 3팀 × 5). 자유롭게 팀 간 이동 가능
    for (const seat of ALL_SEATS) {
      const x = seat.position.xRatio * width
      const y = seat.position.yRatio * height
      const emp = empBySeat.get(seat.id) ?? null
      this.createWorkstation(x, y, emp, seat)
    }

    // 3팀 라벨 항상 표시
    this.drawTeamLabels()
  }

  /** 3팀 라벨 항상 그리기 */
  private teamLabels: Phaser.GameObjects.Text[] = []
  private drawTeamLabels() {
    // 기존 라벨 제거
    for (const lbl of this.teamLabels) lbl.destroy()
    this.teamLabels = []

    const width = this.scale.width
    const height = this.scale.height
    const labelY = 0.85 * height
    const teamX: Record<string, number> = { A: 0.20, B: 0.50, C: 0.80 }
    for (const team of ['A', 'B', 'C'] as const) {
      const t = this.add
        .text(teamX[team] * width, labelY, `— 팀 ${team} —`, {
          fontFamily: '"Courier New", monospace',
          fontSize: '13px',
          color: '#5a3a0f',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(20)
      this.teamLabels.push(t)
    }
  }

  /**
   * 자리 하나 시각화. employee가 null이면 빈 자리(책상+의자+모니터만, 캐릭터/채팅 X).
   * seat.role이 'boss'면 사장석 (책상 + 사장 명패), 단순 시각.
   *
   * 책상 회전(B-4): 책상·의자·모니터·마우스·메모를 deskGroup 컨테이너로 묶고 setRotation 적용.
   * orientation='front'면 의자가 책상 위(캐릭터 위치), 'left'면 책상이 -90°(반시계) → 의자/캐릭터는 책상 오른쪽,
   * 'right'면 +90°(시계) → 의자/캐릭터는 책상 왼쪽. chatBubble/nameplate는 회전 없이 항상 스크린 위/아래.
   */
  private createWorkstation(x: number, y: number, employee: Employee | null, seat: SeatMeta) {
    const isBoss = seat.role === 'boss'
    const deskY = y

    const allObjects: Phaser.GameObjects.GameObject[] = []

    // === 책상 회전 결정 ===
    const orientation: DeskOrientation = employee?.deskOrientation ?? 'front'
    const rot = orientation === 'left' ? -Math.PI / 2 : orientation === 'right' ? Math.PI / 2 : 0

    // === Desk 그룹 (의자/책상/모니터/마우스/메모/깜빡임 — 회전 단위) ===
    const deskGroup = this.add.container(x, deskY)
    deskGroup.setDepth(8)
    deskGroup.setRotation(rot)
    allObjects.push(deskGroup)

    // 캐릭터 위치 — orientation별 (책상 중심 기준 offset)
    const clawdPos = this.getClawdPos(x, deskY, orientation)

    // === Chair (deskGroup 자식, 책상 위쪽으로 -44 offset) — 회전 시 책상 옆으로 이동 ===
    const chair = drawPixelGrid(this, CHAIR, CHAIR_PALETTE, 0, -44, 2)
    if (!employee && !isBoss) chair.setAlpha(0.55) // 빈 자리는 옅게
    deskGroup.add(chair)

    // === Desk ===
    const desk = drawPixelGrid(this, DESK, DESK_PALETTE, 0, 0, 2)
    if (isBoss) desk.setScale(1.3) // 사장석 책상 살짝 큼
    else if (!employee) desk.setAlpha(0.6)
    deskGroup.add(desk)

    // === Monitor + flicker (빈 자리는 검은 화면) ===
    const monitor = drawPixelGrid(this, MONITOR, MONITOR_PALETTE, 0, -13, 2)
    if (!employee) monitor.setAlpha(0.55)
    deskGroup.add(monitor)
    if (employee) {
      // 실제 사용 중인 모니터만 깜빡임
      const flicker = this.add.rectangle(0, -17, 28, 14, 0xffffff, 0.08)
      deskGroup.add(flicker)
      this.tweens.add({
        targets: flicker,
        alpha: { from: 0.04, to: 0.16 },
        yoyo: true,
        repeat: -1,
        duration: 800,
      })
    }

    // === Mouse (employee 자리에만 — 책상 우측 작은 디테일) ===
    if (employee) {
      const mouse = drawPixelGrid(this, MOUSE, MOUSE_PALETTE, 26, -6, 2)
      deskGroup.add(mouse)
    }

    // === 사장석은 명패 + 끝 (캐릭터/채팅/메모 없음, 아직은 빈 사장석) ===
    if (isBoss) {
      const bossPlate = this.add
        .text(x, deskY + 38, '👑 사장석', {
          fontFamily: '"Courier New", monospace',
          fontSize: '14px',
          color: '#5a3a0f',
          backgroundColor: '#fff2b8',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(20)
      bossPlate.setPadding({ left: 10, right: 10, top: 4, bottom: 4 })
      allObjects.push(bossPlate)
      this.workstations.set(seat.id, { seatMeta: seat, employee: null, allObjects })
      return
    }

    // === 빈 자리는 여기까지 (이후는 employee가 있을 때만) ===
    if (!employee) {
      this.workstations.set(seat.id, { seatMeta: seat, employee: null, allObjects })
      return
    }

    // ===== Character + interactive elements (occupied seat 전용) =====

    const clawdX = clawdPos.x
    const clawdY = clawdPos.y

    // 캐릭터 — orientation별 위치 + 책상과 같은 회전
    const variant: ClawdVariant = TEMPLATES[employee.template].variant
    const alpha = TEMPLATES[employee.template].alpha
    const clawd = createClawd(this, clawdX, clawdY, variant)
    clawd.setDepth(10)
    clawd.setScale(CLAWD_BASE_SCALE)
    if (rot !== 0) clawd.setRotation(rot)
    if (alpha !== undefined) clawd.setAlpha(alpha)
    allObjects.push(clawd)

    // 자리 내부 우클릭 공통 처리 — 어느 요소 위에서든 우클릭 = 컨텍스트 메뉴
    const isRightClick = (pointer: Phaser.Input.Pointer): boolean => {
      const nativeButton = (pointer.event as MouseEvent | undefined)?.button
      return nativeButton === 2 || pointer.rightButtonReleased()
    }
    const emitContextMenu = (pointer: Phaser.Input.Pointer) => {
      const native = pointer.event as MouseEvent | TouchEvent | undefined
      let clientX = 0, clientY = 0
      if (native && 'clientX' in native) {
        clientX = native.clientX
        clientY = native.clientY
      } else {
        // 폴백 — Phaser pointer x/y (스크린 좌표와 같음, 카메라 변환 없으므로)
        clientX = pointer.x
        clientY = pointer.y
      }
      eventBus.emit('employee:context-menu', {
        employeeId: employee.id,
        x: clientX,
        y: clientY,
      })
    }

    // 📝 Memo (책상 좌측 작은 노란 포스트잇 — 책상 회전과 같이 돌아감)
    const memo = drawPixelGrid(this, MEMO, MEMO_PALETTE, -26, -6, 2)
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
    memo.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (isRightClick(pointer)) {
        emitContextMenu(pointer)
        return
      }
      eventBus.emit('memo:open', { employeeId: employee.id })
    })
    deskGroup.add(memo)

    // 💬 Chat bubble — 캐릭터 머리 위 (회전 안 함, 항상 스크린 기준 위쪽)
    const chatBubble = drawPixelGrid(
      this,
      CHAT_BUBBLE,
      CHAT_BUBBLE_PALETTE,
      clawdX,
      clawdY - 28,
      2,
    )
    chatBubble.setDepth(19)
    chatBubble.setSize(20, 20)
    chatBubble.setInteractive(
      new Phaser.Geom.Rectangle(-10, -10, 20, 20),
      Phaser.Geom.Rectangle.Contains,
    )
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
    chatBubble.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (isRightClick(pointer)) {
        emitContextMenu(pointer)
        return
      }
      eventBus.emit('chat:open', employee)
    })
    this.tweens.add({
      targets: chatBubble,
      y: { from: clawdY - 28, to: clawdY - 32 },
      yoyo: true,
      repeat: -1,
      duration: 1800,
      ease: 'Sine.easeInOut',
    })
    allObjects.push(chatBubble)

    // Working bubble
    const workingBubble = this.add
      .text(clawdX, clawdY - 28, '  ✦  ', {
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

    // Nameplate — 리더면 약간 강조
    const isLeader = seat.role === 'leader'
    const namePrefix = isLeader ? '⭐ ' : ''
    const nameplate = this.add
      .text(x, deskY + 36, `${namePrefix}${employee.emoji}  ${employee.name} · ${employee.role}`, {
        fontFamily: '"Courier New", monospace',
        fontSize: '12px',
        color: isLeader ? '#5a3a0f' : '#2a2118',
        backgroundColor: isLeader ? '#fff2b8' : '#fff8e0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20)
    nameplate.setPadding({ left: 8, right: 8, top: 3, bottom: 3 })
    allObjects.push(nameplate)

    // === 자리 인터랙티브 zone ===
    // Phaser.Zone — invisible interactive 영역 전용 객체.
    // 정면일 땐 캐릭터(위)~책상(아래) 세로 박스. 회전 시 가로 박스로 바꾸고 캐릭터 쪽으로 이동.
    const zoneIsHorizontal = orientation !== 'front'
    const zoneW = zoneIsHorizontal ? 140 : 90
    const zoneH = zoneIsHorizontal ? 90 : 140
    const zoneCenterX =
      orientation === 'left' ? x + 30 : orientation === 'right' ? x - 30 : x
    const zoneCenterY = orientation === 'front' ? deskY - 30 : deskY
    const interactZone = this.add.zone(zoneCenterX, zoneCenterY, zoneW, zoneH)
    interactZone.setInteractive()
    interactZone.setDepth(3) // 캐릭터/메모/채팅버블보다 아래 — 그것들이 위에서 먼저 hit
    allObjects.push(interactZone)

    // 캐릭터와 zone의 클릭 처리 — 우클릭=컨텍스트 메뉴 / 좌클릭 더블=채팅
    let lastClick = 0
    const handleClick = (pointer: Phaser.Input.Pointer) => {
      if (isRightClick(pointer)) {
        emitContextMenu(pointer)
        return
      }
      const now = Date.now()
      if (now - lastClick < 350) {
        eventBus.emit('chat:open', employee)
      }
      lastClick = now
    }
    clawd.on('pointerup', handleClick)
    interactZone.on('pointerup', handleClick)
    clawd.on('pointerover', () => {
      this.tweens.add({ targets: clawd, scale: CLAWD_BASE_SCALE * 1.08, duration: 120 })
    })
    clawd.on('pointerout', () => {
      this.tweens.add({ targets: clawd, scale: CLAWD_BASE_SCALE, duration: 120 })
    })

    this.workstations.set(seat.id, {
      seatMeta: seat,
      employee,
      clawd,
      workingBubble,
      chatBubble,
      memo,
      nameplate,
      allObjects,
    })
  }

  // ============================================================
  // 자리 이동 — 드래그앤드롭
  // ============================================================

  /** 책상 회전(orientation)에 따른 캐릭터의 베이스 좌표.
   *  front=책상 위(deskY-44), left=책상 오른쪽 옆(+44, deskY), right=책상 왼쪽 옆(-44, deskY) */
  private getClawdPos(deskX: number, deskY: number, orientation: DeskOrientation): { x: number; y: number } {
    if (orientation === 'left') return { x: deskX + 44, y: deskY }
    if (orientation === 'right') return { x: deskX - 44, y: deskY }
    return { x: deskX, y: deskY - 44 }
  }

  /** workstation의 seatMeta + employee.deskOrientation으로 캐릭터 베이스 좌표 계산 */
  private getClawdBaseForWorkstation(ws: Workstation): { x: number; y: number } {
    const deskX = ws.seatMeta.position.xRatio * this.scale.width
    const deskY = ws.seatMeta.position.yRatio * this.scale.height
    const orientation: DeskOrientation = ws.employee?.deskOrientation ?? 'front'
    return this.getClawdPos(deskX, deskY, orientation)
  }

  /** 자리 이동 모드 진입 — 캐릭터 draggable + 빈 자리 펄스 + 안내 텍스트 */
  private enterMoveMode(employeeId: string) {
    // 기존 모드 정리
    if (this.movingEmployeeId) this.exitMoveMode(false)

    // 대상 워크스테이션 찾기
    let target: Workstation | undefined
    for (const w of this.workstations.values()) {
      if (w.employee?.id === employeeId) { target = w; break }
    }
    if (!target || !target.clawd) return

    this.movingEmployeeId = employeeId
    // y는 idle bob 영향을 안 받은 베이스 좌표가 필요 → seatMeta + orientation 기반 재계산
    const base = this.getClawdBaseForWorkstation(target)
    this.dragOriginPos = base

    // ★ 핵심: idle bob 등 기존 트윈을 끄기. 안 그러면 드래그 중에도 y를 계속 덮어씀
    this.tweens.killTweensOf(target.clawd)
    target.clawd.x = base.x
    target.clawd.y = base.y

    // 캐릭터 살짝 들뜨기 + draggable 활성화
    target.clawd.setAlpha(0.85)
    target.clawd.setDepth(50) // 다른 자리 위로
    this.tweens.add({ targets: target.clawd, scale: CLAWD_BASE_SCALE * 1.15, duration: 150 })
    target.clawd.setInteractive({ draggable: true })
    this.input.setDraggable(target.clawd, true)

    // 따라다니는 부속물(채팅/메모/명패) 일시 숨김 — 드래그 깔끔하게
    target.chatBubble?.setVisible(false)
    target.workingBubble?.setVisible(false)
    target.memo?.setVisible(false)
    target.nameplate?.setVisible(false)

    // 빈 자리 펄스 강조 + 자격 검증
    this.dropTargetHighlights = []
    for (const [seatId, ws] of this.workstations) {
      if (ws.employee) continue            // 비어있지 않으면 skip
      if (seatId === target.seatMeta.id) continue  // 본인 현재 자리는 skip
      // 자격 검증 — 부적합한 자리는 빨강 톤
      const emp = target.employee!
      const blocked =
        (ws.seatMeta.role === 'leader' && !canBeTeamLeader(emp.rank)) ||
        (ws.seatMeta.role === 'boss' && !canBeBoss(emp.rank))
      const color = blocked ? 0xff6060 : 0x60ff80
      const x = ws.seatMeta.position.xRatio * this.scale.width
      const y = ws.seatMeta.position.yRatio * this.scale.height
      const hi = this.add.rectangle(x, y, 70, 70, color, 0.18)
      hi.setStrokeStyle(2, color, 0.9)
      hi.setDepth(2)
      this.dropTargetHighlights.push(hi)
      this.tweens.add({
        targets: hi,
        alpha: { from: 0.12, to: 0.35 },
        scale: { from: 0.92, to: 1.08 },
        yoyo: true,
        repeat: -1,
        duration: 700,
      })
    }

    // 화면 상단 안내 텍스트
    this.moveModeHint = this.add
      .text(this.scale.width / 2, 110, '🪑 빈 자리로 드래그하세요  · ESC: 취소', {
        fontFamily: '"Courier New", monospace',
        fontSize: '13px',
        color: '#5a3a0f',
        backgroundColor: '#fff2b8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(100)
    this.moveModeHint.setPadding({ left: 12, right: 12, top: 5, bottom: 5 })
  }

  /** 자리 이동 모드 종료 — UI 정리. 실패 시 캐릭터 시각/idle bob 복원 (성공 시는 rebuild가 처리) */
  private exitMoveMode(success: boolean) {
    const movingId = this.movingEmployeeId
    this.movingEmployeeId = null
    this.dragOriginPos = null
    this.moveModeHint?.destroy()
    this.moveModeHint = undefined
    for (const hi of this.dropTargetHighlights) hi.destroy()
    this.dropTargetHighlights = []

    if (success || !movingId) return

    // 실패: 해당 캐릭터의 외형/트윈 복원
    let ws: Workstation | undefined
    for (const w of this.workstations.values()) {
      if (w.employee?.id === movingId) { ws = w; break }
    }
    if (!ws || !ws.clawd || !ws.employee) return
    const alpha = TEMPLATES[ws.employee.template].alpha ?? 1
    ws.clawd.setAlpha(alpha)
    ws.clawd.setDepth(10)
    this.tweens.add({ targets: ws.clawd, scale: CLAWD_BASE_SCALE, duration: 150 })
    // idle bob 재시작 — orientation 기반 베이스 y
    const base = this.getClawdBaseForWorkstation(ws)
    this.tweens.add({
      targets: ws.clawd,
      y: { from: base.y, to: base.y - 2 },
      yoyo: true,
      repeat: -1,
      duration: 1400,
      ease: 'Sine.easeInOut',
    })
    // 부속물 다시 보이게
    ws.chatBubble?.setVisible(true)
    ws.memo?.setVisible(true)
    ws.nameplate?.setVisible(true)
  }

  /** 드롭 처리 — hit-test로 가장 가까운 빈 자리 찾고 자격 검증, 성공 시 IPC update */
  private async handleSeatDrop(obj: Phaser.GameObjects.Container) {
    if (!this.movingEmployeeId) return

    // 가장 가까운 빈 자리 찾기 (50px 이내)
    let nearest: { ws: Workstation; dist: number } | null = null
    for (const ws of this.workstations.values()) {
      if (ws.employee) continue
      if (ws.seatMeta.id === this.findEmployeeSeatId(this.movingEmployeeId)) continue
      const sx = ws.seatMeta.position.xRatio * this.scale.width
      const sy = ws.seatMeta.position.yRatio * this.scale.height
      const dx = obj.x - sx
      const dy = obj.y - sy
      const d = Math.hypot(dx, dy)
      if (d < 60 && (!nearest || d < nearest.dist)) nearest = { ws, dist: d }
    }

    if (!nearest) {
      // 빈 자리 아님 → 원위치로 tween 복귀
      this.tweenBackToOrigin(obj)
      this.exitMoveMode(false)
      return
    }

    // 자격 검증
    const movingEmp = this.findMovingEmployee()
    if (!movingEmp) {
      this.tweenBackToOrigin(obj)
      this.exitMoveMode(false)
      return
    }
    const targetSeat = nearest.ws.seatMeta
    if (targetSeat.role === 'leader' && !canBeTeamLeader(movingEmp.rank)) {
      this.flashBlockedSeat(nearest.ws, '리더는 과장 이상')
      this.tweenBackToOrigin(obj)
      this.exitMoveMode(false)
      return
    }
    if (targetSeat.role === 'boss' && !canBeBoss(movingEmp.rank)) {
      this.flashBlockedSeat(nearest.ws, '사장석은 사장 이상')
      this.tweenBackToOrigin(obj)
      this.exitMoveMode(false)
      return
    }

    // 좌표를 자리 중앙으로 스냅 (애니메이션). orientation 유지 — 캐릭터 위치도 그에 맞게.
    const deskX = targetSeat.position.xRatio * this.scale.width
    const deskY = targetSeat.position.yRatio * this.scale.height
    const snap = this.getClawdPos(deskX, deskY, movingEmp.deskOrientation)
    this.tweens.add({
      targets: obj,
      x: snap.x,
      y: snap.y,
      duration: 350,
      ease: 'Sine.easeOut',
    })

    // DB 업데이트 → App.tsx가 받아서 setEmployees 갱신 → 자동 rebuild
    try {
      const updated = await platform.updateEmployee(movingEmp.id, { seatId: targetSeat.id })
      if (updated) {
        eventBus.emit('employee:updated', updated)
      }
    } catch (err) {
      console.error('자리 이동 실패:', err)
      this.tweenBackToOrigin(obj)
    } finally {
      this.exitMoveMode(true)
    }
  }

  /** 드래그 취소 시 원위치로 부드럽게 복귀 */
  private tweenBackToOrigin(obj: Phaser.GameObjects.Container) {
    if (!this.dragOriginPos) return
    this.tweens.add({
      targets: obj,
      x: this.dragOriginPos.x,
      y: this.dragOriginPos.y,
      duration: 250,
      ease: 'Sine.easeOut',
    })
  }

  /** 부적합 자리에 잠깐 빨간 깜빡임 */
  private flashBlockedSeat(ws: Workstation, _reason: string) {
    const x = ws.seatMeta.position.xRatio * this.scale.width
    const y = ws.seatMeta.position.yRatio * this.scale.height
    const flash = this.add.rectangle(x, y, 80, 80, 0xff4040, 0.5)
    flash.setDepth(101)
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.3,
      duration: 600,
      onComplete: () => flash.destroy(),
    })
  }

  /** moving employee 찾기 (workstations에서 ID 매칭) */
  private findMovingEmployee(): Employee | null {
    if (!this.movingEmployeeId) return null
    for (const ws of this.workstations.values()) {
      if (ws.employee?.id === this.movingEmployeeId) return ws.employee
    }
    return null
  }

  /** 특정 employee가 앉아있는 seatId 반환 */
  private findEmployeeSeatId(employeeId: string): SeatId | null {
    for (const [seatId, ws] of this.workstations) {
      if (ws.employee?.id === employeeId) return seatId
    }
    return null
  }
}
