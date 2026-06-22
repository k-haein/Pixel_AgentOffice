/**
 * 튜토리얼(T1) 단계 정의 — Day 14.
 *
 * 첫 사용자가 기능에 압도되지 않도록 *앱 진행에 맞춰* 한 단계씩 안내한다.
 * 마스코트(Clawd)가 말풍선으로 설명 + 대상 UI를 스팟라이트로 강조.
 *
 * 흐름: 환영(회사·사장 설명) → API 키 게이트(없으면) → 채용 → 대화 → 정보 단계들 → 완료.
 * API 키 게이트: 대화하려면 키가 필요하므로 채용보다 먼저. 키 있으면 자동 스킵.
 *
 * 순수 데이터 모듈 (React/Phaser 의존 없음) — 단위 테스트·재사용 가능.
 */

/** 단계 진행 조건 — 'next'는 "다음" 클릭, 나머지는 실제 행동(채용/대화/키설정)으로 자동 진행 */
export type TutorialAdvance = 'next' | 'employee-hired' | 'chat-opened' | 'api-key-set'

/** 스팟라이트 대상 — DOM 요소의 data-tutorial 속성값. null=중앙 안내(전체 딤).
 *  예: 'hire'·'shop'·'settings'(상단바), 'canvas'(사무실), 'hire-name' 등(채용 폼 필드) */
export type TutorialTarget = string | null

export type TutorialStep = {
  id: string
  /** 마스코트 말풍선 텍스트 (\n 줄바꿈 허용) */
  text: string
  /** 강조할 UI 대상 */
  target: TutorialTarget
  /** 이 단계를 넘어가는 조건 */
  advanceOn: TutorialAdvance
  /** 명시적 다음 단계 id (없으면 배열 순서상 다음). 분기 단계(api키 성공/건너뜀)용 */
  next?: string
  /** 'next' 단계의 버튼 라벨 (기본 "다음 ▸"). 마지막 단계는 "시작하기" */
  cta?: string
  /** true면 재시청이어도 "다음"으로 못 넘김 — 실제 행동(예: 채용 완료 클릭)만 진행 */
  requireAction?: boolean
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    text: '안녕! 난 사무실 안내를 맡은 클로드야 🐙\n여긴 너의 AI 사무실, 너는 사장이야. 직원(AI)을 채용해서 다양한 대화를 시켜보는 곳이지. 같이 시작해보자!',
    target: null,
    advanceOn: 'next',
  },
  {
    id: 'apikey',
    text: '잠깐! 직원과 대화하려면 AI API 키가 필요해. 무료 Gemini로 바로 시작할 수 있어. 받는 방법을 알려줄게.',
    target: null,
    advanceOn: 'api-key-set',
  },
  {
    id: 'apikey-ok',
    text: 'API 키 등록 완료! 🎉 이제 첫 직원을 채용해보자.',
    target: null,
    advanceOn: 'next',
    next: 'hire',
  },
  {
    id: 'apikey-later',
    text: '괜찮아! API 키는 언제든 ⚙ 설정 → "API 키 설정"에서 넣을 수 있어. 일단 직원부터 만들어보자.',
    target: null,
    advanceOn: 'next',
    next: 'hire',
  },
  {
    id: 'hire',
    text: '이제 첫 직원을 채용하자. 위쪽 “+ 채용” 버튼을 눌러봐. (그냥 둘러보려면 "다음")',
    target: 'hire',
    advanceOn: 'next',
    next: 'chat',
  },
  // ── 채용 폼 안내 (모달 열렸을 때만, 자동 진입) ──────────────
  {
    id: 'hire-template',
    text: '먼저 캐릭터를 골라. 지금은 “편집자 Mary”가 선택돼 있어 — 그대로 둬도 돼.',
    target: 'hire-template',
    advanceOn: 'next',
  },
  {
    id: 'hire-team',
    text: '어느 팀에 앉힐지 정해. 처음엔 “팀 A” 그대로 두면 돼.',
    target: 'hire-team',
    advanceOn: 'next',
  },
  {
    id: 'hire-name',
    text: '직원 이름이야. Mary로 채워져 있지? 원하는 이름으로 바꿔도 돼.',
    target: 'hire-name',
    advanceOn: 'next',
  },
  {
    id: 'hire-role',
    text: '역할(직업)이야. “편집자”처럼 이 직원이 뭘 하는지 적어.',
    target: 'hire-role',
    advanceOn: 'next',
  },
  {
    id: 'hire-instructions',
    text: '성격·말투를 정하는 곳이야. 비워두면 기본값으로 시작하고, 메모지에서 언제든 바꿀 수 있어.',
    target: 'hire-instructions',
    advanceOn: 'next',
  },
  {
    id: 'hire-appearance',
    text: '외형이야. 무늬(단색·점박이·그라데이션·줄무늬)를 고를 수 있고, 새 직원(커스텀)은 색도 바꿀 수 있어.',
    target: 'hire-appearance',
    advanceOn: 'next',
  },
  {
    id: 'hire-mbti',
    text: 'MBTI를 정하면 그 성격대로 대답해요. 비워둬도 되고, 16종 설명은 ⓘ 버튼으로 볼 수 있어.',
    target: 'hire-mbti',
    advanceOn: 'next',
  },
  {
    id: 'hire-rank',
    text: '초기 직급이야. 보통 알바부터 시작해서 대화하며 진급해. (⭐ 과장 이상만 팀 리더 자리에 앉아요)',
    target: 'hire-rank',
    advanceOn: 'next',
  },
  {
    id: 'hire-promotion',
    text: '진급 방식을 골라. 정량(대화 수)·시간(근속)·정성(칭찬)·혼합·수동 중에서. 구체 기준은 아래 설명을 봐.',
    target: 'hire-promotion',
    advanceOn: 'next',
  },
  {
    id: 'hire-model',
    text: '대화에 쓸 AI 모델이야. 무료 Gemini로 시작할 수 있고, 키가 없으면 데모로 동작해.',
    target: 'hire-model',
    advanceOn: 'next',
  },
  {
    id: 'hire-submit',
    text: '다 됐으면 아래 ✓ 채용 완료 버튼을 눌러 Mary를 출근시키자! (이 버튼을 눌러야 진행돼요)',
    target: 'hire-submit',
    advanceOn: 'next',
    next: 'chat',
    requireAction: true,
  },
  {
    id: 'chat',
    text: '좋아, 직원이 출근했어! 사무실의 직원을 더블클릭하면 대화창이 열려. 말을 걸어봐.',
    target: 'canvas',
    advanceOn: 'chat-opened',
  },
  {
    id: 'praise',
    text: '대화 답변 아래 👍를 누르면 “칭찬”이 쌓여. 직원의 기분은 머리 위 말풍선에 표정으로 떠올라.',
    target: 'canvas',
    advanceOn: 'next',
  },
  {
    id: 'context',
    text: '직원을 우클릭하면 자리 이동·메모(지침 수정)·책상 회전·해고 메뉴가 나와.',
    target: 'canvas',
    advanceOn: 'next',
  },
  {
    id: 'done',
    text: '준비 끝! 직원과 대화하고 칭찬하며 사무실을 키워봐. 🛍 상점·⚙ 설정 사용법은 각 창 안의 🎓 버튼을 누르면 그때 자세히 알려줄게 🎉',
    target: null,
    advanceOn: 'next',
    cta: '시작하기',
  },
]

/** 상점(🛍) 팝업 안 🎓 → 상점 옵션 안내 트랙 (Day 14). 모달이 열린 상태에서만 동작. */
export const SHOP_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'shop-intro',
    text: '여기는 🛍 상점이야. 사무실을 꾸미는 것들을 골라볼게.',
    target: null,
    advanceOn: 'next',
  },
  {
    id: 'shop-plate',
    text: '🪧 팀 팻말 디자인 — 카드를 누르면 모든 팀의 팻말 모양이 즉시 바뀌어 (나무·매달림·돌 등).',
    target: 'shop-plate',
    advanceOn: 'next',
  },
  {
    id: 'shop-emotion',
    text: '🎭 감정 미리보기 — 캐릭터가 12가지 감정을 말풍선에 어떻게 표현하는지 미리 볼 수 있어.',
    target: 'shop-emotion',
    advanceOn: 'next',
  },
  {
    id: 'shop-furniture',
    text: '🪑 가구·꾸미기 — "사무실에 배치"를 누르고 원하는 위치를 클릭하면 가구가 놓여. 배치 후 드래그로 이동, 우클릭으로 제거.',
    target: 'shop-furniture',
    advanceOn: 'next',
  },
  {
    id: 'shop-done',
    text: '상점 안내 끝! 마음껏 꾸며서 너만의 사무실을 만들어봐 🎉',
    target: null,
    advanceOn: 'next',
    cta: '닫기',
  },
]

/** 설정(⚙) 팝업 안 🎓 → 설정 옵션 안내 트랙 (Day 14). 모달이 열린 상태에서만 동작.
 *  target은 SettingsModal의 기존 data-section 값을 재사용. */
export const SETTINGS_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'set-intro',
    text: '여기는 ⚙ 설정 창이야. 각 항목을 하나씩 짚어줄게.',
    target: null,
    advanceOn: 'next',
  },
  {
    id: 'set-apikey',
    text: '🔑 API 키 — 무료 Gemini나 유료 Anthropic 키를 여기서 등록해. 키가 있어야 진짜 대화가 돼 (없으면 데모).',
    target: 'api-key',
    advanceOn: 'next',
  },
  {
    id: 'set-model',
    text: '🧠 기본 대화 모델 — 새로 채용하는 직원에게 기본으로 붙는 모델이야.',
    target: 'default-model',
    advanceOn: 'next',
  },
  {
    id: 'set-memory',
    text: '💾 메모리 갱신 모델 — 직원의 "기억 정리"에 쓰는 모델이야. 보통 무료로 충분해.',
    target: 'memory-model',
    advanceOn: 'next',
  },
  {
    id: 'set-usage-display',
    text: '📊 사용량 표시 방식 — 채팅창에서 사용량을 칩으로 볼지, 토글로 볼지 정해.',
    target: 'usage-display',
    advanceOn: 'next',
  },
  {
    id: 'set-limit',
    text: '💰 일일 비용 한도 — 이 금액을 넘으면 사무실이 강제로 밤이 되며 대화가 멈춰. 과금 안전장치야.',
    target: 'daily-limit',
    advanceOn: 'next',
  },
  {
    id: 'set-promotion',
    text: '📈 진급 속도 — 전체 직원의 진급 난이도 배율이야. 🚀빠름부터 🏔매우 느림까지.',
    target: 'promotion-speed',
    advanceOn: 'next',
  },
  {
    id: 'set-usage-detail',
    text: '📈 모델별 사용량 — 이번 세션에 모델별로 얼마나 썼는지(요청·토큰·비용) 볼 수 있어.',
    target: 'usage-detail',
    advanceOn: 'next',
  },
  {
    id: 'set-done',
    text: '설정 안내 끝! 바꾼 값은 아래 "저장"을 눌러야 적용돼. 창은 닫아도 좋아.',
    target: null,
    advanceOn: 'next',
    cta: '닫기',
  },
]
