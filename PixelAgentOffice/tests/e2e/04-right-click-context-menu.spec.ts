/**
 * B-3 우클릭 컨텍스트 메뉴 회귀 테스트.
 *
 * 검증:
 *  1. 캐릭터 우클릭 → 컨텍스트 메뉴 표시 (이름 포함)
 *  2. 메뉴 열린 상태에서 다른 캐릭터 우클릭 → 메뉴가 새 캐릭터로 갱신
 *  3. 자리 영역 (캐릭터 아래·옆, 책상 위) 우클릭 → 메뉴 표시 (zone 확장 검증)
 *  4. 메뉴의 "자리 이동 (드래그)" 버튼이 존재
 */

import { test, expect } from '@playwright/test'
import { launchApp } from './helpers'

// seats.ts 정의와 일치. 시드는 팀 A만 활성 → getDynamicSeatX가 팀 A를 화면 중앙(0.5)에 배치.
// (MEMBER_OFFSETS dy는 seats.ts와 동일하게 0.20)
const TEAM_A_BASE = 0.5
const LEADER_Y = 0.45
const MEMBER_OFFSETS = [
  { dx: -0.06, dy: 0.20 }, // 0: 좌상 (Mary)
  { dx:  0.06, dy: 0.20 }, // 1: 우상 (Haewol)
] as const

/** 자리의 캔버스 내 위치 — desk 중심 (deskY = yRatio * h) */
function seatDeskPos(canvasBox: { x: number; y: number; width: number; height: number }, memberIdx: 0 | 1) {
  const xRatio = TEAM_A_BASE + MEMBER_OFFSETS[memberIdx].dx
  const yRatio = LEADER_Y + MEMBER_OFFSETS[memberIdx].dy
  return {
    deskX: canvasBox.x + xRatio * canvasBox.width,
    deskY: canvasBox.y + yRatio * canvasBox.height,
  }
}

test.describe('우클릭 컨텍스트 메뉴 + 자리 영역(zone)', () => {
  test('캐릭터 위 우클릭 → 메뉴 표시', async () => {
    const { app, window } = await launchApp()
    const canvas = await window.locator('canvas').first().boundingBox()
    expect(canvas).not.toBeNull()
    if (!canvas) return

    // Mary (member:A:0) 위치 — 캐릭터는 deskY - 44
    const { deskX, deskY } = seatDeskPos(canvas, 0)
    const charY = deskY - 44

    await window.mouse.click(deskX, charY, { button: 'right' })
    await window.waitForTimeout(150)

    const menu = window.locator('.employee-context-menu')
    await expect(menu).toBeVisible()
    await expect(menu).toContainText('Mary')

    await app.close()
  })

  test('자리 영역(zone) — 캐릭터 *아래쪽* 책상 위 우클릭도 메뉴 표시', async () => {
    const { app, window } = await launchApp()
    const canvas = await window.locator('canvas').first().boundingBox()
    expect(canvas).not.toBeNull()
    if (!canvas) return

    // Mary 자리에서 책상 중심 (deskY 그대로 — 캐릭터 아래 위치)
    const { deskX, deskY } = seatDeskPos(canvas, 0)

    // 책상 위 우클릭 (캐릭터 아닌 영역) — zone이 잡아야 함
    await window.mouse.click(deskX, deskY + 10, { button: 'right' })
    await window.waitForTimeout(150)

    const menu = window.locator('.employee-context-menu')
    await expect(menu).toBeVisible()
    await expect(menu).toContainText('Mary')

    await app.close()
  })

  test('메뉴 열린 상태에서 다른 캐릭터 우클릭 → 새 캐릭터로 갱신', async () => {
    const { app, window } = await launchApp()
    const canvas = await window.locator('canvas').first().boundingBox()
    expect(canvas).not.toBeNull()
    if (!canvas) return

    // 1) Mary 우클릭 → 메뉴 표시
    const mary = seatDeskPos(canvas, 0)
    await window.mouse.click(mary.deskX, mary.deskY - 44, { button: 'right' })
    await window.waitForTimeout(150)
    const menu = window.locator('.employee-context-menu')
    await expect(menu).toBeVisible()
    await expect(menu).toContainText('Mary')

    // 2) 메뉴 떠있는 상태에서 Haewol 우클릭
    const haewol = seatDeskPos(canvas, 1)
    await window.mouse.click(haewol.deskX, haewol.deskY - 44, { button: 'right' })
    // null → 새 메뉴 setTimeout 거치니까 약간 더 대기
    await window.waitForTimeout(250)

    // 3) 메뉴가 여전히 보이고, 내용이 Haewol로 바뀌어야 함
    await expect(menu).toBeVisible()
    await expect(menu).toContainText('Haewol')

    await app.close()
  })

  test('메뉴에 "자리 이동" 항목 존재 + 클릭하면 메뉴 닫힘', async () => {
    const { app, window } = await launchApp()
    const canvas = await window.locator('canvas').first().boundingBox()
    expect(canvas).not.toBeNull()
    if (!canvas) return

    const { deskX, deskY } = seatDeskPos(canvas, 0)
    await window.mouse.click(deskX, deskY - 44, { button: 'right' })
    await window.waitForTimeout(150)

    const menu = window.locator('.employee-context-menu')
    await expect(menu).toBeVisible()

    // "🪑 자리 이동 (드래그)" 버튼 존재
    const moveBtn = menu.getByRole('button', { name: /자리 이동/ })
    await expect(moveBtn).toBeVisible()

    // 클릭하면 메뉴는 닫힘 (이동 모드 진입)
    await moveBtn.click()
    await window.waitForTimeout(150)
    await expect(menu).toBeHidden()

    await app.close()
  })
})
