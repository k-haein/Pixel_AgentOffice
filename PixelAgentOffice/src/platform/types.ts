/**
 * Platform 인터페이스 — 환경(Electron/Web/Mock)에 무관한 추상 layer.
 *
 * 컴포넌트는 이 인터페이스만 사용하면 됨. 어떤 환경에서 실행되는지 모름.
 * 환경별 구현은 `electron.ts`, `web.ts`, `mock.ts` 에 분리.
 *
 * 미래 모바일 출시 시 컴포넌트 코드 0줄 변경 — adapter만 갈아끼우면 됨.
 *
 * 자세한 배경: ../../../../ideas/13-electron-and-mobile-strategy.md
 */

import type { AppData, Employee, Settings, Model, ChatMessage, EmployeeStatsDelta } from '../shared/types'
import type { ChatRequest } from '../../electron/llm/types'
import type { ChatResult, RateLimitStatus, TeamEvent, TeamRunIpcResult } from '../../electron/preload'
import type { ProviderName } from '../../electron/llm/types'

// preload.ts에서 정의한 타입들을 그대로 재사용 (preload는 electron 환경 의존이지만,
// 타입 자체는 환경 무관이므로 platform layer에서도 사용 가능)
export type { ChatResult, RateLimitStatus, ProviderName, TeamEvent, TeamRunIpcResult }

export interface Platform {
  // === Data 영속화 ===
  /** 앱 데이터(직원·설정) 전체 로드 */
  loadData(): Promise<AppData>
  /** 직원 신규 채용 */
  addEmployee(employee: Employee): Promise<Employee>
  /** 직원 일부 필드 수정 (자리·랭크·모델 등) */
  updateEmployee(id: string, patch: Partial<Employee>): Promise<Employee | null>
  /** 직원 활동 통계 원자적 증가 (Phase 1) — 채팅/메모/칭찬 누적. 진급·메모리 토대 */
  incrementEmployeeStats(id: string, delta: EmployeeStatsDelta): Promise<Employee | null>
  /** 직원 해고 */
  removeEmployee(id: string): Promise<boolean>
  /** 설정 일부 필드 수정 */
  updateSettings(patch: Partial<Settings>): Promise<Settings>

  // === 채팅 이력 영구화 (Day 11+ 풀 스펙) ===
  /** 특정 직원의 채팅 이력 로드 — 채팅창 열 때 호출 */
  loadChatHistory(employeeId: string): Promise<ChatMessage[]>
  /** 특정 직원의 채팅 이력 저장 — 메시지 변경 시마다 호출 (debounce 권장) */
  saveChatHistory(employeeId: string, messages: ChatMessage[]): Promise<void>
  /** 특정 직원의 채팅 이력 삭제 — 해고 시 호출 */
  clearChatHistory(employeeId: string): Promise<void>

  // === 메모리 (Phase 4) ===
  /** 직원 메모리 로드 — 채팅 system prompt 주입용 */
  loadMemory(employeeId: string): Promise<string>
  /** 직원 메모리 저장 — "지금 기억 정리" 요약 결과 */
  saveMemory(employeeId: string, text: string): Promise<void>

  // === API 키 관리 (provider별) ===
  /** API 키 저장 (Electron=OS키체인 / Web=백엔드DB 등 환경별 구현) */
  saveApiKey(provider: ProviderName, key: string): Promise<{ ok: true }>
  /** API 키 존재 여부만 확인 (키 값은 노출 안 함) */
  hasApiKey(provider: ProviderName): Promise<boolean>
  /** API 키 삭제 */
  deleteApiKey(provider: ProviderName): Promise<{ ok: true }>
  /** 키 보관소 사용 가능 여부 (예: Electron safeStorage 비활성 환경 감지) */
  isApiKeyStorageAvailable(): Promise<boolean>

  // === LLM 호출 ===
  /** 채팅 요청. requestId 동봉 시 abortChat으로 중단 가능.
   *  stream: true면 생성 중 텍스트 조각이 onChatChunk 구독자에게 실시간 전달됨 (1층 폴리시) */
  chat(request: ChatRequest & { requestId?: string; stream?: boolean }): Promise<ChatResult>
  /** 스트리밍 청크 구독 — 반환값은 구독 해제 함수 */
  onChatChunk(listener: (payload: { requestId: string; delta: string }) => void): () => void
  /** 진행 중인 채팅 요청 중단 — 2층 팀 실행(runTeamTask requestId)도 같은 경로로 중단 */
  abortChat(requestId: string): Promise<{ ok: boolean; reason?: string }>
  /** 특정 모델의 rate limit 상태 조회 (RPM 카운터 + 세션 누적) */
  getRateLimit(model: Model): Promise<RateLimitStatus>

  // === 2층 팀 협업 (Phase 3) ===
  /** 팀장에게 팀 단위 작업 지시 — 팀장이 같은 팀 팀원에게 위임 후 종합 보고 반환 */
  runTeamTask(payload: { leaderId: string; task: string; requestId?: string }): Promise<TeamRunIpcResult>
  /** 팀 실행 진행 이벤트 구독(위임 시작/완료·루프 스텝) — 반환값은 구독 해제 함수 */
  onTeamEvent(listener: (payload: { requestId: string; event: TeamEvent }) => void): () => void
}
