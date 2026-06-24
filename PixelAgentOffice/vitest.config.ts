import { defineConfig } from 'vitest/config'

// 순수 로직(promotion·seats 등) 유닛테스트 전용 — vite.config의 electron 플러그인과 분리해
// 테스트 실행 시 Electron이 떠지 않게 한다. node 환경, DOM/Phaser 불필요.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
})
