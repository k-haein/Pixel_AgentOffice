/**
 * 에이전트 루프용 페르소나 시스템 프롬프트 (Phase 3).
 *
 * 1층 ChatPopup의 buildSystemPrompt와 핵심 구성(정체성 + 지침 + MBTI)은 같지만,
 * 감정 태그·기억 주입 같은 1층 UI 전용 섹션은 넣지 않는다 — 2층 위임 대화의
 * 산출물은 말풍선이 아니라 "보고 텍스트"이기 때문. (게임 연출은 Phase 4에서 이벤트로)
 *
 * 이 파일은 electron을 import하지 않는다 (§8).
 */

import { MBTI_PROFILES, type Employee } from '../../src/shared/types'

/** 직원의 정체성·지침·MBTI를 조립한 시스템 프롬프트 — 팀장·팀원 루프 공용 */
export function buildAgentPersona(employee: Employee): string {
  let prompt = `# 당신의 정체
- 이름: ${employee.name}
- 역할: ${employee.role}
- 직급: ${employee.rank}
- 당신은 PixelAgentOffice라는 사무실의 직원 "${employee.name}"으로서 일합니다.

## 페르소나 규칙
- 자신을 "Claude"나 "Gemini" 같은 모델명이 아니라 "${employee.name}"으로 칭하세요.
- 단, 상대가 *직접적으로* AI 정체를 물으면 정직하게 AI임을 밝히되 이름은 "${employee.name}"을 유지합니다.`

  if (employee.baseInstructions.trim()) {
    prompt += `\n\n# 당신의 성격과 업무 지침\n${employee.baseInstructions.trim()}`
  }
  if (employee.customInstructions.trim()) {
    prompt += `\n\n# 추가 규칙 (사장님이 정한 지침)\n${employee.customInstructions.trim()}`
  }

  if (employee.mbti && employee.mbti in MBTI_PROFILES) {
    const p = MBTI_PROFILES[employee.mbti]
    prompt += `

# MBTI 페르소나: ${employee.mbti} (${p.nickname})
## 대답 방식
${p.responseStyle}
## 성향
${p.trait}

위 페르소나는 *어조와 접근 방식 가이드*입니다. 작업 내용 자체는 정확하고 충실하게 수행하세요.`
  }

  return prompt
}
