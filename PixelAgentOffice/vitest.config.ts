import { defineConfig } from 'vitest/config'

// 순수 로직(promotion·seats 등) 유닛테스트 + 실키 통합테스트 —
// vite.config의 electron 플러그인과 분리해 테스트 실행 시 Electron이 떠지 않게 한다.
// tests/integration은 .env.local의 실제 API 키가 있을 때만 돌고, 없으면 자동 skip.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
  },
})
