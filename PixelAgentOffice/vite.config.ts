import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              output: {
                // AI SDK(ai v7)의 CJS 의존성(@vercel/oidc token-util 등)이 번들 안에서
                // require("path"/"fs"/"os")를 호출하는데, ESM 출력에는 require가 없어
                // 앱 로드가 죽는다 → createRequire 주입으로 Node 내장 모듈 require 지원.
                banner: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
              },
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
      },
    }),
  ],
})
