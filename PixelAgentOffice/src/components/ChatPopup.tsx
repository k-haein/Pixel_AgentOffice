import { useEffect, useRef, useState } from 'react'
import { eventBus } from '../game/eventBus'
import type { Employee } from '../shared/types'

type Message = {
  id: string
  role: 'user' | 'agent' | 'system'
  text: string
}

/** Employee → 시스템 프롬프트 조립 (기본 지침 + 커스텀 지침) */
function buildSystemPrompt(employee: Employee): string {
  let prompt = employee.baseInstructions.trim()
  if (employee.customInstructions.trim()) {
    prompt += '\n\n## 추가 규칙\n' + employee.customInstructions.trim()
  }
  // 메모리는 M4에서 추가 예정
  return prompt
}

export function ChatPopup() {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isAgentTyping, setIsAgentTyping] = useState(false)
  const msgsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onOpen = (payload: unknown) => {
      const e = payload as Employee
      setEmployee(e)
      setMessages([
        {
          id: 'sys-1',
          role: 'system',
          text: `${e.emoji}  ${e.name} (${e.role})와의 대화가 시작되었습니다.`,
        },
      ])
      setInput('')
    }
    const onForceClose = (payload: unknown) => {
      const { agentId } = payload as { agentId: string }
      setEmployee(prev => (prev?.id === agentId ? null : prev))
    }
    eventBus.on('chat:open', onOpen)
    eventBus.on('chat:force-close', onForceClose)
    return () => {
      eventBus.off('chat:open', onOpen)
      eventBus.off('chat:force-close', onForceClose)
    }
  }, [])

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAgentTyping])

  if (!employee) return null

  const close = () => {
    setEmployee(null)
    eventBus.emit('agent:set-state', { agentId: employee.id, state: 'idle' })
  }

  const send = async () => {
    const text = input.trim()
    if (!text || isAgentTyping) return

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
    }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setIsAgentTyping(true)
    eventBus.emit('agent:set-state', { agentId: employee.id, state: 'working' })

    // 시스템 메시지 제외, user/assistant만 API로
    const apiMessages = nextMessages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: (m.role === 'agent' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.text,
      }))

    try {
      const result = await window.api.chatWithLLM({
        model: employee.model,
        systemPrompt: buildSystemPrompt(employee),
        messages: apiMessages,
      })

      if (result.ok) {
        const reply: Message = {
          id: `a-${Date.now()}`,
          role: 'agent',
          text: result.response.text,
        }
        setMessages(prev => [...prev, reply])
      } else {
        const providerLabel = result.error.provider === 'google' ? 'Google (Gemini)' : 'Anthropic (Claude)'
        let friendly = result.error.message
        if (result.error.code === 'NO_API_KEY') {
          friendly = `⚠️ ${providerLabel} API 키가 없습니다. 상단 ⚙️ 설정에서 입력해주세요.`
        } else if (result.error.code === 'INVALID_KEY') {
          friendly = `⚠️ ${providerLabel} API 키가 유효하지 않습니다.`
        } else if (result.error.code === 'NETWORK') {
          friendly = `⚠️ ${result.error.message}`
        } else if (result.error.code === 'RATE_LIMIT') {
          if (employee.model === 'gemini-2-5-pro') {
            friendly = '⚠️ Gemini 2.5 Pro는 무료 한도가 매우 작아요 (분당 5회). 📝 메모지 → 모델을 \'Gemini 2.0 Flash\'로 바꿔보세요 (한도 큼).'
          } else if (employee.model.startsWith('gemini')) {
            friendly = '⚠️ Gemini 한도 초과. 1분 후 다시 시도하거나 더 한도 큰 모델 (2.0 Flash) 시도해보세요.'
          } else {
            friendly = `⚠️ ${providerLabel} 한도 초과. 잠시 후 다시 시도해주세요.`
          }
        } else {
          friendly = `⚠️ ${result.error.message}`
        }
        setMessages(prev => [
          ...prev,
          { id: `sys-${Date.now()}`, role: 'system', text: friendly },
        ])
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: 'system',
          text: `⚠️ 알 수 없는 오류: ${(err as Error).message}`,
        },
      ])
    } finally {
      setIsAgentTyping(false)
      eventBus.emit('agent:set-state', { agentId: employee.id, state: 'idle' })
    }
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
        <div className="chat-avatar">{employee.emoji}</div>
        <div className="chat-title">
          <div className="chat-name">{employee.name}</div>
          <div className="chat-role">
            {employee.role} · 🧠 {employee.model.replace('claude-', '').replace('-4-7', '')}
          </div>
        </div>
        <div className="chat-status">{isAgentTyping ? '● 작업 중' : '● 대기'}</div>
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
          placeholder={isAgentTyping ? '응답 대기 중...' : '명령을 입력하세요... (Enter)'}
          disabled={isAgentTyping}
        />
        <button className="chat-send" onClick={send} disabled={!input.trim() || isAgentTyping}>
          {isAgentTyping ? '...' : '전송'}
        </button>
      </div>

      <div className="chat-footer">
        💬 실제 LLM과 대화 중 · {employee.model.startsWith('gemini') ? '🆓 무료' : '💸 토큰 비용 발생'}
      </div>
    </div>
  )
}
