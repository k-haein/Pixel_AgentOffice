import { PhaserGame } from './game/PhaserGame'
import { ChatPopup } from './components/ChatPopup'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-title">
          🏢 <strong>PixelAgentOffice</strong>{' '}
          <span className="topbar-sub">Floor 1 · Solo Office</span>
        </div>
        <div className="topbar-actions">
          <button className="topbar-btn" title="채용 (Phase 1.2)" disabled>
            + 채용
          </button>
          <button className="topbar-btn" title="설정 (Phase 1.4)" disabled>
            ⚙
          </button>
        </div>
      </header>

      <main className="stage">
        <PhaserGame />
      </main>

      <ChatPopup />

      <footer className="statusbar">
        <span>● M1 Demo Build</span>
        <span className="status-spacer"></span>
        <span>토큰 보드 · 권한 UI · 진짜 LLM은 다음 마일스톤</span>
      </footer>
    </div>
  )
}

export default App
