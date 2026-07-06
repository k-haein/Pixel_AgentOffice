/**
 * 직원 기억(메모리) 요약 로직 (Phase 4 → 1층 폴리시에서 공용화).
 *
 * MemoModal의 수동 [기억 정리] 버튼과 ChatPopup의 자동/확인(ask/auto) 트리거가
 * 같은 로직을 쓰도록 분리. electron을 import하지 않는다.
 */

import type { Platform } from '../platform/types'
import type { Employee } from './types'

/** ask/auto 트리거 발동 최소 대화 턴 수 — 이 미만이면 정리할 거리가 없다고 본다 */
export const MEMORY_AUTO_MIN_TURNS = 3

export type SummarizeOutcome =
  | { status: 'saved'; memory: string }   // 요약 성공 + 저장 완료
  | { status: 'no-history' }              // 대화 기록 없음
  | { status: 'empty-result' }            // 요약 결과가 비어 기존 기억 유지
  | { status: 'error'; message: string }  // LLM 호출 실패

/** 무의미한 요약 결과 판별 — 빈/"없음" 류가 기존 기억을 덮어쓰지 않게 방어 */
const META_EMPTY = /^[(（]?\s*(없음|기억\s*없음|n\/?a|none)\s*[)）]?$/i

/** 대화 이력 + 기존 기억 → memoryModel로 병합 요약 → 저장.
 *  existingMemory를 주면 그 값을 기존 기억으로 사용(메모 모달의 미저장 편집분 반영),
 *  생략하면 저장소에서 로드(자동 트리거 경로). */
export async function summarizeMemory(
  platform: Platform,
  employee: Employee,
  existingMemory?: string,
): Promise<SummarizeOutcome> {
  const history = await platform.loadChatHistory(employee.id)
  // 긴 대화는 토큰 한도 초과 → 최근 40개만 요약 (최신 대화가 기억에 더 중요)
  const convo = history
    .filter(m => m.role !== 'system')
    .slice(-40)
    .map(m => `${m.role === 'agent' ? employee.name : '사용자'}: ${m.text}`)
    .join('\n')
  if (!convo.trim()) return { status: 'no-history' }

  const memory = existingMemory ?? (await platform.loadMemory(employee.id))
  const result = await platform.chat({
    model: employee.memoryModel,
    systemPrompt:
      '당신은 메모리 요약기입니다. 대화에서 *사용자에 대해* 기억할 사실(이름·선호·진행 중인 작업·반복 주제)만 간결한 3인칭 메모로 추출해 기존 기억과 병합하세요. 추측·창작 금지. 메모 본문만 출력하세요.',
    messages: [
      {
        role: 'user',
        content: `기존 기억:\n${memory || '(없음)'}\n\n새 대화:\n${convo}\n\n병합된 기억을 출력하세요:`,
      },
    ],
  })
  if (!result.ok) return { status: 'error', message: result.error.message }

  const newMem = result.response.text.trim()
  if (newMem.length < 2 || META_EMPTY.test(newMem)) return { status: 'empty-result' }

  await platform.saveMemory(employee.id, newMem)
  return { status: 'saved', memory: newMem }
}
