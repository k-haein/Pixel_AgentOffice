# 기술 스택 + 배포 전략 (확정안)

> 작성: 2026-05-12
> 결정 배경: 사용자가 "최대한 설치까지 자동화" 명시 → Python 경로 배제, Electron 채택

---

## 결정 사항

### 언어 & 런타임
- **TypeScript 전 영역 통일** (frontend / backend / build script)
- **Node.js** (Electron 내부에 자동 번들)
- → Python 설치 불필요. 사용자는 `.exe` 하나만 더블클릭하면 됨.

### Frontend
- **React + TypeScript** — UI 골격, 채팅창, 패널
- **Phaser.js** — 픽셀 사무실 씬, 에이전트 애니메이션 (스프라이트, 인터랙션)
- **Tailwind CSS** — 빠른 스타일링
- 구조: React shell이 페이지 라우팅·UI 담당, Phaser는 사무실 canvas 영역만 담당

### Backend (Electron main process)
- **Node.js + TypeScript**
- **`@anthropic-ai/claude-agent-sdk`** — Phase 2에서 Claude Code subagent 호출
- **SQLite** (better-sqlite3) — 채팅 기록, agent state, trace 저장

### 배포
- **electron-builder** — `.exe` (Windows) / `.dmg` (Mac) / `.AppImage` (Linux) 자동 생성
- 설치 흐름: 인스톨러 더블클릭 → 끝
- 첫 실행 시 API key 입력 화면 → 로컬 safe storage에 저장

---

## API Key 처리 정책

- **사용자가 본인 Anthropic API key를 입력하는 방식**
  - 우리는 키 운영 책임 없음, 과금 책임 없음 → 배포에 안전
  - 첫 실행 시 안내 화면 + 발급 가이드 링크 (`console.anthropic.com`)
- **저장**: Electron `safeStorage` API (OS 키체인 사용) → 평문 저장 금지

---

## 빌드 단계 (개념)

```
사용자 PC 입장:
  1. installer.exe 다운로드
  2. 더블클릭 → 설치
  3. 앱 실행 → API key 입력
  4. 사무실 화면 등장

개발자 입장:
  npm run dev      → 개발 모드 (hot reload)
  npm run build    → 프로덕션 빌드
  npm run dist     → installer.exe 생성 (electron-builder)
```

---

## Phase 1 첫 작업 — "일하는 척" UI

진짜 LLM 호출 없이 시각/인터랙션 부분 먼저 완성:

- 픽셀 사무실 씬 (Phaser)
- 책상 N개 + 에이전트 스프라이트 + 명패
- 상태: 대기 / 일하는중(애니메이션) / 완료 / 에러
- 더블클릭 → React 채팅 팝업
- 명령 입력 → mock 응답 (몇 초 후 "완료") → 다시 대기
- 병렬 명령 가능 (여러 에이전트 동시에 working)

이 단계가 끝나면 Phase 2에서 mock 부분만 진짜 agent SDK 호출로 교체.

---

## 자율 시뮬레이션 (Phase 1.5+)

사용자 선택: **C (둘 다)**
- 트리거 자동화: cron 같은 스케줄러 → "매일 9시 ○○ 에이전트 실행"
- 자율 의사결정: 에이전트끼리 메시지 주고받으며 일 분배 (AI Town 풍)

→ 우선 Phase 1 UI 안정화 후 도입.

---

## 미정

- [ ] 픽셀 아트 에셋: 직접 만들 것인가, 무료 에셋(itch.io 등) 사용?
- [ ] 사무실 레이아웃: 1층 고정 vs 층/방 확장 가능 구조?
- [ ] 추천 페이지 전체 목록 (다음 단계)
