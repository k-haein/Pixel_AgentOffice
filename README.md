# PixelAgentOffice

> 픽셀 아트 사무실에서 AI 에이전트를 직원처럼 채용·배치·명령할 수 있는 데스크탑 앱.

**Status**: **M5-b** 완료 (시간대 + 사무실 위계 구조) + B-3 (자리 이동) 미커밋
**Stack**: Electron + React 19 + Phaser 4 + TypeScript + Anthropic/Google LLM + Playwright E2E

> 🧭 **이어서 작업하려면 → [HANDOFF.md](HANDOFF.md)** (30초 요약 + 진행 타임라인 + 다음 작업 + 보류 결정)

---

## 📁 레포 구조

```
myPrj/
├─ PixelAgentOffice/      ← 🛠 실제 앱 소스 (개발 작업장)
│  ├─ electron/           ← Electron 메인 프로세스
│  ├─ src/                ← React + Phaser
│  │  ├─ game/            ← Phaser 씬, 캐릭터, 픽셀아트
│  │  └─ components/      ← React UI
│  ├─ package.json
│  └─ vite.config.ts
│
├─ ideas/                 ← 💡 기획·아이디어 문서 (활성 작업장)
│  ├─ 00-brainstorming-log.md    ← 의사결정 흐름 추적
│  ├─ 01~08-*.md                 ← 카테고리별 기획 문서
│  ├─ office-mockup.html         ← 시안 1: 사무실 레이아웃
│  └─ wireframes.html            ← 시안 2: 6개 화면
│
└─ portfolio/             ← 📦 포트폴리오 큐레이션 아카이브
   └─ PixelAgentOffice/
      ├─ README.md        ← 케이스 스터디 표지
      ├─ planning/        ← 기획 문서 스냅샷
      ├─ visuals/         ← HTML 시안 스냅샷
      ├─ screenshots/     ← 스크린샷 + 캡처 가이드
      └─ milestones/
         └─ M1-basic-ui/  ← 마일스톤별 코드 스냅샷 + 회고
```

## 🚀 실행

```powershell
cd PixelAgentOffice
pnpm install
pnpm dev
```

→ Electron 윈도우 자동 실행.

## 📝 메모

- 활성 코드: `PixelAgentOffice/` 에서 직접 수정
- 기획 흐름은 `ideas/` 에 누적
- 마일스톤 도달 시 `portfolio/` 에 스냅샷 추가

자세한 케이스 스터디는 [portfolio/PixelAgentOffice/README.md](portfolio/PixelAgentOffice/README.md) 참고.
