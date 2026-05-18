/**
 * Platform 진입점.
 *
 * 환경을 감지해서 적절한 adapter를 선택. 컴포넌트는 그저 이 파일에서
 *   import { platform } from '@/platform'
 * 하면 끝. 어떤 환경인지 신경 안 써도 됨.
 *
 * 환경 감지 우선순위:
 *   1. window.api 존재 → Electron renderer
 *   2. 그 외 (브라우저/모바일/SSR 등) → web adapter (미래 — 지금은 mock 폴백)
 *
 * 추가: 테스트에서 강제 mock 사용하려면 setMockPlatform() 또는
 *      __PLATFORM_OVERRIDE__ 전역 변수.
 */

import type { Platform } from './types'
import { electronPlatform } from './electron'
import { mockPlatform } from './mock'

export type { Platform } from './types'
export type { ChatResult, RateLimitStatus, ProviderName } from './types'

/** Electron renderer 환경인지 (window.api가 contextBridge로 노출된 상태) */
function isElectronRenderer(): boolean {
  if (typeof window === 'undefined') return false
  return 'api' in window && typeof (window as { api?: unknown }).api === 'object'
}

/** 테스트 등 외부에서 override 가능. window.__PLATFORM_OVERRIDE__ = mockPlatform 같이. */
function getOverride(): Platform | null {
  if (typeof window === 'undefined') return null
  const w = window as { __PLATFORM_OVERRIDE__?: Platform }
  return w.__PLATFORM_OVERRIDE__ ?? null
}

function detect(): Platform {
  const override = getOverride()
  if (override) return override
  if (isElectronRenderer()) return electronPlatform
  // 미래: web adapter (백엔드 fetch)로 갈 자리. 지금은 mock fallback.
  return mockPlatform
}

/** 환경 자동 감지된 단일 platform 인스턴스 — 앱 전체에서 import해 사용 */
export const platform: Platform = detect()

/** 테스트에서 platform을 mock으로 교체할 때 사용 */
export { mockPlatform, electronPlatform }
