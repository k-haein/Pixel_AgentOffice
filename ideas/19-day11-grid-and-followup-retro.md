# Day 11 후속 회고 — 그리드 확대 실패 + G/A/B/C 작업 완료

> 2026-05-21 (Day 11 후반). 그리드 확대 2번 시도 실패 → 원복 → 다른 작업 4개(HANDOFF 정리 + 가구 배치 + 채팅 영구화 + 빈 자리 숨김) 진행.

---

## 1. 그리드 확대 시도 — 두 번 모두 실패

### 시도 1: 16×14 cells PIXEL_SIZE 2 (32×28 px)
- 사용자 요청: "캐릭터만 좀 더 크게, v2.5 디테일 부활"
- Claude 옵션 비교 → 사용자 "옵션 2. 16×14 PIXEL_SIZE 2 (추천)" 선택
- 작업: Clawd 4종 (basic/headphones/jellyfish/custom) 모두 16×14로 재그림. ACCESSORY/EYE_EXPRESSION/DESK_ITEM도 새 사이즈로 재디자인. 우연히 새 grid의 눈 local 좌표가 기존과 동일(±6, -6) — eyesClosed/chatBubble/hit area 변경 불필요. 빌드 통과.
- 사용자 검증: **"너무 못생겻어....캐릭터가 아까 보내준 이미지만큼 나오려면 더 그리드를 확대해야해?"**

### 시도 2: 32×24 cells (캐릭터 64×48 px) + 가구 PIXEL_SIZE 3
- Claude 옵션 비교 (24×20 추천 / 32×24 / PNG) → 사용자 "32×24 (레퍼런스 수준)" 선택
- 작업량 컸음:
  - Clawd 4종 32×24로 재그림 (머리 16 + 다리 8, 큰 눈 4×4, 흰 하이라이트, 작은 입)
  - 가구 PIXEL_SIZE 2 → 3 (책상·의자·모니터·lamp·memo·desk_item)
  - 좌표 1.5배 비례 조정 (chair -44→-66, monitor -13→-20, lamp/memo/desk_item 모두)
  - getClawdPos -44→-66
  - chatBubble Y -36→-50
  - nameplate Y deskY+28→deskY+42
  - boss plate deskY+38→deskY+57
  - hireZone 80×100→120×150
  - eyesClosed 좌표 (-6,-6)/(6,-6)→(-14,-3)/(14,-3) 폭 14
  - EYE_EXPRESSION 16×4 → 32×6 재디자인
  - 빌드 통과
- 사용자 검증: **"걍 그리드 사이즈 키우는거 전체 원복하자....그리드 사이즈 안키울래. 아까 키우기 전에 커밋해놨지? 그떄로 다시 원복하자...너무 못생겼다"**

### 원복
- `git restore` 3개 파일 (Clawd.ts / OfficeScene.ts / ShopModal.tsx) → `449fdbf` 시점 완전 복귀
- 12×12 PIXEL_SIZE 2로 복원 ✓

---

## 2. 왜 그리드 확대로는 안 되는가

### Claude의 픽셀 디자인 한계
- 픽셀 그리드 문자열 (`'..OOOOOO..'`)로 단순 마스코트(12×12) 그리는 건 OK
- 32×24처럼 셀 수가 많아지면 외곽·디테일·비례를 머리로 계산해서 문자열로 그려야 함
- 결과는 *셀 수는 많지만 디자인 직관이 없는 어색한 결과*
- 레퍼런스 이미지(16 octopus)는 픽셀아티스트가 직접 그린 작품 — Claude가 흉내 불가

### 해결책: PNG asset 도입
- Aseprite/Piskel로 사용자가 직접 그림
- 무제한 디테일, 그라데이션, 앤티앨리어싱 가능
- Claude는 Phaser preload + spritesheet animation 코드만 담당
- v2.5 액세서리·소품·눈 표정도 PNG 도입 시점에 한 번에 부활

### 다음 사용자가 PNG 도입을 결정한다면
1. 캐릭터 6종 PNG (basic·headphones·jellyfish·custom + 측면 left/right + 추가 variant)
2. 액세서리 3종 PNG (glasses·sunglasses·cap)
3. 소품 3종 PNG (mug·plant·laptop)
4. 눈 표정 5종 PNG (closed·happy·love·surprised·star)
5. Phaser preload + texture atlas + animation
6. v2.5 코드 `if` 주석 해제 → 시각 부활

---

## 3. G/A/B/C 작업 완료

원복 후 사용자: "그다음 뭐하지" → Claude 옵션 비교 → 사용자 "G 먼저 정리하고 A,B,C 순서대로"

### G. HANDOFF 정리
- Header / §1 30초 요약 / §3 cleanup에서 "🚨 그리드 확대 우선" 블록 제거
- Day 11 후반 그리드 확대 시도 실패 회고 추가
- 다음 작업 우선순위: P2 #25 → 채팅 영구화 → 빈 자리 숨김 → M5-d / Phase 3
- "PNG asset 도입 시점에 v2.5 부활" 명시

### A. P2 #25 가구 배치 드래그앤드롭 (8종)
**범위 결정**: α (기존 3종만) / β (3종 + 5종 추가) / γ (12종 전체) 중 **β** 선택.

**구현**:
- types.ts: `FurnitureId` 8종 + `PlacedFurniture { uid, itemId, xRatio, yRatio }` + `Settings.placedFurniture`
- OfficeScene.ts: 신규 픽셀 5종 (SOFA / CALENDAR / FRAME / TRASH_CAN / LOUNGE_TABLE) + `FURNITURE_SPECS` 매핑 + `drawPlacedFurniture()` 함수
- App.tsx: `furniture:placed` / `furniture:moved` / `furniture:removed` 이벤트 → platform.updateSettings → office:settings emit
- ShopModal.tsx: SHOP_CATALOG 12종 중 8종에 "🏢 사무실에 추가" 활성화

**드래그 UX**: Phaser native draggable + dragstart 알파 0.7 + dragend → emit + 우클릭 제거 + hover cursor `grab`

**좌표 영속화**: xRatio/yRatio 비율 저장 → 화면 크기 무관

### B. 채팅 영구화 풀 스펙 (store.ts 영속화)
**기존 P1 #13**: 메모리 only — 앱 재시작 시 사라짐.
**풀 스펙**: app-data.json에 `chatHistories: Record<employeeId, ChatMessage[]>` 별도 키.

**구현**:
- types.ts: `ChatMessage` 타입 + `AppData.chatHistories?`
- electron/data/store.ts: `loadChatHistory` / `saveChatHistory` / `clearChatHistory` + `removeEmployee` 시 자동 삭제
- electron/main.ts: ipcMain handlers 3개
- electron/preload.ts: contextBridge 노출
- src/platform/*: Platform 인터페이스 + electron/mock 구현
- ChatPopup.tsx: onOpen 시 메모리 → 영속 → 신규 system msg 순서로 로드. 300ms debounce 자동 저장. force-close 시 영속 삭제

### C. 빈 자리 평소 숨김
**문제**: 빈 자리(직원 없는 책상·의자·모니터) 항상 visible → 화면 어수선.
**개선**: 채용 모달 + 자리 이동 모드일 때만 visible. 평소엔 직원 있는 자리만.

**구현**:
- App.tsx: `hireOpen` 변경 → `office:hire-mode` emit
- OfficeScene.ts: `hireMode` 멤버 + `hireModeHandler` + `setEmptySeatsVisibility(visible)` (workstations 순회, `employee === null && team !== null` 토글)
- enterMoveMode → 강제 true, exitMoveMode → hireMode 따라
- rebuildWorkstations 끝에 즉시 적용
- 사장석은 별도 plate라 항상 visible

---

## 4. 교훈

### 시각 한계 인식
- Claude는 알고리즘·로직·구조·이벤트 흐름·타입 시스템에는 강함
- 픽셀 디자인·이미지 자체는 *직접 만들 수 없음* (문자열 그리드는 단순 마스코트까지)
- 디테일이 필요한 시각 요소는 **사용자가 PNG로 직접 제공**해야 함

### 시각 검증 없이 만드는 작업은 위험
- 빌드 통과해도 실제 보기엔 못생긴 결과 가능
- 큰 작업(32×24 + 가구 비례 + 좌표 1.5배)을 시각 검증 없이 진행하면 원복 비용 큼
- 다음부터: 작은 단위 시각 검증 후 다음 단계 진행

### 대안 작업의 가치
- 그리드 확대 실패 후 "다음 뭐하지" → G/A/B/C 4개 작업 완료
- 시각 디자인이 아닌 *기능·UX·영속화* 영역은 Claude가 강한 영역
- P2 #25 가구 배치 (사무실 꾸미기 핵심) + 채팅 영구화 (실용성 ↑) + 빈 자리 숨김 (정리감)
- 12개 파일 변경, 빌드 통과, 시각 검증만 남음

---

## 5. Day 11 후속 +1 — 상점 픽셀 미리보기 + 배치 모드 + UX 정리 5종

사용자가 시각 검증 *시작 전* 4가지 피드백 + 추가 UX 요청을 한꺼번에 보냄:

### 사용자 피드백
1. "**상점 아이콘들도 내가 붙여넣는 것이랑 이미지가 동일했으면 좋겠어**"
2. "**중앙에 바로 붙여넣어지는게 아니라 어느 위치에 붙여넣을지 선택하게 하고 그 위치에 붙여넣게 해줘.**" + "**그 위치에 클릭하면 거기에 떨어져야해**"
3. "**상점에 있는 물건들이 좀 크기가 작고 구분하기 어려워. 좀 더 다른 디자인으로 고도화해줘.**"
4. (스크린샷 첨부) **자리 이동 시 줌 줄이면 안내·드롭 박스가 2개씩** + **메모에서 외형 편집 비활성** + **캐릭터 hover 명함 카드 주석**

### 구현 — 5가지 작업

#### a) 상점 디자인 고도화 — 픽셀 미리보기 통합
- 신규 `src/shared/furnitureCatalog.ts` — 가구 8종 픽셀 정의를 OfficeScene에서 *순수 데이터*로 분리 (Phaser 의존 X)
  - FURNITURE_CATALOG (8종) + renderFurnitureToCanvas (Canvas 2D) + getFurnitureSize
- 신규 `src/components/FurniturePreview.tsx` — React 컴포넌트. Canvas에 픽셀 그림. `imageRendering: 'pixelated'`로 픽셀 선명
- ShopModal.tsx — 가구 카드에 `<FurniturePreview itemId={itemId} scale={2} />` 통합. 실제 사무실 배치 이미지와 100% 동일
- ShopModal.css — `shop-grid-furniture` (minmax 200px) + `shop-item-furniture` (큰 카드) + `shop-item-pixel-preview` (체크무늬 배경, 80px 높이)
- OfficeScene 중복 픽셀 정의 145줄 제거 (FURNITURE_CATALOG 단일 출처)

#### b) 배치 모드 (placement mode)
- ShopModal "🏢 사무실에 배치" → `furniture:start-placement` emit → 모달 자동 닫힘
- OfficeScene `enterPlacementMode`:
  - Ghost preview (drawPixelGrid, alpha 0.55, depth 50)
  - 안내 텍스트 "🪑 원하는 위치를 클릭하세요 (ESC 또는 우클릭 = 취소)" 화면 상단 고정 (main 카메라 ignore)
  - cursor: crosshair
- pointermove → ghost가 pointer.worldX/Y 추적 (줌·패닝 반영)
- 좌클릭 → confirmPlacement (xRatio/yRatio 0.02~0.98 clamp) → emit
- ESC / 우클릭 → exitPlacementMode (ghost·hint destroy)

#### c) 자리 이동 안내·드롭 박스 중복 표시 버그 fix
- 사용자 스크린샷: 안내 텍스트와 빈 자리 박스가 각각 2개씩 보임 (main 카메라 + uiCamera 동시 렌더링)
- 원인: `moveModeHint`, `dropTargetHighlights` 생성 시 카메라 ignore 처리 누락
- 수정:
  - `moveModeHint`: `this.cameras.main.ignore()` → uiCamera only → 화면 고정
  - `dropTargetHighlights`: `this.uiCamera?.ignore(hi)` → main only → 책상 좌표 따라감

#### d) MemoModal 외형 편집 제거
- 외형 편집 JSX 섹션 (색 / 무늬) 전체 주석 — 코드 보존
- customColor/pattern state를 useState → const read-only (저장 시 기존 값 전달)
- 미사용 import 4개 정리

#### e) 캐릭터 hover 명함 카드 주석
- state·이벤트 핸들러·JSX 렌더링 모두 주석 (코드 보존)
- 미사용 import MODEL_INFO 제거
- 향후 다른 위치(예: 우측 사이드 패널)에 다시 보일지 결정

### 푸시
- 커밋: `3f5a3c8` Day 11 후속 +1 — 7 files changed (571 insertions, 145 deletions)

### 교훈 — Day 11 후속 +1
- 사용자 피드백을 *시각 검증 시작 전*에 한 번에 받아 처리 → 검증 부담 감소
- **카메라 분리 패턴 정착**: Phaser 멀티 카메라에서 객체별로 *어느 카메라에 보일지* 명확히 결정해야 (양쪽 다 보이면 중복 표시 버그)
- **데이터 단일 출처**: 가구 픽셀 정의를 ShopModal·OfficeScene·preview가 같이 import → 향후 확장 안정
- **코드 보존 + UI 숨김 패턴**: hover 카드·외형 편집·v2.5 시각 — 향후 재활성화 위해 주석으로 보존

---

## 6. 다음 우선순위 (HANDOFF §3 갱신됨)

1. **시각 검증** (사용자 PC에서 pnpm dev) — Day 11 전체 4 커밋 (b3b3205 / 449fdbf / 2f527bb / 3f5a3c8)
2. **M5-d 성격 시스템** (MBTI 보류 결정 답변 필요)
3. **Phase 3 백엔드 셋업** (모바일 진입)
4. **PNG asset 도입** (사용자가 그림 그리기 결정 시 → v2.5 부활)
5. 남은 P1 미반영 항목
