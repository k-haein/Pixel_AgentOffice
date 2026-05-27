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
  const [hireOpen, setHireOpen] = useState(false)
  const [memoEmployee, setMemoEmployee] = useState<Employee | null>(null)

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
          onClose={() => setSettingsOpen(false)}
          initialSettings={settings}
          onSaved={handleSettingsSaved}
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

      <footer className="statusbar">
        <span>● M2 Build · UI 채널 완성</span>
        <span className="status-spacer"></span>
        <span>다음: M3-a (Claude API 연결)</span>
      </footer>
    </div>
  )
}

export default App
