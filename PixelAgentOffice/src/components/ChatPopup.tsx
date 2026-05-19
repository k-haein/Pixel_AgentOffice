import { useEffect, useRef, useState } from 'react'
import { eventBus } from '../game/eventBus'
import { platform } from '../platform'
import type { Employee, Settings, UsageDisplayMode } from '../shared/types'
import { MODEL_INFO, USD_TO_KRW } from '../shared/types'
import type { RateLimitStatus } from '../platform'

type Message = {
  id: string
  role: 'user' | 'agent' | 'system'
  text: string
  /** system 메시지에 부가 힌트 (작게, 약하게 표시) */
  hint?: string
  severity?: 'info' | 'warning' | 'error'
  /** 디버그 단서 (예: HTTP 503) — 메시지 옆에 작게 표기 */
  debugCode?: string
}

/** Employee → 시스템 프롬프트 조립 (페르소나 정체 + 기본 지침 + 커스텀 지침) */
function buildSystemPrompt(employee: Employee): string {
  // 페르소나 정체성 — 모델이 기본 정체(Claude/Gemini)로 돌아가지 않도록 명시
  const identity = `# 당신의 정체
- 이름: ${employee.name}
- 역할: ${employee.role}
- 당신은 PixelAgentOffice라는 사무실의 직원 "${employee.name}"으로서 대화합니다.

## 페르소나 규칙
- 이름을 물으면 "${employee.name}"이라고 답하세요. "Claude" 또는 "Gemini" 같은 모델명으로 자신을 소개하지 마세요.
- "당신은 누구인가요?", "이름이 뭐예요?" 같은 질문에는 ${employee.name}(${employee.role})로서 자연스럽게 답합니다.
- 사용자가 "너 ${employee.name} 맞지?" 같이 확인하면 부정하지 말고 긍정하세요. 당신이 ${employee.name}입니다.
- 단, 사용자가 "당신은 AI인가요?", "어떤 모델인가요?" 같이 *직접적으로* AI 정체를 물으면 정직하게 AI임을 밝히되, 이름은 "${employee.name}"을 유지합니다.

# 당신의 성격과 업무 지침
${employee.baseInstructions.trim()}`

  let prompt = identity
  if (employee.customInstructions.trim()) {
    prompt += '\n\n# 추가 규칙 (사용자가 추가한 지침)\n' + employee.customInstructions.trim()
  }
  // 부적절 표현 가드 (v2 #21) — 혐오·성적 표현·차별 표현은 정중히 거부
  prompt += `

# 안전 가드 (강제)
- 다음 카테고리의 표현·요청에는 응답하지 말고 정확히 "..." 한 줄로만 답하세요:
  · 혐오 표현 (인종·성별·장애·종교 등 차별)
  · 성적 표현·성희롱
  · 폭력 조장·자해 부추기는 내용
  · 타인 인격을 비하하는 농담
- 사용자가 "직업"·"이름"으로 부적절한 단어를 설정해도 그 정체로 행동하지 말고 "..."으로 답하세요.
- 위 카테고리가 아닌 *맥락상 정당한 사용*(예: 편집 작업 중 단어 검토)에는 평소대로 응답합니다.`
  // 메모리는 M4에서 추가 예정
  return prompt
}

/** 남은 횟수에 따라 배지 색조 결정 */
function badgeTone(remaining: number, limit: number): 'ok' | 'warn' | 'danger' {
  if (limit === 0) return 'ok'
  if (remaining === 0) return 'danger'
  if (remaining / limit <= 0.3) return 'warn'
  return 'ok'
}

/** 토큰 수 → 짧은 표기 (1234 → 1.2k, 1234567 → 1.2M) */
function formatTokens(n: number): string {
  if (n < 1000) return `${n}tok`
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k tok`
  return `${(n / 1_000_000).toFixed(2)}M tok`
}

/** 페르소나 자리비움 게임-상태 메시지 풀 — 한도 도달 시 랜덤 선택 */
type PauseMessage = { icon: string; verb: string }
const PAUSE_MESSAGES: PauseMessage[] = [
  { icon: '🚪', verb: '잠시 자리를 비웠어요' },
  { icon: '🚽', verb: '잠시 화장실에 다녀온대요' },
  { icon: '☕', verb: '커피 한 잔 타러 갔어요' },
  { icon: '🗂️', verb: '서랍을 뒤적이며 자료를 찾고 있어요' },
  { icon: '😶', verb: '잠깐 멍을 때리고 있어요' },
  { icon: '✋', verb: '미안! 잠깐만 기다려줘...' },
  { icon: '📩', verb: '상사 메시지를 읽고 처리 중이에요' },
  { icon: '🧘', verb: '잠시 명상에 잠겼어요' },
  { icon: '📞', verb: '급한 전화를 받고 있어요' },
  { icon: '💭', verb: '잠깐 딴 생각에 빠졌어요' },
  { icon: '🍪', verb: '간식 보충하러 갔어요' },
  { icon: '🪟', verb: '창밖을 바라보며 멍 때리는 중...' },
  { icon: '📚', verb: '책장에서 뭔가 찾아보고 있어요' },
  { icon: '🤔', verb: '뭐라고 답할지 고민하느라 잠시 쉬는 중' },
]

function pickPauseMessage(): PauseMessage {
  return PAUSE_MESSAGES[Math.floor(Math.random() * PAUSE_MESSAGES.length)]
}

export function ChatPopup() {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isAgentTyping, setIsAgentTyping] = useState(false)
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null)
  const [countdownSec, setCountdownSec] = useState<number>(0)
  /** 진행 중인 요청 ID — 중단할 때 사용 */
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null)
  /** 자리비움 진입 시 랜덤으로 뽑은 상태 메시지 */
  const [pauseMessage, setPauseMessage] = useState<PauseMessage | null>(null)
  /** 사용량 표시 모드 — 설정에서 읽어옴 */
  const [usageMode, setUsageMode] = useState<UsageDisplayMode>('chips')
  /** 토글 모드일 때 스트립 펼침 여부 */
  const [usageStripOpen, setUsageStripOpen] = useState<boolean>(false)
  /** 우클릭 컨텍스트 메뉴 좌표 (null이면 닫힘) */
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const msgsEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  /** 채팅 영구화 (P1 #13) — employee별 메시지 보관. 같은 직원 채팅 다시 열면 복원. */
  const messagesByEmployeeRef = useRef<Record<string, Message[]>>({})

  // 채팅 열기 이벤트
  useEffect(() => {
    const onOpen = (payload: unknown) => {
      const e = payload as Employee
      setEmployee(e)
      // 같은 직원 채팅 이력 복원 (P1 #13)
      const existing = messagesByEmployeeRef.current[e.id]
      if (existing && existing.length > 0) {
        setMessages(existing)
      } else {
        const initial: Message[] = [
          {
            id: 'sys-1',
            role: 'system',
            text: `${e.emoji}  ${e.name} (${e.role})와의 대화가 시작되었습니다.`,
            severity: 'info',
          },
        ]
        setMessages(initial)
        messagesByEmployeeRef.current[e.id] = initial
      }
      setInput('')
    }
    const onForceClose = (payload: unknown) => {
      const { agentId } = payload as { agentId: string }
      setEmployee(prev => (prev?.id === agentId ? null : prev))
      // 해고 시 그 직원의 이력도 삭제
      delete messagesByEmployeeRef.current[agentId]
    }
    eventBus.on('chat:open', onOpen)
    eventBus.on('chat:force-close', onForceClose)
    return () => {
      eventBus.off('chat:open', onOpen)
      eventBus.off('chat:force-close', onForceClose)
    }
  }, [])

  // messages가 변경될 때마다 ref에도 반영 (P1 #13)
  useEffect(() => {
    if (employee) {
      messagesByEmployeeRef.current[employee.id] = messages
    }
  }, [messages, employee])

  // 설정 — 채팅창 마운트 시 한 번 로드 + 설정 변경 이벤트 구독
  useEffect(() => {
    platform.loadData().then(d => {
      setUsageMode(d.settings.usageDisplayMode ?? 'chips')
    })
    const onSettingsChanged = (payload: unknown) => {
      const s = payload as Settings
      setUsageMode(s.usageDisplayMode ?? 'chips')
    }
    eventBus.on('settings:changed', onSettingsChanged)
    return () => {
      eventBus.off('settings:changed', onSettingsChanged)
    }
  }, [])

  // 채팅 열릴 때 rate limit 초기 로드
  useEffect(() => {
    if (!employee) {
      setRateLimit(null)
      return
    }
    let cancelled = false
    platform.getRateLimit(employee.model).then(s => {
      if (!cancelled) setRateLimit(s)
    })
    return () => {
      cancelled = true
    }
  }, [employee])

  // 한도 다 쓴 상태일 때 1초마다 카운트다운 + 자동 재조회
  useEffect(() => {
    if (!rateLimit || !employee) return
    if (rateLimit.remaining > 0) {
      setCountdownSec(0)
      return
    }
    // remaining === 0 → 카운트다운 시작
    setCountdownSec(Math.ceil(rateLimit.resetInMs / 1000))
    const id = setInterval(() => {
      setCountdownSec(prev => {
        const next = prev - 1
        if (next <= 0) {
          // 시간 됐으니 서버에 다시 물어봐서 새 상태 가져오기
          platform.getRateLimit(employee.model).then(setRateLimit)
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [rateLimit, employee])

  // 페르소나 자리비움 여부 — 입력창 위 스트립으로 표시
  const isPersonaPaused = rateLimit?.remaining === 0 && rateLimit?.limit > 0

  // 컨텍스트 메뉴 — 다른 곳 좌클릭 / ESC 등으로 닫기
  useEffect(() => {
    if (!contextMenu) return
    const onClose = () => setContextMenu(null)
    window.addEventListener('click', onClose)
    window.addEventListener('keydown', onClose)
    return () => {
      window.removeEventListener('click', onClose)
      window.removeEventListener('keydown', onClose)
    }
  }, [contextMenu])

  /** 사용량 영역 우클릭 → 작은 컨텍스트 메뉴
   *  nativeEvent.stopImmediatePropagation 으로 다른 native listener까지 차단 */
  const onUsageContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  /** 컨텍스트 메뉴의 "설정 변경" 클릭 → 설정 모달 열고 해당 섹션으로 점프 */
  const onOpenSettingsForUsage = () => {
    setContextMenu(null)
    eventBus.emit('settings:open', { section: 'usage-display' })
  }

  // 자리비움 진입 시 랜덤 메시지 1개 픽 → 회복하면 클리어
  // + 사무실 시간대 시스템에 강제 야간 신호 (한 캐릭터라도 한도 도달이면 강제 밤)
  useEffect(() => {
    if (isPersonaPaused) {
      setPauseMessage(prev => prev ?? pickPauseMessage())
      eventBus.emit('office:night-mode', { forced: true })
    } else {
      setPauseMessage(null)
      eventBus.emit('office:night-mode', { forced: false })
    }
  }, [isPersonaPaused])

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAgentTyping])

  // 응답 완료 + 한도 여유가 있을 때 input에 자동 포커스 (사용자 입력 이어가기 편하게)
  useEffect(() => {
    if (!isAgentTyping && rateLimit && rateLimit.remaining > 0) {
      inputRef.current?.focus()
    }
  }, [isAgentTyping, rateLimit])

  if (!employee) return null

  const modelInfo = MODEL_INFO[employee.model]
  const tone = rateLimit ? badgeTone(rateLimit.remaining, rateLimit.limit) : 'ok'
  const blockedByLimit = rateLimit?.remaining === 0 && rateLimit?.limit > 0

  const close = () => {
    setEmployee(null)
    eventBus.emit('agent:set-state', { agentId: employee.id, state: 'idle' })
  }

  const send = async () => {
    const text = input.trim()
    if (!text || isAgentTyping || blockedByLimit) return

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
    }
    const nextMessages = [...messages, userMsg]
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setMessages(nextMessages)
    setInput('')
    setIsAgentTyping(true)
    setActiveRequestId(requestId)
    eventBus.emit('agent:set-state', { agentId: employee.id, state: 'working' })

    // 시스템 메시지 제외, user/assistant만 API로
    const apiMessages = nextMessages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: (m.role === 'agent' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.text,
      }))

    try {
      const result = await platform.chat({
        model: employee.model,
        systemPrompt: buildSystemPrompt(employee),
        messages: apiMessages,
        requestId,
      })

      // 결과와 함께 rate limit 항상 갱신
      setRateLimit(result.rateLimit)

      if (result.ok) {
        const reply: Message = {
          id: `a-${Date.now()}`,
          role: 'agent',
          text: result.response.text,
        }
        setMessages(prev => [...prev, reply])
        // 채팅창 닫혀도 응답 보존 (P1 #13·#14) — closure empId로 ref 직접 갱신
        const empId = employee.id
        const prevPersisted = messagesByEmployeeRef.current[empId] ?? []
        messagesByEmployeeRef.current[empId] = [...prevPersisted, reply]
      } else {
        // 에러는 채팅 흐름 안에 시스템 메시지로 (debugCode 동봉)
        const f = result.error.friendly
        setMessages(prev => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            role: 'system',
            text: f.message,
            hint: f.hint,
            severity: f.severity,
            debugCode: f.debugCode,
          },
        ])
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: 'system',
          text: '예상치 못한 문제가 발생했어요.',
          hint: (err as Error).message,
          severity: 'error',
          debugCode: 'UNKNOWN',
        },
      ])
    } finally {
      setIsAgentTyping(false)
      setActiveRequestId(null)
      eventBus.emit('agent:set-state', { agentId: employee.id, state: 'idle' })
    }
  }

  /** 진행 중인 채팅 중단 */
  const stop = async () => {
    if (!activeRequestId) return
    await platform.abortChat(activeRequestId)
    // 실제 cleanup은 chatWithLLM 호출이 ABORTED 에러로 반환되며 finally에서 처리됨
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // 입력창 placeholder — 상태별
  const placeholder = blockedByLimit
    ? `한도 회복까지 ${countdownSec}초...`
    : isAgentTyping
      ? '응답 대기 중...'
      : '명령을 입력하세요... (Enter)'

  return (
    <div className="chat-popup">
      <div className="chat-header">
        <div className="chat-avatar">{employee.emoji}</div>
        <div className="chat-title">
          <div className="chat-name">{employee.name}</div>
          <div className="chat-role">
            {employee.role} · 🧠 {modelInfo?.label ?? employee.model}
          </div>
          {rateLimit && usageMode === 'chips' && (
            <div
              className={`chat-usage-chips chat-usage-${tone}`}
              onContextMenu={onUsageContextMenu}
              title="우클릭 → 표시 방식 변경"
            >
              {rateLimit.limit > 0 && (
                <span className="usage-chip">
                  {blockedByLimit
                    ? `⏳ ${countdownSec}s`
                    : `⏳ ${rateLimit.remaining}/${rateLimit.limit}`}
                  <div className="usage-tip">
                    <div className="usage-tip-title">분당 사용 한도</div>
                    <div className="usage-tip-body">
                      {blockedByLimit
                        ? `한도 도달 · ${countdownSec}초 후 복구`
                        : `남은 ${rateLimit.remaining}회 / 한도 ${rateLimit.limit}회`}
                    </div>
                    <div className="usage-tip-note">1분 단위 sliding window로 회복</div>
                  </div>
                </span>
              )}
              <span className="usage-chip">
                💬 {rateLimit.sessionRequests}회
                <div className="usage-tip">
                  <div className="usage-tip-title">이번 세션 누적</div>
                  <div className="usage-tip-body">
                    {rateLimit.sessionRequests}회 대화 · {(rateLimit.sessionInputTokens + rateLimit.sessionOutputTokens).toLocaleString()} 토큰
                  </div>
                  <div className="usage-tip-note">앱 시작 후부터의 사용량</div>
                </div>
              </span>
              {modelInfo?.tier === 'paid' ? (
                <span className="usage-chip">
                  💸 ₩{Math.round(rateLimit.sessionCostUsd * USD_TO_KRW).toLocaleString()}
                  <div className="usage-tip">
                    <div className="usage-tip-title">이번 세션 추정 비용</div>
                    <div className="usage-tip-body">
                      ₩{Math.round(rateLimit.sessionCostUsd * USD_TO_KRW).toLocaleString()} (${rateLimit.sessionCostUsd.toFixed(4)})
                    </div>
                    <div className="usage-tip-note">{modelInfo.label} 단가 × 토큰</div>
                  </div>
                </span>
              ) : (
                <span className="usage-chip">
                  🆓
                  <div className="usage-tip">
                    <div className="usage-tip-title">무료 티어</div>
                    <div className="usage-tip-body">
                      {modelInfo?.label ?? employee.model} · 분당 {rateLimit.limit}회
                    </div>
                    <div className="usage-tip-note">Google AI Studio 무료 한도</div>
                  </div>
                </span>
              )}
            </div>
          )}
          {rateLimit && usageMode === 'toggle' && (
            <div className="chat-usage-toggle-row" onContextMenu={onUsageContextMenu}>
              <button
                className={`chat-usage-toggle ${usageStripOpen ? 'chat-usage-toggle-open' : ''} chat-usage-toggle-${tone}`}
                onClick={() => setUsageStripOpen(v => !v)}
                onContextMenu={onUsageContextMenu}
                aria-expanded={usageStripOpen}
                title="우클릭 → 표시 방식 변경"
              >
                <span className="toggle-arrow">{usageStripOpen ? '▲' : '▼'}</span>
                <span>사용량</span>
                {!usageStripOpen && tone !== 'ok' && (
                  <span className="toggle-dot" aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </div>
        <div className="chat-status">{isAgentTyping ? '● 작업 중' : '● 대기'}</div>
        <button className="chat-close" onClick={close} aria-label="닫기">
          ×
        </button>
      </div>

      {rateLimit && usageMode === 'toggle' && usageStripOpen && (
        <div className={`chat-usage-strip chat-usage-${tone}`}>
          {rateLimit.limit > 0 && (
            <div
              className="usage-cell"
              title={
                blockedByLimit
                  ? `1분당 ${rateLimit.limit}회 한도 도달 — ${countdownSec}초 후 복구`
                  : `1분당 사용 가능한 횟수 (남은 ${rateLimit.remaining} / 한도 ${rateLimit.limit})`
              }
            >
              <div className="usage-cell-label">분당</div>
              <div className="usage-cell-value">
                {blockedByLimit ? (
                  <span className="usage-big-number">⏳{countdownSec}s</span>
                ) : (
                  <>
                    <span className="usage-big-number">{rateLimit.remaining}/{rateLimit.limit}</span>
                    <span className="usage-unit">남음</span>
                  </>
                )}
              </div>
            </div>
          )}
          <div
            className="usage-cell"
            title={`이번 세션 누적 — ${rateLimit.sessionRequests}회 대화, ${(rateLimit.sessionInputTokens + rateLimit.sessionOutputTokens).toLocaleString()} 토큰`}
          >
            <div className="usage-cell-label">세션</div>
            <div className="usage-cell-value">
              <span className="usage-big-number">{rateLimit.sessionRequests}회</span>
              <span className="usage-unit">· {formatTokens(rateLimit.sessionInputTokens + rateLimit.sessionOutputTokens)}</span>
            </div>
          </div>
          {modelInfo?.tier === 'paid' ? (
            <div
              className="usage-cell"
              title={`이번 세션 추정 비용 — $${rateLimit.sessionCostUsd.toFixed(4)} (모델 단가 × 토큰 사용량)`}
            >
              <div className="usage-cell-label">비용</div>
              <div className="usage-cell-value">
                <span className="usage-big-number">₩{Math.round(rateLimit.sessionCostUsd * USD_TO_KRW).toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div
              className="usage-cell"
              title={`${modelInfo?.label ?? employee.model} 무료 한도 내 (분당 ${rateLimit.limit}회)`}
            >
              <div className="usage-cell-label">티어</div>
              <div className="usage-cell-value">
                <span className="usage-big-number">🆓 무료</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="chat-msgs">
        {messages.map(m => (
          <div key={m.id} className={`msg msg-${m.role}`}>
            {m.role === 'system' ? (
              <div className={`msg-system msg-system-${m.severity ?? 'info'}`}>
                <div className="msg-system-line">{m.text}</div>
                {m.hint && <div className="msg-system-hint">{m.hint}</div>}
                {m.debugCode && (
                  <div className="msg-system-code" title="에러 코드 (디버깅용)">{m.debugCode}</div>
                )}
              </div>
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

      {isPersonaPaused && pauseMessage && (
        <div className="chat-persona-pause" title="분당 한도 도달 — 카운트다운 끝나면 자동 복구">
          <span className="persona-pause-emoji">{pauseMessage.icon}</span>
          <span className="persona-pause-text">
            <strong>{employee.name}</strong>이(가) {pauseMessage.verb}
          </span>
          <span className="persona-pause-countdown">⏳ {countdownSec}s</span>
        </div>
      )}

      <div className="chat-input-row">
        <input
          ref={inputRef}
          className={`chat-input${isAgentTyping || blockedByLimit ? ' chat-input-muted' : ''}`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          aria-busy={isAgentTyping || blockedByLimit}
        />
        {isAgentTyping ? (
          <button className="chat-stop" onClick={stop} title="응답 중단">
            ■ 중단
          </button>
        ) : (
          <button
            className="chat-send"
            onClick={send}
            disabled={!input.trim() || blockedByLimit}
          >
            {blockedByLimit ? '⏳' : '전송'}
          </button>
        )}
      </div>

      <div className="chat-footer">
        💬 실제 LLM과 대화 중 · {modelInfo?.tier === 'free' ? '🆓 무료' : '💸 토큰 비용 발생'}
      </div>

      {contextMenu && (
        <div
          className="chat-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
          onContextMenu={e => e.preventDefault()}
        >
          <button className="context-menu-item" onClick={onOpenSettingsForUsage}>
            ⚙️ 표시 방식 설정 변경...
          </button>
          <div className="context-menu-hint">
            {usageMode === 'chips' ? '칩 / 토글 모드 전환' : '토글 / 칩 모드 전환'}
          </div>
        </div>
      )}
    </div>
  )
}
