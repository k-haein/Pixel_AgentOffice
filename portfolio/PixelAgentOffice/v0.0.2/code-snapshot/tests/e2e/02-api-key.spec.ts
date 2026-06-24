import { test, expect } from '@playwright/test'
import { launchApp, getGeminiKey } from './helpers'

// Day 14 재설계: 설정창 인라인 키 입력 → 별도 "API 키 미니 팝업"(ApiKeyModal)으로 분리됨.
// 흐름: ⚙ 설정 → "🔑 API 키 설정 열기" → 팝업에서 키 입력·저장.
test('Gemini API 키를 API 키 팝업에서 저장한다', async () => {
  const key = getGeminiKey()
  test.skip(!key, '.env.local의 GEMINI_API_KEY가 없어서 스킵')

  const { app, window } = await launchApp()

  // 설정 열기
  await window.getByRole('button', { name: '⚙' }).click()
  await expect(window.locator('.modal-header h2')).toContainText('설정')

  // "API 키 설정 열기" → 미니 팝업
  await window.getByRole('button', { name: /API 키 설정 열기/ }).click()
  await expect(window.locator('.modal-header h2', { hasText: 'API 키 설정' })).toBeVisible()

  // Google 키 input(type=password → placeholder로 선택) 입력 + 저장
  const googleKeyInput = window.locator('input[placeholder*="AIza"]').first()
  await googleKeyInput.fill(key!)
  // 팝업의 저장 버튼 — 뒤에 가려진 설정창의 "저장"과 구분 위해 정확한 라벨로
  await window.getByRole('button', { name: '💾 저장' }).click()

  // "✓ 저장되었습니다" 확인
  await expect(window.locator('text=/저장되었습니다/')).toBeVisible({ timeout: 5000 })
  await window.waitForTimeout(1000) // 팝업 자동 닫힘 (설정창은 뒤에 그대로 열려 있음)

  // 다시 팝업 열어 "✓ 저장됨" 배지 확인
  await window.getByRole('button', { name: /API 키 설정 열기/ }).click()
  await expect(window.locator('.key-stored-badge').first()).toContainText('저장됨')

  await app.close()
})
