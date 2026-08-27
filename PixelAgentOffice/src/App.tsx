import { useEffect, useRef, useState } from 'react'
import { PhaserGame } from './game/PhaserGame'
import { ChatPopup } from './components/ChatPopup'
import { SettingsModal } from './components/SettingsModal'
import { HireModal } from './components/HireModal'
import { MemoModal } from './components/MemoModal'
import { ShopModal } from './components/ShopModal'
import { PromotionModal } from './components/PromotionModal'
import { TeamTaskModal } from './components/TeamTaskModal'
import { TechModal } from './components/TechModal'
import { eventBus } from './game/eventBus'
import { platform } from './platform'
import type { Employee, Settings, DeskOrientation, Rank } from './shared/types'
import { DEFAULT_SETTINGS, DEFAULT_MAX_EMPLOYEES, canBeTeamLeader } from './shared/types'
import { SEAT_LOOKUP } from './shared/seats'
import { checkPromotionEligible } from './shared/promotion'
import { TutorialOverlay } from './components/TutorialOverlay'
import { ApiKeyModal } from './components/ApiKeyModal'
import { ApiKeyGuideModal } from './components/ApiKeyGuideModal'
import { TUTORIAL_STEPS, FIRST_RUN_STEPS, SHOP_TUTORIAL_STEPS, SETTINGS_TUTORIAL_STEPS, MEMO_TUTORIAL_STEPS, type TutorialStep } from './shared/tutorial'
import './App.css'

function App() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [maxEmployees, setMaxEmployees] = useState(DEFAULT_MAX_EMPLOYEES)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  const [settingsOpen, setSettingsOpen] = useState(false)
  /** 설정 모달 열 때 특정 섹션으로 스크롤 (다른 곳에서 우클릭으로 열 때) */
  const [settingsFocusSection, setSettingsFocusSection] = useState<string | undefined>(undefined)
  const [hireOpen, setHireOpen] = useState(false)
  // Day 12 §3 — 채용 모달 트리거 제거 (모달이 화면 가려서 빈 자리 보일 필요 X).
  // 빈 자리는 *자리 이동 모드* 시에만 표시 (OfficeScene.enterMoveMode).
  const [shopOpen, setShopOpen] = useState(false)
  /** 기술 스택·설계 패널 (?) — 포트폴리오 열람자용 읽기 화면 */
  const [techOpen, setTechOpen] = useState(false)
  const [memoEmployee, setMemoEmployee] = useState<Employee | null>(null)
  /** 진급 요청 모달 (Phase 3) — 자격 도달 시 캐릭터가 사장에게 요청 */
  const [promotionReq, setPromotionReq] = useState<{ employee: Employee; toRank: Rank } | null>(null)
  /** 팀 작업 모달 (2F Phase 4) — 팀장에게 팀 단위 작업 지시 */
  const [teamTask, setTeamTask] = useState<{ leader: Employee; members: Employee[] } | null>(null)
  /** 캐릭터 우클릭 시 띄울 컨텍스트 메뉴 위치/대상 */
  const [employeeContextMenu, setEmployeeContextMenu] = useState<{ x: number; y: number; employee: Employee } | null>(null)
  /** 줌 토글 상태 (B-5) — true=1.4x, false=1.0x. Phaser scene과 동기화 */
  const [zoomedIn, setZoomedIn] = useState(false)
  /** 캐릭터 hover 시 떠오르는 명함 카드 (A) — Day 11 후속 +2 비활성. 보존 위해 주석 */
  // const [hoverCard, setHoverCard] = useState<{ employee: Employee; x: number; y: number } | null>(null)
  // 빈 자리 hover tooltip 제거 (Day 11) — emptySeatTip state·이벤트 핸들러 함께 제거
  /** 상태바(F) — 사용량·시간대 라이브 정보 (OfficeScene이 emit) */
  const [usageSummary, setUsageSummary] = useState<{ totalCost: number; limit: number; color: 'green' | 'yellow' | 'red' } | null>(null)
  const [timeOfDay, setTimeOfDay] = useState<{ label: string; forcedNight: boolean } | null>(null)
  /** 튜토리얼(T1, Day 14) — 현재 단계 인덱스. null=비활성. 첫 실행 시 0부터 시작 */
  const [tutorialStep, setTutorialStep] = useState<number | null>(null)
  const tutorialStepRef = useRef<number | null>(null)
  useEffect(() => { tutorialStepRef.current = tutorialStep }, [tutorialStep])
  /** 설정 "다시 보기"로 재시작했는지 — 재시청 시 행동 단계(채용·대화)는 자동 통과 */
  const tutorialReplayRef = useRef(false)
  /** 튜토리얼 단계 이동 히스토리 — "◂ 이전" 버튼용 (분기 흐름도 정확히 되돌림) */
  const tutorialHistoryRef = useRef<number[]>([])
  /** 활성 튜토리얼 트랙의 단계 배열 (메인/상점/설정). 트랙 전환은 항상 setTutorialStep을 동반하므로 ref로 충분 */
  const tutorialStepsRef = useRef<TutorialStep[]>(TUTORIAL_STEPS)
  /** 활성 트랙 종류. 'first-run'=최초/다시보기 자동 연속(메모·상점·설정 모달을 zone에 맞춰 자동 제어).
   *  상점/설정/메모 단독 트랙은 해당 모달이 닫히면 자동 종료. */
  const tutorialTrackRef = useRef<'main' | 'first-run' | 'shop' | 'settings' | 'memo'>('main')
  /** 정보 팝업(MBTI 16종·감정 미리보기 등)이 열리면 스팟라이트를 잠시 숨김 — 팝업이 포커스 뒤에 가려 안 보이는 문제 방지 */
  const [tutorialSuppressed, setTutorialSuppressed] = useState(false)
  /** API 키 미니 팝업 (Day 14) — 설정·튜토리얼·키없음 흐름 공용 */
  const [apiKeyOpen, setApiKeyOpen] = useState(false)
  const [apiKeyGuideOpen, setApiKeyGuideOpen] = useState(false)
  /** 키가 하나라도 등록돼 있는지 — 튜토리얼 키 단계 스킵 판단 (ref로 최신값) */
  const hasAnyKeyRef = useRef(false)

  // Stable ref to current employees (for handlers that won't see state updates)
  const employeesRef = useRef<Employee[]>([])
  useEffect(() => {
    employeesRef.current = employees
  }, [employees])
  // Stable ref to current settings (토큰 보드 등 scene-측에서 최신 settings 참조)
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS)
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  // Load data from main process
  useEffect(() => {
    let mounted = true

    // Wait for scene ready signal — re-push current data
    const onReady = () => {
      eventBus.emit('office:set-employees', employeesRef.current)
      eventBus.emit('office:settings', settingsRef.current)
    }
    eventBus.on('office:ready', onReady)

    ;(async () => {
      try {
        const data = await platform.loadData()
        if (!mounted) return
        setEmployees(data.employees)
        setMaxEmployees(data.maxEmployees)
        setSettings(data.settings)
        setLoading(false)
        // 튜토리얼(T1) — 자동으로 띄우지 않음 (사용자 요청, Day 14). 상단 🎓 버튼으로 직접 연다.
        // API 키 보유 여부 — 튜토리얼 키 단계 스킵 판단용 (비동기, welcome 단계 클릭 전 도착)
        void Promise.all([platform.hasApiKey('google'), platform.hasApiKey('anthropic')]).then(([g, a]) => {
          hasAnyKeyRef.current = g || a
          // 로드가 늦게 끝나 이미 키 단계에 머물러 있으면 즉시 스킵
          const idx = tutorialStepRef.current
          if (hasAnyKeyRef.current && idx !== null && tutorialStepsRef.current[idx]?.id === 'apikey') goToTutorialStep('hire')
        })
        eventBus.emit('office:set-employees', data.employees)
        eventBus.emit('office:settings', data.settings)
        // Phase 3 — 시간형 진급은 카운터 이벤트가 없으므로 로드 시 1회 스캔.
        // 첫 자격자 1명만 요청 (한 번에 여러 모달 방지)
        const mult = data.settings.promotionSpeedMultiplier ?? 1
        const due = data.employees.map(e => ({ e, to: checkPromotionEligible(e, mult) })).find(x => x.to)
        if (due && due.to) setPromotionReq({ employee: due.e, toRank: due.to })
      } catch (err) {
        console.error('Load data failed:', err)
        setLoading(false)
      }
    })()

    return () => {
      mounted = false
      eventBus.off('office:ready', onReady)
    }
  }, [])

  // Listen for memo:open events from Phaser
  useEffect(() => {
    const onMemoOpen = (payload: unknown) => {
      const { employeeId } = payload as { employeeId: string }
      const emp = employees.find(e => e.id === employeeId)
      if (emp) setMemoEmployee(emp)
    }
    eventBus.on('memo:open', onMemoOpen)
    return () => eventBus.off('memo:open', onMemoOpen)
  }, [employees])

  // Sync Phaser scene whenever employees change
  useEffect(() => {
    if (!loading) {
      eventBus.emit('office:set-employees', employees)
    }
  }, [employees, loading])

  // ESC key closes all modals
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 위에 API 키 팝업/안내가 떠 있으면 그 팝업만 ESC로 닫고 아래 모달(채용·설정) 입력은 보존
        if (apiKeyOpen || apiKeyGuideOpen) return
        // 최초 튜토리얼(자동 연속) 중엔 ESC로 모달을 닫지 않음 — zone 효과가 즉시 재오픈해 충돌. 종료는 카드의 "건너뛰기".
        if (tutorialTrackRef.current === 'first-run' && tutorialStepRef.current !== null) return
        setSettingsOpen(false)
        setHireOpen(false)
        setMemoEmployee(null)
        setTechOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [apiKeyOpen, apiKeyGuideOpen])

  // 다른 컴포넌트에서 우클릭으로 설정 → 특정 섹션 점프하면서 열기
  useEffect(() => {
    const onSettingsOpen = (payload: unknown) => {
      const section = (payload as { section?: string } | undefined)?.section
      // API 키 섹션 요청은 미니 팝업으로 (Day 14 — 설정에서 키 입력 분리)
      if (section === 'google-key' || section === 'anthropic-key') {
        setApiKeyGuideOpen(false)
        setApiKeyOpen(true)
        return
      }
      setSettingsFocusSection(section)
      setSettingsOpen(true)
    }
    eventBus.on('settings:open', onSettingsOpen)
    return () => eventBus.off('settings:open', onSettingsOpen)
  }, [])

  // API 키 미니 팝업 (Day 14) — 열기/받는법/저장 이벤트 공용 구독
  useEffect(() => {
    const onOpen = () => { setApiKeyGuideOpen(false); setApiKeyOpen(true) }
    const onOpenGuide = () => { setApiKeyOpen(false); setApiKeyGuideOpen(true) }
    const onSaved = () => {
      hasAnyKeyRef.current = true
      advanceTutorialOn('api-key-set') // 튜토리얼 키 단계면 다음으로 (→ apikey-ok)
    }
    eventBus.on('apikey:open', onOpen)
    eventBus.on('apikey:open-guide', onOpenGuide)
    eventBus.on('apikey:saved', onSaved)
    return () => {
      eventBus.off('apikey:open', onOpen)
      eventBus.off('apikey:open-guide', onOpenGuide)
      eventBus.off('apikey:saved', onSaved)
    }
  }, [])

  // 튜토리얼(T1) — chat:open(대화 시작) / tutorial:start(설정에서 다시 보기) 구독.
  // 핸들러는 ref만 읽으므로 [] deps로 한 번만 등록해도 최신 단계로 동작.
  useEffect(() => {
    const onChatOpen = () => advanceTutorialOn('chat-opened')
    const onTutorialStart = (payload: unknown) => {
      const track = (payload as { track?: string } | undefined)?.track
      if (track === 'shop') startTutorialTrack(SHOP_TUTORIAL_STEPS, 'shop')
      else if (track === 'settings') startTutorialTrack(SETTINGS_TUTORIAL_STEPS, 'settings')
      else if (track === 'memo') startTutorialTrack(MEMO_TUTORIAL_STEPS, 'memo')
      else startTutorialTrack(TUTORIAL_STEPS, 'main')
    }
    eventBus.on('chat:open', onChatOpen)
    eventBus.on('tutorial:start', onTutorialStart)
    return () => {
      eventBus.off('chat:open', onChatOpen)
      eventBus.off('tutorial:start', onTutorialStart)
    }
  }, [])

  // 튜토리얼(T1) — 행동 단계의 조건이 이미 충족돼 있으면 자동 전진.
  // (예: 설정에서 "다시 보기"로 재시작했는데 직원이 이미 있으면 채용 단계 건너뜀)
  useEffect(() => {
    if (tutorialStep === null) return
    const s = tutorialStepsRef.current[tutorialStep]
    if (!s) return
    // 이미 직원이 있으면 채용 단계(hire/hire-*/hire-submit)는 건너뛰고 대화로 — replay 가드보다 먼저.
    // 채용 단계는 requireAction이라 "다음"이 없고 최대 인원이면 [+채용]도 비활성 → 다시보기 데드엔드·중복채용 방지.
    if (s.id.startsWith('hire') && employees.length > 0) { goToTutorialStep('chat'); return }
    // 재시청("다시 보기")은 전체 흐름을 다 보여줌 — 이하 자동 스킵 안 함.
    // (행동 단계는 오버레이가 "다음 ▸" 버튼을 제공해 갇히지 않게 함)
    if (tutorialReplayRef.current) return
    // 첫 실행 — 키가 이미 있으면 API 키 안내 단계 건너뜀 (→ 채용)
    if (s.id === 'apikey' && hasAnyKeyRef.current) { goToTutorialStep('hire'); return }
    // 첫 실행 — 이미 직원이 있으면(예: 안내 전에 직접 채용) 채용 단계 건너뜀
    if (s.advanceOn === 'employee-hired' && employees.length > 0) advanceTutorial()
  }, [tutorialStep, employees])

  // 튜토리얼 채용 폼 안내 — 채용 모달 열림/닫힘에 맞춰 진입·복귀 (Day 14)
  // 'hire' 단계에서 모달 열면 폼 필드 안내(hire-template~)로, 폼 안내 중 모달 닫으면 'hire'로 복귀.
  useEffect(() => {
    if (tutorialStep === null) return
    const id = tutorialStepsRef.current[tutorialStep]?.id
    if (!id) return
    if (id === 'hire' && hireOpen) {
      tutorialHistoryRef.current = [] // 폼 안내는 자체 이전/다음 체인
      const i = tutorialStepsRef.current.findIndex(s => s.id === 'hire-template')
      if (i >= 0) setTutorialStep(i)
    } else if (id.startsWith('hire-') && !hireOpen) {
      const i = tutorialStepsRef.current.findIndex(s => s.id === 'hire')
      if (i >= 0) setTutorialStep(i)
    } else if (!id.startsWith('hire') && hireOpen) {
      // 폼을 "다음"으로 건너뛰어 폼 밖(chat 등)으로 나갔는데 모달이 남아있으면 닫기
      // (실제 채용 경로는 onClose로 이미 닫히지만, 폼-스킵 경로엔 닫는 호출이 없음)
      setHireOpen(false)
    }
  }, [hireOpen, tutorialStep])

  // 상점/설정/메모 단독 트랙(Day 14) — 해당 모달이 닫히면 그 트랙 튜토리얼도 종료.
  // (first-run은 모달을 자동 제어하므로 제외 — 아래 zone 효과가 담당)
  useEffect(() => {
    if (tutorialStep === null) return
    const track = tutorialTrackRef.current
    if (track === 'shop' && !shopOpen) finishTutorial()
    else if (track === 'settings' && !settingsOpen) finishTutorial()
    else if (track === 'memo' && !memoEmployee) finishTutorial()
  }, [shopOpen, settingsOpen, memoEmployee, tutorialStep])

  // 최초 튜토리얼(first-run) 자동 연속 — 현재 단계 zone(메모/상점/설정)에 맞춰 모달을 자동으로 열고 닫음.
  // 채용폼(hire) zone은 별도 효과가 담당. zone 밖이면 해당 모달을 닫아 한 흐름으로 이어지게 한다.
  useEffect(() => {
    if (tutorialStep === null) return
    if (tutorialTrackRef.current !== 'first-run') return
    const id = tutorialStepsRef.current[tutorialStep]?.id
    if (!id) return
    const wantMemo = id.startsWith('memo')
    const wantShop = id.startsWith('shop')
    const wantSettings = id.startsWith('set')
    // 메모 — 첫 직원(방금 채용한 메리)의 메모지를 대상으로
    if (wantMemo) {
      const emp = employeesRef.current[0]
      if (emp && memoEmployee?.id !== emp.id) setMemoEmployee(emp)
    } else if (memoEmployee) {
      setMemoEmployee(null)
    }
    if (wantShop !== shopOpen) setShopOpen(wantShop)
    if (wantSettings !== settingsOpen) setSettingsOpen(wantSettings)
  }, [tutorialStep, memoEmployee, shopOpen, settingsOpen])

  // 정보 팝업(MBTI 16종·감정 미리보기 등)이 열리면 스팟라이트를 잠시 숨김 (포커스 뒤에 가려 안 보이는 문제 방지)
  useEffect(() => {
    const onSuppress = (payload: unknown) => setTutorialSuppressed(payload === true)
    eventBus.on('tutorial:suppress', onSuppress)
    return () => eventBus.off('tutorial:suppress', onSuppress)
  }, [])

  // 캐릭터 우클릭 → 컨텍스트 메뉴 (자리 변경 등)
  useEffect(() => {
    const onContextMenu = (payload: unknown) => {
      const { employeeId, x, y } = payload as { employeeId: string; x: number; y: number }
      const emp = employeesRef.current.find(e => e.id === employeeId)
      if (!emp) return
      // 이미 메뉴가 떠 있을 때 다른 캐릭터 우클릭 — null 거쳐서 mount 애니메이션 재시작 + 새 위치/대상으로
      setEmployeeContextMenu(null)
      setTimeout(() => setEmployeeContextMenu({ x, y, employee: emp }), 0)
    }
    eventBus.on('employee:context-menu', onContextMenu)
    return () => eventBus.off('employee:context-menu', onContextMenu)
  }, [])

  // 팀장(리더 자리 + 과장 이상)인지 + 같은 팀 팀원 목록 (2F Phase 4 팀 작업 트리거 조건)
  const leaderTeamMembers = (emp: Employee): Employee[] | null => {
    if (!emp.seatId) return null
    const seat = SEAT_LOOKUP[emp.seatId]
    if (!seat || seat.role !== 'leader' || !seat.team || !canBeTeamLeader(emp.rank)) return null
    const members = employeesRef.current.filter(e => {
      if (e.id === emp.id || !e.seatId) return false
      const s = SEAT_LOOKUP[e.seatId]
      return s?.team === seat.team && s.role === 'member'
    })
    return members.length > 0 ? members : null
  }

  // 드래그앤드롭으로 자리 이동 완료 → 직원 상태 갱신 + scene 재구성
  useEffect(() => {
    const onUpdated = (payload: unknown) => {
      const updated = payload as Employee
      setEmployees(prev => {
        const next = prev.map(e => (e.id === updated.id ? updated : e))
        // scene에 반영
        eventBus.emit('office:set-employees', next)
        return next
      })
    }
    eventBus.on('employee:updated', onUpdated)
    return () => eventBus.off('employee:updated', onUpdated)
  }, [])

  // 빈 자리 hover tooltip 제거 (Day 11 사용자 피드백) — 이벤트 핸들러도 제거

  // 팀 라벨 우클릭 → 컨텍스트 메뉴 (Day 11)
  const [teamContextMenu, setTeamContextMenu] = useState<{
    team: 'A' | 'B' | 'C'
    currentName: string
    x: number
    y: number
  } | null>(null)
  useEffect(() => {
    const onTeamCtx = (payload: unknown) => {
      const p = payload as { team: 'A' | 'B' | 'C'; currentName: string; x: number; y: number }
      // 같은 자리 다시 우클릭 시 갱신 위해 null 거친 후 set (employee-context-menu 패턴과 동일)
      setTeamContextMenu(null)
      setTimeout(() => setTeamContextMenu(p), 0)
    }
    eventBus.on('team:context-menu', onTeamCtx)
    return () => eventBus.off('team:context-menu', onTeamCtx)
  }, [])
  // 메뉴 외부 클릭·ESC 시 닫기
  useEffect(() => {
    if (!teamContextMenu) return
    const onClose = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      setTeamContextMenu(null)
    }
    window.addEventListener('click', onClose)
    window.addEventListener('keydown', onClose)
    return () => {
      window.removeEventListener('click', onClose)
      window.removeEventListener('keydown', onClose)
    }
  }, [teamContextMenu])
  // 팀 이름 수정 — Electron에서 window.prompt 비활성이라 inline 모달로 (Day 11)
  const [teamRenameModal, setTeamRenameModal] = useState<{
    team: 'A' | 'B' | 'C'
    currentName: string
    inputValue: string
  } | null>(null)
  const openRenameModal = (team: 'A' | 'B' | 'C', currentName: string) => {
    setTeamContextMenu(null)
    setTeamRenameModal({ team, currentName, inputValue: currentName })
  }
  const submitRename = async () => {
    if (!teamRenameModal) return
    const { team, currentName, inputValue } = teamRenameModal
    const newName = inputValue.trim()
    if (newName === '' || newName === currentName) {
      setTeamRenameModal(null)
      return
    }
    const updatedTeamNames = { ...settingsRef.current.teamNames, [team]: newName }
    try {
      const next = await platform.updateSettings({ teamNames: updatedTeamNames })
      setSettings(next)
      eventBus.emit('office:settings', next)
    } catch (err) {
      console.error('팀 이름 변경 실패:', err)
    }
    setTeamRenameModal(null)
  }

  // 캐릭터 hover → 명함 카드 (Day 11 후속 +2: 일단 주석 — 나중에 다른 위치 결정)
  // useEffect(() => {
  //   const onHover = (payload: unknown) => {
  //     if (!payload) {
  //       setHoverCard(null)
  //       return
  //     }
  //     const { employeeId, x, y } = payload as { employeeId: string; x: number; y: number }
  //     const emp = employeesRef.current.find(e => e.id === employeeId)
  //     if (!emp) return
  //     setHoverCard({ employee: emp, x, y })
  //   }
  //   eventBus.on('employee:hover-card', onHover)
  //   return () => eventBus.off('employee:hover-card', onHover)
  // }, [])

  // P2 #25 — 가구 배치/이동/제거 이벤트 처리 (placedFurniture 갱신 → Settings 영속화)
  useEffect(() => {
    const onFurniturePlaced = async (payload: unknown) => {
      const p = payload as { itemId: string; xRatio: number; yRatio: number }
      const existing = settingsRef.current.placedFurniture ?? []
      const uid = `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const next = await platform.updateSettings({
        placedFurniture: [...existing, { uid, itemId: p.itemId as never, xRatio: p.xRatio, yRatio: p.yRatio }],
      })
      setSettings(next)
      eventBus.emit('office:settings', next)
    }
    const onFurnitureMoved = async (payload: unknown) => {
      const p = payload as { uid: string; xRatio: number; yRatio: number }
      const existing = settingsRef.current.placedFurniture ?? []
      const updated = existing.map(f =>
        f.uid === p.uid ? { ...f, xRatio: p.xRatio, yRatio: p.yRatio } : f,
      )
      const next = await platform.updateSettings({ placedFurniture: updated })
      setSettings(next)
      eventBus.emit('office:settings', next)
    }
    const onFurnitureRemoved = async (payload: unknown) => {
      const p = payload as { uid: string }
      const existing = settingsRef.current.placedFurniture ?? []
      const updated = existing.filter(f => f.uid !== p.uid)
      const next = await platform.updateSettings({ placedFurniture: updated })
      setSettings(next)
      eventBus.emit('office:settings', next)
    }
    // 전체 가구 삭제 (Day 11 후속 +2)
    const onFurnitureClearAll = async () => {
      const next = await platform.updateSettings({ placedFurniture: [] })
      setSettings(next)
      eventBus.emit('office:settings', next)
    }
    eventBus.on('furniture:placed', onFurniturePlaced)
    eventBus.on('furniture:moved', onFurnitureMoved)
    eventBus.on('furniture:removed', onFurnitureRemoved)
    eventBus.on('furniture:clear-all', onFurnitureClearAll)
    return () => {
      eventBus.off('furniture:placed', onFurniturePlaced)
      eventBus.off('furniture:moved', onFurnitureMoved)
      eventBus.off('furniture:removed', onFurnitureRemoved)
      eventBus.off('furniture:clear-all', onFurnitureClearAll)
    }
  }, [])

  // 가구 우클릭 컨텍스트 메뉴 (Day 11 후속 +2)
  const [furnitureContextMenu, setFurnitureContextMenu] = useState<{
    uid: string
    itemId: string
    x: number
    y: number
  } | null>(null)
  useEffect(() => {
    const onFurnitureCtx = (payload: unknown) => {
      const p = payload as { uid: string; itemId: string; x: number; y: number }
      setFurnitureContextMenu(null)
      setTimeout(() => setFurnitureContextMenu(p), 0)
    }
    eventBus.on('furniture:context-menu', onFurnitureCtx)
    return () => eventBus.off('furniture:context-menu', onFurnitureCtx)
  }, [])
  // 메뉴 외부 클릭·ESC 닫기
  useEffect(() => {
    if (!furnitureContextMenu) return
    const onClose = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      setFurnitureContextMenu(null)
    }
    window.addEventListener('click', onClose)
    window.addEventListener('keydown', onClose)
    return () => {
      window.removeEventListener('click', onClose)
      window.removeEventListener('keydown', onClose)
    }
  }, [furnitureContextMenu])

  // 상태바(F) — OfficeScene이 emit하는 사용량·시간대 받기
  useEffect(() => {
    const onUsage = (payload: unknown) => {
      setUsageSummary(payload as { totalCost: number; limit: number; color: 'green' | 'yellow' | 'red' })
    }
    const onTime = (payload: unknown) => {
      const { label, forcedNight } = payload as { label: string; forcedNight: boolean }
      setTimeOfDay({ label, forcedNight })
    }
    eventBus.on('office:usage-summary', onUsage)
    eventBus.on('office:time-changed', onTime)
    return () => {
      eventBus.off('office:usage-summary', onUsage)
      eventBus.off('office:time-changed', onTime)
    }
  }, [])

  // 컨텍스트 메뉴 — 외부 클릭/ESC로 닫기
  useEffect(() => {
    if (!employeeContextMenu) return
    const onClose = () => setEmployeeContextMenu(null)
    window.addEventListener('click', onClose)
    window.addEventListener('keydown', onClose)
    return () => {
      window.removeEventListener('click', onClose)
      window.removeEventListener('keydown', onClose)
    }
  }, [employeeContextMenu])

  // E2E 테스트 헬퍼 (Electron renderer는 신뢰 가능 환경, prod에서도 둠)
  useEffect(() => {
    ;(window as unknown as { __test?: object }).__test = {
      openChat: (employeeId: string) => {
        const emp = employeesRef.current.find(e => e.id === employeeId)
        if (emp) eventBus.emit('chat:open', emp)
      },
      refreshEmployees: async () => {
        const data = await platform.loadData()
        setEmployees(data.employees)
        eventBus.emit('office:set-employees', data.employees)
      },
      getFirstEmployeeId: () => employeesRef.current[0]?.id ?? null,
    }
  }, [])

  // ── 튜토리얼(T1) 제어 ──────────────────────────────────────────
  /** 완료/건너뛰기 — 투어 종료 + 완료 플래그 영속화 (다시는 자동 시작 안 함) */
  const finishTutorial = () => {
    setTutorialStep(null)
    setTutorialSuppressed(false)
    tutorialHistoryRef.current = []
    const updated = { ...settingsRef.current, tutorialDone: true }
    setSettings(updated)
    void platform.updateSettings({ tutorialDone: true })
  }
  /** 현재 단계를 히스토리에 쌓고 목표 단계로 이동 (앞으로 갈 때만) */
  const navigateTutorial = (target: number) => {
    const idx = tutorialStepRef.current
    if (idx !== null) tutorialHistoryRef.current.push(idx)
    setTutorialStep(target)
  }
  /** 특정 단계로 점프 (분기용) */
  const goToTutorialStep = (id: string) => {
    const i = tutorialStepsRef.current.findIndex(s => s.id === id)
    if (i >= 0) navigateTutorial(i)
  }
  /** 다음 단계로 (step.next 있으면 그쪽으로 분기). 마지막이면 종료 */
  const advanceTutorial = () => {
    const idx = tutorialStepRef.current
    if (idx === null) return
    const cur = tutorialStepsRef.current[idx]
    if (cur?.next) {
      const i = tutorialStepsRef.current.findIndex(s => s.id === cur.next)
      if (i >= 0) { navigateTutorial(i); return }
    }
    const next = idx + 1
    if (next >= tutorialStepsRef.current.length) finishTutorial()
    else navigateTutorial(next)
  }
  /** 이전 단계로 (히스토리 pop) */
  const prevTutorial = () => {
    const prev = tutorialHistoryRef.current.pop()
    if (prev !== undefined) setTutorialStep(prev)
  }
  /** 실제 행동(채용/대화)으로 진행되는 단계 — 현재 단계가 그 트리거를 기다릴 때만 전진 */
  const advanceTutorialOn = (trigger: TutorialStep['advanceOn']) => {
    const idx = tutorialStepRef.current
    if (idx === null) return
    if (tutorialStepsRef.current[idx]?.advanceOn === trigger) advanceTutorial()
  }
  /** 좌상단 🎓 버튼 — 튜토리얼 토글 (열기=처음부터 재시청 / 닫기=완료 처리) */
  /** 트랙 처음부터 시작 — 항상 재시청 모드. 빈 트랙은 무시 */
  const startTutorialTrack = (steps: TutorialStep[], track: 'main' | 'first-run' | 'shop' | 'settings' | 'memo') => {
    if (steps.length === 0) return
    tutorialStepsRef.current = steps
    tutorialTrackRef.current = track
    tutorialReplayRef.current = true
    tutorialHistoryRef.current = []
    setTutorialStep(0)
  }
  const toggleTutorial = () => {
    if (tutorialStep !== null) finishTutorial()
    else startTutorialTrack(FIRST_RUN_STEPS, 'first-run')
  }

  const handleHired = (employee: Employee) => {
    setEmployees(prev => [...prev, employee])
    // 튜토리얼이 채용 단계/폼 안내 중이면 대화 단계로 점프
    const idx = tutorialStepRef.current
    if (idx !== null && tutorialStepsRef.current[idx]?.id.startsWith('hire')) {
      tutorialHistoryRef.current = []
      const i = tutorialStepsRef.current.findIndex(s => s.id === 'chat')
      if (i >= 0) setTutorialStep(i)
    }
  }

  const handleUpdated = (employee: Employee) => {
    setEmployees(prev => prev.map(e => (e.id === employee.id ? employee : e)))
  }

  // Phase 3 — 진급 요청 이벤트 (ChatPopup/MemoModal이 카운터 증가 후 자격 도달 시 emit)
  useEffect(() => {
    const onPromotionRequest = (payload: unknown) => {
      const p = payload as { employee: Employee; toRank: Rank }
      // 이미 모달 떠있으면 무시 (한 번에 하나 — 다음 자격자는 승인 후 재스캔으로 이어짐)
      setPromotionReq(prev => prev ?? p)
    }
    eventBus.on('promotion:request', onPromotionRequest)
    return () => eventBus.off('promotion:request', onPromotionRequest)
  }, [])

  /** 자격자 1명을 찾아 진급 요청 모달 표시 (이미 떠있으면 유지).
   *  로드 시·배율 변경 시·승인 직후 호출. 시간형은 이벤트가 없어 이 스캔에 의존 (리뷰 B). */
  const scanForPromotion = (emps: Employee[], mult: number) => {
    const due = emps.find(e => checkPromotionEligible(e, mult))
    if (!due) return
    const toRank = checkPromotionEligible(due, mult)
    if (toRank) setPromotionReq(prev => prev ?? { employee: due, toRank })
  }

  // 진급 승인 — rank 상승 + 사무실 반영 + 축하 감정 + 다음 자격자로 자동 전환 (리뷰 C)
  const handlePromotionApprove = async () => {
    if (!promotionReq) return
    const { employee, toRank } = promotionReq
    const updated = await platform.updateEmployee(employee.id, { rank: toRank })
    let nextEmps = employeesRef.current
    if (updated) {
      nextEmps = employeesRef.current.map(e => (e.id === updated.id ? updated : e))
      setEmployees(nextEmps)
      eventBus.emit('office:set-employees', nextEmps)
      eventBus.emit('agent:set-emotion', { agentId: updated.id, emotion: 'happy', expireMs: 6000 })
    }
    // 다음 자격자 1명으로 전환 (방금 승인자는 rank가 올라 제외됨). 없으면 닫힘
    const mult = settingsRef.current.promotionSpeedMultiplier ?? 1
    const nextDue = nextEmps.find(e => checkPromotionEligible(e, mult))
    const nextToRank = nextDue ? checkPromotionEligible(nextDue, mult) : null
    setPromotionReq(nextDue && nextToRank ? { employee: nextDue, toRank: nextToRank } : null)
  }

  const handleFired = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id))
    // Close any chat popup for the fired employee
    eventBus.emit('chat:force-close', { agentId: id })
  }

  const handleSettingsSaved = (newSettings: Settings) => {
    setSettings(newSettings)
    eventBus.emit('office:settings', newSettings)
    // 배율 변경 시 시간형 진급은 이벤트가 없어 표면화 안 됨 → 즉시 재스캔 (리뷰 B)
    scanForPromotion(employeesRef.current, newSettings.promotionSpeedMultiplier ?? 1)
  }

  // 최초 튜토리얼(자동 연속) 활성 중 — 채용폼 잠금 + 자동 개폐 모달의 사용자 닫기 무시(zone 효과가 흐름 제어)
  const firstRunActive = tutorialStep !== null && tutorialTrackRef.current === 'first-run'

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-title">
          🏢 <strong>PixelAgentOffice</strong>{' '}
          <span className="topbar-sub">
            Floor 1 · Solo Office · 직원 {employees.length}/{maxEmployees}
          </span>
        </div>
        <div className="topbar-actions">
          <button
            className={`topbar-btn ${employees.length === 0 ? 'topbar-btn-pulse' : ''}`}
            onClick={() => setHireOpen(true)}
            disabled={employees.length >= maxEmployees}
            data-tutorial="hire"
            title={employees.length >= maxEmployees ? '최대 인원 도달' : '새 직원 채용'}
          >
            + 채용
          </button>
          <button
            className="topbar-btn"
            onClick={toggleTutorial}
            title={tutorialStep !== null ? '튜토리얼 닫기' : '튜토리얼 보기'}
          >
            🎓 튜토리얼
          </button>
          <button
            className="topbar-btn"
            onClick={() => setShopOpen(true)}
            title="상점 (가구·꾸미기)"
            data-tutorial="shop"
          >
            🛒 상점
          </button>
          <button
            className="topbar-btn"
            onClick={() => setSettingsOpen(true)}
            title="설정"
            data-tutorial="settings"
          >
            ⚙
          </button>
          <button
            className="topbar-btn"
            onClick={() => setTechOpen(true)}
            title="기술 스택 · 설계 — 무엇을 왜 이렇게 만들었는지"
          >
            ?
          </button>
        </div>
      </header>

      <main className="stage" data-tutorial="canvas">
        {loading && (
          <div className="loading-overlay">
            <div className="loading-text">사무실 준비 중...</div>
          </div>
        )}
        <PhaserGame />
        {/* 줌 토글 (B-5) — 캔버스 좌상단 floating */}
        <button
          className="zoom-toggle"
          data-tutorial="zoom"
          title={zoomedIn ? '줌 아웃 (전체)' : '줌 인 (1.4x)'}
          onClick={() => {
            setZoomedIn(prev => !prev)
            eventBus.emit('camera:zoom-toggle')
          }}
        >
          {zoomedIn ? '🔎−' : '🔎+'}
        </button>
        {/* 온보딩 안내 (C) — 직원 0명일 때 화면 중앙 가이드.
            Day 12 §3 — "또는 빈 자리 클릭" 안내 제거 (P0 #6에서 빈 자리 클릭 채용 기능도 이미 제거됨) */}
        {!loading && employees.length === 0 && tutorialStep === null && (
          <div className="onboarding-overlay">
            <div className="onboarding-box">
              <div className="onboarding-emoji">🏢</div>
              <div className="onboarding-title">사무실이 비어있어요</div>
              <div className="onboarding-sub">
                상단 <strong>+ 채용</strong> 버튼으로 첫 직원을 만나보세요
              </div>
            </div>
          </div>
        )}
      </main>

      <ChatPopup />

      {settingsOpen && (
        <SettingsModal
          onClose={() => {
            if (firstRunActive) return // 자동 연속 튜토리얼 중 — 닫기 무시(zone 효과가 다음 단계에서 닫음)
            setSettingsOpen(false)
            setSettingsFocusSection(undefined)
          }}
          initialSettings={settings}
          onSaved={handleSettingsSaved}
          focusSection={settingsFocusSection}
        />
      )}
      {hireOpen && (
        <HireModal
          onClose={() => setHireOpen(false)}
          existingEmployees={employees}
          maxCount={maxEmployees}
          defaultModel={settings.defaultModel}
          defaultMemoryModel={settings.defaultMemoryModel}
          onHired={handleHired}
          lockToTutorial={firstRunActive}
        />
      )}
      {memoEmployee && (
        <MemoModal
          key={memoEmployee.id}
          onClose={() => { if (firstRunActive) return; setMemoEmployee(null) }}
          employee={memoEmployee}
          settings={settings}
          onUpdated={handleUpdated}
          onFired={handleFired}
        />
      )}
      {shopOpen && <ShopModal onClose={() => { if (firstRunActive) return; setShopOpen(false) }} />}
      {promotionReq && (
        <PromotionModal
          employee={promotionReq.employee}
          toRank={promotionReq.toRank}
          multiplier={settings.promotionSpeedMultiplier ?? 1}
          onApprove={handlePromotionApprove}
          onDismiss={() => setPromotionReq(null)}
        />
      )}
      {techOpen && <TechModal onClose={() => setTechOpen(false)} />}

      {/* 팀 작업 모달 (2F Phase 4) — 팀장에게 팀 단위 작업 지시 */}
      {teamTask && (
        <TeamTaskModal
          leader={teamTask.leader}
          members={teamTask.members}
          onClose={() => setTeamTask(null)}
        />
      )}
      {/* API 키 미니 팝업 + 받는 법 안내 (Day 14) */}
      {apiKeyOpen && <ApiKeyModal onClose={() => setApiKeyOpen(false)} />}
      {apiKeyGuideOpen && <ApiKeyGuideModal onClose={() => setApiKeyGuideOpen(false)} />}
      {/* 튜토리얼 가이드 투어 (T1, Day 14) */}
      {tutorialStep !== null && !tutorialSuppressed && tutorialStepsRef.current[tutorialStep] && (
        <TutorialOverlay
          step={tutorialStepsRef.current[tutorialStep]}
          index={tutorialStep}
          total={tutorialStepsRef.current.length}
          onNext={advanceTutorial}
          onPrev={prevTutorial}
          canPrev={tutorialHistoryRef.current.length > 0}
          onSkip={finishTutorial}
          onApiKeyGuide={() => eventBus.emit('apikey:open-guide')}
          onApiKeyLater={() => goToTutorialStep('apikey-later')}
          replay={tutorialReplayRef.current}
        />
      )}
      {/* 캐릭터 우클릭 컨텍스트 메뉴 */}
      {employeeContextMenu && (
        <div
          className="employee-context-menu"
          style={{ position: 'fixed', left: employeeContextMenu.x, top: employeeContextMenu.y, zIndex: 1000 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="context-menu-title">
            {employeeContextMenu.employee.emoji} {employeeContextMenu.employee.name}
          </div>
          <button
            className="context-menu-item"
            onClick={() => {
              // 자리 이동 모드 시작 — Phaser에서 드래그앤드롭 시작
              eventBus.emit('seat:start-move', { employeeId: employeeContextMenu.employee.id })
              setEmployeeContextMenu(null)
            }}
          >
            🪑 자리 이동 (드래그)
          </button>
          <button
            className="context-menu-item"
            onClick={async () => {
              // 책상 회전 (B-4) — front → right → left → front 순환
              const current = employeeContextMenu.employee.deskOrientation
              const next: DeskOrientation =
                current === 'front' ? 'right' : current === 'right' ? 'left' : 'front'
              setEmployeeContextMenu(null)
              const updated = await platform.updateEmployee(
                employeeContextMenu.employee.id,
                { deskOrientation: next },
              )
              if (updated) eventBus.emit('employee:updated', updated)
            }}
          >
            🔄 책상 회전
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              eventBus.emit('chat:open', employeeContextMenu.employee)
              setEmployeeContextMenu(null)
            }}
          >
            💬 채팅 열기
          </button>
          {/* 팀 작업 (2F Phase 4) — 팀장(리더 자리 + 과장 이상, 팀원 보유)에게만 노출 */}
          {(() => {
            const members = leaderTeamMembers(employeeContextMenu.employee)
            if (!members) return null
            return (
              <button
                className="context-menu-item"
                onClick={() => {
                  setTeamTask({ leader: employeeContextMenu.employee, members })
                  setEmployeeContextMenu(null)
                }}
              >
                🤝 팀 작업 시키기
              </button>
            )
          })()}
          <button
            className="context-menu-item"
            onClick={() => {
              eventBus.emit('memo:open', { employeeId: employeeContextMenu.employee.id })
              setEmployeeContextMenu(null)
            }}
          >
            📝 메모지 열기
          </button>
        </div>
      )}

      {/* 팀 컨텍스트 메뉴 (Day 11) — 팻말 우클릭 시 */}
      {teamContextMenu && (
        <div
          className="employee-context-menu"
          style={{ position: 'fixed', left: teamContextMenu.x, top: teamContextMenu.y, zIndex: 1000 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="context-menu-header">
            🏷️ {teamContextMenu.currentName}
          </div>
          <button
            className="context-menu-item"
            onClick={() => openRenameModal(teamContextMenu.team, teamContextMenu.currentName)}
          >
            ✏️ 이름 수정
          </button>
        </div>
      )}

      {/* 가구 컨텍스트 메뉴 (Day 11 후속 +2) — 가구 우클릭 시 */}
      {furnitureContextMenu && (
        <div
          className="employee-context-menu"
          style={{ position: 'fixed', left: furnitureContextMenu.x, top: furnitureContextMenu.y, zIndex: 1000 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="context-menu-header">
            🪑 가구 옵션
          </div>
          <button
            className="context-menu-item"
            onClick={() => {
              // 옮기기 모드 진입 — placement mode 재진입 (moveUid 전달)
              eventBus.emit('furniture:start-placement', {
                itemId: furnitureContextMenu.itemId,
                moveUid: furnitureContextMenu.uid,
              })
              setFurnitureContextMenu(null)
            }}
          >
            🚚 옮기기
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              eventBus.emit('furniture:removed', { uid: furnitureContextMenu.uid })
              setFurnitureContextMenu(null)
            }}
          >
            🗑 이 가구 삭제
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              if (window.confirm('사무실의 모든 가구를 삭제하시겠습니까?')) {
                eventBus.emit('furniture:clear-all', null)
              }
              setFurnitureContextMenu(null)
            }}
            style={{ color: '#c83838' }}
          >
            🧹 전체 가구 삭제
          </button>
        </div>
      )}

      {/* 팀 이름 수정 모달 (Day 11) — Electron window.prompt 대체 */}
      {teamRenameModal && (
        <div
          className="modal-backdrop"
          onClick={() => setTeamRenameModal(null)}
        >
          <div
            className="modal"
            style={{ maxWidth: 360 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>✏️ 팀 이름 수정</h2>
              <button onClick={() => setTeamRenameModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 8 }}>현재: <strong>{teamRenameModal.currentName}</strong></p>
              <input
                type="text"
                value={teamRenameModal.inputValue}
                onChange={e =>
                  setTeamRenameModal(prev => prev ? { ...prev, inputValue: e.target.value } : null)
                }
                onKeyDown={e => {
                  if (e.key === 'Enter') submitRename()
                  if (e.key === 'Escape') setTeamRenameModal(null)
                }}
                autoFocus
                style={{ width: '100%', padding: 8, fontSize: 14 }}
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setTeamRenameModal(null)}>취소</button>
              <button className="primary" onClick={submitRename}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 빈 자리 hover hint 제거 (Day 11) — 사용자 피드백 "거슬려, 그냥 툴팁" */}

      {/* 명함 hover 카드 (A) — Day 11 후속 +2: 일단 주석 (나중에 다른 위치 결정).
          state·렌더링 모두 보존하되 UI에서 안 보임. */}
      {/*
      {hoverCard && (
        <div
          className="employee-hover-card"
          style={{
            left: hoverCard.x + 20,
            top: hoverCard.y + 20,
          }}
        >
          <div className="hover-card-name">
            {hoverCard.employee.emoji} {hoverCard.employee.name}
          </div>
          <div className="hover-card-row">
            <span className="hover-card-label">직급</span>
            <span>
              {hoverCard.employee.seatId?.startsWith('leader:') ? '⭐ ' : ''}
              {hoverCard.employee.rank}
            </span>
          </div>
          <div className="hover-card-row">
            <span className="hover-card-label">역할</span>
            <span>{hoverCard.employee.role}</span>
          </div>
          <div className="hover-card-row">
            <span className="hover-card-label">모델</span>
            <span>{MODEL_INFO[hoverCard.employee.model]?.label ?? hoverCard.employee.model}</span>
          </div>
        </div>
      )}
      */}

      <footer className="statusbar">
        <span className="status-build">● M5 Build</span>
        <span className="status-sep">·</span>
        <span title="현재 직원 수 / 최대 인원">
          👥 {employees.length} / {maxEmployees}
        </span>
        <span className="status-sep">·</span>
        <span title="현재 사무실 시간대">
          🕐 {timeOfDay?.label ?? '...'}
          {timeOfDay?.forcedNight && ' (한도 도달)'}
        </span>
        <span className="status-sep">·</span>
        <span className="status-hint" title="기능 안내">
          💬 말풍선 = 채팅 · 📝 메모 = 설정
        </span>
        <span className="status-spacer"></span>
        <span
          className={`status-cost ${usageSummary?.color ?? 'green'}`}
          title="이번 세션 누적 비용 / 일일 한도"
          onClick={() => {
            setSettingsFocusSection('usage-detail')
            setSettingsOpen(true)
          }}
        >
          💰 ${(usageSummary?.totalCost ?? 0).toFixed(4)} / ${(usageSummary?.limit ?? settings.dailyLimitUsd).toFixed(2)}
        </span>
      </footer>
    </div>
  )
}

export default App
