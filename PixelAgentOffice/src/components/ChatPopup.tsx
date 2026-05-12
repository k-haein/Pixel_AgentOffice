import { useEffect, useRef, useState } from 'react'
import { eventBus, type Agent } from '../game/eventBus'

type Message = {
  id: string
  role: 'user' | 'agent' | 'system'
  text: string
}

const MOCK_RESPONSES = [
  '읽어볼게요. 핵심 메시지는 살리되 문장이 너무 길어요. 짧고 또렷하게 다듬은 버전을 만들어봤어요.',
  '좋은 방향이에요. 이 표현은 비유를 살짝 줄이면 더 명확해질 것 같아요.',
  '음, 흥미로운 시도네요. 다만 톤이 조금 들떠 보이니 한 호흡 가라앉히면 어떨까요?',
  '이대로 가도 충분히 좋습니다. ✨',
  '문장 하나하나가 살아있어요. 단락 사이만 여백을 더 두면 가독성이 올라가요.',
]

export function ChatPopup() {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isAgentTyping, setIsAgentTyping] = useState(false)
  const msgsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onOpen = (a: Agent) => {
      setAgent(a)
      setMessages([
        {
          id: 'sys-1',
          role: 'system',
          text: `${a.emoji}  ${a.name} (${a.role})와의 대화가 시작되었습니다.`,
        },
      ])
      setInput('')
    }
    eventBus.on('chat:open', onOpen)
    return () => eventBus.off('chat:open', onOpen)
  }, [])

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAgentTyping])

  if (!agent) return null

  const close = () => {
    setAgent(null)
    eventBus.emit('agent:set-state', { agentId: agent.id, state: 'idle' })
  }

  const send = () => {
    const text = input.trim()
    if (!text) return
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsAgentTyping(true)
    eventBus.emit('agent:set-state', { agentId: agent.id, state: 'working' })

    // Mock response after 1.2 ~ 1.8s
    const delay = 1200 + Math.random() * 600
    setTimeout(() => {
      const reply: Message = {
        id: `a-${Date.now()}`,
        role: 'agent',
        text: MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)],
      }
      setMessages(prev => [...prev, reply])
      setIsAgentTyping(false)
      eventBus.emit('agent:set-state', { agentId: agent.id, state: 'working' }) // keep working in demo
    }, delay)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="chat-popup">
      <div className="chat-header">
        <div className="chat-avatar">{agent.emoji}</div>
        <div className="chat-title">
          <div className="chat-name">{agent.name}</div>
          <div className="chat-role">{agent.role}</div>
        </div>
        <div className="chat-status">● 일하는 중</div>
        <button className="chat-close" onClick={close} aria-label="닫기">
          ×
        </button>
      </div>

      <div className="chat-msgs">
        {messages.map(m => (
          <div key={m.id} className={`msg msg-${m.role}`}>
            {m.role === 'system' ? (
              <div className="msg-system">{m.text}</div>
            ) : (
              <div className="msg-bubble">{m.text}</div>
            )}
          </div>
        ))}
        {isAgentTyping && (
          <div className="msg msg-agent">
            <div className="msg-bubble msg-typing">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}
        <div ref={msgsEndRef} />
      </div>

      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="명령을 입력하세요... (Enter로 전송)"
        />
        <button className="chat-send" onClick={send} disabled={!input.trim()}>
          전송
        </button>
      </div>

      <div className="chat-footer">
        💡 데모 모드 — 실제 LLM 연결은 Phase 1.4에서 (현재는 임의 응답)
      </div>
    </div>
  )
}
