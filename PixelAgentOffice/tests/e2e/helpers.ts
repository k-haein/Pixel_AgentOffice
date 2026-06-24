import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
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
  userDataDir: string
}

/**
 * 테스트용 시드 데이터 — Mary(member:A:0) + Haewol(member:A:1).
 * 배포 기본은 빈 사무실이라, 좌석·우클릭·대화 테스트를 위해 결정적 직원을 심는다.
 * (둘 다 팀 A → 팀 1개만 활성 → getDynamicSeatX가 팀 A를 화면 중앙(0.5)에 배치)
 */
function seedAppData() {
  const now = new Date().toISOString()
  const base = {
    baseInstructions: '', customInstructions: '',
    model: 'gemini-2-5-flash', memoryModel: 'gemini-2-5-flash', memoryMode: 'auto',
    promotionMode: 'time', hiredAt: now, deskOrientation: 'front',
    totalMessages: 0, totalMemoryUpdates: 0, totalPraises: 0,
  }
  return {
    employees: [
      { ...base, id: 'seed-mary', template: 'editor', name: 'Mary', role: '편집자', emoji: '✏️', rank: '사원', seatId: 'member:A:0' },
      { ...base, id: 'seed-haewol', template: 'writer', name: 'Haewol', role: '작가', emoji: '📝', rank: '사원', seatId: 'member:A:1' },
    ],
    maxEmployees: 15,
    settings: { tutorialDone: true }, // 테스트 중 튜토리얼 자동 안내 방지(나머지는 기본값으로 채워짐)
    chatHistories: {},
    memories: {},
  }
}

/** Electron 앱 띄우기 — 빌드된 main.js + 격리된 임시 userData(시드 포함). 매 실행 깨끗한 프로필. */
export async function launchApp(opts: { seed?: boolean } = {}): Promise<AppContext> {
  const seed = opts.seed ?? true
  const mainPath = path.join(PROJECT_ROOT, 'dist-electron', 'main.js')
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pao-e2e-'))
  if (seed) {
    fs.writeFileSync(
      path.join(userDataDir, 'app-data.json'),
      JSON.stringify(seedAppData(), null, 2),
      'utf-8',
    )
  }
  const app = await electron.launch({
    args: [mainPath, `--user-data-dir=${userDataDir}`],
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
  return { app, window, userDataDir }
}

/** Gemini API 키 가져오기 (env에서) */
export function getGeminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY
}

/** Anthropic API 키 가져오기 (env에서) */
export function getAnthropicKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY
}
