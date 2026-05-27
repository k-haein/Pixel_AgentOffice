# Electron 기술 결정 + 모바일 전환 전략

> 작성: 2026-05-18
> 목적: 비개발자(상사·고객·포트폴리오 평가자)도 이해할 수 있도록 *왜 Electron인지* + *모바일 출시를 위해 필요한 변환*을 정리.

---

## 1. Electron이 뭔가요?

### 한 줄 정의
> **웹 기술(HTML/CSS/JavaScript)로 데스크탑 앱을 만드는 프레임워크.**
> 우리가 만든 *웹 페이지*를 Chrome 브라우저 + Node.js로 감싸서 **Windows/Mac/Linux에서 `.exe` 더블클릭으로 실행 가능**한 데스크탑 앱으로 만든다.

### 매일 쓰는 익숙한 Electron 앱들
- **VS Code** (Microsoft 코드 에디터)
- **Discord** (게임 채팅)
- **Slack** (협업 메신저)
- **Notion** (메모/문서)
- **Figma 데스크탑** (디자인 도구)
- **Postman** (API 도구)

겉보기엔 그냥 데스크탑 앱이지만 *내부는 사실 웹사이트*. 우리가 익숙한 웹 기술(React, HTML, CSS)을 데스크탑 환경에 그대로 가져다 쓸 수 있다는 점이 핵심.

### 어떻게 작동하나
```
┌────────────────────────────────────────────┐
│  Electron 앱 = "데스크탑처럼 보이는 웹"     │
│                                             │
│  ┌──────────────────────────────────────┐ │
│  │ Chromium 브라우저                    │ │
│  │  ├ HTML / CSS / JavaScript           │ │  ← 이 부분이 화면
│  │  ├ React (UI 라이브러리)             │ │
│  │  └ Phaser (게임 엔진)                │ │
│  └──────────────────────────────────────┘ │
│                                             │
│  Node.js (Main 프로세스)                   │
│  ├ 파일 시스템 (데이터 저장/불러오기)       │  ← 데스크탑 전용 기능
│  ├ OS 키체인 (API 키 안전 보관)            │
│  └ 외부 API 호출 (Claude, Gemini)          │
└────────────────────────────────────────────┘
```

---

## 2. 왜 Electron을 골랐나요?

기획 초반(Day 1)에 다음 제약을 고려:

| 요구사항 | 영향 |
|---|---|
| 일반 사용자도 **즉시 설치 가능** | Python/Node 설치 강제는 불가 → 단일 `.exe` 인스톨러 |
| **웹 기술 재사용** | 새 언어/프레임워크 배울 시간 없음 → 익숙한 React/TypeScript |
| **OS 기능 사용** (파일 저장, 키체인) | 순수 웹으론 불가, 데스크탑 환경 필요 |
| **픽셀 게임 엔진** 사용 | Phaser는 웹 기반 → 데스크탑 wrapper 필요 |
| 빠른 프로토타이핑 | 기존 웹 생태계(npm, Vite) 그대로 활용 |

### Electron이 자연스러운 답인 이유
- 위 모든 조건을 *동시에* 만족
- 일반 사용자가 `.exe` 더블클릭 한 번이면 설치 끝
- 우리는 친숙한 React/Phaser 코드 그대로 작성

### 검토했던 대안과 탈락 이유
- **Python (PyQt 등)**: 사용자가 Python 설치해야 함 → 진입 장벽
- **순수 웹**: OS 키체인·파일 저장 X. 픽셀 게임은 가능하지만 *내 사무실*이라는 영속성 못 줌
- **네이티브 (Swift/C#)**: 우리가 그 언어 모름, OS별 다시 작성

→ 결정: **Electron** (자세한 비교는 [`03-stack-and-distribution.md`](./03-stack-and-distribution.md) 참고)

---

## 3. Electron의 단점 — 모바일에 안 됨

| 한계 | 영향 |
|---|---|
| **iOS/Android 미지원** | Electron은 Chromium + Node를 그대로 들고가는데, 모바일 OS 위에선 안 돌아감 |
| **앱 용량** | Chromium 통째 포함 → 200~300MB (모바일 앱치고는 매우 큼) |
| **터치 인터랙션** | 데스크탑 마우스 가정, 모바일 손가락에 맞게 다시 디자인 필요 |

→ **모바일/태블릿 출시는 Electron만으로 불가능.**

---

## 4. 모바일 출시를 위해 무엇이 필요한가요?

### A. 빌드 도구 교체
Electron은 데스크탑 전용이라 모바일 빌드 도구로 **갈아끼워야** 함:

| 도구 | 특징 | 우리 React/Phaser 코드 재사용 |
|---|---|---|
| **Tauri 2.0** ⭐ | Rust 기반. Electron보다 가볍고 iOS/Android/Desktop 통합. Electron 대체 후보 | **95%** (UI 코드 그대로) |
| **Capacitor** | 웹을 네이티브로 감쌈. iOS/Android만 | 95% |
| **React Native** | 게임 엔진을 처음부터 다시 짜야 함 | 30% (Phaser 못 씀) |
| **PWA** | 웹 그대로 + "홈 화면에 추가" | 100% (가장 단순하지만 *진짜 앱*은 아님) |

→ **Tauri 또는 Capacitor 추천**. 둘 다 우리 React+Phaser 코드를 거의 그대로 재사용.

### B. LLM 호출 방식 변환 — 백엔드 필요
모바일에선 *브라우저 환경*에서 LLM API를 호출해야 하는데:

- **Anthropic (Claude)** — 브라우저 직접 호출 차단 (CORS 정책)
- **Google (Gemini)** — 일부 가능

→ Claude를 모바일에서 쓰려면 **백엔드 서버를 우리가 만들어서** 그 서버를 통해 LLM에 요청해야 함 (프록시 패턴).

```
[모바일 앱] ──→ [우리 백엔드 서버] ──→ [Anthropic / Google API]
              (API 키 안전 보관)         (실제 LLM)
```

### C. 비용 부담은 누구?
백엔드를 만든다고 *우리가 LLM 비용을 부담하는 건 아님*. 옵션:

| 모델 | 비용 부담 | 사용자 부담 |
|---|---|---|
| **BYOK + 백엔드 프록시** | 우리: 서버 운영비만 (월 $10~50) | 사용자: 자기 API 키 등록 + LLM 비용 직접 청구 |
| **SaaS (구독)** | 우리: LLM 비용 + 서버 | 사용자: 월 구독료 |
| **하이브리드** | 우리: 무료 한도분만 | 사용자: 가입만 → 그 이상은 자기 키 또는 구독 |

→ 자세한 비교는 [`12-business-model.md`](./12-business-model.md) 참고.

### D. UI 반응형 대응
- 채팅창/모달들이 모바일 폭(360px~)에서도 깨지지 않게
- 터치 인터랙션 추가 (드래그앤드롭, 핀치 줌 등 — `B-5` 작업에 일부 포함)
- Phaser 캔버스는 이미 RESIZE 모드라 OK

---

## 5. 그래서 *지금* 설계를 다시 해야 하나요?

### 결론: **NO**. 설계 *전체*를 다시 할 필요는 없다.

| 다시 해야 하는 부분 | 비율 |
|---|---|
| 그대로 살릴 수 있는 코드 | **~85%** (React 컴포넌트, Phaser 게임, LLM provider 추상화, 자리 시스템) |
| 추상화·이동 필요 | **~15%** (Electron IPC, safeStorage, fs — Adapter 패턴으로 격리) |
| 처음부터 다시 | **0%** ✅ |

### 미리 챙겨두면 좋은 것 — Platform Adapter 패턴

현재 컴포넌트들이 Electron API를 *직접* 호출:
```ts
const result = await window.api.chatWithLLM({ model, ... })  // Electron 종속
```

→ 한 layer 추가해서 환경 무관한 인터페이스 사용:
```ts
const result = await platform.chat({ model, ... })  // 어떤 환경에서도 동작
```

`platform` 객체는 환경 따라 다른 구현:
- **Electron**: `window.api.chatWithLLM` 호출 (현재)
- **모바일 (Web/Tauri)**: 백엔드 fetch 호출 (미래)
- **Mock**: 가짜 응답 (테스트용)

→ 이 추상화만 *지금 한 번* 해두면, 미래 모바일 빌드 시 **컴포넌트 코드 0줄 변경**으로 작동.
→ 작업 비용: 약 **4~6시간**.

---

## 6. 점진 도입 단계 (PRD 로드맵 보강)

지금 당장 백엔드 사업 결심 안 해도 됨. 단계 나누면:

| Phase | 작업 | 결정 부담 |
|---|---|---|
| **1. Platform Adapter 패턴 도입** | Electron API를 추상화 (4~6시간) | 거의 무 |
| **2. Web 빌드 (BYOK + localStorage)** | 데모/시각 확인용. Gemini 한정 작동 (Claude CORS) | 작음 |
| **3. 백엔드 최소 (BYOK 프록시만)** | LLM 호출만 백엔드로 — Claude도 됨 | 중 |
| **4. 사용자 인증 + 키 영구 저장** | 가입 → 키 등록 → 어디서든 사용 | 중 |
| **5. 모바일 빌드 (Tauri/Capacitor)** | 같은 코드, iOS/Android 배포 | 중 |
| **6. (선택) SaaS 전환** | 우리가 키 보유 + 구독 결제 | 큼 |

→ Phase 3까지가 *핵심*. 그 이후는 *원할 때* 결정.

---

## 7. 상사·고객 설명용 한 문장 요약

> "이 앱은 **Electron**이라는 기술로 만들었어요. VS Code나 Discord 같은 데스크탑 앱이 쓰는 기술인데, *웹 코드(React/Phaser)*를 *데스크탑 앱(.exe)*으로 만들어주는 도구예요.
>
> 같은 코드로 **Tauri나 Capacitor**라는 도구만 갈아끼면 *iOS/Android 모바일 앱*으로도 출시 가능해요. 다만 모바일에선 보안상 LLM에 직접 못 닿아서 *우리가 작은 백엔드 서버*를 만들어야 하는데, 이건 *프록시* 역할만 하고 실제 LLM 비용은 *사용자가 자기 API 키*로 부담하는 모델이 가장 운영 부담 적습니다."

---

## 관련 문서
- [`03-stack-and-distribution.md`](./03-stack-and-distribution.md) — Electron 선택 초기 배경
- [`12-business-model.md`](./12-business-model.md) — BYOK / SaaS / Groq 등 비즈니스 모델 비교
- [`../HANDOFF.md`](../HANDOFF.md) — 현재 상태 + 다음 작업 + 폴더 가이드
- [`../portfolio/PixelAgentOffice/PRD.md`](../portfolio/PixelAgentOffice/PRD.md) — 제품 비전 + 기술 아키텍처
