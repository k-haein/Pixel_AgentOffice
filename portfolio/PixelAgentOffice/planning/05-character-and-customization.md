# 캐릭터 시스템 & 사무실 커스터마이징

> 작성: 2026-05-12
> 핵심 비전: **"AI 에이전트를 채용하고 사무실을 꾸미는 게임형 IDE"**
> 영감: Two Point Hospital + The Sims + AI Town

---

## 컨셉 한 줄

> 사용자가 마음에 드는 픽셀 캐릭터를 골라 → 이름 짓고 → 역할 부여하고 → 책상에 앉히고 → 자기 사무실을 꾸민다. 그 캐릭터들이 진짜 AI 에이전트로 일한다.

---

## 캐릭터 시스템

### 캐릭터 패밀리 2종

**(1) Clawd 패밀리 (메인)**
- Anthropic 마스코트 Clawd 풍 — 오렌지 블록형 픽셀 캐릭터
- 다양한 변형: 안경 Clawd, 모자 Clawd, 헤드폰 Clawd, 아기 Clawd, 좀비 Clawd 등
- 통일된 비주얼 아이덴티티 → 사무실이 귀엽고 일관적
- **⚠️ 배포 시 라이선스 고려 필요** — 개인/학습은 OK, 공개 배포 전 결정:
  - (A) "Clawd 영감 받은 오리지널 캐릭터" 자체 제작 (안전)
  - (B) Anthropic에 문의

**(2) Human 캐릭터 (기타 옵션)**
- 일반 직장인 픽셀 캐릭터 (남/녀, 다양한 외모)
- 대표 직업군 아이콘:
  - 🧪 테스터 (실험복)
  - 🔍 리뷰어 (돋보기)
  - ✍️ 글쓰는 사람 (펜)
  - 🔧 고치는 사람 (스패너)
  - 📊 분석가 (차트)
  - 👨‍💼 매니저 (정장)
- 다양성을 위한 옵션 (모든 사용자가 Clawd를 좋아하지 않을 수 있음)

### 캐릭터 데이터 구조 (초안)

```ts
type Character = {
  id: string;
  family: 'clawd' | 'human';
  variant: string;          // 'clawd-glasses', 'human-tester' 등
  spriteSheet: string;      // 경로
  animations: {
    idle: string;
    working: string;
    happy: string;
    thinking: string;
  };
};

type Employee = {
  id: string;
  characterId: string;      // Character 참조
  name: string;             // 사용자가 지은 이름 ("Mary", "팀장님")
  role: AgentRole;          // worker/reviewer/tester/leader/...
  deskPosition: { x: number; y: number };
  // 진짜 에이전트로 연결되는 필드
  agentDefinition: AgentDefinition;
};
```

---

## 채용 시스템 (Hiring Flow)

**UX 흐름 (예정)**
1. 사용자 클릭 "+ 새 직원 채용" 버튼
2. 캐릭터 갤러리 모달 등장 → 사용 가능한 캐릭터 카드 일람
3. 캐릭터 선택 → 이름 입력 → 역할 선택
4. 책상 위치 자동 배정 (또는 직접 드래그 배치)
5. 새 캐릭터가 사무실에 입장 애니메이션
6. 더블클릭으로 즉시 명령 가능

**확장 아이디어**
- 초기 보유 캐릭터는 한정 (5~10종) → 사용/레벨업으로 잠금 해제? (게임적 동기)
- 사용자가 PNG 스프라이트를 드래그해서 커스텀 캐릭터 추가 가능
- 이름 위에 작은 직급 뱃지 (사원/대리/팀장 같은)

---

## 사무실 커스터마이징

### 이동 가능한 요소
- 책상 (이동/회전)
- 의자 (책상과 함께)
- 캐릭터 (자리 옮기기)
- 추후: 화분, 화이트보드, 자판기, 소파, 카펫 등 데코 아이템

### 인터랙션
- **드래그**: 책상 잡고 옮기기 (그리드 스냅)
- **충돌**: 다른 책상/벽과 겹치지 않게 자동 회피
- **부서 그룹화**: 같은 부서끼리 가까이 모이면 시각적 클러스터 강조
- 우클릭/길게 누름 → 컨텍스트 메뉴 (회전, 삭제, 정보)

### 향후 확장 (Phase 1.4+)
- 사무실 테마 (모던 / 사이버펑크 / 일본식 / 우주선)
- 방 확장 (회의실, 휴게실, 서버실)
- 시간대 (낮/밤 조명 변화)
- BGM/효과음

---

## UI 옵션 재평가 — Phaser 확정

새 요구사항을 반영하면 Phaser가 명백한 선택:

| 요구사항 | Phaser | PixiJS | React+CSS |
|---|---|---|---|
| 드래그앤드롭 | ✅ 1줄 | 🟡 직접 구현 | 🟡 라이브러리 필요 |
| 그리드 스냅 | ✅ 표준 | 🟡 | 🟡 |
| 스프라이트 애니메이션 | ✅ 1줄 | 🟡 | ❌ 어려움 |
| 캐릭터 이동 (자율) | ✅ Tween | 🟡 | ❌ |
| 충돌 검사 | ✅ 표준 | 🟡 | ❌ |
| 채용 모달 등 React UI | 🟡 분리 필요 | 🟡 | ✅ |

→ **사무실 씬 = Phaser**, **모달/메뉴 = React** 하이브리드

### 통합 패턴

```
[Electron App]
├─ React shell (전체 UI)
│   ├─ Top bar / Menu
│   ├─ Office canvas 영역 (여기에 Phaser 게임 마운트)
│   ├─ Side panel (선택된 에이전트 정보)
│   └─ Modals (채용 모달, 채팅 팝업, 설정)
└─ Phaser game (canvas 안에서 동작)
    ├─ Office scene (사무실 렌더링)
    ├─ Character sprites
    ├─ Drag handlers
    └─ Animation system
```

Phaser → React 이벤트 (캐릭터 더블클릭 시 React 모달 열기)
React → Phaser 이벤트 (채용 완료 시 Phaser 씬에 새 캐릭터 추가)

---

## 단계적 도입 로드맵

| 단계 | 기능 | 기술 도입 |
|---|---|---|
| **Phase 1.0** | 정적 mockup (현재) | React + CSS |
| **Phase 1.1** | Phaser 도입, Clawd 1종 + 일하는 애니메이션 | + Phaser |
| **Phase 1.2** | 채용 모달, 캐릭터 갤러리 (5~10종) | + 상태 관리 |
| **Phase 1.3** | 책상/에이전트 드래그 재배치, 그리드 스냅 | Phaser 인터랙션 |
| **Phase 1.4** | 사무실 데코 아이템 (화분, 보드 등) | 에셋 추가 |
| **Phase 2.0** | Claude Agent SDK 연결 (진짜 LLM) | + agent SDK |
| **Phase 2.1** | Seegene 에이전트 임포트 | |
| **Phase 3.0** | 자율 시뮬레이션 (캐릭터 이동, 자율 의사결정) | |

---

## 에셋 전략

**(1) 직접 제작**
- Aseprite 같은 픽셀 도구로 그림
- 초기엔 시간 많이 듦
- 장점: 완전한 커스터마이징, 라이선스 깨끗

**(2) 무료/구매 에셋 활용** ⭐ 추천
- itch.io / OpenGameArt — "modern office", "top-down pixel" 검색
- Kenney.nl — 무료 게임 에셋 (CC0)
- 장점: 빠른 프로토타입, 다양한 종류

**(3) AI 이미지 생성**
- Midjourney / DALL-E로 픽셀 스타일 캐릭터 생성
- 단점: 스프라이트 시트(여러 프레임)에는 부적합
- 정적 캐릭터 카드/아이콘엔 OK

**1차 추천**: 무료 에셋(Kenney의 office pack 등)으로 빠르게 시작 → 핵심 Clawd 캐릭터는 직접 또는 의뢰

---

## 에셋 폴더 구조 — Swappable 캐릭터 팩 (확정)

**핵심 원칙**: 코드는 **캐릭터 ID만** 안다. 실제 스프라이트는 폴더에서 동적 로딩.
→ "Clawd로 개발 → 배포 직전 자체 캐릭터로 교체"가 **코드 변경 0**으로 가능.

### 폴더 레이아웃

```
assets/
└─ characters/
    ├─ _registry.json            # 활성 팩 + 사용 가능한 팩 목록
    ├─ clawd-default/            # 1차 개발용 (현재)
    │   ├─ manifest.json         # 팩 메타: 이름, 버전, 라이선스, 작가
    │   ├─ clawd-basic/
    │   │   ├─ sprite.png        # 스프라이트 시트 (idle/working/등)
    │   │   ├─ frames.json       # 프레임 좌표 정의
    │   │   └─ portrait.png      # 채용 화면 카드용 큰 그림
    │   ├─ clawd-glasses/
    │   ├─ clawd-headphone/
    │   └─ ...
    ├─ humans-default/           # Human 캐릭터 팩
    │   ├─ manifest.json
    │   ├─ tester/
    │   ├─ reviewer/
    │   └─ ...
    └─ original-default/         # 배포용 자체 캐릭터 (나중에)
        ├─ manifest.json
        └─ ...
```

### `_registry.json` 예시

```json
{
  "activePacks": ["clawd-default", "humans-default"],
  "availablePacks": [
    {
      "id": "clawd-default",
      "path": "clawd-default/",
      "enabled": true,
      "distributable": false   // 배포 빌드에서 제외
    },
    {
      "id": "original-default",
      "path": "original-default/",
      "enabled": false,
      "distributable": true
    }
  ]
}
```

### `manifest.json` 예시 (팩 단위)

```json
{
  "packId": "clawd-default",
  "name": "Clawd Family",
  "version": "1.0.0",
  "author": "Anthropic-inspired",
  "license": "internal use only - do not distribute",
  "characters": [
    {
      "id": "clawd-basic",
      "displayName": "Basic Clawd",
      "spriteSheet": "clawd-basic/sprite.png",
      "frames": "clawd-basic/frames.json",
      "portrait": "clawd-basic/portrait.png",
      "animations": {
        "idle":    { "frames": [0, 1, 2, 3], "frameRate": 4, "repeat": -1 },
        "working": { "frames": [4, 5, 6, 7], "frameRate": 8, "repeat": -1 },
        "happy":   { "frames": [8, 9],       "frameRate": 4, "repeat": -1 }
      }
    }
  ]
}
```

### 코드는 ID만 안다

```ts
const employee = {
  characterId: "clawd-basic",   // 이 ID만 알면 됨
  name: "Mary",
  role: "worker",
};
// 어떤 png 파일인지, 어떤 폴더인지는 CharacterRegistry가 매핑
```

→ **Clawd → 자체 캐릭터 교체 = `_registry.json`에서 활성 팩만 변경.** 코드는 그대로.

### 부가 효과

1. **사용자 커스텀 팩** — 폴더에 png + manifest 넣으면 자동 인식 (MOD 느낌)
2. **시즌/테마 팩** — 할로윈 Clawd, 크리스마스 Clawd 등 쉽게 추가
3. **라이선스 격리** — Clawd 팩은 `.gitignore`에서 제외, 배포 빌드는 `distributable: true` 팩만 번들
4. **A/B 디자인 비교** — 사용자가 팩을 토글하며 선호도 테스트

### 라이선스 처리 정책

- 개발 중: `clawd-default/` 사용 (개인 학습용)
- 배포 전: `original-default/` 자체 디자인 완성 → registry 교체
- `clawd-default/`는 `.gitignore` 권장 (실수로 공개 저장소에 안 올라가게)

---

## 미정

- [ ] Clawd 라이선스 — 자체 디자인 vs Anthropic 문의 (배포 직전 결정)
- [ ] 1차 캐릭터 셋 (몇 종으로 시작?)
- [ ] 추천 페이지 전체 목록 (다음 작업)
