/**
 * M-2F-0 완료 기준 ②·③ 검증 — 새 provider(OpenAI)로 채팅 성공 + 비용/한도 카운터 동작.
 * 03-gemini-chat.spec.ts와 같은 흐름. OPENAI_API_KEY 없으면 skip.
 */

import { test, expect } from '@playwright/test'
import { launchApp, getOpenAIKey } from './helpers'

test('OpenAI(gpt-5-mini)로 직원과 대화하고 비용 카운터가 누적된다', async () => {
  const key = getOpenAIKey()
  test.skip(!key, '.env.local의 OPENAI_API_KEY가 없어서 스킵')

  const { app, window } = await launchApp()

  // 1단계: OpenAI API 키 저장 — 설정 → "API 키 설정 열기" → 미니 팝업
  await window.getByRole('button', { name: '⚙' }).click()
  await expect(window.locator('.modal-header h2')).toContainText('설정')
  await window.getByRole('button', { name: /API 키 설정 열기/ }).click()
  const openaiKeyInput = window.locator('input[placeholder="sk-..."]').first()
  await openaiKeyInput.fill(key!)
  await window.getByRole('button', { name: '💾 저장' }).click()
  await expect(window.locator('text=/저장되었습니다/')).toBeVisible({ timeout: 5000 })
  await window.waitForTimeout(1000) // API 키 팝업 자동 닫힘
  await window.keyboard.press('Escape') // 뒤에 남은 설정창 닫기
  await window.waitForTimeout(300)

  // 2단계: 첫 직원을 OpenAI 모델로 변경
  const firstEmpId = await window.evaluate(() => {
    return (window as any).__test.getFirstEmployeeId()
  })
  expect(firstEmpId).toBeTruthy()

  await window.evaluate(async (id: string) => {
    await (window as any).api.updateEmployee(id, { model: 'gpt-5-mini' })
    await (window as any).__test.refreshEmployees()
  }, firstEmpId)

  // 3단계: 채팅 열기
  await window.evaluate((id: string) => {
    ;(window as any).__test.openChat(id)
  }, firstEmpId)

  await expect(window.locator('.chat-popup')).toBeVisible()
  await expect(window.locator('.chat-role')).toContainText(/gpt/i)

  // 4단계: 메시지 전송
  await window.locator('.chat-input').fill('안녕! 한국어로 한 줄만 답해줘. "테스트 통과" 라고만 적어줘.')
  await window.getByRole('button', { name: '전송' }).click()

  // 5단계: 응답 대기 — 실제 응답 말풍선만 (시스템 첫 인사·typing 제외)
  const agentMessages = window.locator('.msg-agent .msg-bubble:not(.msg-typing)')
  await expect(agentMessages.first()).toBeVisible({ timeout: 60_000 })

  const responseText = await agentMessages.first().textContent()
  console.log('🤖 OpenAI 응답:', responseText)
  expect(responseText).toBeTruthy()
  expect(responseText!.length).toBeGreaterThan(0)

  // 6단계: 비용/한도 카운터 (완료 기준 ③) — dispatch 경유로 자동 누적됐는지
  const rateLimit = await window.evaluate(async () => {
    return await (window as any).api.getRateLimit('gpt-5-mini')
  })
  console.log('📊 gpt-5-mini 카운터:', rateLimit)
  expect(rateLimit.sessionRequests).toBeGreaterThanOrEqual(1) // 오늘 요청 수 기록됨
  expect(rateLimit.sessionInputTokens).toBeGreaterThan(0)     // 토큰 사용량 기록됨
  expect(rateLimit.sessionOutputTokens).toBeGreaterThan(0)
  expect(rateLimit.sessionCostUsd).toBeGreaterThan(0)         // 단가 기반 비용 계산됨
  expect(rateLimit.used).toBeGreaterThanOrEqual(1)            // RPM sliding window 기록됨

  await app.close()
})
