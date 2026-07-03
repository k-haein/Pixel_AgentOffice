import { app, safeStorage } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { ProviderName } from './types'

/** Provider별 키 파일 이름 */
const FILES: Record<ProviderName, string> = {
  anthropic: 'api-key-anthropic.bin',
  google: 'api-key-google.bin',
  openai: 'api-key-openai.bin',
}

// 하위 호환: M3-a에서 쓰던 단일 파일을 anthropic으로 인식
const LEGACY_FILE = 'api-key.bin'

function filePath(provider: ProviderName): string {
  return path.join(app.getPath('userData'), FILES[provider])
}

function legacyPath(): string {
  return path.join(app.getPath('userData'), LEGACY_FILE)
}

export function isAvailable(): boolean {
  return safeStorage.isEncryptionAvailable()
}

/** API 키 저장 */
export async function saveApiKey(provider: ProviderName, plaintext: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS 키체인을 사용할 수 없습니다.')
  }
  const trimmed = plaintext.trim()
  if (!trimmed) throw new Error('빈 키는 저장할 수 없습니다.')
  const encrypted = safeStorage.encryptString(trimmed)
  const target = filePath(provider)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, encrypted)
}

/** API 키 불러오기 */
export async function loadApiKey(provider: ProviderName): Promise<string | null> {
  // 새 위치 먼저
  try {
    const encrypted = await fs.readFile(filePath(provider))
    if (!safeStorage.isEncryptionAvailable()) return null
    return safeStorage.decryptString(encrypted)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }

  // 하위 호환: M3-a 단일 파일 → anthropic로만 인식
  if (provider === 'anthropic') {
    try {
      const encrypted = await fs.readFile(legacyPath())
      if (!safeStorage.isEncryptionAvailable()) return null
      const key = safeStorage.decryptString(encrypted)
      // 마이그레이션: 새 위치로 옮기고 legacy 삭제
      await saveApiKey('anthropic', key)
      await fs.unlink(legacyPath()).catch(() => {})
      return key
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }
  }

  return null
}

/** API 키 보유 여부 */
export async function hasApiKey(provider: ProviderName): Promise<boolean> {
  const key = await loadApiKey(provider)
  return key !== null && key.length > 0
}

/** API 키 삭제 */
export async function deleteApiKey(provider: ProviderName): Promise<void> {
  try {
    await fs.unlink(filePath(provider))
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
}
