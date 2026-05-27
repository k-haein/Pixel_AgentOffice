import { test, expect } from '@playwright/test'
import { launchApp } from './helpers'

test('앱이 띄워지고 사무실이 렌더링된다', async () => {
  const { app, window } = await launchApp()

  // 윈도우 타이틀 확인
  const title = await window.title()
  expect(title).toBe('PixelAgentOffice')

  // 상단바 타이틀 확인
  await expect(window.locator('.topbar-title')).toContainText('PixelAgentOffice')

  // 직원 카운터가 보임 (기본 직원 2명 있을 거)
  await expect(window.locator('.topbar-sub')).toContainText('직원')

  // 채용 / 설정 버튼 존재
  await expect(window.getByRole('button', { name: /채용/ })).toBeVisible()
  await expect(window.getByRole('button', { name: '⚙' })).toBeVisible()

  await app.close()
})
