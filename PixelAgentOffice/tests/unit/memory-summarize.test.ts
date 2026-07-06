/**
 * 1층 폴리시 — 공용 기억 요약 로직(shared/memory.ts) 유닛 테스트.
 * 가짜 Platform으로 LLM 호출 없이 분기(no-history / saved / empty-result / error)를 검증.
 */

import { describe, it, expect } from 'vitest'
import { summarizeMemory } from '../../src/shared/memory'
import type { Platform } from '../../src/platform/types'
import type { ChatResult } from '../../src/platform/types'
import type { Employee, ChatMessage } from '../../src/shared/types'

const EMP = {
  id: 'emp-1',
  name: '메리',
  memoryModel: 'gemini-2-5-flash',
  memoryMode: 'auto',
} as Employee

function msg(role: 'user' | 'agent', text: string): ChatMessage {
  return { id: `${role}-${text}`, role, text } as ChatMessage
}

/** 필요한 4개 메서드만 채운 가짜 Platform */
function fakePlatform(opts: {
  history?: ChatMessage[]
  storedMemory?: string
  chatReply?: string
  chatFails?: boolean
}) {
  const calls: { chatRequest?: Parameters<Platform['chat']>[0]; savedMemory?: string } = {}
  const p = {
    loadChatHistory: async () => opts.history ?? [],
    loadMemory: async () => opts.storedMemory ?? '',
    saveMemory: async (_id: string, text: string) => {
      calls.savedMemory = text
    },
    chat: async (request: Parameters<Platform['chat']>[0]): Promise<ChatResult> => {
      calls.chatRequest = request
      if (opts.chatFails) {
        return {
          ok: false,
          error: {
            code: 'API_ERROR', message: '요약 모델 오류', provider: 'google',
            friendly: { message: '오류', severity: 'error' },
          },
          rateLimit: {} as never,
        } as ChatResult
      }
      return {
        ok: true,
        response: { text: opts.chatReply ?? '', stopReason: 'end', usage: { inputTokens: 10, outputTokens: 5 } },
        rateLimit: {} as never,
      } as ChatResult
    },
  } as unknown as Platform
  return { p, calls }
}

describe('summarizeMemory — 공용 기억 요약', () => {
  it('대화 기록이 없으면 no-history (LLM 호출 안 함)', async () => {
    const { p, calls } = fakePlatform({ history: [] })
    const outcome = await summarizeMemory(p, EMP)
    expect(outcome.status).toBe('no-history')
    expect(calls.chatRequest).toBeUndefined()
  })

  it('정상 요약 — memoryModel로 호출 + 병합 결과 저장 + saved 반환', async () => {
    const { p, calls } = fakePlatform({
      history: [msg('user', '내 이름은 김사장이야'), msg('agent', '네 사장님!')],
      storedMemory: '사용자는 커피를 좋아함',
      chatReply: '사용자 이름은 김사장. 커피를 좋아함.',
    })
    const outcome = await summarizeMemory(p, EMP)
    expect(outcome).toEqual({ status: 'saved', memory: '사용자 이름은 김사장. 커피를 좋아함.' })
    expect(calls.savedMemory).toBe('사용자 이름은 김사장. 커피를 좋아함.')
    // 요약은 반드시 memoryModel로 (대화 모델 아님)
    expect(calls.chatRequest?.model).toBe('gemini-2-5-flash')
    // 기존 기억이 프롬프트에 포함돼야 병합이 됨
    const userContent = calls.chatRequest?.messages[0]
    expect(userContent && 'content' in userContent ? userContent.content : '').toContain('사용자는 커피를 좋아함')
  })

  it('existingMemory를 주면 저장소 대신 그 값으로 병합 (메모 모달 미저장 편집분)', async () => {
    const { p, calls } = fakePlatform({
      history: [msg('user', '안녕'), msg('agent', '안녕하세요')],
      storedMemory: '옛날 기억',
      chatReply: '병합된 기억',
    })
    await summarizeMemory(p, EMP, '방금 편집한 기억')
    const userContent = calls.chatRequest?.messages[0]
    const content = userContent && 'content' in userContent ? String(userContent.content) : ''
    expect(content).toContain('방금 편집한 기억')
    expect(content).not.toContain('옛날 기억')
  })

  it('"없음" 류 결과는 기존 기억을 덮어쓰지 않음 (empty-result)', async () => {
    const { p, calls } = fakePlatform({
      history: [msg('user', 'ㅎㅇ'), msg('agent', '안녕하세요')],
      chatReply: '(없음)',
    })
    const outcome = await summarizeMemory(p, EMP)
    expect(outcome.status).toBe('empty-result')
    expect(calls.savedMemory).toBeUndefined()
  })

  it('LLM 호출 실패 시 error + 메시지 전달', async () => {
    const { p, calls } = fakePlatform({
      history: [msg('user', 'ㅎㅇ'), msg('agent', '안녕하세요')],
      chatFails: true,
    })
    const outcome = await summarizeMemory(p, EMP)
    expect(outcome).toEqual({ status: 'error', message: '요약 모델 오류' })
    expect(calls.savedMemory).toBeUndefined()
  })
})
