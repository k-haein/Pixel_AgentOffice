# M2 — UI 채널 완성 (Claude 연결 전 준비)

> 마일스톤 도달일: 2026-05-13
> 소요 시간: 약 반나절 (디자인 논의 + 코드 구현 + 종합 테스트 + 피드백 라운드)
> 코드 라인 수: ~1,400 LOC (M1 대비 +700)

---

## 🎯 목표

> "사용자가 직접 캐릭터를 채용·해고·편집할 수 있는 UI 채널을 완성한다. 그래야 Claude를 연결했을 때 의미 있는 테스트가 가능하다."

M1은 하드코딩된 Mary로 동작했지만, M2부터는 **사용자가 동적으로 조작 가능한 UI 채널**이 완성됨.

---

## ✅ 달성한 것

### 영속화 인프라
- [x] JSON 파일 기반 데이터 저장 (`%APPDATA%\pixelagentoffice\app-data.json`)
- [x] Electron `userData` 경로 활용
- [x] 첫 실행 시 기본 직원 2명(Mary, Haewol) 자동 생성
- [x] 새 필드 추가 시 자동 마이그레이션 (`migrateEmployee()`)
- [x] 캐시 레이어 (`cachedData`)

### IPC 브릿지
- [x] `electron/preload.ts` → `window.api` 노출
- [x] 5개 IPC 핸들러: `data:load`, `employee:add/update/remove`, `settings:update`
- [x] TypeScript 타입 안전성 (`src/types/global.d.ts`)

### 3개 모달 UI
- [x] **⚙️ SettingsModal**: API 키 (placeholder), 기본/메모리 모델, 비용 한도
- [x] **📋 HireModal**: 템플릿 선택, 이름/역할/직급/진급 방식/모델, 빈 자리 자동 배치
- [x] **📝 MemoModal**: 기본 지침(읽기 전용), 커스텀 지침(편집), 모델·메모리 모드 변경, 해고

### 사무실 씬 동적화
- [x] 영속 데이터에서 직원 로딩 → 워크스테이션 자동 생성
- [x] 데이터 변경 시 자동 rebuild (해고/채용 즉시 반영)
- [x] 책상 위 📝 메모지 픽셀 그리드 + 클릭 이벤트
- [x] 💬 채팅 말풍선 (단일 클릭으로 채팅) — UX 개선

### UX 디테일
- [x] ESC 키로 모든 모달 닫기
- [x] 모달 backdrop 클릭으로 닫기
- [x] "✓ 저장되었습니다" 토스트 (0.9초 후 자동 닫힘)
- [x] 채용 시 폼 자동 reset (조건부 마운트 패턴)
- [x] 호버 효과 (말풍선·메모지 살짝 확대 + 손가락 커서)
- [x] 최대 2명 제한 (채용 버튼 자동 disabled + 카운터 표시)
- [x] 해고된 직원의 채팅창 자동 닫힘 (`chat:force-close` 이벤트)

---

## 🔧 기술적 의사결정

| 결정 | 선택 | 이유 |
|---|---|---|
| 데이터 영속화 방식 | JSON 파일 (electron userData) | SQLite는 과함, M2는 데이터 단순 |
| 모달 마운트 전략 | 조건부 마운트 (`{open && <Modal />}`) | React 19 새 룰 + props 초기화 |
| Memo 모달 재마운트 | `key={employee.id}` prop | 다른 employee 시 강제 재마운트 |
| 라디오 vs 버튼 | **버튼** (Memory mode, Promotion mode) | radio + display:none 일부 환경 click 안 됨 |
| 메모지 vs 메모리 분리 | 메모지엔 지침만 (사용자 관리) | "Mary 여러명이면 메모리 일일이 관리 못 함" |
| 채팅 시작 UX | 💬 말풍선 단일 클릭 + 더블클릭 backup | 더블클릭 발견성 ↓ |
| Phaser scene listener cleanup | `isShutdown` 플래그 + `!this.add` 가드 | HMR/StrictMode 안전 |

---

## 🐛 발견 + 수정한 버그 (총 11개)

### 종합 테스트에서 발견 (7개)
1. `employeesRef` 일반 객체 → `useRef` (stale closure 위험)
2. 채용 자리 겹침 → 빈 자리 찾기 알고리즘
3. 채용 후 폼 reset 안 됨 → 조건부 마운트
4. 해고 시 채팅창 안 닫힘 → `chat:force-close`
5. ESC 키 미동작 → window keydown listener
6. 마이그레이션 X → `migrateEmployee()`
7. HMR 시 Scene listener 누수 → `isShutdown` 가드

### 사용자 테스트 피드백에서 발견 (3개)
8. 메모리 모드 변경 안 됨 (`<input style="display:none">` 일부 환경 click 안 됨) → 버튼 변환
9. 더블클릭 발견성 낮음 → 💬 말풍선 단일 클릭
10. API 키 / 비용 한도 작동 안 함을 명확히 표시 X → 큰 경고 박스 + disabled

### 코드 품질 (1)
11. TS unused 2건 + `any` 4건 + React 19 useEffect setState 룰 → ESLint 0 errors

---

## 💡 디자인 인사이트

### "사용자 관리 vs 시스템 관리" 분리
사용자가 정정한 핵심 통찰:
> "메모지엔 지침만(기본+커스텀). 메모리는 따로. Mary를 여러명 만들 수도 있는데 그걸 일일이 관리 못 해."

→ 사용자 정신 부담 ↓. 시스템이 알아서.

### "토큰 vs 메모리" 레벨 분리
> "토큰은 전체 공유 (회사 바). 메모리는 직원 개별 (졸음 표현)."

→ 시각적 표현이 명확해짐.

### "캐릭터 voice 진급 모달"
> "누가 회사원한테 '똑똑해졌어요'라고 그래? 캐릭터가 입장에서 '저... 승진은 언제?' 라고 물어보거나, 연봉 협상 시즌이라고."

→ 직원을 도구가 아닌 캐릭터로 존중. 게임적 재미 ↑.

### "Claude 먼저 vs UI 먼저"
원래 권장은 Claude 먼저 (B안)였지만, 사용자가 "테스트할 때 생성해보고 대화해보고 하잖아"라고 짚어서 UI 채널을 먼저 만드는 게 맞다고 합의. M3 에 진입했을 때 의미 있는 테스트가 가능해짐.

---

## 📐 코드 구조 (M2 추가분)

```
PixelAgentOffice/
├─ electron/
│  ├─ data/
│  │  └─ store.ts          # 🆕 JSON 영속화 + 마이그레이션
│  ├─ main.ts              # IPC 핸들러 추가
│  └─ preload.ts           # window.api 노출
└─ src/
   ├─ shared/
   │  └─ types.ts          # 🆕 Employee/Settings/Template
   ├─ types/
   │  └─ global.d.ts       # 🆕 window.api 타입
   ├─ components/
   │  ├─ ChatPopup.tsx
   │  ├─ SettingsModal.tsx # 🆕
   │  ├─ HireModal.tsx     # 🆕
   │  └─ MemoModal.tsx     # 🆕
   └─ game/
      ├─ OfficeScene.ts    # 동적 워크스테이션 + 메모지 클릭 + 💬 말풍선
      ├─ characters/
      │  └─ Clawd.ts
      ├─ pixelArt.ts
      └─ eventBus.ts
```

---

## 🚧 의도적으로 미구현 (다음 마일스톤)

| 기능 | 마일스톤 | 이유 |
|---|---|---|
| API 키 실제 저장 (safeStorage) | M3-a | Claude 연결과 묶음 |
| Mock 응답 → 실제 Claude | M3-a | 핵심 작업 |
| 토큰 카운팅 + 한도 차단 | M3-b | 실제 사용량 데이터 필요 |
| 채팅 영속화 | M3-c | 진짜 대화 생기면 |
| 메모리 시스템 동작 | M4 | 진짜 대화 후 압축 |
| 진급 시스템 동작 | M6 | 실 사용 데이터 누적 후 |
| 토큰 보드 UI | M5 | 실 데이터 필요 |
| 시간대 변화 | M5 | 토큰 시스템과 묶음 |
| 이모트 라이브러리 | M5 | 풍부화 단계 |

---

## 📊 통계

- **코드 파일 (M2 신규)**: 7개 (store.ts, types.ts, global.d.ts, 3 모달, IPC 갱신)
- **총 코드 파일**: 25개
- **순 추가 LOC**: ~700 (M1 → M2)
- **수정한 버그**: 11개
- **추가된 모달**: 3종 + ChatPopup 갱신
- **IPC 핸들러**: 5개
- **린트 / TypeScript 에러**: 0
- **빌드 시간**: 1.6초

---

## 🎯 다음 마일스톤 — M3-a

이제 의미 있는 채널이 다 있음. M3-a부터 진짜 Claude를 붙임:

1. API 키 입력 + Electron `safeStorage` 저장
2. `@anthropic-ai/claude-agent-sdk` (또는 SDK) 설치
3. Main process에서 Claude API 호출 (preload 브릿지 추가)
4. ChatPopup의 mock 응답을 실제 호출로 교체
5. 시스템 프롬프트 = 기본 지침 + 커스텀 지침 (메모리는 M4)
6. 스트리밍 응답 표시

→ 이제부터 진짜 "쓸 수 있는 도구"가 됨.
