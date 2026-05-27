/**
 * 사무실 시간대 시스템.
 *
 * 실제 PC 시각 기반으로 5단계 시간대 결정 + 시간대별 색 팔레트 제공.
 * 토큰 고갈 시에는 외부에서 강제로 'night'로 덮어쓸 수 있음.
 *
 * Phaser 씬에서 OfficeScene이 이 팔레트를 읽어 배경/하늘/태양/달/구름 색을 갱신한다.
 */

export type TimeOfDay = 'morning' | 'noon' | 'sunset' | 'evening' | 'night'

export type TimePalette = {
  /** 카메라 배경 (사무실 바닥/벽 톤) */
  cameraBg: number
  /** 상단 하늘 띠 색 */
  sky: number
  /** 하늘과 천장 경계선 */
  skyDivider: number
  /** 구름 색 (보이지 않을 땐 같은 색으로 페이드아웃) */
  cloud: number
  /** 구름 보이는 정도 (0 = 안 보임, 1 = 평소) */
  cloudAlpha: number
  /** 태양/달 색 */
  celestial: number
  /** 태양인가 달인가 — 별 깜빡임 트리거 */
  isCelestialMoon: boolean
  /** 별 보이는 정도 */
  starAlpha: number
  /** 한국어 라벨 + 이모지 (UI 표시용) */
  label: string
}

export const TIME_PALETTES: Record<TimeOfDay, TimePalette> = {
  morning: {
    cameraBg: 0xfdf2dd,        // 따뜻한 미색
    sky: 0xffd8a8,             // 부드러운 살구
    skyDivider: 0x6a4a36,
    cloud: 0xffffff,
    cloudAlpha: 1,
    celestial: 0xffe082,        // 부드러운 노랑 태양
    isCelestialMoon: false,
    starAlpha: 0,
    label: '🌅 아침',
  },
  noon: {
    cameraBg: 0xe8dfd0,        // 기본 베이지 (현재 톤)
    sky: 0x87ceeb,             // 푸른 하늘 (기본)
    skyDivider: 0x5a4a36,
    cloud: 0xffffff,
    cloudAlpha: 1,
    celestial: 0xfff176,        // 밝은 노랑 태양
    isCelestialMoon: false,
    starAlpha: 0,
    label: '☀️ 점심',
  },
  sunset: {
    cameraBg: 0xf5d9be,        // 오렌지빛 베이지
    sky: 0xff9a73,             // 노을 오렌지
    skyDivider: 0x6a3018,
    cloud: 0xffc8a0,
    cloudAlpha: 0.85,
    celestial: 0xff6f3a,        // 노을 태양
    isCelestialMoon: false,
    starAlpha: 0,
    label: '🌇 노을',
  },
  evening: {
    cameraBg: 0xa898ba,        // 보라빛 어둠
    sky: 0x4a3870,             // 짙은 보라
    skyDivider: 0x2a1840,
    cloud: 0x6a5880,
    cloudAlpha: 0.5,
    celestial: 0xe8d8c0,        // 옅은 달
    isCelestialMoon: true,
    starAlpha: 0.4,
    label: '🌆 저녁',
  },
  night: {
    cameraBg: 0x3a3050,        // 짙은 야간 톤
    sky: 0x1a1438,             // 거의 검정
    skyDivider: 0x0a0820,
    cloud: 0x3a3458,
    cloudAlpha: 0.3,
    celestial: 0xf0e0a8,        // 밝은 달
    isCelestialMoon: true,
    starAlpha: 1,
    label: '🌃 밤',
  },
}

/**
 * 현재 시각 → 시간대 추론.
 * 06–11 아침 / 11–15 점심 / 15–18 노을 / 18–21 저녁 / 21–06 밤
 */
export function getTimeOfDay(now: Date = new Date()): TimeOfDay {
  const h = now.getHours()
  if (h >= 6  && h < 11) return 'morning'
  if (h >= 11 && h < 15) return 'noon'
  if (h >= 15 && h < 18) return 'sunset'
  if (h >= 18 && h < 21) return 'evening'
  return 'night'
}

/** 다음 시간대 트랜지션까지 남은 ms (자동 갱신 타이머용) */
export function msUntilNextTransition(now: Date = new Date()): number {
  const h = now.getHours()
  const m = now.getMinutes()
  const s = now.getSeconds()
  // 경계점: 6, 11, 15, 18, 21, 24(=다음날 0)
  const boundaries = [6, 11, 15, 18, 21, 24]
  const nextHour = boundaries.find(b => b > h) ?? 24 + 6 // 자정 넘어 새벽 6시
  const minutesLeft = (nextHour - h - 1) * 60 + (60 - m)
  return Math.max(1000, (minutesLeft * 60 - s) * 1000)
}
