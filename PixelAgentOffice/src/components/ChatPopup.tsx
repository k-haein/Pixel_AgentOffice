import { useEffect, useRef, useState } from 'react'
import { eventBus } from '../game/eventBus'
import { platform } from '../platform'
import type { Employee, Settings, UsageDisplayMode, ChatMessage, BubbleEmotion } from '../shared/types'
import { MODEL_INFO, USD_TO_KRW, MBTI_PROFILES } from '../shared/types'
import { checkPromotionEligible } from '../shared/promotion'
import { demoReply } from '../shared/demoReplies'
import type { RateLimitStatus } from '../platform'

// ChatMessage를 Message로 alias — 기존 코드 호환
type Message = ChatMessage

/** Employee → 시스템 프롬프트 조립 (페르소나 정체 + 기본 지침 + 커스텀 지침 + 기억).
 *  memory: 누적 메모리 텍스트 (Phase 4). 있으면 # 기억 섹션으로 주입 */
function buildSystemPrompt(employee: Employee, memory?: string): string {
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

  // Day 12 §2 — MBTI 페르소나 자동 주입 (employee.mbti 있을 때만)
  if (employee.mbti && employee.mbti in MBTI_PROFILES) {
    const p = MBTI_PROFILES[employee.mbti]
    prompt += `

# MBTI 페르소나: ${employee.mbti} (${p.nickname})

당신의 성격과 응답 스타일은 다음 MBTI 유형을 따릅니다. 이 패턴을 자연스럽게 응답에 반영하세요.

## 대답 방식
${p.responseStyle}

## 성향
${p.trait}

위 페르소나는 *대화 스타일과 분위기 가이드*입니다. 사용자의 실제 질문에는 정확하고 도움이 되는 답을 제공하되, 어조와 접근 방식에 페르소나를 녹이세요.`
  }

  // Day 11 후속 +2 — 감정 표현 자동 트리거 지침
  prompt += `

# 응답 마지막의 감정 태그 (필수)
당신의 응답 *맨 마지막 줄에만* 다음 형식으로 한 번 감정 태그를 붙이세요. 그 외에는 절대 사용하지 마세요.

형식: [emotion:키]

선택 가능한 키 (12종):
- thinking — 평소·생각 중 (확실치 않을 때)
- happy — 기쁨, 즐거움, 칭찬 받음
- surprised — 놀람, 의외
- sleepy — 졸림, 피곤
- confused — 혼란, 질문이 모호함
- idea — 좋은 아이디어 떠올림, 제안
- love — 사랑, 감사, 깊은 호감
- angry — 분노, 짜증
- sad — 슬픔, 미안함, 사과
- sweat — 당황, 식은땀, 어려움
- music — 즐거운 분위기, 콧노래
- wow — 감탄, 와우, 흥분

예시:
"좋은 질문이네요! 한번 알아볼게요.
[emotion:idea]"

규칙:
- 매 응답마다 *정확히 한 줄* 태그를 마지막에 붙입니다 (위치: 응답 텍스트 마지막).
- 키는 위 12종 중 정확히 하나만.
- 평범한 응답에는 thinking으로.`

  // 메모리 주입 (Phase 4) — 누적 기억이 있으면 system prompt에 추가
  if (memory && memory.trim()) {
    prompt += `

# 기억 (이전 대화에서 누적된 사용자 정보)
${memory.trim()}

위 기억을 자연스럽게 활용해 대화하세요. 단, 기억에 없는 것을 아는 척하지 마세요.`
  }

  // 부적절 콘텐츠 가드 (v2 #21) — 주석 처리. Gemini safety filter 충돌 가능성 + 채팅 테스트는 나중에.
  return prompt
}

/** LLM 응답에서 [emotion:xxx] 태그 추출 — 본문에서 제거 후 emotion 키 반환 (Day 11 후속 +2) */
function parseEmotionTag(text: string): { cleanText: string; emotion: BubbleEmotion | null } {
  const validEmotions: BubbleEmotion[] = [
    'thinking', 'happy', 'surprised', 'sleepy', 'confused',
    'idea', 'love', 'angry', 'sad', 'sweat', 'music', 'wow',
  ]
  // [emotion:xxx] 패턴 매칭 — 응답 어디에 있든 잡음 (마지막 줄 지침이지만 모델이 어디에 둘지 모름)
  const re = /\[emotion:(\w+)\]/i
  const match = text.match(re)
  if (!match) return { cleanText: text, emotion: null }
  const key = match[1].toLowerCase() as BubbleEmotion
  const emotion = validEmotions.includes(key) ? key : null
  // 태그 제거 + 주변 공백/줄바꿈 정리
  const cleanText = text.replace(re, '').trim().replace(/\n{3,}/g, '\n\n')
  return { cleanText, emotion }
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
  // 진급 난이도 배율 (Day 13) — settings에서 로드, 진급 자격 판정에 사용
  const [promotionMult, setPromotionMult] = useState(1)
  /** 토글 모드일 때 스트립 펼침 여부 */
  const [usageStripOpen, setUsageStripOpen] = useState<boolean>(false)
  /** 우클릭 컨텍스트 메뉴 좌표 (null이면 닫힘) */
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  /** 데모 모드 (Day 14) — 직원 모델의 provider 키가 없으면 true. 더미 응답 + 배너 */
  const [demoMode, setDemoMode] = useState(false)
  /** 데모 응답 순번 — 캐릭터별 라인 순환용 */
  const demoTurnRef = useRef(0)
  const msgsEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  /** 채팅 영구화 (P1 #13) — employee별 메시지 보관. 같은 직원 채팅 다시 열면 복원. */
  const messagesByEmployeeRef = useRef<Record<string, Message[]>>({})

  // 데모 모드 판별 (Day 14) — 직원 모델 provider의 키 유무. 키 저장되면 즉시 해제.
  useEffect(() => {
    if (!employee) { setDemoMode(false); return }
    let alive = true
    const check = async () => {
      const has = await platform.hasApiKey(MODEL_INFO[employee.model].provider)
      if (alive) setDemoMode(!has)
    }
    void check()
    const onSaved = () => { void check() }
    eventBus.on('apikey:saved', onSaved)
    return () => { alive = false; eventBus.off('apikey:saved', onSaved) }
  }, [employee])

  // 채팅 열기 이벤트 (Day 11+ 풀 스펙: store.ts 영속화 추가 — 앱 재시작 후도 이력 복원)
  useEffect(() => {
    const onOpen = async (payload: unknown) => {
      const e = payload as Employee
      setEmployee(e)
      setInput('')
      // 1) 메모리 ref에 있으면 즉시 표시
      const existing = messagesByEmployeeRef.current[e.id]
      if (existing && existing.length > 0) {
        setMessages(existing)
        return
      }
      // 2) 영속 저장소에서 로드 (앱 재시작 후)
      try {
        const persisted = await platform.loadChatHistory(e.id)
        if (persisted && persisted.length > 0) {
          messagesByEmployeeRef.current[e.id] = persisted
          setMessages(persisted)
          return
        }
      } catch (err) {
        console.error('채팅 이력 로드 실패:', err)
      }
      // 3) 신규 — 시작 system 메시지
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
    const onForceClose = (payload: unknown) => {
      const { agentId } = payload as { agentId: string }
      setEmployee(prev => (prev?.id === agentId ? null : prev))
      // 해고 시 그 직원의 이력도 삭제 (메모리 + 영속)
      delete messagesByEmployeeRef.current[agentId]
      void platform.clearChatHistory(agentId).catch(err =>
        console.error('채팅 이력 삭제 실패:', err)
      )
    }
    eventBus.on('chat:open', onOpen)
    eventBus.on('chat:force-close', onForceClose)
    return () => {
      eventBus.off('chat:open', onOpen)
      eventBus.off('chat:force-close', onForceClose)
    }
  }, [])

  // messages 변경 시 메모리 ref 갱신 + 영속화 (debounced via setTimeout 300ms)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!employee) return
    messagesByEmployeeRef.current[employee.id] = messages
    // 메시지가 1개(시작 system 메시지만)일 땐 굳이 영속화 안 함
    if (messages.length <= 1) return
    // debounce — 짧은 시간 안 여러 변경이 일어나면 마지막 한 번만 저장
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void platform.saveChatHistory(employee.id, messages).catch(err =>
        console.error('채팅 이력 저장 실패:', err)
      )
    }, 300)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [messages, employee])

  // 설정 — 채팅창 마운트 시 한 번 로드 + 설정 변경 이벤트 구독
  useEffect(() => {
    platform.loadData().then(d => {
      setUsageMode(d.settings.usageDisplayMode ?? 'chips')
      setPromotionMult(d.settings.promotionSpeedMultiplier ?? 1)
    })
    const onSettingsChanged = (payload: unknown) => {
      const s = payload as Settings
      setUsageMode(s.usageDisplayMode ?? 'chips')
      setPromotionMult(s.promotionSpeedMultiplier ?? 1)
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
      // 데모 모드 (Day 14) — 모델 provider 키가 없으면 실제 LLM 대신 캐릭터별 더미 응답.
      const hasKey = await platform.hasApiKey(MODEL_INFO[employee.model].provider)
      if (!hasKey) {
        setDemoMode(true)
        await new Promise(r => setTimeout(r, 500)) // 타이핑 느낌의 짧은 지연
        const reply: Message = {
          id: `a-${Date.now()}`,
          role: 'agent',
          text: demoReply(employee.template, employee.name, demoTurnRef.current++),
        }
        setMessages(prev => [...prev, reply])
        const empId = employee.id
        const prevPersisted = messagesByEmployeeRef.current[empId] ?? []
        messagesByEmployeeRef.current[empId] = [...prevPersisted, reply]
        eventBus.emit('agent:reply', { agentId: empId }) // 말풍선 happy
        // 데모도 게임 루프(칭찬·진급) 체험되게 활동 카운트
        void platform.incrementEmployeeStats(empId, { totalMessages: 1 }).then(maybeRequestPromotion)
        return // finally에서 typing/state 정리
      }

      // Phase 4 — 매 전송 직전 최신 메모리 로드 (메모 모달에서 갱신돼도 즉시 반영, stale 차단)
      const freshMemory = await platform.loadMemory(employee.id)
      const result = await platform.chat({
        model: employee.model,
        systemPrompt: buildSystemPrompt(employee, freshMemory),
        messages: apiMessages,
        requestId,
      })

      // 결과와 함께 rate limit 항상 갱신
      setRateLimit(result.rateLimit)

      if (result.ok) {
        // Day 11 후속 +2 — [emotion:xxx] 태그 파싱 → 본문 정리 + 말풍선 emotion 5초 트리거
        const { cleanText, emotion } = parseEmotionTag(result.response.text)
        const reply: Message = {
          id: `a-${Date.now()}`,
          role: 'agent',
          text: cleanText,
        }
        setMessages(prev => [...prev, reply])
        // 채팅창 닫혀도 응답 보존 (P1 #13·#14) — closure empId로 ref 직접 갱신
        const empId = employee.id
        const prevPersisted = messagesByEmployeeRef.current[empId] ?? []
        messagesByEmployeeRef.current[empId] = [...prevPersisted, reply]
        // 응답 도착 → 말풍선 emotion 5초 (Day 11 후속 +2). 태그 없으면 기본 'happy' (Day 10 호환)
        eventBus.emit('agent:reply', { agentId: employee.id })
        if (emotion) {
          eventBus.emit('agent:set-emotion', { agentId: employee.id, emotion, expireMs: 5000 })
        }
        // Phase 1 — 활동 카운터: 응답 1건 성공 = 대화 1회 누적 (진급·메모리 토대).
        // Phase 3 — 갱신 결과로 진급 자격 체크 → 자격 도달 시 진급 요청 emit.
        void platform.incrementEmployeeStats(empId, { totalMessages: 1 }).then(maybeRequestPromotion)
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
        // LLM error → 말풍선 confused 잠시 (Day 10)
        eventBus.emit('agent:error', { agentId: employee.id })
        // 사용자 입력 복구 (Day 10) — 매번 다시 타이핑 안 하게
        setInput(text)
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
      eventBus.emit('agent:error', { agentId: employee.id })
      setInput(text) // 사용자 입력 복구
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

  /** 갱신된 employee가 진급 자격이면 진급 요청 emit (Phase 3) — App이 모달 표시 */
  const maybeRequestPromotion = (updated: Employee | null) => {
    if (!updated) return
    const toRank = checkPromotionEligible(updated, promotionMult)
    if (toRank) eventBus.emit('promotion:request', { employee: updated, toRank })
  }

  /** 칭찬 👍 (Phase 2) — agent 응답에 칭찬 1회. 메시지당 한 번만 (praised 영속화로 중복 방지) */
  const praise = (messageId: string) => {
    const target = messages.find(m => m.id === messageId)
    if (!target || target.role !== 'agent' || target.praised) return
    // 메시지에 praised 마킹 → useEffect[messages]가 영속화 (채팅창 재오픈해도 유지)
    setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, praised: true } : m)))
    // 활동 카운터 누적 (Phase 1 토대) — 정성형 진급 지표. Phase 3 — 갱신 결과로 진급 체크
    void platform.incrementEmployeeStats(employee.id, { totalPraises: 1 }).then(maybeRequestPromotion)
    // 캐릭터가 기뻐하는 반응 (감정 시스템 연계) — 재미 요소
    eventBus.emit('agent:set-emotion', { agentId: employee.id, emotion: 'happy', expireMs: 4000 })
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

      {demoMode && (
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            background: '#fff3d6', borderTop: '1px solid #e0c890', borderBottom: '1px solid #e0c890',
            padding: '7px 12px', fontSize: 12, color: '#7a5a1a',
          }}
        >
          <span>🔑 데모 응답이에요 — API 키를 연결하면 진짜로 대화해요</span>
          <button
            type="button"
            onClick={() => eventBus.emit('apikey:open')}
            style={{
              background: '#ffd24a', border: '1px solid #b8860b', borderRadius: 6,
              padding: '4px 10px', fontSize: 11, fontWeight: 'bold', cursor: 'pointer',
              color: '#2a2118', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >
            🔑 키 연결
          </button>
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
              <>
                <div className="msg-bubble">{m.text}</div>
                {m.role === 'agent' && (
                  <button
                    className={`msg-praise${m.praised ? ' msg-praised' : ''}`}
                    onClick={() => praise(m.id)}
                    disabled={m.praised}
                    title={m.praised ? '칭찬함' : '이 응답 칭찬하기'}
                  >
                    👍
                  </button>
                )}
              </>
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
        {demoMode
          ? '🔑 데모 모드 · API 키를 연결하면 실제 대화 (비용 없음)'
          : `💬 실제 LLM과 대화 중 · ${modelInfo?.tier === 'free' ? '🆓 무료' : '💸 토큰 비용 발생'}`}
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
