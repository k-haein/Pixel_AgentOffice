# 스크린샷 캡처 가이드

> HTML 시안을 png로 변환해 본 폴더에 저장. 비기술자도 한눈에 작품을 볼 수 있도록.

## 왜 필요한가

- GitHub은 `.html`을 미리보기 하지 않음 (raw 보임). png는 즉시 렌더링됨.
- 노션, PPT, 이력서 등에 첨부할 때 png가 표준
- HTML 파일을 열 환경이 없는 리뷰어를 위함

---

## 추천 캡처 목록

`visuals/office-mockup.html` 에서:

| 파일명 | 내용 |
|---|---|
| `01-office-overview.png` | 전체 사무실 모습 (엘리베이터 + 토큰 보드 + 모든 부서 보이게) |
| `02-token-board-detail.png` | 토큰 보드 부분 줌인 (LED 게이지 강조) |
| `03-elevator-detail.png` | 좌측 엘리베이터 줌인 |

`visuals/wireframes.html` 에서:

| 파일명 | 내용 |
|---|---|
| `04-hire-modal.png` | 채용 모달 3단계 흐름 (SCREEN 1) |
| `05-chat-preview.png` | 채팅창 + Side Preview 패널 (SCREEN 2) |
| `06-permissions.png` | 권한 관리 UI (SCREEN 3) |
| `07-settings.png` | 설정 화면 (SCREEN 4) |
| `08-floor2-team.png` | Floor 2 Team Office (SCREEN 5) |
| `09-night-mode.png` | 🌙 토큰 고갈 밤 모드 (SCREEN 6) — *시그니처 샷* |

---

## 캡처 방법

### 방법 1: 브라우저 스크린샷 (가장 간단)
1. 해당 HTML 파일을 Chrome/Edge에서 연다
2. F12 → 개발자 도구 → 우상단 점 3개 메뉴 → "Capture screenshot" (또는 Ctrl+Shift+P → "screenshot")
3. 전체 페이지 또는 영역 선택 가능

### 방법 2: 윈도우 캡처 도구
- `Win + Shift + S` → 영역 선택 → 클립보드 복사
- 그림판 등에 붙여넣기 후 png로 저장

### 방법 3: 자동화 (선택사항)
Playwright나 Puppeteer로 일괄 캡처:
```bash
npx playwright screenshot office-mockup.html 01-office-overview.png
```

---

## 명명 규칙

`NN-feature-detail.png` 형식 권장:
- `NN`: 두 자리 순서 번호 (정렬을 위해)
- `feature`: 무엇을 보여주는지 (영문 kebab-case)
- `detail`: 부수 정보 (옵션)

좋은 예: `01-office-overview.png`, `09-night-mode-signature.png`
나쁜 예: `Screenshot 2026-05-12 오후 3.png` (정보 없음)

---

## 추후 옵션

- **GIF/MP4**: 토큰 고갈 → 캐릭터 반응 → 부활 시퀀스를 짧은 영상으로. SNS 노출용.
- **Cover image**: README 맨 위에 박을 대표 이미지 1장 (사무실 전경 + 토큰 보드가 잘 보이는 컷 추천)
