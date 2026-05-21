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

## 5. 다음 우선순위 (HANDOFF §3 갱신됨)

1. **시각 검증** (사용자 PC에서 pnpm dev) — Day 11 후속 12개 파일
2. **M5-d 성격 시스템** (MBTI 보류 결정 답변 필요)
3. **Phase 3 백엔드 셋업** (모바일 진입)
4. **PNG asset 도입** (사용자가 그림 그리기 결정 시 → v2.5 부활)
5. 남은 P1 미반영 항목
