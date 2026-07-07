/**
 * get_current_time — Phase 2 루프 검증용 첫 실전 도구.
 * Phase 1 통합 테스트(toolcall-roundtrip)에서 더미로 쓰던 스펙을 실제 실행기로 승격.
 */

import type { AgentTool } from '../loop'

export const getCurrentTimeTool: AgentTool = {
  def: {
    name: 'get_current_time',
    description: '현재 날짜와 시각을 확인한다. 시간·날짜 질문에는 추측하지 말고 반드시 이 도구를 사용할 것.',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'IANA 타임존 (예: Asia/Seoul). 생략하면 실행 환경의 로컬 타임존.',
        },
      },
    },
  },
  // 잘못된 타임존이면 toLocaleString이 RangeError를 던짐 — 루프가 { error }로 모델에 되돌려 재시도 유도
  async execute(args) {
    const timezone = (args as { timezone?: string } | null | undefined)?.timezone
    const now = new Date()
    return {
      now: now.toLocaleString('ko-KR', { timeZone: timezone, dateStyle: 'full', timeStyle: 'short' }),
      iso: now.toISOString(),
      timezone: timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
  },
}
