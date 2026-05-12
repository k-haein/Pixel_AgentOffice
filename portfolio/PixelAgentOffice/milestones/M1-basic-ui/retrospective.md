# M1 — 단일 에이전트 기본 UI

> 마일스톤 도달일: 2026-05-12
> 소요 시간: 약 1 세션 (스캐폴드부터 픽셀 도트 완성까지)
> 코드 라인 수: ~700 LOC (TypeScript + TSX + CSS)

---

## 🎯 목표

> "Electron 앱이 뜨고, 픽셀 사무실에서 캐릭터를 더블클릭하면 채팅창이 열리고, mock 응답이 돌아온다."

기획 단계(M0)를 끝낸 직후, **실제 동작하는 데스크탑 앱**으로 첫 결과물을 만드는 것이 목적.

---

## ✅ 달성한 것

### 인프라
- [x] Vite + React 19 + TypeScript 6 + Electron 42 풀스택
- [x] `vite-plugin-electron`으로 메인 프로세스 자동 빌드
- [x] `pnpm dev` 한 번으로 데스크탑 윈도우 자동 실행
- [x] HMR (React 변경 즉시 반영)

### 게임 엔진 통합
- [x] Phaser 4 → React 컴포넌트 안에서 canvas로 마운트
- [x] Phaser 씬 ↔ React UI 양방향 이벤트 (`eventBus.ts`)
- [x] StrictMode 이중 마운트 대응 (gameRef 가드)

### 그래픽
- [x] 픽셀 그리드 헬퍼 `drawPixelGrid()` — 문자열 배열을 픽셀 아트로 렌더
- [x] Clawd 캐릭터 (12×12 픽셀, 4다리, 검은 눈, 오렌지 본체)
- [x] 사무실 요소 전부 도트화 (책상·의자·모니터·마우스·태양·구름)
- [x] 구름 4개 80초 주기 드리프트
- [x] 일하는 ✦ 펄스, idle bob, 호버 확대

### UI 동작
- [x] 캐릭터 더블클릭 → 채팅 팝업 등장
- [x] 메시지 입력 → typing 점 애니메이션 → mock 응답
- [x] Phaser 캐릭터 상태 동기화 (working ↔ idle)
- [x] 상단바 (타이틀·메뉴) + 상태바

---

## 🔧 기술적 의사결정

| 결정 | 선택 | 이유 |
|---|---|---|
| 백엔드 언어 | TypeScript + Node (Electron) | 배포 자동화 우선 (Python 배제) |
| 빌드 도구 | Vite 8 + `vite-plugin-electron/simple` | 빠른 HMR, 단일 설정 |
| 게임 엔진 | Phaser 4 | 드래그/스프라이트/씬 표준 지원 |
| 캐릭터 렌더링 | **픽셀 그리드 (문자열 → 사각형)** ⭐ | 코드로 표현, 진짜 도트 느낌 |
| Phaser ↔ React 통신 | 자체 EventBus | 간단·의존성 없음 |
| 모듈 시스템 | ESM (`type: "module"`) | Electron 42 ESM 지원 |
| 패키지 매니저 | pnpm 10 | 빠르고 디스크 효율 |

---

## 🐛 만났던 이슈와 해결

### 1. `vite-plugin-electron-renderer` 의존성 못 찾음
**증상**: pnpm 격리 호이스팅 때문에 `renderer` 옵션이 sub-dep을 못 찾음
**해결**: `renderer: {}` 옵션 제거. 일반 React 앱이라 renderer 플러그인 불필요.

### 2. AudioContext 경고
**증상**: 콘솔에 "Cannot suspend a closed AudioContext"
**원인**: React StrictMode가 컴포넌트를 두 번 마운트해서 Phaser 게임도 두 번 생성됨
**해결**: 무시 가능 (프로덕션 빌드에서 사라짐). `gameRef.current` 가드로 인스턴스 중복 방지.

### 3. Phaser 씬 HMR 안 됨
**증상**: OfficeScene.ts 수정 시 화면 갱신 안 됨
**원인**: Phaser 씬은 클래스 closure로 캡처되어 모듈 교체로 갱신 어려움
**해결**: 사용자 `Ctrl+R`로 수동 새로고침. (HMR 자동화는 추후 과제)

---

## 🎨 Clawd 디자인 4번 반복

| 시도 | 결과 | 사용자 피드백 |
|---|---|---|
| **v1** 단순 원 + 점 | placeholder | "Clawd 캐릭터 쓰자" |
| **v2** 블러시·반짝·미소 cute 풍 | 너무 디테일 | "구려, 못생겼다" |
| **v3** 미니멀 외곽선 + 2다리 | Mascot 정체성 회복 | "1/4 크기, 4다리로" |
| **v4** 픽셀 그리드 방식 ⭐ | **🎯 채택** | "그래 이거야!" |

→ **교훈**: 픽셀 아트는 직사각형 조합이 아니라 **픽셀 단위 매핑**이 핵심. `drawPixelGrid` 헬퍼를 만든 게 결정적이었음.

---

## 📐 코드 구조

```
PixelAgentOffice/
├─ electron/
│  ├─ main.ts            # 윈도우 생성, dev URL 로드
│  └─ preload.ts         # 추후 IPC용 (현재 비어있음)
└─ src/
   ├─ main.tsx           # React 진입점
   ├─ App.tsx            # 레이아웃 (상단바/스테이지/상태바)
   ├─ App.css            # 스타일
   ├─ components/
   │  └─ ChatPopup.tsx   # 채팅 팝업 + mock 응답
   └─ game/
      ├─ PhaserGame.tsx  # React → Phaser 마운트
      ├─ OfficeScene.ts  # 사무실 씬 (Phaser)
      ├─ eventBus.ts     # Phaser ↔ React 이벤트 브릿지
      ├─ pixelArt.ts     # drawPixelGrid 헬퍼
      └─ characters/
         └─ Clawd.ts     # Clawd 픽셀 그리드 정의
```

---

## 💡 배운 점

1. **제약이 결정을 단순화한다** — 배포 자동화 요구 하나가 Python을 자동 배제하고 Electron으로 가게 만들었다.
2. **헬퍼 추상화의 위력** — `drawPixelGrid`를 만들고 나니 모든 요소를 도트화하는 게 5분 작업이 됐다.
3. **사용자 피드백 루프가 빠를수록 좋다** — 캐릭터 디자인 4번 반복은 1시간 안에 끝났고, 각 라운드마다 명확한 개선이 있었다.
4. **HMR ≠ 자동 갱신** — Phaser 같은 stateful 라이브러리는 React HMR과 별개로 다뤄야 한다.

---

## 🚧 미해결 / 다음 단계

### 보완할 점
- [ ] Phaser 씬 HMR 자동화 (옵션: Vite plugin or scene restart 로직)
- [ ] React StrictMode 이중 마운트 우아하게 처리
- [ ] 자동 빌드/배포 (`electron-builder` 셋업 미진행)
- [ ] 스크린샷 캡처해서 `screenshots/` 에 추가

### M2 후보 작업
- 채용 모달 (캐릭터 갤러리 + 이름 + 역할)
- 실제 LLM 연결 (`@anthropic-ai/claude-agent-sdk`)
- 권한 UI + 비용 한도
- 채팅 히스토리 영속화 (SQLite)

---

## 📊 통계

- **코드 파일**: 18개
- **총 LOC**: ~700
- **Clawd 픽셀**: 12×12 = 144 픽셀
- **사무실 픽셀 요소**: 6종 (sun, cloud, desk, chair, monitor, mouse)
- **에이전트 수**: 1 (Mary · 편집자)
- **mock 응답 패턴**: 5종 랜덤 (1.2~1.8초 지연)
