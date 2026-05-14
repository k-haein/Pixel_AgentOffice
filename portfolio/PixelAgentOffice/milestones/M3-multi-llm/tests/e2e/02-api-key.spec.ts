import { test, expect } from '@playwright/test'
import { launchApp, getGeminiKey } from './helpers'

test('Gemini API 키를 설정 모달에서 저장한다', async () => {
  const key = getGeminiKey()
  test.skip(!key, '.env.local의 GEMINI_API_KEY가 없어서 스킵')

  const { app, window } = await launchApp()

  // 설정 버튼 클릭
  await window.getByRole('button', { name: '⚙' }).click()

  // 설정 모달 열림 확인
  await expect(window.locator('.modal-header h2')).toContainText('설정')

  // Google API 키 input에 입력
  // Note: input은 type=password라 selector를 placeholder로 잡음
  const googleKeyInput = window.locator('input[placeholder*="AIza"]').first()
  await googleKeyInput.fill(key!)

  // 저장 클릭
  await window.getByRole('button', { name: '저장' }).click()

  // "✓ 저장되었습니다" 토스트 확인
  await expect(window.locator('text=/저장되었습니다/')).toBeVisible({ timeout: 5000 })

  // 모달 자동 닫힘 대기
  await window.waitForTimeout(1200)

  // 다시 설정 열어서 "저장됨" 배지 확인
  await window.getByRole('button', { name: '⚙' }).click()
  await expect(window.locator('.key-stored-badge').first()).toContainText('저장됨')

  await app.close()
})
