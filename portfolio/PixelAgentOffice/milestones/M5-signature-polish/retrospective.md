# M5-a/b — 시그니처 폴리시 시작: 시간대 + 사무실 구조 재설계

> 마일스톤 도달일: 2026-05-15 (Day 6)
> 소요: 약 1세션
> 코드 라인 수: 약 +700 LOC (M4 대비)
> 상태: M5-a 시간대 ✅ 검증 완료 / M5-b 사무실 구조 (B-1+B-2) ✅ 검증 완료

---

## 🎯 목표

**M5 시그니처 폴리시의 첫 두 단추**:
- M5-a: 사무실에 *살아있는 분위기* 부여 (시간대 + 토큰 고갈 야간)
- M5-b: 사용자가 직접 그린 *위계적 사무실 구조* 구현 (사장 + 3팀)

남은 M5 단계:
- B-3 채용 / 자리 변경 UI
- B-4 책상 회전
- B-5 줌 / 카메라
- M5-c 토큰 보드 (사장석 뒤 LED)
- M5-d 성격 + 토큰 고갈 애니메이션
- M5-e 회복 애니메이션

---

## ✅ M5-a 달성

### 시간대 시스템 (timeOfDay.ts 신규)
- [x] 5단계 `TimeOfDay` 타입 + 팔레트 (camera bg / sky / divider / cloud alpha / celestial / star alpha)
- [x] `getTimeOfDay(now)` 실제 시각 추론 (06-11 아침 / 11-15 점심 / 15-18 노을 / 18-21 저녁 / 21-06 밤)
- [x] `msUntilNextTransition()` 다음 경계까지 정확한 ms 계산

### OfficeScene 통합
- [x] 시간대 자동 갱신 타이머 (`scheduleNextTimeRefresh`)
- [x] `tweens.addCounter` RGB 보간 — 1.5초 부드러운 트랜지션
- [x] 별(stars) 8개 — 밤에만 alpha 1, 살짝 깜빡임
- [x] 구름 alpha 시간대별 (밤엔 0.3)
- [x] 우측 상단 시간대 라벨 ("🌅 아침" 등)
- [x] 강제 야간 모드 — `office:night-mode` eventBus 리스닝

### ChatPopup 연동
- [x] `isPersonaPaused` 변화 시 `eventBus.emit('office:night-mode', { forced })`
- [x] 한 직원이라도 한도 도달 = 전체 사무실 강제 야간

---

## ✅ M5-b (B-1 + B-2) 달성

### 데이터 모델 확장 (types.ts)
- [x] `RANK_ORDER` 배열 + `rankGte(a, b)` 비교
- [x] `canBeTeamLeader(rank)` — 과장 이상 + 사장 제외
- [x] `canBeBoss(rank)` — 사장/회장/레전드
- [x] `TeamId` ('A'|'B'|'C')
- [x] `DeskOrientation` ('front'|'left'|'right') — B-4용 필드 마련
- [x] `SeatId` template literal — 'boss' | `leader:${TeamId}` | `member:${TeamId}:${0|1|2|3}`
- [x] Employee에 `seatId`, `deskOrientation` 추가, `deskPosition` 레거시(optional)

### 자리 시스템 (seats.ts 신규)
- [x] `ALL_SEATS`: 16개 자리 메타 (xRatio, yRatio, team, role, label)
- [x] `SEAT_LOOKUP`: id → meta 빠른 조회
- [x] `seatsOfTeam()`, `isTeamActive()`, `visibleTeams()` — 팀 점진 확장 로직
- [x] `findNextEmptyMemberSeat()`, `findNextEmptyLeaderSeat()` — 채용 자동 배치

### 저장 마이그레이션 (store.ts)
- [x] `migrateEmployees()` 배열 단위 — seatId 누락 직원에게 빈 팀원 자리 자동 할당
- [x] createDefaultData 갱신 — Mary='member:A:0', Haewol='member:A:1'

### OfficeScene 재디자인
- [x] `workstations` Map 키 = SeatId (이전: employee.id)
- [x] `rebuildWorkstations()` — `visibleTeams()` 호출하여 보이는 팀만 그림
- [x] `createWorkstation(x, y, employee | null, seatMeta)` 통합:
  · 빈 자리: 의자/책상/모니터만 alpha 55~60% 회색조
  · 사장석: 책상 1.3배 크기 + "👑 사장석" 노랑 명패
  · 리더 자리: 명패 ⭐ + 노랑 배경 강조
  · 팀원 자리: 기존 형식
- [x] `drawTeamLabels()` — 보이는 팀 아래 "— 팀 A —" 텍스트
- [x] `setStateHandler` employee.id로 iterate 검색 (workstations 키 변경 대응)

---

## 🔧 기술적 의사결정

| 결정 | 선택 | 이유 |
|---|---|---|
| 시간 추론 | 실제 PC 시각 기반 + 토큰 고갈 시 강제 야간 | 직관적 + 시그니처 폴리시 트리거 |
| 색 보간 | `tweens.addCounter` + Phaser.Display.Color.Interpolate | Phaser 표준 API, 부드러운 RGB 보간 |
| 자리 좌표 | 상대 비율(xRatio, yRatio) | 캔버스 리사이즈에 자동 적응 |
| SeatId 타입 | template literal types | 타입 안전 + autocomplete 친화 |
| 팀 등장 규칙 | A 다 차야 B, B 다 차야 C | 점진 성장 게임감, 사용자가 명시적으로 원함 |
| 빈 자리 시각 | alpha 55-60% 회색조 | "회사가 비어있다 → 채용해야 한다" 동기 부여 |
| 리더 자격 | 과장 이상 (사장 제외) | 한국 직급 위계 자연스러움 |
| workstations 키 | seatId | 빈 자리도 추적, employee.id로 검색은 iterate |
| 사장석 | 책상 1.3배 + 명패만 (캐릭터 X) | 미래 사장 채용 위해 자리만 잡아둠 |

---

## 🐛 만난 이슈와 해결

### 1. HMR 스테일 캐시 (deskPosition 참조 잔재)
**증상**: 데이터 모델 변경 후 OfficeScene이 옛 `emp.deskPosition.x` 참조하다 `Cannot read 'x'` 에러
**해결**: Dev server 재시작으로 fresh module 로드

### 2. createWorkstation의 employee null 처리
**증상**: 빈 자리도 그려야 하는데 기존 코드는 employee 전제
**해결**: 함수 시그니처 변경(`employee: Employee | null, seat: SeatMeta`) + 조건부 렌더 (chair/desk/monitor는 항상, character/chat/memo/nameplate는 employee가 있을 때만)

### 3. setStateHandler lookup 변경
**증상**: workstations Map 키가 SeatId로 바뀌어서 employee.id로 못 찾음
**해결**: iterate로 employee.id 매칭하여 워크스테이션 찾기

---

## 💡 핵심 인사이트

### "사용자가 명확한 그림이 있으면, 자유 배치(B)보다 고정 layout(A)이 빠르다"
사용자가 ASCII 스케치로 정확한 사무실 구조 제시 → 드래그 시스템 같은 큰 인프라 없이도 즉시 그릴 수 있는 A형으로 결정. 꾸미기는 추후 *옵션*으로 분리 가능.

### "팀 점진 확장 = 회사 성장 게임감"
빈 자리 회색조 + 채용 시 자리 채워짐 + 팀 다 차면 새 팀 등장 = *"내 회사가 커지고 있다"* 체감. The Sims / Two Point 게임 시그니처와 정합.

### "시간대 = 게임 분위기 + 토큰 고갈 시각화"
시간대를 단순 *시계*가 아닌 *사무실 분위기*로 표현 → 토큰 고갈을 *밤 사무실*로 자연스럽게 시각화. 시그니처 폴리시 layer 1 (날씨/시간) + layer 2 (페르소나 자리비움)이 결합.

---

## 📐 코드 구조 (M5 추가/수정분)

```
PixelAgentOffice/
├─ src/
│  ├─ shared/
│  │  ├─ types.ts          # 🔧 RANK_ORDER, rankGte, canBeTeamLeader, canBeBoss,
│  │  │                    #    TeamId, DeskOrientation, SeatId, Employee.seatId/deskOrientation
│  │  └─ seats.ts          # 🆕 ALL_SEATS 16개 + SEAT_LOOKUP + visibleTeams + findNextEmpty*
│  ├─ game/
│  │  ├─ timeOfDay.ts      # 🆕 5단계 팔레트 + getTimeOfDay + msUntilNextTransition
│  │  └─ OfficeScene.ts    # 🔧 시간대 시스템 + 사무실 재디자인 (seatId 기반)
│  └─ components/
│     └─ ChatPopup.tsx     # 🔧 isPersonaPaused → office:night-mode 이벤트
└─ electron/
   └─ data/store.ts        # 🔧 migrateEmployees (배열 단위), seatId 자동 할당
```

---

## 📊 통계

- **신규 파일**: 2개 (`timeOfDay.ts`, `seats.ts`)
- **수정 파일**: 4개 (types/OfficeScene/store/ChatPopup)
- **순 추가 LOC**: 약 700
- **새 eventBus 이벤트**: 1개 (`office:night-mode`)
- **TypeScript 에러**: 0

---

## 🚧 의도적 미구현 (M5 후속)

| 항목 | 마일스톤 | 이유 |
|---|---|---|
| 채용 모달 팀/자리 선택 UI | B-3 | 자동 배치로 우선 동작 |
| 우클릭 → 자리 변경 / 회전 | B-3/B-4 | UI 디테일, 별도 작업 |
| 책상 좌/우 회전 시각화 | B-4 | 픽셀 에셋 회전 작업 필요 |
| 마우스 휠 줌 / 모바일 핀치 | B-5 | 카메라 시스템 별도 |
| 토큰 보드 (사장석 뒤 LED) | M5-c | 사용량 데이터 시각화 |
| 성격별 토큰 고갈 애니메이션 | M5-d | personality 필드 + 스프라이트 |
| 회복 부활 애니메이션 | M5-e | 전체 폴리시 마무리 |
| 2층 (Team Office) | M5+1 | 1F 완성 후 |

---

## 🎯 다음 단계 후보

1. **B-3 채용/자리 변경 UI** — 가장 자연스러운 다음 (사용자가 팀 선택해서 채용)
2. **M5-c 토큰 보드** — 사장석 뒤 LED, M4 사용량 데이터 시각화
3. **꾸미기 Lv 1** — 가구 풀 (별도 트랙으로 점진 도입)
4. **B-5 줌 + 모바일 대응** — 모바일 출시 검토 시 우선
