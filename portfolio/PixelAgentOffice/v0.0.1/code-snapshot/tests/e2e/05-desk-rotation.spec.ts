/**
 * B-4 책상 회전 회귀 테스트.
 *
 * 검증:
 *  1. 우클릭 컨텍스트 메뉴에 "🔄 책상 회전" 항목 존재
 *  2. 회전 클릭 → 메뉴 닫힘 → 책상 옆 영역(zone 회전 후 위치)에서 다시 우클릭 시 메뉴 표시
 *  3. 3번 회전 후 (front → right → left → front) 다시 front 자리에서 우클릭 시 메뉴 표시
 */

import { test, expect } from '@playwright/test'
import { launchApp } from './helpers'

// seats.ts 정의와 일치
const TEAM_X = { A: 0.20 } as const
const LEADER_Y = 0.45
const MEMBER_OFFSETS = [
  { dx: -0.06, dy: 0.15 }, // 0: 좌상 (Mary)
] as const

function seatDeskPos(canvasBox: { x: number; y: number; width: number; height: number }) {
  const xRatio = TEAM_X.A + MEMBER_OFFSETS[0].dx
  const yRatio = LEADER_Y + MEMBER_OFFSETS[0].dy
  return {
    deskX: canvasBox.x + xRatio * canvasBox.width,
    deskY: canvasBox.y + yRatio * canvasBox.height,
  }
}

test.describe('책상 회전 (B-4)', () => {
  test('컨텍스트 메뉴에 "책상 회전" 항목 존재 + 클릭 시 메뉴 닫힘', async () => {
    const { app, window } = await launchApp()
    const canvas = await window.locator('canvas').first().boundingBox()
    expect(canvas).not.toBeNull()
    if (!canvas) return

    const { deskX, deskY } = seatDeskPos(canvas)
    await window.mouse.click(deskX, deskY - 44, { button: 'right' })
    await window.waitForTimeout(150)

    const menu = window.locator('.employee-context-menu')
    await expect(menu).toBeVisible()

    const rotateBtn = menu.getByRole('button', { name: /책상 회전/ })
    await expect(rotateBtn).toBeVisible()

    await rotateBtn.click()
    await window.waitForTimeout(300) // platform.updateEmployee + rebuild 대기
    await expect(menu).toBeHidden()

    await app.close()
  })

  test('회전 후 책상 옆 영역에서 우클릭하면 메뉴 다시 표시 (zone이 회전 따라감)', async () => {
    const { app, window } = await launchApp()
    const canvas = await window.locator('canvas').first().boundingBox()
    expect(canvas).not.toBeNull()
    if (!canvas) return

    const { deskX, deskY } = seatDeskPos(canvas)

    // 1) 우클릭 → 회전 1회 (front → right)
    await window.mouse.click(deskX, deskY - 44, { button: 'right' })
    await window.waitForTimeout(150)
    const menu = window.locator('.employee-context-menu')
    await expect(menu).toBeVisible()
    await menu.getByRole('button', { name: /책상 회전/ }).click()
    await window.waitForTimeout(400) // updateEmployee + rebuild

    // 2) right 회전 후 캐릭터는 책상 *왼쪽* (deskX-44, deskY) 근처
    //    zone은 중심 (deskX-30, deskY), 140×90 → x 범위 (deskX-100, deskX+40), y 범위 (deskY-45, deskY+45)
    //    캐릭터 위치 (deskX-44, deskY)에서 우클릭
    await window.mouse.click(deskX - 44, deskY, { button: 'right' })
    await window.waitForTimeout(150)
    await expect(menu).toBeVisible()
    await expect(menu).toContainText('Mary')

    await app.close()
  })

  test('3번 회전 시 front로 복귀 — 정면 캐릭터 위치 우클릭 동작', async () => {
    const { app, window } = await launchApp()
    const canvas = await window.locator('canvas').first().boundingBox()
    expect(canvas).not.toBeNull()
    if (!canvas) return

    const { deskX, deskY } = seatDeskPos(canvas)
    const menu = window.locator('.employee-context-menu')

    // front → right
    await window.mouse.click(deskX, deskY - 44, { button: 'right' })
    await window.waitForTimeout(150)
    await menu.getByRole('button', { name: /책상 회전/ }).click()
    await window.waitForTimeout(400)

    // right → left — 캐릭터는 deskX-44 위치
    await window.mouse.click(deskX - 44, deskY, { button: 'right' })
    await window.waitForTimeout(150)
    await menu.getByRole('button', { name: /책상 회전/ }).click()
    await window.waitForTimeout(400)

    // left → front — 캐릭터는 deskX+44 위치
    await window.mouse.click(deskX + 44, deskY, { button: 'right' })
    await window.waitForTimeout(150)
    await menu.getByRole('button', { name: /책상 회전/ }).click()
    await window.waitForTimeout(400)

    // 다시 정면 — 원래 위치(deskX, deskY-44)에서 우클릭 시 인식
    await window.mouse.click(deskX, deskY - 44, { button: 'right' })
    await window.waitForTimeout(150)
    await expect(menu).toBeVisible()
    await expect(menu).toContainText('Mary')

    await app.close()
  })
})
