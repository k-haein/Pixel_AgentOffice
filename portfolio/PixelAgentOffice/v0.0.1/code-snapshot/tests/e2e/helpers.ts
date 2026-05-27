import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.join(__dirname, '..', '..')

// 키는 .env.local에서 로드 (gitignored)
loadEnv({ path: path.join(PROJECT_ROOT, '.env.local') })

export type AppContext = {
  app: ElectronApplication
  window: Page
}

/** Electron 앱 띄우기 — 빌드된 main.js 사용 */
export async function launchApp(): Promise<AppContext> {
  const mainPath = path.join(PROJECT_ROOT, 'dist-electron', 'main.js')
  const app = await electron.launch({
    args: [mainPath],
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')
  // Phaser scene이 준비될 때까지 잠깐
  await window.waitForTimeout(2000)
  return { app, window }
}

/** Gemini API 키 가져오기 (env에서) */
export function getGeminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY
}

/** Anthropic API 키 가져오기 (env에서) */
export function getAnthropicKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY
}
