import Phaser from 'phaser'
import { eventBus } from './eventBus'
import { platform } from '../platform'
import { createClawd, type ClawdVariant } from './characters/Clawd'
import { drawPixelGrid } from './pixelArt'
import { type Employee, type SeatId, type DeskOrientation, type Settings, type Model, MODEL_INFO, TEMPLATES, canBeTeamLeader, canBeBoss } from '../shared/types'
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
// 책상 폭 축소 (40 → 24, P0 #5) — 모니터가 캐릭터 정면, 메모만 책상 위, 마우스 제거
const DESK = [
  'OOOOOOOOOOOOOOOOOOOOOOOO',
  'OHHHHHHHHHHHHHHHHHHHHHHO',
  'OWWWWWWWWWWWWWWWWWWWWWWO',
  'OWWWWWWWWWWWWWWWWWWWWWWO',
  'OOOOOOOOOOOOOOOOOOOOOOOO',
  'ODDDDDDDDDDDDDDDDDDDDDDO',
  'ODDDDDDDDDDDDDDDDDDDDDDO',
  'ODDDDDDDDDDDDDDDDDDDDDDO',
  'ODDDDDDDDDDDDDDDDDDDDDDO',
  'ODDDDDDDDDDDDDDDDDDDDDDO',
  'ODDDDDDDDDDDDDDDDDDDDDDO',
  'OOOOOOOOOOOOOOOOOOOOOOOO',
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

// MOUSE 픽셀 제거 (P0 #5 — 마우스 빼고 메모만 책상 위)

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

// 💬 채팅 말풍선 — 캐릭터 머리 위, 클릭하면 채팅 (P1 #15: 안쪽 비움, 채팅 중엔 위에 점선 텍스트 오버레이)
const CHAT_BUBBLE_PALETTE = { O: 0x2a1408, W: 0xfafafa }
const CHAT_BUBBLE = [
  '.OOOOOOO.',
  'OWWWWWWWO',
  'OWWWWWWWO',
  'OWWWWWWWO',
  'OWWWWWWWO',
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

// === 가구 (꾸미기 Lv1) — 사무실 분위기 살리기 ===
const PLANT_PALETTE = { L: 0x2a5a2a, G: 0x4a8a4a, S: 0x7ac87a, P: 0x6a4030, D: 0x4a2818 }
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

const BOOKSHELF_PALETTE = { O: 0x3a2008, R: 0xa83838, Y: 0xc8b048, B: 0x3868a8, G: 0x488a48, W: 0xc8a070 }
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

const VENDING_PALETTE = { O: 0x2a1a04, K: 0x101010, W: 0x484858, R: 0xc83030, B: 0x3060c8, Y: 0xc8b030, P: 0x5a4030, S: 0xa87830 }
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

// 시계 face (P1 #10) — 시침·분침 픽셀 제거. 시침·분침은 graphics로 동적 그리기 (실시간 시간 반영)
const CLOCK_PALETTE = { O: 0x2a1a04, W: 0xf8f0d0 }
const CLOCK = [
  '..OOOOOO..',
  '.OWWWWWWO.',
  'OWWWWWWWWO',
  'OWWWWWWWWO',
  'OWWWWWWWWO',
  'OWWWWWWWWO',
  'OWWWWWWWWO',
  'OWWWWWWWWO',
  '.OWWWWWWO.',
  '..OOOOOO..',
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

  // === 토큰 보드 (M5-c) — 사장석 뒤 벽 액자 LED ===
  private tokenBoard?: {
    frame: Phaser.GameObjects.Rectangle
    bezel: Phaser.GameObjects.Rectangle
    ledScreen: Phaser.GameObjects.Rectangle
    costLabel: Phaser.GameObjects.Text
    progressBg: Phaser.GameObjects.Rectangle
    progressFill: Phaser.GameObjects.Rectangle
    /** 빨강 점멸 트윈 (한도 도달 또는 강제 야간 시) */
    pulseTween?: Phaser.Tweens.Tween
    /** 진행률 바 전체 폭 (ratio 계산에 재사용) */
    barW: number
  }
  private tokenBoardTimer?: Phaser.Time.TimerEvent
  /** 사용자 설정 일일 한도 — settings 변경 시 갱신 */
  private dailyLimitUsd = 5

  /** 가구 (drawFurniture에서 만든 정적 월드 객체) — UI camera ignore 대상 */
  private worldFurniture: Phaser.GameObjects.GameObject[] = []

  /** 사무실 벽 + 사장실 파티션 (P1 #12 옵션 C, 정적). UI 카메라용 (sky·시계와 같이) */
  private walls: Phaser.GameObjects.GameObject[] = []
  /** 팀 사이/자리 사이 파티션 (P1 #12 옵션 C, 동적 — rebuild 시 갱신) */
  private partitions: Phaser.GameObjects.GameObject[] = []

  // === 줌·카메라 (B-5) ===
  /** 줌 토글 상태 — false=1.0x, true=1.4x */
  private isZoomedIn = false
  /** 줌 트랜지션 트윈 — 중복 토글 방지용 */
  private zoomTween?: Phaser.Tweens.Tween
  /** 줌 범위 클램프 */
  private readonly ZOOM_MIN = 0.7
  private readonly ZOOM_MAX = 1.6

  // === UI 카메라 분리 (P1 #8) — 줌 시 sky/title/시계/토큰보드는 영향 X ===
  /** UI 전용 카메라 — zoom 1 고정, main 카메라와 분리 */
  private uiCamera?: Phaser.Cameras.Scene2D.Camera
  /** UI 정적 객체 보관 — title/subtitle/시계 등 (rebuildWorkstations와 독립) */
  private titleText?: Phaser.GameObjects.Text
  private subtitleText?: Phaser.GameObjects.Text
  private clockFace?: Phaser.GameObjects.Container
  /** 시계 시침·분침 (실시간) — P1 #10 */
  private clockHourHand?: Phaser.GameObjects.Graphics
  private clockMinuteHand?: Phaser.GameObjects.Graphics
  private clockTimer?: Phaser.Time.TimerEvent
  /** 사무실 바닥 grid (월드 객체) — UI camera에서 ignore */
  private floorGrid?: Phaser.GameObjects.Graphics

  // === 카메라 panning (P1 #9) ===
  private isPanning = false
  private panStartScreen = { x: 0, y: 0 }
  private panStartScroll = { x: 0, y: 0 }

  // === 팀 라벨 우클릭 → 이름 수정 (P1 #11) ===
  /** 현재 활성 팀 — drawTeamLabels 외부 호출 가능하게 멤버로 보관 */
  private activeTeams = new Set<'A' | 'B' | 'C'>(['A'])
  /** 설정에서 받은 팀 표시 이름 — 기본 "팀 A/B/C" */
  private teamDisplayNames: { A: string; B: string; C: string } = { A: '팀 A', B: '팀 B', C: '팀 C' }

  // === 빈 자리 채용 hint (B → P0 #2 DOM tooltip) ===
  /** 빈 자리 zone 모음 — 이동 모드 진입 시 비활성화 (P0 #3 충돌 회피) */
  private hireZones: Phaser.GameObjects.Zone[] = []

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
  /** 토큰 고갈 → 강제 밤 / 회복 → 평시 시간대. 토큰 보드 LED 색도 같이 즉시 갱신. */
  private nightModeHandler = (payload: unknown) => {
    if (this.isShutdown) return
    const { forced } = payload as { forced: boolean }
    this.forcedNight = forced
    this.applyTimeOfDay(this.resolveTimeOfDay(), true)
    void this.refreshTokenBoard()
  }

  /** 외부에서 자리 이동 시작 트리거 (App.tsx 컨텍스트 메뉴 → 우리에게 emit) */
  private startSeatMoveHandler = (payload: unknown) => {
    if (this.isShutdown) return
    const { employeeId } = payload as { employeeId: string }
    this.enterMoveMode(employeeId)
  }

  /** 사용자 설정 동기화 (dailyLimitUsd, teamNames 등) — 토큰 보드 임계 + 팀 라벨 갱신 */
  private setSettingsHandler = (payload: unknown) => {
    if (this.isShutdown) return
    const settings = payload as Settings
    this.dailyLimitUsd = settings.dailyLimitUsd
    if (settings.teamNames) {
      this.teamDisplayNames = settings.teamNames
      // 활성 팀 라벨 즉시 다시 그리기 (P1 #11)
      this.drawTeamLabels()
      // 새 라벨도 uiCamera에서 ignore
      this.ignoreWorldOnUiCamera(this.teamLabels)
    }
    void this.refreshTokenBoard()
  }

  /** 외부에서 줌 토글 트리거 (App.tsx 좌상단 🔍 버튼) — 1.0x ↔ 1.4x 300ms 트랜지션 */
  private zoomToggleHandler = () => {
    if (this.isShutdown) return
    const targetZoom = this.isZoomedIn ? 1.0 : 1.4
    this.isZoomedIn = !this.isZoomedIn
    this.zoomTween?.stop()
    this.zoomTween = this.tweens.add({
      targets: this.cameras.main,
      zoom: targetZoom,
      duration: 300,
      ease: 'Sine.easeInOut',
    })
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

    // UI 카메라 (P1 #8) — 줌 영향 X. main 카메라와 동일 viewport, zoom 1 고정.
    this.uiCamera = this.cameras.add(0, 0, width, height)
    this.uiCamera.setZoom(1)
    this.uiCamera.setScroll(0, 0)

    // Floor grid (월드 객체 — uiCamera에서 ignore)
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
    this.floorGrid = grid

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

    // Title (UI camera용 — 멤버 보관)
    this.titleText = this.add
      .text(width / 2, 60, 'PixelAgentOffice', {
        fontFamily: '"Courier New", monospace',
        fontSize: '20px',
        color: '#5a3a0f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    // 토큰 보드 자리 차지 (y=78 영역) — subtitle은 그 아래로
    this.subtitleText = this.add
      .text(width / 2, 110, '💬 말풍선 클릭 → 채팅 · 📝 메모지 클릭 → 설정', {
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

    // 사무실 벽 + 사장실 파티션 (P1 #12 옵션 C, 정적)
    this.drawWallsAndPartitions()

    // 가구 (꾸미기 Lv1) — 사무실 분위기 살리기 (화분/책장/자판기/시계)
    this.drawFurniture()

    // 토큰 보드 (M5-c) — 사장석 뒤 벽 액자 LED
    this.createTokenBoard()
    this.scheduleTokenBoardRefresh()

    // Listen for data changes from React (참조 보관해서 cleanup 가능)
    eventBus.on('office:set-employees', this.setEmployeesHandler)
    eventBus.on('agent:set-state', this.setStateHandler)
    eventBus.on('office:night-mode', this.nightModeHandler)
    eventBus.on('seat:start-move', this.startSeatMoveHandler)
    eventBus.on('office:settings', this.setSettingsHandler)
    eventBus.on('camera:zoom-toggle', this.zoomToggleHandler)

    // 마우스 휠 줌 — 포인터 위치 기준 (마우스가 가리킨 지점이 줌 후에도 같은 화면 위치에)
    this.input.on(
      'wheel',
      (pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
        if (this.isShutdown) return
        const cam = this.cameras.main
        const oldZoom = cam.zoom
        const factor = dy > 0 ? 0.9 : 1.1 // 휠 아래 = 줌아웃, 휠 위 = 줌인
        const newZoom = Phaser.Math.Clamp(oldZoom * factor, this.ZOOM_MIN, this.ZOOM_MAX)
        if (Math.abs(newZoom - oldZoom) < 0.001) return

        // 포인터의 월드 좌표 (휠 전)
        const screenCenterX = this.scale.width / 2
        const screenCenterY = this.scale.height / 2
        const worldX = (pointer.x - screenCenterX) / oldZoom + cam.midPoint.x
        const worldY = (pointer.y - screenCenterY) / oldZoom + cam.midPoint.y

        cam.setZoom(newZoom)
        // 카메라 중심을 이동시켜 포인터가 가리킨 월드 좌표가 같은 화면 위치에 머무르게
        const camNewCenterX = worldX - (pointer.x - screenCenterX) / newZoom
        const camNewCenterY = worldY - (pointer.y - screenCenterY) / newZoom
        cam.centerOn(camNewCenterX, camNewCenterY)

        // 토글 상태 동기화 — 휠로 1.0 근처면 zoomedIn 해제, 그 이상이면 켜짐
        this.isZoomedIn = newZoom > 1.1
      },
    )

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

    // 카메라 panning (P1 #9) — 빈 영역 좌클릭 드래그 시 main camera scroll 이동
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: unknown[]) => {
      if (this.isShutdown) return
      // 좌클릭만, hit object 없을 때만 (객체 위면 자리이동 드래그 등에 양보)
      const nativeButton = (pointer.event as MouseEvent | undefined)?.button
      if (nativeButton !== 0) return
      if (currentlyOver.length > 0) return
      if (this.movingEmployeeId) return
      this.isPanning = true
      this.panStartScreen = { x: pointer.x, y: pointer.y }
      this.panStartScroll = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY }
      this.input.setDefaultCursor('grabbing')
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPanning || this.isShutdown) return
      const zoom = this.cameras.main.zoom
      const dx = (pointer.x - this.panStartScreen.x) / zoom
      const dy = (pointer.y - this.panStartScreen.y) / zoom
      this.cameras.main.setScroll(this.panStartScroll.x - dx, this.panStartScroll.y - dy)
    })
    this.input.on('pointerup', () => {
      if (this.isPanning) {
        this.isPanning = false
        this.input.setDefaultCursor('default')
      }
    })

    // UI 객체들을 main 카메라에서 제외 (P1 #8) — 줌 영향 X
    this.applyUiCameraSeparation()

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

  /** UI 객체는 uiCamera에서만 보이게, 월드 객체는 main에서만 보이게 (P1 #8).
   *  create() 끝에 1회 호출. rebuildWorkstations / drawFurniture는 동적이라 그쪽에서 별도 ignore. */
  private applyUiCameraSeparation() {
    if (!this.uiCamera) return
    // UI 객체 — main 카메라에서 제외 (zoom 영향 X)
    const uiObjects: Phaser.GameObjects.GameObject[] = []
    if (this.skyBand) uiObjects.push(this.skyBand)
    if (this.skyDivider) uiObjects.push(this.skyDivider)
    uiObjects.push(...this.stars, ...this.clouds)
    if (this.celestialBody) uiObjects.push(this.celestialBody)
    if (this.titleText) uiObjects.push(this.titleText)
    if (this.subtitleText) uiObjects.push(this.subtitleText)
    if (this.timeLabel) uiObjects.push(this.timeLabel)
    if (this.clockFace) uiObjects.push(this.clockFace)
    if (this.clockHourHand) uiObjects.push(this.clockHourHand)
    if (this.clockMinuteHand) uiObjects.push(this.clockMinuteHand)
    if (this.tokenBoard) {
      uiObjects.push(
        this.tokenBoard.frame,
        this.tokenBoard.bezel,
        this.tokenBoard.ledScreen,
        this.tokenBoard.costLabel,
        this.tokenBoard.progressBg,
        this.tokenBoard.progressFill,
      )
    }
    uiObjects.push(...this.walls)
    this.cameras.main.ignore(uiObjects)

    // 월드 객체 — uiCamera에서 제외
    const worldObjects: Phaser.GameObjects.GameObject[] = []
    if (this.floorGrid) worldObjects.push(this.floorGrid)
    worldObjects.push(...this.worldFurniture)
    worldObjects.push(...this.teamLabels)
    for (const ws of this.workstations.values()) worldObjects.push(...ws.allObjects)
    this.uiCamera.ignore(worldObjects)
  }

  /** 동적으로 추가된 월드 객체를 uiCamera에서 추가로 ignore — rebuildWorkstations 끝에 호출 */
  private ignoreWorldOnUiCamera(objects: Phaser.GameObjects.GameObject[]) {
    if (!this.uiCamera || objects.length === 0) return
    this.uiCamera.ignore(objects)
  }

  private cleanupListeners() {
    eventBus.off('office:set-employees', this.setEmployeesHandler)
    eventBus.off('agent:set-state', this.setStateHandler)
    eventBus.off('office:night-mode', this.nightModeHandler)
    eventBus.off('seat:start-move', this.startSeatMoveHandler)
    eventBus.off('office:settings', this.setSettingsHandler)
    eventBus.off('camera:zoom-toggle', this.zoomToggleHandler)
    this.timeRefreshTimer?.remove(false)
    this.timeRefreshTimer = undefined
    this.tokenBoardTimer?.remove(false)
    this.tokenBoardTimer = undefined
    this.tokenBoard?.pulseTween?.stop()
    this.zoomTween?.stop()
    this.clockTimer?.remove(false)
    this.clockTimer = undefined
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

    // 상태바(F)에도 시간대 전달
    eventBus.emit('office:time-changed', {
      timeOfDay: t,
      label: p.label,
      forcedNight: this.forcedNight,
    })
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

  // ============================================================
  // 사무실 벽 + 파티션 (P1 #12 옵션 C — 풀 파티션)
  // ============================================================

  /** 위쪽 벽 영역 + 사장실 격리 파티션 — 정적, create 시 1회. */
  private drawWallsAndPartitions() {
    const width = this.scale.width
    const height = this.scale.height

    // 위쪽 벽 영역 (y=60~120) — 베이지 배경 + 아래 갈색 경계
    const wallBg = this.add.rectangle(width / 2, 90, width, 60, 0xd8c890)
    wallBg.setDepth(0.5) // sky(0) 위, 자리(다양) 아래
    const wallBorder = this.add.rectangle(width / 2, 120, width, 2, 0x8a6a30)
    wallBorder.setDepth(0.6)
    this.walls.push(wallBg, wallBorder)

    // 사장실 격리 — 사장석 좌우 큰 파티션 (사장석 yRatio 0.30)
    const bossDeskY = 0.30 * height
    const partCenterY = bossDeskY + 10
    const partHeight = 100
    const bossLeftX = 0.5 * width - 56
    const bossRightX = 0.5 * width + 56
    const bossLeftPart = this.add.rectangle(bossLeftX, partCenterY, 6, partHeight, 0xc8b878)
    bossLeftPart.setStrokeStyle(1, 0x6a5a30)
    bossLeftPart.setDepth(7)
    const bossRightPart = this.add.rectangle(bossRightX, partCenterY, 6, partHeight, 0xc8b878)
    bossRightPart.setStrokeStyle(1, 0x6a5a30)
    bossRightPart.setDepth(7)
    // 사장실 윗쪽 가로 파티션 (벽 아래·사장석 위)
    const bossTopY = bossDeskY - 50
    const bossTopPart = this.add.rectangle(0.5 * width, bossTopY, 120, 5, 0xc8b878)
    bossTopPart.setStrokeStyle(1, 0x6a5a30)
    bossTopPart.setDepth(7)
    this.walls.push(bossLeftPart, bossRightPart, bossTopPart)
  }

  /** 활성 팀 사이 + 같은 팀 내 자리 사이 파티션 (rebuild 시 호출, P1 #12). */
  private drawTeamPartitions() {
    // 기존 파티션 정리
    for (const p of this.partitions) p.destroy()
    this.partitions = []

    const width = this.scale.width
    const height = this.scale.height

    // 팀 사이 파티션 — 활성 팀 인접 사이만
    const teamXs: Record<'A' | 'B' | 'C', number> = { A: 0.20, B: 0.50, C: 0.80 }
    const teamsOrdered: ('A' | 'B' | 'C')[] = ['A', 'B', 'C']
    const activeOrdered = teamsOrdered.filter(t => this.activeTeams.has(t))
    for (let i = 0; i < activeOrdered.length - 1; i++) {
      const t1 = activeOrdered[i]
      const t2 = activeOrdered[i + 1]
      const x = ((teamXs[t1] + teamXs[t2]) / 2) * width
      const y = 0.65 * height
      const part = this.add.rectangle(x, y, 8, 220, 0xb8a868)
      part.setStrokeStyle(1, 0x6a5a30)
      part.setDepth(6)
      this.partitions.push(part)
    }

    // 같은 팀 내 자리 사이 파티션 — member 좌·우 분리 (leader 아래쪽 세로 파티션)
    for (const team of activeOrdered) {
      const x = teamXs[team] * width
      // leader y=0.45, member y=0.60·0.75. leader 책상 아래(deskY+30)부터 member 책상 아래(0.75deskY+30)까지
      const yTop = 0.55 * height
      const yBot = 0.80 * height
      const partHeight = yBot - yTop
      const partCenterY = (yTop + yBot) / 2
      const part = this.add.rectangle(x, partCenterY, 4, partHeight, 0xc8b878)
      part.setStrokeStyle(1, 0x6a5a30)
      part.setDepth(5) // 책상·캐릭터보다 아래 (depth 8·10)
      this.partitions.push(part)
    }
  }

  // ============================================================
  // 가구 (꾸미기 Lv1) — 화분·책장·자판기·시계 배치
  // ============================================================

  /** 사무실 분위기 살리는 정적 가구들. 인터랙션 없음, 시각 디테일만.
   *  화분/책장/자판기 = 월드 객체. 시계 = UI 객체 (벽에 액자처럼 — P1 #8 UI 카메라). */
  private drawFurniture() {
    const width = this.scale.width
    const height = this.scale.height

    // 화분 — 좌하 + 우하 코너 (월드)
    const plant1 = drawPixelGrid(this, PLANT, PLANT_PALETTE, 0.06 * width, 0.85 * height, 2)
    plant1.setDepth(3)
    const plant2 = drawPixelGrid(this, PLANT, PLANT_PALETTE, 0.94 * width, 0.85 * height, 2)
    plant2.setDepth(3)

    // 책장 — 좌측 벽 중간 (월드)
    const bookshelf = drawPixelGrid(this, BOOKSHELF, BOOKSHELF_PALETTE, 0.04 * width, 0.55 * height, 2)
    bookshelf.setDepth(2)

    // 자판기 — 우측 벽 중간 (월드)
    const vending = drawPixelGrid(this, VENDING, VENDING_PALETTE, 0.96 * width, 0.55 * height, 2)
    vending.setDepth(2)

    this.worldFurniture = [plant1, plant2, bookshelf, vending]

    // 시계 — 좌측 벽 상단 (UI). 크기 키움 (pixelSize 2→3, P1 #10) + 시침·분침 graphics
    const clockX = 0.18 * width
    const clockY = 0.13 * height
    this.clockFace = drawPixelGrid(this, CLOCK, CLOCK_PALETTE, clockX, clockY, 3)
    this.clockFace.setDepth(4)

    // 시침·분침 — 실시간 (P1 #10)
    this.clockHourHand = this.add.graphics()
    this.clockHourHand.setPosition(clockX, clockY)
    this.clockHourHand.setDepth(5)
    this.clockMinuteHand = this.add.graphics()
    this.clockMinuteHand.setPosition(clockX, clockY)
    this.clockMinuteHand.setDepth(5)
    this.updateClockHands()
    this.clockTimer = this.time.addEvent({
      delay: 60_000,
      callback: () => this.updateClockHands(),
      loop: true,
    })
  }

  /** 시침·분침 위치 갱신 — PC 시간 기준 (P1 #10) */
  private updateClockHands() {
    if (!this.clockHourHand || !this.clockMinuteHand) return
    const now = new Date()
    const hours = now.getHours() % 12
    const minutes = now.getMinutes()
    // 분침: 360° = 60분 → 6°/분. -90° offset (12시 방향 = 위)
    const minuteAngle = ((minutes * 6) - 90) * Math.PI / 180
    // 시침: 360° = 12시간 → 30°/시간 + 분 보정 (0.5°/분)
    const hourAngle = ((hours * 30) + (minutes * 0.5) - 90) * Math.PI / 180

    // pixelSize 3 + grid 10x10 → 반지름 약 12
    const minuteLen = 11
    const hourLen = 7

    this.clockHourHand.clear()
    this.clockHourHand.lineStyle(2, 0x101010, 1)
    this.clockHourHand.beginPath()
    this.clockHourHand.moveTo(0, 0)
    this.clockHourHand.lineTo(Math.cos(hourAngle) * hourLen, Math.sin(hourAngle) * hourLen)
    this.clockHourHand.strokePath()

    this.clockMinuteHand.clear()
    this.clockMinuteHand.lineStyle(1, 0x4a3a08, 1)
    this.clockMinuteHand.beginPath()
    this.clockMinuteHand.moveTo(0, 0)
    this.clockMinuteHand.lineTo(Math.cos(minuteAngle) * minuteLen, Math.sin(minuteAngle) * minuteLen)
    this.clockMinuteHand.strokePath()
  }

  // 빈 자리 hover hint는 DOM tooltip으로 전환됨 (P0 #2). Phaser side는 hireZone에서 직접 emit.

  // ============================================================
  // 토큰 보드 (M5-c) — 사장석 뒤 벽 액자 LED
  // ============================================================

  /** 액자 + LED 스크린 + 비용 라벨 + 진행률 바를 사장석 뒤 벽 영역에 그린다.
   *  위치: 화면 상단 중앙, title(60) 아래 + 사장석 책상 위.
   *  표시: 신호등 색 LED, "$X.XX / $Y.YY" 비용 라벨, 진행률 바.
   *  점멸: 비율 ≥ 85% 또는 forcedNight === true 일 때 빨강 점멸. */
  private createTokenBoard() {
    const width = this.scale.width
    const boardX = width / 2
    const boardY = 78
    const boardW = 200
    const boardH = 36

    // 외곽 액자 — 진한 갈색 두꺼운 테두리
    const frame = this.add.rectangle(boardX, boardY, boardW, boardH, 0x2a1a04)
    frame.setStrokeStyle(2, 0x6a4a1a)
    frame.setDepth(5)

    // 안쪽 베젤 (LED 주변 갈색 테)
    const bezel = this.add.rectangle(boardX, boardY, boardW - 8, boardH - 8, 0x5a3a14)
    bezel.setDepth(6)

    // LED 스크린 — 초록/노랑/빨강 톤 (신호등 색에 따라 변함)
    const ledW = boardW - 16
    const ledH = boardH - 14
    const ledScreen = this.add.rectangle(boardX, boardY, ledW, ledH, 0x0a2a08)
    ledScreen.setDepth(7)

    // 비용 라벨 — 위쪽 (Courier New 픽셀풍 폰트)
    const costLabel = this.add
      .text(boardX, boardY - 4, '$0.00 / $5.00', {
        fontFamily: '"Courier New", monospace',
        fontSize: '10px',
        color: '#60ff80',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(8)

    // 진행률 바 — 아래쪽
    const barW = ledW - 16
    const barX = boardX
    const barY = boardY + 8
    const progressBg = this.add.rectangle(barX, barY, barW, 4, 0x0a1a0a)
    progressBg.setStrokeStyle(1, 0x40a040, 0.5)
    progressBg.setDepth(8)
    const progressFill = this.add.rectangle(barX - barW / 2, barY, 0, 4, 0x60ff80)
    progressFill.setOrigin(0, 0.5)
    progressFill.setDepth(9)

    this.tokenBoard = {
      frame,
      bezel,
      ledScreen,
      costLabel,
      progressBg,
      progressFill,
      barW,
    }
  }

  /** 1초 간격으로 모든 모델의 사용량 합산 → 신호등 색·라벨·바 갱신 */
  private scheduleTokenBoardRefresh() {
    this.tokenBoardTimer = this.time.addEvent({
      delay: 1000,
      callback: () => { void this.refreshTokenBoard() },
      loop: true,
    })
    void this.refreshTokenBoard()
  }

  /** 토큰 보드 색·텍스트·바 갱신 — 모든 모델 sessionCostUsd 합산 / dailyLimitUsd 대비 비율 */
  private async refreshTokenBoard() {
    if (this.isShutdown || !this.tokenBoard) return

    // 모든 모델 병렬 fetch
    const models = Object.keys(MODEL_INFO) as Model[]
    let totalCost = 0
    await Promise.all(
      models.map(async m => {
        try {
          const s = await platform.getRateLimit(m)
          totalCost += s.sessionCostUsd
        } catch {
          // 모델 호출 실패는 무시 — 합산에서 빠짐
        }
      }),
    )

    // 씬이 그 사이에 종료됐으면 중단
    if (this.isShutdown || !this.tokenBoard?.ledScreen.active) return

    const limit = this.dailyLimitUsd
    const ratio = limit > 0 ? Math.min(1, totalCost / limit) : 0

    // 신호등 색 — forcedNight면 무조건 빨강 (토큰 고갈)
    let color: 'green' | 'yellow' | 'red'
    if (ratio >= 0.85 || this.forcedNight) color = 'red'
    else if (ratio >= 0.6) color = 'yellow'
    else color = 'green'

    const colorMap = {
      green: { led: 0x0a2a08, text: '#60ff80', fill: 0x60ff80 },
      yellow: { led: 0x2a2a08, text: '#ffd040', fill: 0xffd040 },
      red: { led: 0x2a0808, text: '#ff5060', fill: 0xff5060 },
    } as const
    const c = colorMap[color]

    this.tokenBoard.ledScreen.setFillStyle(c.led)
    this.tokenBoard.costLabel.setColor(c.text)
    this.tokenBoard.costLabel.setText(`$${totalCost.toFixed(2)} / $${limit.toFixed(2)}`)
    this.tokenBoard.progressFill.setSize(this.tokenBoard.barW * ratio, 4)
    this.tokenBoard.progressFill.setFillStyle(c.fill)

    // 상태바(F)에도 동일 데이터 전달 — App.tsx footer가 받음
    eventBus.emit('office:usage-summary', {
      totalCost,
      limit,
      color,
    })

    // 빨강 점멸 토글 — red 진입 시 시작, red 이탈 시 종료
    if (color === 'red' && !this.tokenBoard.pulseTween) {
      this.startTokenBoardPulse()
    } else if (color !== 'red' && this.tokenBoard.pulseTween) {
      this.stopTokenBoardPulse()
    }
  }

  /** 빨강 점멸 시작 — LED + 라벨 alpha 0.4↔1 yoyo */
  private startTokenBoardPulse() {
    if (!this.tokenBoard || this.tokenBoard.pulseTween) return
    this.tokenBoard.pulseTween = this.tweens.add({
      targets: [this.tokenBoard.ledScreen, this.tokenBoard.costLabel],
      alpha: { from: 0.4, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 350,
    })
  }

  /** 빨강 점멸 종료 — tween 해제 + alpha 복원 */
  private stopTokenBoardPulse() {
    if (!this.tokenBoard?.pulseTween) return
    this.tokenBoard.pulseTween.stop()
    this.tokenBoard.pulseTween = undefined
    this.tokenBoard.ledScreen.setAlpha(1)
    this.tokenBoard.costLabel.setAlpha(1)
  }

  private rebuildWorkstations(employees: Employee[]) {
    // Clear existing
    for (const ws of this.workstations.values()) {
      for (const obj of ws.allObjects) obj.destroy()
    }
    this.workstations.clear()
    this.hireZones = [] // P0 #3 — 다음 빌드에 새 zone 모음

    // employee.seatId 기반 lookup
    const empBySeat = new Map<SeatId, Employee>()
    for (const emp of employees) {
      if (emp.seatId) empBySeat.set(emp.seatId, emp)
    }

    const width = this.scale.width
    const height = this.scale.height

    // 활성 팀만 표시 (P0 #7) — 팀원 1명 이상 있는 팀만. 초기엔 팀 A만 보임
    this.activeTeams = new Set<'A' | 'B' | 'C'>(['A']) // 팀 A는 기본 항상 활성
    for (const emp of employees) {
      if (!emp.seatId) continue
      const meta = ALL_SEATS.find(s => s.id === emp.seatId)
      if (meta?.team) this.activeTeams.add(meta.team)
    }

    const visibleSeats = ALL_SEATS.filter(s => s.id === 'boss' || (s.team && this.activeTeams.has(s.team)))
    for (const seat of visibleSeats) {
      const x = seat.position.xRatio * width
      const y = seat.position.yRatio * height
      const emp = empBySeat.get(seat.id) ?? null
      this.createWorkstation(x, y, emp, seat)
    }

    // 활성 팀 라벨만 표시
    this.drawTeamLabels()

    // 팀 사이 + 같은 팀 내 자리 사이 파티션 (P1 #12 옵션 C)
    this.drawTeamPartitions()

    // 새 월드 객체들을 uiCamera에서 ignore (P1 #8)
    const newWorld: Phaser.GameObjects.GameObject[] = []
    for (const ws of this.workstations.values()) newWorld.push(...ws.allObjects)
    newWorld.push(...this.teamLabels)
    newWorld.push(...this.partitions)
    this.ignoreWorldOnUiCamera(newWorld)
  }

  /** 활성 팀 라벨만 그리기 (P0 #7). 우클릭 시 이름 수정 (P1 #11) */
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
      if (!this.activeTeams.has(team)) continue
      const displayName = this.teamDisplayNames[team]
      const t = this.add
        .text(teamX[team] * width, labelY, `— ${displayName} —`, {
          fontFamily: '"Courier New", monospace',
          fontSize: '13px',
          color: '#5a3a0f',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(20)
      // 우클릭 → React에 이름 수정 요청 (P1 #11)
      t.setInteractive()
      t.on('pointerup', (pointer: Phaser.Input.Pointer) => {
        if (this.isShutdown) return
        const nativeButton = (pointer.event as MouseEvent | undefined)?.button
        const isRightClick = nativeButton === 2 || pointer.rightButtonReleased()
        if (!isRightClick) return
        eventBus.emit('team:rename-request', { team, currentName: displayName })
      })
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

    // 마우스 제거 (P0 #5) — 책상 폭 축소로 공간 부족 + 사용자 요청

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
      // 빈 자리 hover zone — DOM tooltip 트리거 (P0 #2). 클릭은 아무 동작 안 함 (P0 #6 — 채용은 우상단 버튼만)
      const hireZone = this.add.zone(x, deskY - 20, 80, 100)
      hireZone.setInteractive()
      hireZone.setDepth(3)
      hireZone.on('pointerover', (pointer: Phaser.Input.Pointer) => {
        if (this.isShutdown) return
        // 이동 모드일 땐 hover 안 받음 (P0 #3 충돌 회피)
        if (this.movingEmployeeId) return
        const native = pointer.event as MouseEvent | TouchEvent | undefined
        const clientX = native && 'clientX' in native ? native.clientX : pointer.x
        const clientY = native && 'clientY' in native ? native.clientY : pointer.y
        eventBus.emit('seat:hover-empty', { x: clientX, y: clientY, label: seat.label })
        this.input.setDefaultCursor('default')
      })
      hireZone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (this.isShutdown || this.movingEmployeeId) return
        const native = pointer.event as MouseEvent | TouchEvent | undefined
        const clientX = native && 'clientX' in native ? native.clientX : pointer.x
        const clientY = native && 'clientY' in native ? native.clientY : pointer.y
        eventBus.emit('seat:hover-empty', { x: clientX, y: clientY, label: seat.label })
      })
      hireZone.on('pointerout', () => {
        if (this.isShutdown) return
        eventBus.emit('seat:hover-empty', null)
      })
      // pointerup 핸들러 제거 (P0 #6 — 채용은 우상단 버튼만)
      this.hireZones.push(hireZone)
      allObjects.push(hireZone)

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

    // 📝 Memo (책상 우측 상단 — 폭 축소 후 책상 위 표면에 작게, P0 #5)
    const memo = drawPixelGrid(this, MEMO, MEMO_PALETTE, 12, -4, 2)
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

    // 💬 Chat bubble — 회전 시에도 보이도록 위치 보정 (P0 #4)
    //   정면: 캐릭터 머리 위 / 회전(left/right): 책상 위 영역 (deskY-60) — 캐릭터 옆으로 옮겨도 책상 위에 보임
    const chatBubbleX = orientation === 'front' ? clawdX : x
    const chatBubbleY = orientation === 'front' ? clawdY - 28 : deskY - 60
    const chatBubble = drawPixelGrid(
      this,
      CHAT_BUBBLE,
      CHAT_BUBBLE_PALETTE,
      chatBubbleX,
      chatBubbleY,
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
      y: { from: chatBubbleY, to: chatBubbleY - 4 },
      yoyo: true,
      repeat: -1,
      duration: 1800,
      ease: 'Sine.easeInOut',
    })
    allObjects.push(chatBubble)

    // Working bubble (P1 #15) — 점선 점점점(…)을 말풍선 안에 오버레이.
    //   평소엔 chatBubble(빈 말풍선) / 채팅 중엔 chatBubble 위에 thinkingDots 표시 → 시각 일관성
    const workingBubble = this.add
      .text(chatBubbleX, chatBubbleY - 4, '…', {
        fontFamily: '"Courier New", monospace',
        fontSize: '14px',
        color: '#5a3a0f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false)
    // 점선 깜빡임 — 생각하는 느낌
    this.tweens.add({
      targets: workingBubble,
      alpha: { from: 0.4, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 600,
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

    // 명함 hover 카드 (A) — pointerover/move 시 위치 갱신, out 시 닫기
    const emitHoverCard = (pointer: Phaser.Input.Pointer) => {
      const native = pointer.event as MouseEvent | TouchEvent | undefined
      let clientX = 0, clientY = 0
      if (native && 'clientX' in native) {
        clientX = native.clientX
        clientY = native.clientY
      } else {
        clientX = pointer.x
        clientY = pointer.y
      }
      eventBus.emit('employee:hover-card', {
        employeeId: employee.id,
        x: clientX,
        y: clientY,
      })
    }
    clawd.on('pointerover', (pointer: Phaser.Input.Pointer) => {
      this.tweens.add({ targets: clawd, scale: CLAWD_BASE_SCALE * 1.08, duration: 120 })
      emitHoverCard(pointer)
    })
    clawd.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      emitHoverCard(pointer)
    })
    clawd.on('pointerout', () => {
      this.tweens.add({ targets: clawd, scale: CLAWD_BASE_SCALE, duration: 120 })
      eventBus.emit('employee:hover-card', null)
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
    // 이동 모드 동안 빈 자리 hover zone 비활성화 — 회전+드래그 시 채용 hint 충돌 방지 (P0 #3)
    for (const z of this.hireZones) z.disableInteractive()
    eventBus.emit('seat:hover-empty', null)

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
    // 빈 자리 hover zone 재활성화 (P0 #3) — success 시엔 rebuild가 새 zone 만들어주므로 중복 OK
    for (const z of this.hireZones) z.setInteractive()

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
