/**
 * 튜토리얼(T1) 단계 정의 — Day 14.
 *
 * 컨셉: 문 비서(🐙 문어 캐릭터)가 사장님께 사무실을 안내한다. 말투는 존댓말, 호칭은 "사장님".
 * 버튼 이름은 [대괄호]로 표기한다(예: [+ 채용], [✓ 채용 완료]).
 *
 * 트랙 구성:
 *  - FIRST_RUN_STEPS: 최초/다시보기용 — 채용→대화→직원관리(메모)→상점→설정까지 한 흐름으로 자동 연속.
 *    (App이 단계 zone에 맞춰 해당 모달을 자동으로 열고 닫음. 최초 채용은 메리로 강제 + 편집 잠금.)
 *  - 각 트랙(SHOP/SETTINGS/MEMO)_TUTORIAL_STEPS: 해당 창 안 🎓로 단독 실행 시 사용(끝에 "닫기").
 *
 * 순수 데이터 모듈 (React/Phaser 의존 없음) — 단위 테스트·재사용 가능.
 */

/** 단계 진행 조건 — 'next'는 "다음" 클릭, 나머지는 실제 행동(채용/대화/키설정)으로 자동 진행 */
export type TutorialAdvance = 'next' | 'employee-hired' | 'chat-opened' | 'api-key-set'

/** 스팟라이트 대상 — DOM 요소의 data-tutorial / data-section 속성값. null=중앙 안내(전체 딤). */
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

// ── 메인 안내 코어 (환영 → API키 → 채용폼 전체 → 대화 → 칭찬 → 우클릭 → 화면이동) ──────
const MAIN_CORE: TutorialStep[] = [
  {
    id: 'welcome',
    text: '사장님, 출근하셨습니까. 🐙\n저는 오늘부터 사장님을 모실 문 비서입니다. 이곳은 사장님의 AI 사무실이에요. 직원(AI)을 채용해 여러 가지 대화를 시켜보는 곳입니다. 제가 차근차근 안내해 드릴게요.',
    target: null,
    advanceOn: 'next',
  },
  {
    id: 'apikey',
    text: '먼저, 직원과 대화하려면 AI API 키가 필요합니다. 무료 Gemini로 바로 시작하실 수 있어요. 받는 방법을 알려드릴까요?',
    target: null,
    advanceOn: 'api-key-set',
  },
  {
    id: 'apikey-ok',
    text: 'API 키 등록을 마쳤습니다! 🎉 이제 첫 직원을 채용해 보시죠.',
    target: null,
    advanceOn: 'next',
    next: 'hire',
  },
  {
    id: 'apikey-later',
    text: '괜찮습니다! API 키는 언제든 ⚙ 설정의 [API 키 설정]에서 넣으실 수 있어요. 우선 직원부터 만들어 보시죠.',
    target: null,
    advanceOn: 'next',
    next: 'hire',
  },
  {
    id: 'hire',
    text: '그럼 첫 직원을 채용하겠습니다. 위쪽 [+ 채용] 버튼을 눌러 주세요.',
    target: 'hire',
    advanceOn: 'next',
    requireAction: true,
  },
  // ── 채용 폼 안내 (모달 열렸을 때 자동 진입. 최초에는 메리로 고정 + 편집 잠금) ──────
  {
    id: 'hire-template',
    text: '채용 창이 열렸습니다. 처음이라 제가 편집자 “Mary”로 맞춰 두었어요 — 지금은 그대로 따라오시면 됩니다. (나중엔 [새 직원]으로 자유롭게 만드실 수 있어요.)',
    target: 'hire-template',
    advanceOn: 'next',
  },
  {
    id: 'hire-team',
    text: '어느 팀에 앉힐지 정하는 곳입니다. 지금은 [팀 A]로 두겠습니다.',
    target: 'hire-team',
    advanceOn: 'next',
  },
  {
    id: 'hire-name',
    text: '직원 이름입니다. “Mary”로 채워져 있죠? 나중엔 원하시는 이름으로 바꾸실 수 있어요.',
    target: 'hire-name',
    advanceOn: 'next',
  },
  {
    id: 'hire-role',
    text: '역할(직업)입니다. “편집자”처럼 이 직원이 무슨 일을 하는지 적는 곳이에요.',
    target: 'hire-role',
    advanceOn: 'next',
  },
  {
    id: 'hire-instructions',
    text: '성격·말투를 정하는 곳입니다. 비워두면 기본값으로 시작하고, 나중에 메모지에서 언제든 바꾸실 수 있어요.',
    target: 'hire-instructions',
    advanceOn: 'next',
  },
  {
    id: 'hire-appearance',
    text: '외형입니다. 무늬(단색·점박이·그라데이션·줄무늬)를 고를 수 있고, [새 직원]은 색도 바꾸실 수 있어요.',
    target: 'hire-appearance',
    advanceOn: 'next',
  },
  {
    id: 'hire-mbti',
    text: 'MBTI를 정하면 그 성격대로 대답합니다. 비워두셔도 돼요. 옆의 [ⓘ] 버튼을 누르면 16종 설명이 나옵니다 — 한번 눌러보세요.',
    target: 'hire-mbti',
    advanceOn: 'next',
  },
  {
    id: 'hire-rank',
    text: '초기 직급입니다. 보통 [알바]부터 시작해 대화하며 진급해요. (⭐ 과장 이상만 팀 리더 자리에 앉습니다.)',
    target: 'hire-rank',
    advanceOn: 'next',
  },
  {
    id: 'hire-promotion',
    text: '진급 방식을 고르는 곳입니다. 정량(대화 수)·시간(근속)·정성(칭찬)·혼합·수동 중에서요. 자세한 기준은 아래 설명을 봐 주세요.',
    target: 'hire-promotion',
    advanceOn: 'next',
  },
  {
    id: 'hire-model',
    text: '대화에 쓸 AI 모델입니다. 무료 Gemini로 시작할 수 있고, 키가 없으면 데모로 동작해요.',
    target: 'hire-model',
    advanceOn: 'next',
  },
  {
    id: 'hire-submit',
    text: '다 됐습니다. 아래 [✓ 채용 완료] 버튼을 눌러 Mary를 출근시켜 주세요!',
    target: 'hire-submit',
    advanceOn: 'next',
    requireAction: true,
  },
  {
    id: 'chat',
    text: '좋습니다, 직원이 출근했어요! 사무실의 직원을 더블클릭하면 대화창이 열립니다. 말을 걸어보세요.',
    target: 'canvas',
    advanceOn: 'chat-opened',
  },
  {
    id: 'praise',
    text: '대화 답변 아래 [👍]를 누르면 “칭찬”이 쌓입니다. 직원의 기분은 머리 위 말풍선에 표정으로 떠올라요.',
    target: 'canvas',
    advanceOn: 'next',
  },
  {
    id: 'context',
    text: '직원을 우클릭하면 자리 이동·책상 회전·💬 채팅 열기·📝 메모지 열기가 나옵니다. (지침·기억·해고 같은 직원 관리는 다음에 보여드릴 메모지 안에 있어요.)',
    target: 'canvas',
    advanceOn: 'next',
  },
  {
    id: 'navigate',
    text: '사무실이 크면 둘러보세요 — 왼쪽 위 [🔎] 버튼이나 마우스 휠로 확대·축소하고, 빈 공간을 드래그하면 화면을 옮길 수 있어요.',
    target: 'canvas',
    advanceOn: 'next',
  },
]

// ── 메모지(직원 관리) 코어 ──────────────────────────────────────────────
const MEMO_CORE: TutorialStep[] = [
  {
    id: 'memo-intro',
    text: '여기는 📝 직원 메모지입니다. 채용한 뒤 이 직원의 거의 모든 것을 여기서 바꾸실 수 있어요. 하나씩 짚어 드릴게요.',
    target: null,
    advanceOn: 'next',
  },
  {
    id: 'memo-identity',
    text: '🪪 정체성입니다. 이름·역할·이모지를 바꿀 수 있고, 위에 현재 직급과 입사일도 보여요.',
    target: 'memo-identity',
    advanceOn: 'next',
  },
  {
    id: 'memo-base',
    text: '⚙️ 기본 지침입니다. 채용 때 정한 캐릭터의 정체성이에요.',
    target: 'memo-base',
    advanceOn: 'next',
  },
  {
    id: 'memo-custom',
    text: '✏️ 커스텀 지침입니다. 이 직원만의 행동 규칙이에요 (예: 반말 금지). 매 대화에 적용됩니다.',
    target: 'memo-custom',
    advanceOn: 'next',
  },
  {
    id: 'memo-model',
    text: '🧠 대화 모델입니다. 직원마다 따로 정하실 수 있어요 (무료 Gemini / 유료 Claude).',
    target: 'memo-model',
    advanceOn: 'next',
  },
  {
    id: 'memo-memory-mode',
    text: '💾 메모리 모드입니다. 기억을 언제 갱신할지 정해요. OFF·수동·미리보기(ASK)·자동 중에서요. 보통 자동이면 충분합니다.',
    target: 'memo-memory-mode',
    advanceOn: 'next',
  },
  {
    id: 'memo-emotion',
    text: '🎭 기본 감정입니다. 평소 이 직원 말풍선에 뜰 표정이에요. 대화 답변에 따라 잠깐 바뀌었다가 이 기본값으로 돌아옵니다.',
    target: 'memo-emotion',
    advanceOn: 'next',
  },
  {
    id: 'memo-memory',
    text: '🧠 기억입니다. 이 직원이 대화에서 기억하는 내용이에요. 직접 적으셔도 되고, [기억 정리]를 누르면 대화를 모델이 요약해 채워줍니다. 다음 대화부터 자동으로 참고해요.',
    target: 'memo-memory',
    advanceOn: 'next',
  },
  {
    id: 'memo-stats',
    text: '📊 그간 활동입니다. 대화·지침 수정·받은 칭찬 횟수예요. 진급(정량·정성) 조건의 기준이 되는 숫자들입니다.',
    target: 'memo-stats',
    advanceOn: 'next',
  },
  {
    id: 'memo-promotion',
    text: '📈 진급입니다. 진급 방식을 고르면 조건을 채웠을 때 직원이 진급을 요청해요. 아래 막대로 진행도가 보이고, 이사 직급은 사장님이 직접 임명하십니다.',
    target: 'memo-promotion',
    advanceOn: 'next',
  },
  {
    id: 'memo-fire',
    text: '🗑 해고입니다. 이 직원을 내보내요 — 대화 기록과 기억도 함께 지워지니 신중히 결정해 주세요.',
    target: 'memo-fire',
    advanceOn: 'next',
  },
]

// ── 상점 코어 ──────────────────────────────────────────────────────────
const SHOP_CORE: TutorialStep[] = [
  {
    id: 'shop-intro',
    text: '여기는 🛒 상점입니다. 사무실을 꾸미는 것들을 골라볼게요.',
    target: null,
    advanceOn: 'next',
  },
  {
    id: 'shop-plate',
    text: '🪧 팀 팻말 디자인입니다. 카드를 누르면 모든 팀의 팻말 모양이 바로 바뀌어요 (나무·매달림·돌 등).',
    target: 'shop-plate',
    advanceOn: 'next',
  },
  {
    id: 'shop-emotion',
    text: '🎭 감정 미리보기입니다. 캐릭터가 12가지 감정을 말풍선에 어떻게 표현하는지 미리 보실 수 있어요.',
    target: 'shop-emotion',
    advanceOn: 'next',
  },
  {
    id: 'shop-furniture',
    text: '🪑 가구·꾸미기입니다. [사무실에 배치]를 누르고 원하는 위치를 클릭하면 가구가 놓여요. 배치 후 드래그로 이동, 우클릭으로 제거합니다.',
    target: 'shop-furniture',
    advanceOn: 'next',
  },
]

// ── 설정 코어 (target은 SettingsModal의 기존 data-section 값 재사용) ──────
const SETTINGS_CORE: TutorialStep[] = [
  {
    id: 'set-intro',
    text: '여기는 ⚙ 설정 창입니다. 항목을 하나씩 짚어 드릴게요.',
    target: null,
    advanceOn: 'next',
  },
  {
    id: 'set-apikey',
    text: '🔑 API 키입니다. 무료 Gemini나 유료 Anthropic 키를 여기서 등록해요. 키가 있어야 진짜 대화가 됩니다 (없으면 데모).',
    target: 'api-key',
    advanceOn: 'next',
  },
  {
    id: 'set-model',
    text: '🧠 기본 대화 모델입니다. 새로 채용하는 직원에게 기본으로 붙는 모델이에요.',
    target: 'default-model',
    advanceOn: 'next',
  },
  {
    id: 'set-memory',
    text: '💾 메모리 갱신 모델입니다. 직원의 “기억 정리”에 쓰는 모델이에요. 보통 무료로 충분합니다.',
    target: 'memory-model',
    advanceOn: 'next',
  },
  {
    id: 'set-usage-display',
    text: '📊 사용량 표시 방식입니다. 채팅창에서 사용량을 칩으로 볼지, 토글로 볼지 정해요.',
    target: 'usage-display',
    advanceOn: 'next',
  },
  {
    id: 'set-limit',
    text: '💰 일일 비용 한도입니다. 이 금액을 넘으면 사무실이 강제로 밤이 되며 대화가 멈춰요. 과금 안전장치입니다.',
    target: 'daily-limit',
    advanceOn: 'next',
  },
  {
    id: 'set-promotion',
    text: '📈 진급 속도입니다. 전체 직원의 진급 난이도 배율이에요. 🚀빠름부터 🏔매우 느림까지요.',
    target: 'promotion-speed',
    advanceOn: 'next',
  },
  {
    id: 'set-usage-detail',
    text: '📈 모델별 사용량입니다. 이번 세션에 모델별로 얼마나 썼는지(요청·토큰·비용) 보실 수 있어요.',
    target: 'usage-detail',
    advanceOn: 'next',
  },
]

// ── 트랙 전환 안내 (FIRST_RUN 전용 — 다음 트랙으로 넘어가기 직전) ──────────
const TO_MEMO: TutorialStep = {
  id: 'to-memo',
  text: '이제 직원을 어떻게 관리하는지 보여드릴게요. 직원의 메모지를 열어보겠습니다.',
  target: null,
  advanceOn: 'next',
  cta: '📝 직원 관리 보기',
}
const TO_SHOP: TutorialStep = {
  id: 'to-shop',
  text: '다음은 사무실을 꾸미는 🛒 상점을 보여드릴게요.',
  target: null,
  advanceOn: 'next',
  cta: '🛒 상점 보기',
}
const TO_SETTINGS: TutorialStep = {
  id: 'to-settings',
  text: '마지막으로 ⚙ 설정을 보여드릴게요.',
  target: null,
  advanceOn: 'next',
  cta: '⚙ 설정 보기',
}

/** 최초/다시보기 전체 흐름 — 채용→대화→메모→상점→설정까지 자동 연속 (App이 모달을 zone에 맞춰 제어). */
export const FIRST_RUN_STEPS: TutorialStep[] = [
  ...MAIN_CORE,
  TO_MEMO,
  ...MEMO_CORE,
  TO_SHOP,
  ...SHOP_CORE,
  TO_SETTINGS,
  ...SETTINGS_CORE,
  {
    id: 'all-done',
    text: '안내는 여기까지입니다, 사장님! 🎉\n이제 직원과 대화하고 칭찬하며 사무실을 키워보세요. 다시 보고 싶으시면 언제든 오른쪽 위 [🎓 튜토리얼] 버튼을 눌러 주세요.',
    target: null,
    advanceOn: 'next',
    cta: '시작하기',
  },
]

/** 메인 단독 트랙 (fallback) — 각 창 안 🎓로 상점·설정·메모를 따로 보도록 안내하며 마무리. */
export const TUTORIAL_STEPS: TutorialStep[] = [
  ...MAIN_CORE,
  {
    id: 'done',
    text: '안내는 여기까지입니다, 사장님! 🎉 🛒 상점·⚙ 설정·📝 메모지 사용법은 각 창 안의 [🎓] 버튼을 누르면 그때 자세히 알려드릴게요.',
    target: null,
    advanceOn: 'next',
    cta: '시작하기',
  },
]

/** 상점(🛒) 팝업 안 🎓 → 상점 옵션 단독 안내 트랙. 모달이 열린 상태에서만 동작. */
export const SHOP_TUTORIAL_STEPS: TutorialStep[] = [
  ...SHOP_CORE,
  {
    id: 'shop-done',
    text: '상점 안내는 여기까지입니다. 마음껏 꾸며서 사장님만의 사무실을 만들어 보세요 🎉',
    target: null,
    advanceOn: 'next',
    cta: '닫기',
  },
]

/** 설정(⚙) 팝업 안 🎓 → 설정 옵션 단독 안내 트랙. 모달이 열린 상태에서만 동작. */
export const SETTINGS_TUTORIAL_STEPS: TutorialStep[] = [
  ...SETTINGS_CORE,
  {
    id: 'set-done',
    text: '설정 안내는 여기까지입니다. 바꾼 값은 아래 [저장]을 눌러야 적용돼요. 창은 닫으셔도 좋습니다.',
    target: null,
    advanceOn: 'next',
    cta: '닫기',
  },
]

/** 메모지(📝) 모달 안 🎓 → 직원 편집·기억 단독 안내 트랙. 모달이 열린 상태에서만 동작. */
export const MEMO_TUTORIAL_STEPS: TutorialStep[] = [
  ...MEMO_CORE,
  {
    id: 'memo-done',
    text: '메모지 안내는 여기까지입니다. 바꾼 값은 아래 [💾 저장]을 눌러야 적용돼요. 직원을 키우며 지침과 기억을 다듬어 보세요 🎉',
    target: null,
    advanceOn: 'next',
    cta: '닫기',
  },
]
