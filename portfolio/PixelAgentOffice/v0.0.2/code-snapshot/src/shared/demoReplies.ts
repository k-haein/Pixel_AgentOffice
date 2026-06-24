/**
 * 데모(키 없음) 모드 더미 응답 — Day 14.
 *
 * API 키가 없을 때 캐릭터별 정해진 답변으로 게임 루프(대화·감정·칭찬·진급)를 체험하게 한다.
 * 기본 캐릭터(editor/writer/developer)는 페르소나에 맞춘 답변, custom(새 직원)은 키 연결 유도.
 *
 * 순수 데이터 모듈 (React/Phaser 의존 없음).
 */

import type { Template } from './types'

const EDITOR = [
  '음, 이 문장은 조금만 다듬으면 훨씬 깔끔해지겠어요.',
  '흐름은 좋아요. 중복되는 표현 하나만 정리해볼까요?',
  '맞춤법은 거의 완벽해요. 쉼표 위치만 살짝 손볼게요.',
  '제목이 핵심을 잘 담았네요. 첫 문장도 그만큼 힘 있게 가요.',
  '문장이 조금 길어요. 두 문장으로 나누면 읽기 편해져요.',
  '좋은 글이에요! 마지막 문단만 한 번 더 다듬으면 끝이에요.',
]

const WRITER = [
  '문득 바다 위에 떠오른 달이 생각나네요… 그 장면, 글로 옮겨볼까요?',
  '이 이야기엔 잔잔한 물결 같은 리듬이 어울릴 것 같아요.',
  '감정의 결을 조금만 더 살리면 독자가 깊이 빠져들 거예요.',
  '한 문장, 한 문장이 파도처럼 이어지면 좋겠어요.',
  '여백도 하나의 문장이에요. 잠시 숨을 두고 가볼까요?',
  '별빛 같은 단어 하나가 이 문단 전체를 밝혀줄 거예요.',
]

const DEVELOPER = [
  '음... 그건 엣지 케이스 같네요. 일단 재현부터.',
  '...로그부터 찍어보면 바로 나올 듯. 🐛',
  'LGTM. 근데 이거 나중에 리팩터링 각이긴 함.',
  '그거 캐싱하면 해결돼요. ...아마도.',
  '돌아는 가는데 왜 되는지는 저도 몰라요. 🙃',
  '커밋 메시지: "fix: 어쩌다 고쳐짐". ...농담이에요.',
]

/** 캐릭터 템플릿·이름·대화 순번으로 데모 응답 한 줄 반환 */
export function demoReply(template: Template, name: string, turn: number): string {
  const pick = (arr: string[]) => arr[((turn % arr.length) + arr.length) % arr.length]
  switch (template) {
    case 'editor':
      return pick(EDITOR)
    case 'writer':
      return pick(WRITER)
    case 'developer':
      return pick(DEVELOPER)
    default:
      // custom(새 직원) — 진짜 페르소나로 답하려면 키 필요
      return `아직은 데모라 정해진 말만 할 수 있어요. 🔑 API 키를 연결하면 ‘${name}’의 성격과 지침에 딱 맞게 진짜로 대답할 수 있어요!`
  }
}
