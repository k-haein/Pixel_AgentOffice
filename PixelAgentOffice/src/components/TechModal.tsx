/**
 * 기술 스택 · 설계 패널 (?) — 포트폴리오 열람자용.
 *
 * 이 앱에서 유일하게 줄글을 써도 되는 곳이다. 다른 화면은 "동작하는 것"을 보여주지만
 * 여기는 애초에 읽으러 오는 곳이기 때문이다. 대신 짧게 쓴다.
 *
 * 원칙: 무엇을 썼는지가 아니라 *왜 그걸 골랐는지*를 적는다.
 * 기술 선택은 대부분 트레이드오프이고, 남는 기록은 그 판단이다.
 */

import { useState } from 'react'
import './TechModal.css'

type Props = { onClose: () => void }

const STACK: { group: string; items: { name: string; why: string }[] }[] = [
  {
    group: '데스크톱 · 셸',
    items: [
      {
        name: 'Electron',
        why: '일반 사용자에게 exe 더블클릭보다 낮은 진입 장벽이 없습니다. 후보였던 Python은 배포 자동화에서 막혀 탈락했습니다. OS 키체인에 API 키를 암호화 저장하는 것도 웹으로는 불가능한 부분이었습니다.',
      },
      {
        name: 'Platform Adapter (자체)',
        why: '화면 코드가 Electron API를 직접 부르지 못하게 어댑터를 한 겹 뒀습니다. 명목은 "언젠가 모바일이나 웹으로 갈 때를 위해"였는데, 실제로 지금 보고 계신 이 웹 데모가 그 투자로 나왔습니다. 화면 코드는 한 줄도 고치지 않았습니다.',
      },
    ],
  },
  {
    group: '화면',
    items: [
      {
        name: 'Phaser 4',
        why: '사무실은 캐릭터·책상·가구가 좌표 위에서 움직이는 게임 씬입니다. DOM으로 만들면 겹침 정렬과 클릭 판정을 직접 짜야 합니다.',
      },
      {
        name: 'React 19',
        why: '반대로 모달·폼을 게임 엔진으로 그리면 손해입니다. 씬은 Phaser, UI는 React로 나누고 그 사이를 이벤트 버스로 연결했습니다. 각자 잘하는 것만 시킵니다.',
      },
      {
        name: '픽셀 렌더러 (자체)',
        why: '캐릭터와 가구를 이미지가 아니라 코드로 그립니다. 에셋 라이선스 위험이 없고 색만 바꿔 변형을 만들 수 있습니다. 대신 12×12 그리드라 표정 같은 미세한 표현에는 한계가 있습니다 — 눈 표정을 4픽셀로 시도했다가 되돌린 적이 있습니다.',
      },
    ],
  },
  {
    group: 'AI',
    items: [
      {
        name: 'Vercel AI SDK',
        why: 'Claude·Gemini·GPT를 하나의 인터페이스로 다룹니다. 처음엔 각 사 SDK를 직접 썼는데, 도구 호출(tool calling)을 붙이면서 provider마다 형식이 달라 전환했습니다.',
      },
      {
        name: 'BYOK (사용자 키)',
        why: '사용자가 자기 API 키를 넣습니다. 우리는 비용도 법적 책임도 지지 않습니다. 단점은 그 자체가 진입 장벽이라는 것이고, 그래서 키 없이도 도는 데모 모드를 따로 만들었습니다 — 지금 이 데모가 그 모드입니다.',
      },
      {
        name: '에이전트 루프 (자체)',
        why: 'LLM 호출 → 도구 실행 → 결과 주입 → 반복. 20스텝 상한을 두되 도달해도 예외를 던지지 않고 "여기까지 했다"로 정상 반환합니다. 도구가 실패해도 오류를 모델에게 되돌려줘 루프가 죽지 않고 모델이 스스로 복구합니다.',
      },
    ],
  },
  {
    group: '안전장치 · 테스트',
    items: [
      {
        name: '사용량 한도 (자체)',
        why: '분당 요청은 슬라이딩 윈도로 미리 차단하고, 일일 비용 상한은 메인 프로세스에서 실제로 막습니다. 처음엔 화면에 표시만 하고 막지는 않았는데, 회고에서 "표시만 하는 상한은 상한이 아니다"로 판정해 고쳤습니다.',
      },
      {
        name: '에러 한글 매핑',
        why: 'API 원본 오류에는 요청 URL과 키 일부가 섞여 나옵니다. 전부 한글 안내로 매핑하고, 동시에 담당 직원 캐릭터를 시무룩하게 만듭니다. 에러를 읽는 일이 덜 불쾌해집니다.',
      },
      {
        name: 'vitest + Playwright',
        why: '유닛 67개 + E2E 6스펙. 팀 위임 기능에서 팀원이 쓴 토큰이 합계에 안 잡히던 버그를 잡아낸 게 테스트였습니다. 눈으로는 못 봤을 종류의 오류입니다.',
      },
    ],
  },
]

const DATA: { name: string; role: string; why: string }[] = [
  {
    name: 'app-data.json',
    role: '직원 · 좌석 · 설정 · 대화 이력',
    why: '관계형 데이터가 아니라 "내 사무실의 현재 상태" 한 덩어리입니다. 사용자는 1명이고 동시 접근이 없으니 DB를 둘 이유가 없었습니다. OS 사용자 폴더에 JSON 파일 하나로 둡니다.',
  },
  {
    name: 'OS 키체인',
    role: 'API 키',
    why: 'JSON에 같이 넣으면 평문으로 남습니다. provider별로 분리해 OS 암호화 저장소에 넣고, 앱은 "있다/없다"만 확인합니다.',
  },
  {
    name: 'Seat (좌석)',
    role: '조직 내 위치',
    why: '조직도 테이블이 따로 없습니다. 좌석 id가 곧 조직 내 위치이고, 팀원 목록은 저장값이 아니라 좌석에서 매번 계산합니다. 화면에 보이는 배치가 유일한 진실입니다 — 자세히는 "핵심 인터페이스" 탭.',
  },
  {
    name: '폐기 모델 자동 교체',
    role: '마이그레이션',
    why: 'Gemini 2.0 Flash가 폐기되면서 저장돼 있던 모델 id가 죽는 사고가 있었습니다. 이후로는 데이터를 읽는 시점에 폐기된 id를 살아있는 id로 자동 교체합니다.',
  },
  {
    name: '웹 데모 (지금 이 화면)',
    role: '서버 없음',
    why: '이 데모에는 백엔드가 없습니다. 채용한 직원도 배치한 가구도 방문자 브라우저에만 남고 저희에게 전송되지 않습니다. 수집하는 데이터가 0이라 개인정보 문제가 생길 여지 자체가 없습니다.',
  },
]

const KICK_RULES: { title: string; body: string }[] = [
  {
    title: '규칙 1 — 자리가 역할을 결정한다',
    body: '리더석에 앉으면 팀장, 옆 자리에 앉으면 그 팀의 팀원입니다. 역할을 지정하는 별도 설정 화면이 없습니다. 캐릭터를 다른 자리로 옮기면 조직도가 그 자리에서 바뀝니다.',
  },
  {
    title: '규칙 2 — 같은 팀은 같은 열',
    body: '팀장의 팀원 명단은 저장된 값이 아니라 좌석에서 계산됩니다. 관리해야 할 조직도 데이터가 아예 존재하지 않습니다.',
  },
  {
    title: '규칙 3 — 위임은 좌석을 벗어날 수 없다',
    body: '팀장 AI에게 넘기는 지시문에는 자기 팀원 명단만 들어갑니다. 옆 팀에 간섭할 수단이 지시문 수준에서 없습니다.',
  },
  {
    title: '권한은 진급으로 얻는다',
    body: '팀장이 되려면 과장 이상이어야 하고, 진급은 대화·메모·칭찬이 쌓여야 합니다. 즉 함께 일한 이력이 있어야 남에게 일을 시킬 권한이 생깁니다. 설정값이 아니라 관계의 결과로 권한이 생기는 모델입니다.',
  },
]

const KICK_TABLE: { want: string; code: string; here: string }[] = [
  { want: '팀 만들기', code: 'Crew(agents=[...])', here: '리더석에 캐릭터 배치' },
  { want: '팀원 추가', code: 'agents 배열에 추가', here: '옆 팀원석에 배치' },
  { want: '위임 권한 부여', code: 'allow_delegation=True', here: '과장으로 진급' },
  { want: '실행', code: 'crew.kickoff()', here: '팀장 우클릭 → 팀 작업' },
  { want: '진행 관찰', code: '콘솔 로그', here: '캐릭터 연출 + 위임 카드' },
]

const PLANNING: { title: string; now: string; effect: string }[] = [
  {
    title: 'AI 팀을 구성하려면 왜 항상 개발자가 필요한가',
    now: 'CrewAI·AutoGen·LangGraph 모두 에이전트 간 위계와 위임 권한을 코드로 선언합니다. 그래서 "이런 팀을 만들어줘"는 기획자가 직접 못 하고 개발자에게 부탁해야 하는 일이 됩니다.',
    effect: '위계를 공간 배치로 표현하면 그 부탁이 사라집니다. 이 프로토타입이 검증하려던 게 정확히 이 지점입니다.',
  },
  {
    title: '위임 권한이 켜고 끄는 스위치 하나인 게 맞나',
    now: '기존 도구에서 "이 에이전트가 남에게 일을 시켜도 되는가"는 설정 한 줄입니다. 켜거나 끄거나 둘 중 하나입니다.',
    effect: '진급 시스템으로 바꾸면 권한이 이력의 결과가 됩니다. 실무에서도 신입에게 바로 위임 권한을 주지는 않습니다. 조직 은유가 테마가 아니라 권한 모델로 기능하는 지점입니다.',
  },
  {
    title: '에러는 기능이 될 수 있다',
    now: '일일 비용 한도에 걸리면 보통 빨간 오류창이 뜨고, 사용자는 무엇을 잘못했는지 모릅니다.',
    effect: '이 앱은 사무실을 밤으로 만들고 직원들을 퇴근시킵니다. 차단이라는 사실은 같은데 사용자가 상황을 즉시 이해합니다. 제약을 감추지 않고 연출로 바꾼 사례입니다.',
  },
  {
    title: '그리고 — 이 방향은 제품화하지 않기로 했습니다',
    now: '사용자는 exe 다운로드와 API 키 발급이라는 두 겹의 벽을 넘어야 첫 대화를 합니다. 경쟁 상대는 같은 경험을 무료로, 모바일에서, 설치만으로 제공합니다.',
    effect: '만들어보기 전에는 내릴 수 없던 판단입니다. 좌석 16석·위계 2단계라는 표현력 상한도 직접 구현하고 나서야 명확해졌습니다. 이 프로젝트의 산출물은 완성된 제품이 아니라, 그 판단에 도달한 근거와 동작하는 프로토타입입니다.',
  },
]

const TABS = [
  { key: 'stack', label: '기술 스택' },
  { key: 'data', label: '데이터' },
  { key: 'kick', label: '핵심 인터페이스' },
  { key: 'planning', label: '기획 관점' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function TechModal({ onClose }: Props) {
  const [tab, setTab] = useState<TabKey>('stack')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal tech-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>기술 스택 · 설계</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="tech-intro">
          무엇을 썼는지가 아니라 <strong>왜 그걸 골랐는지</strong>를 적었습니다.
          기술 선택은 대부분 트레이드오프이고, 남는 기록은 그 판단이라고 생각합니다.
        </div>

        <div className="tech-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`tech-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {tab === 'stack' && STACK.map(g => (
            <section className="tech-card" key={g.group}>
              <h3 className="tech-group">{g.group}</h3>
              {g.items.map(it => (
                <div className="tech-item" key={it.name}>
                  <div className="tech-name">{it.name}</div>
                  <p className="tech-why">{it.why}</p>
                </div>
              ))}
            </section>
          ))}

          {tab === 'data' && (
            <>
              <p className="tech-lead">
                이 앱에는 데이터베이스가 없습니다. 사용자가 1명이고 동시 접근이 없기 때문입니다.
              </p>
              {DATA.map(d => (
                <section className="tech-card" key={d.name}>
                  <div className="tech-name">
                    {d.name} <span className="tech-role">{d.role}</span>
                  </div>
                  <p className="tech-why">{d.why}</p>
                </section>
              ))}
            </>
          )}

          {tab === 'kick' && (
            <>
              <p className="tech-lead">
                이 프로젝트의 발명품은 픽셀 사무실이 아니라,
                <strong> 에이전트 위계를 코드가 아니라 좌석 배치로 정의하는 인터페이스</strong>입니다.
              </p>

              <section className="tech-card">
                <h3 className="tech-group">문제</h3>
                <p className="tech-why">
                  멀티 에이전트 도구는 위계와 위임 권한을 전부 코드로 선언합니다.
                  그래서 "AI 팀을 만든다"는 행위 자체가 개발자에게 묶여 있습니다.
                </p>
              </section>

              {KICK_RULES.map(r => (
                <section className="tech-card" key={r.title}>
                  <div className="tech-name">{r.title}</div>
                  <p className="tech-why">{r.body}</p>
                </section>
              ))}

              <section className="tech-card">
                <h3 className="tech-group">같은 일을 어떻게 하는가</h3>
                <div className="tech-table">
                  <div className="tech-tr tech-th">
                    <span>하고 싶은 것</span><span>CrewAI (코드)</span><span>여기 (공간)</span>
                  </div>
                  {KICK_TABLE.map(r => (
                    <div className="tech-tr" key={r.want}>
                      <span>{r.want}</span>
                      <span className="tech-mono">{r.code}</span>
                      <span className="tech-here">{r.here}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="tech-card tech-honest">
                <h3 className="tech-group">아직 검증하지 못한 것</h3>
                <p className="tech-why">
                  지금까지 증명된 것은 <strong>이 인터페이스가 동작한다</strong>는 것까지입니다.
                  이 방식이 코드보다 <em>실제로 더 쉬운지</em>는 아직 근거가 없습니다.
                  좌석은 16석, 위계는 2단계가 상한이고, 조건 분기나 병렬 합류 같은 흐름을
                  공간으로 표현할 방법은 아직 없습니다.
                </p>
                <p className="tech-why">
                  검증하려면 비개발자 5명에게 같은 과제를 주고 CrewAI 문서를 대조군으로 두어
                  완료 시간을 비교해야 합니다. 그 실험은 아직 하지 않았습니다.
                </p>
              </section>
            </>
          )}

          {tab === 'planning' && PLANNING.map(p => (
            <section className="tech-card" key={p.title}>
              <div className="tech-name">{p.title}</div>
              <p className="tech-why"><span className="tech-badge">현재</span>{p.now}</p>
              <p className="tech-why"><span className="tech-badge tech-badge-eff">그래서</span>{p.effect}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
