# 회사망 SSL Inspection — Node fetch 실패 진단·해결

> 작성: 2026-05-20 (Day 10)
> 출처: PC `pnpm dev` 시 Gemini 채팅 호출이 `TypeError: fetch failed`로 실패한 사건
> 결론: **사용자 PC가 회사망에 있어서** 발생. 임시 fix는 dev에만 적용됨 (production 영향 X). **배포 전 일반망에서 한 번 더 검증 필수**.

---

## 1. 증상

- 사용자 채팅창에 "Gemini가 응답을 거부했어요 / API_ERROR" 표시
- main process 콘솔 (PowerShell `pnpm dev`)에 `[gemini] raw error: [TypeError: fetch failed]`
- 같은 PC의 **브라우저**에서는 `https://generativelanguage.googleapis.com/v1beta/models?key=...` 호출 시 **200 OK** 정상 응답

## 2. 진단 과정 (Day 10 흐름)

1. **가드 system prompt 의심** — P1 #21 가드 문구("혐오·성적·폭력") 키워드가 Gemini safety filter 트리거 가능성 → 가드 주석 처리 후에도 동일 에러
2. **DNS / TCP / 시스템 프록시 확인** — 모두 정상
   ```powershell
   Resolve-DnsName generativelanguage.googleapis.com  # IPv4·IPv6 정상 응답
   Test-NetConnection generativelanguage.googleapis.com -Port 443  # TcpTestSucceeded: True
   netsh winhttp show proxy  # "직접 액세스(프록시 서버 없음)"
   ```
3. **IPv6 우선 이슈 의심** — `setDefaultResultOrder('ipv4first')` 추가 → 동일 에러
4. **SDK가 cause 안 보존** — `GoogleGenerativeAIError`로 wrap돼서 `.cause` 없음. SDK 한계
5. **Node 직접 fetch** — 결정타:
   ```powershell
   node -e "fetch('https://generativelanguage.googleapis.com/v1beta/models').then(r => console.log(r.status)).catch(e => console.error('err:', e, 'cause:', e.cause))"
   ```
   → `cause: Error: self-signed certificate in certificate chain` / `code: 'SELF_SIGNED_CERT_IN_CHAIN'`

→ **회사망 SSL inspection** 확정.

## 3. 원리

- 회사 보안 시스템이 직원의 HTTPS 트래픽을 *중간자(MITM)* 가로채서 *회사 자체 CA로 다시 서명*한 인증서를 클라이언트에 제공 (트래픽 검사 목적)
- **브라우저** (Chrome/Edge) = **Windows 인증서 저장소**를 사용 → 회사 IT가 회사 CA를 거기 등록해 둠 → 신뢰 → 정상 작동
- **Node.js** = **자체 CA bundle** (Mozilla 기반)만 사용 → 회사 CA 모름 → `SELF_SIGNED_CERT_IN_CHAIN` 거부
- Electron의 **renderer process** = Chromium net stack → 브라우저와 동일 (영향 없음)
- Electron의 **main process** = Node.js fetch → 영향 받음. LLM SDK가 여기서 호출되므로 채팅 실패

## 4. 임시 fix (현재 적용됨)

`electron/main.ts` 상단:

```typescript
import { setDefaultResultOrder } from 'node:dns'

// IPv4 우선 (Windows fetch IPv6 fallback 이슈 대비)
setDefaultResultOrder('ipv4first')

// 회사망 SSL inspection 대응 — dev에서만 SSL 검증 끔
if (!app.isPackaged) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}
```

### 안전 가드
- **`!app.isPackaged`** — Electron이 *빌드된 .exe* 안에서는 `app.isPackaged = true`라 이 코드 미실행
- 즉 **production 빌드는 정상 SSL 검증 유지**
- 일반 사용자(회사망 아님)는 영향 없음

## 5. 더 안전한 해결 (마이그레이션 권장)

`NODE_TLS_REJECT_UNAUTHORIZED=0`은 *모든 outbound HTTPS 검증을 끔* — dev라도 보안 위험 있음 (예: MITM 공격, 인증서 위조 탐지 불가). 더 안전한 방법:

### 옵션 A — `NODE_EXTRA_CA_CERTS`
1. IT에서 **회사 CA 인증서 파일** (`.crt` 또는 `.cer`) 받기
2. 또는 브라우저에서 직접 export: Chrome 설정 → 보안 → 인증서 관리 → 신뢰할 수 있는 루트 인증서 → 회사 CA 선택 → "Copy to File" (Base-64 X.509)
3. `electron/main.ts`에서:
   ```typescript
   if (!app.isPackaged) {
     process.env.NODE_EXTRA_CA_CERTS = path.join(__dirname, '..', 'certs', 'company-ca.crt')
   }
   ```
4. 이러면 SSL 검증 유지하면서 **회사 CA만 추가 신뢰**

### 옵션 B — Electron `net` 모듈로 SDK 우회
- Electron의 `net.request`는 Chromium net stack 사용 → 브라우저와 동일 신뢰 체계
- LLM SDK가 Node fetch 기반이라 우회는 SDK fork 필요 → 복잡

→ **권장**: 옵션 A. cert 파일 받으면 마이그레이션.

## 6. 같이 영향받을 수 있는 명령

회사망에서 dev 시 같은 이유로 가끔 실패할 수 있는 것들:
- `npm install` / `pnpm install` (registry HTTPS) → `strict-ssl=false` 또는 `cafile` 설정 필요할 수 있음
- `git clone https://...` → `git config http.sslVerify false` 또는 `http.sslCAInfo` 설정
- 기타 Node 기반 CLI 도구의 HTTPS 호출 (axios·node-fetch·undici)

이미 정상 작동 중이라면 IT가 시스템 환경변수에 회사 CA를 일부 적용해 둔 것일 수도. 새 도구 도입 시 비슷한 증상 보이면 같은 원인 의심.

## 7. 배포 전 검증 체크리스트

자세히는 [`FEATURES.md`](../PixelAgentOffice/FEATURES.md) "배포 전 검증" 섹션. 핵심:

- [ ] **일반망(집 Wi-Fi / 카페 / 모바일 핫스팟)** 에서 `pnpm dev` 실행 + LLM 채팅 정상 응답 확인
- [ ] **production 빌드** (`pnpm build` 또는 `electron-builder`) + 빌드된 `.exe`를 *다른 PC*(회사망 아닌)에서 실행 → 채팅 정상
- [ ] `electron/main.ts`의 `NODE_TLS_REJECT_UNAUTHORIZED=0`이 **`!app.isPackaged` 가드 안에** 있는지 마지막 확인
- [ ] `electron/llm/gemini.ts`의 임시 디버그 `console.error` 4줄 (`err type`, `err keys`, `cause`, `cause keys/json`) 정리 — 첫 줄(`raw error`)만 남기고 나머지 제거

이 항목이 모두 ✅ 돼야 안심하고 배포.

## 8. 의의

회사망에서 dev 하는 흐름의 *전형적 함정* + Node와 브라우저의 *서로 다른 신뢰 체계* 학습. 같은 패턴이 npm/git/기타 HTTPS API 호출에서도 반복 가능. **Node 기반 도구가 *유독* HTTPS 실패하면 SSL inspection 의심 → `node -e "fetch(...)..."` 로 `cause.code` 확인**이 가장 빠른 진단.
