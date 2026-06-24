import { test, expect } from '@playwright/test'
import { launchApp, getGeminiKey } from './helpers'

test('Gemini로 직원과 대화하고 응답을 받는다', async () => {
  const key = getGeminiKey()
  test.skip(!key, '.env.local의 GEMINI_API_KEY가 없어서 스킵')

  const { app, window } = await launchApp()

  // 1단계: Gemini API 키 저장 — 설정 → "API 키 설정 열기" → 미니 팝업 (Day 14 분리)
  await window.getByRole('button', { name: '⚙' }).click()
  await expect(window.locator('.modal-header h2')).toContainText('설정')
  await window.getByRole('button', { name: /API 키 설정 열기/ }).click()
  const googleKeyInput = window.locator('input[placeholder*="AIza"]').first()
  await googleKeyInput.fill(key!)
  await window.getByRole('button', { name: '💾 저장' }).click()
  await expect(window.locator('text=/저장되었습니다/')).toBeVisible({ timeout: 5000 })
  await window.waitForTimeout(1000) // API 키 팝업 자동 닫힘
  // 설정창이 뒤에 그대로 열려 있음 → 닫아서 채팅창이 가려지지 않게
  await window.keyboard.press('Escape')
  await window.waitForTimeout(300)

  // 2단계: 첫 직원을 Gemini 모델로 변경
  const firstEmpId = await window.evaluate(() => {
    return (window as any).__test.getFirstEmployeeId()
  })
  expect(firstEmpId).toBeTruthy()

  await window.evaluate(async (id: string) => {
    await (window as any).api.updateEmployee(id, { model: 'gemini-2-5-flash' })
    await (window as any).__test.refreshEmployees()
  }, firstEmpId)

  // 3단계: 채팅 열기 (test helper로 캐릭터 좌표 클릭 우회)
  await window.evaluate((id: string) => {
    ;(window as any).__test.openChat(id)
  }, firstEmpId)

  // 채팅창이 보임
  await expect(window.locator('.chat-popup')).toBeVisible()
  await expect(window.locator('.chat-role')).toContainText(/gemini/i)

  // 4단계: 메시지 전송
  await window.locator('.chat-input').fill('안녕! 한국어로 한 줄만 답해줘. "테스트 통과" 라고만 적어줘.')
  await window.getByRole('button', { name: '전송' }).click()

  // 5단계: 응답 대기 (Gemini가 무료라 빠름, 30초면 충분)
  // 시스템 메시지(첫 인사)·입력중(typing) 말풍선 제외 — 실제 응답 말풍선만 대기
  const agentMessages = window.locator('.msg-agent .msg-bubble:not(.msg-typing)')
  await expect(agentMessages.first()).toBeVisible({ timeout: 30_000 })

  const responseText = await agentMessages.first().textContent()
  console.log('🤖 Gemini 응답:', responseText)
  expect(responseText).toBeTruthy()
  expect(responseText!.length).toBeGreaterThan(0)

  await app.close()
})
