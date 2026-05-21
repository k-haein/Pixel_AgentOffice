import { useEffect, useRef, useState } from 'react'
import { PhaserGame } from './game/PhaserGame'
import { ChatPopup } from './components/ChatPopup'
import { SettingsModal } from './components/SettingsModal'
import { HireModal } from './components/HireModal'
import { MemoModal } from './components/MemoModal'
import { ShopModal } from './components/ShopModal'
import { eventBus } from './game/eventBus'
import { platform } from './platform'
import type { Employee, Settings, DeskOrientation } from './shared/types'
import { DEFAULT_SETTINGS, DEFAULT_MAX_EMPLOYEES } from './shared/types'
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
  // 채용 모달 열고 닫을 때 빈 자리 visibility 동기 (Day 11+ — C)
  useEffect(() => {
    eventBus.emit('office:hire-mode', hireOpen)
  }, [hireOpen])
  const [shopOpen, setShopOpen] = useState(false)
  const [memoEmployee, setMemoEmployee] = useState<Employee | null>(null)
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
        eventBus.emit('office:set-employees', data.employees)
        eventBus.emit('office:settings', data.settings)
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
        setSettingsOpen(false)
        setHireOpen(false)
        setMemoEmployee(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 다른 컴포넌트에서 우클릭으로 설정 → 특정 섹션 점프하면서 열기
  useEffect(() => {
    const onSettingsOpen = (payload: unknown) => {
      const section = (payload as { section?: string } | undefined)?.section
      setSettingsFocusSection(section)
      setSettingsOpen(true)
    }
    eventBus.on('settings:open', onSettingsOpen)
    return () => eventBus.off('settings:open', onSettingsOpen)
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
    eventBus.on('furniture:placed', onFurniturePlaced)
    eventBus.on('furniture:moved', onFurnitureMoved)
    eventBus.on('furniture:removed', onFurnitureRemoved)
    return () => {
      eventBus.off('furniture:placed', onFurniturePlaced)
      eventBus.off('furniture:moved', onFurnitureMoved)
      eventBus.off('furniture:removed', onFurnitureRemoved)
    }
  }, [])

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

  const handleHired = (employee: Employee) => {
    setEmployees(prev => [...prev, employee])
  }

  const handleUpdated = (employee: Employee) => {
    setEmployees(prev => prev.map(e => (e.id === employee.id ? employee : e)))
  }

  const handleFired = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id))
    // Close any chat popup for the fired employee
    eventBus.emit('chat:force-close', { agentId: id })
  }

  const handleSettingsSaved = (newSettings: Settings) => {
    setSettings(newSettings)
    eventBus.emit('office:settings', newSettings)
  }

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
            className="topbar-btn"
            onClick={() => setHireOpen(true)}
            disabled={employees.length >= maxEmployees}
            title={employees.length >= maxEmployees ? '최대 인원 도달' : '새 직원 채용'}
          >
            + 채용
          </button>
          <button
            className="topbar-btn"
            onClick={() => setShopOpen(true)}
            title="상점 (가구·꾸미기)"
          >
            🛍 상점
          </button>
          <button
            className="topbar-btn"
            onClick={() => setSettingsOpen(true)}
            title="설정"
          >
            ⚙
          </button>
        </div>
      </header>

      <main className="stage">
        {loading && (
          <div className="loading-overlay">
            <div className="loading-text">사무실 준비 중...</div>
          </div>
        )}
        <PhaserGame />
        {/* 줌 토글 (B-5) — 캔버스 좌상단 floating */}
        <button
          className="zoom-toggle"
          title={zoomedIn ? '줌 아웃 (전체)' : '줌 인 (1.4x)'}
          onClick={() => {
            setZoomedIn(prev => !prev)
            eventBus.emit('camera:zoom-toggle')
          }}
        >
          {zoomedIn ? '🔎−' : '🔎+'}
        </button>
        {/* 온보딩 안내 (C) — 직원 0명일 때 화면 중앙 가이드 */}
        {!loading && employees.length === 0 && (
          <div className="onboarding-overlay">
            <div className="onboarding-box">
              <div className="onboarding-emoji">🏢</div>
              <div className="onboarding-title">사무실이 비어있어요</div>
              <div className="onboarding-sub">
                상단 <strong>+ 채용</strong> 버튼으로 첫 직원을 만나보세요
              </div>
              <div className="onboarding-hint">또는 사무실의 빈 자리를 클릭</div>
            </div>
          </div>
        )}
      </main>

      <ChatPopup />

      {settingsOpen && (
        <SettingsModal
          onClose={() => {
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
        />
      )}
      {memoEmployee && (
        <MemoModal
          key={memoEmployee.id}
          onClose={() => setMemoEmployee(null)}
          employee={memoEmployee}
          onUpdated={handleUpdated}
          onFired={handleFired}
        />
      )}
      {shopOpen && <ShopModal onClose={() => setShopOpen(false)} />}
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
