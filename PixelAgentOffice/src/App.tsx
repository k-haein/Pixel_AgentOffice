import { useEffect, useRef, useState } from 'react'
import { PhaserGame } from './game/PhaserGame'
import { ChatPopup } from './components/ChatPopup'
import { SettingsModal } from './components/SettingsModal'
import { HireModal } from './components/HireModal'
import { MemoModal } from './components/MemoModal'
import { eventBus } from './game/eventBus'
import type { Employee, Settings } from './shared/types'
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
  const [memoEmployee, setMemoEmployee] = useState<Employee | null>(null)
  /** 캐릭터 우클릭 시 띄울 컨텍스트 메뉴 위치/대상 */
  const [employeeContextMenu, setEmployeeContextMenu] = useState<{ x: number; y: number; employee: Employee } | null>(null)

  // Stable ref to current employees (for handlers that won't see state updates)
  const employeesRef = useRef<Employee[]>([])
  useEffect(() => {
    employeesRef.current = employees
  }, [employees])

  // Load data from main process
  useEffect(() => {
    let mounted = true

    // Wait for scene ready signal — re-push current data
    const onReady = () => {
      eventBus.emit('office:set-employees', employeesRef.current)
    }
    eventBus.on('office:ready', onReady)

    ;(async () => {
      try {
        const data = await window.api.loadData()
        if (!mounted) return
        setEmployees(data.employees)
        setMaxEmployees(data.maxEmployees)
        setSettings(data.settings)
        setLoading(false)
        eventBus.emit('office:set-employees', data.employees)
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
        const data = await window.api.loadData()
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

      <footer className="statusbar">
        <span>● M2 Build · UI 채널 완성</span>
        <span className="status-spacer"></span>
        <span>다음: M3-a (Claude API 연결)</span>
      </footer>
    </div>
  )
}

export default App
