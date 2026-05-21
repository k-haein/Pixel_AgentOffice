/**
 * 상점 모달 (P2 #24) — 가구 카탈로그 미리보기.
 *
 * 1차 구현: 카탈로그 표시만. 구매·배치는 P2 #25 (드래그앤드롭) 다음 단계.
 * 가격 시스템: 결정 보류 — 1차는 무료 시즌 가정.
 */

import { platform } from '../platform'
import { useEffect, useState } from 'react'
import { eventBus } from '../game/eventBus'
import type { Employee, Settings, TeamPlateStyle, AccessoryId, DeskItemId } from '../shared/types'
import './ShopModal.css'

type ShopItem = {
  id: string
  emoji: string
  name: string
  desc: string
  category: '가구' | '꾸미기' | '비품'
}

type PlateItem = {
  id: TeamPlateStyle
  emoji: string
  name: string
  desc: string
}

const PLATE_CATALOG: PlateItem[] = [
  { id: 'wood', emoji: '🪧', name: '기본 팻말', desc: '바닥에 박힌 갈색 나무 팻말 (기본)' },
  { id: 'hanging', emoji: '🎏', name: '매달림 팻말', desc: '위 막대에서 줄로 매달린 어두운 팻말' },
  { id: 'stone', emoji: '🪨', name: '돌 팻말', desc: '회색 돌받침대 + 어두운 글자' },
]

// Day 11 v2.5 C — 액세서리 카탈로그
type AccessoryItem = { id: AccessoryId | 'none'; emoji: string; name: string }
const ACCESSORY_CATALOG: AccessoryItem[] = [
  { id: 'none', emoji: '🚫', name: '없음' },
  { id: 'glasses', emoji: '👓', name: '안경' },
  { id: 'sunglasses', emoji: '🕶️', name: '선글라스' },
  { id: 'cap', emoji: '🧢', name: '야구모자' },
]

// Day 11 v2.5 D — 책상 소품 카탈로그
type DeskItemEntry = { id: DeskItemId | 'none'; emoji: string; name: string }
const DESK_ITEM_CATALOG: DeskItemEntry[] = [
  { id: 'none', emoji: '🚫', name: '없음' },
  { id: 'mug', emoji: '☕', name: '머그컵' },
  { id: 'plant', emoji: '🪴', name: '작은 화분' },
  { id: 'laptop', emoji: '💻', name: '노트북' },
]

// Day 11 v2.5 A — 말풍선 안 12 emotion 미리보기 갤러리
type EmotionItem = { id: string; emoji: string; name: string }
const EMOTION_GALLERY: EmotionItem[] = [
  { id: 'thinking', emoji: '⋯', name: '생각' },
  { id: 'happy', emoji: '◡', name: '기쁨' },
  { id: 'surprised', emoji: '‼', name: '놀람' },
  { id: 'sleepy', emoji: 'Z', name: '졸음' },
  { id: 'confused', emoji: '?', name: '혼란' },
  { id: 'idea', emoji: '💡', name: '아이디어' },
  { id: 'love', emoji: '♥', name: '사랑' },
  { id: 'angry', emoji: '✗', name: '화남' },
  { id: 'sad', emoji: '💧', name: '슬픔' },
  { id: 'sweat', emoji: '💦', name: '땀' },
  { id: 'music', emoji: '♪', name: '음악' },
  { id: 'wow', emoji: '✨', name: '와우' },
]

const SHOP_CATALOG: ShopItem[] = [
  { id: 'plant-large', emoji: '🪴', name: '대형 화분', desc: '코너에 두면 분위기 ↑', category: '꾸미기' },
  { id: 'bookshelf-tall', emoji: '📚', name: '큰 책장 5단', desc: '책 더 많이 표시', category: '가구' },
  { id: 'coffee-machine', emoji: '☕', name: '커피머신', desc: '직원 만족도 효과 (예정)', category: '비품' },
  { id: 'vending-soda', emoji: '🥤', name: '음료 자판기', desc: '청량음료 추가', category: '비품' },
  { id: 'lounge-table', emoji: '🍽', name: '탕비실 테이블', desc: '점심·휴식 공간', category: '가구' },
  { id: 'calendar', emoji: '📅', name: '벽 캘린더', desc: '실시간 날짜 표시 (예정)', category: '꾸미기' },
  { id: 'sofa', emoji: '🛋', name: '소파', desc: '휴게 공간 시각화', category: '가구' },
  { id: 'frame', emoji: '🖼', name: '액자 (그림)', desc: '벽 액자 추가', category: '꾸미기' },
  { id: 'plant-corner', emoji: '🌿', name: '큰 식물', desc: '코너용 큰 화분', category: '꾸미기' },
  { id: 'desk-lamp-extra', emoji: '💡', name: '추가 탁상 전등', desc: '평시에도 켜진 전등', category: '비품' },
  { id: 'trash-can', emoji: '🧺', name: '휴지통', desc: '사무실 디테일', category: '비품' },
  { id: 'partition-extra', emoji: '🚪', name: '추가 칸막이', desc: '직원 공간 분리', category: '가구' },
]

type Props = {
  onClose: () => void
}

export function ShopModal({ onClose }: Props) {
  // 현재 팀 팻말 스타일 (Day 11)
  const [currentPlate, setCurrentPlate] = useState<TeamPlateStyle>('wood')
  // 직원 목록 + 선택된 직원 (액세서리·소품 적용 대상)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmpId, setSelectedEmpId] = useState<string>('')
  useEffect(() => {
    void (async () => {
      const data = await platform.loadData()
      setCurrentPlate(data.settings.teamPlateStyle ?? 'wood')
      setEmployees(data.employees)
      if (data.employees[0]) setSelectedEmpId(data.employees[0].id)
    })()
  }, [])
  const selectedEmp = employees.find(e => e.id === selectedEmpId)
  const applyAccessory = async (accId: AccessoryId | 'none') => {
    if (!selectedEmp) return
    const patch = { accessoryId: accId === 'none' ? undefined : accId }
    const updated = await platform.updateEmployee(selectedEmp.id, patch)
    if (updated) {
      setEmployees(prev => prev.map(e => (e.id === updated.id ? updated : e)))
      eventBus.emit('employee:updated', updated)
    }
  }
  const applyDeskItem = async (itemId: DeskItemId | 'none') => {
    if (!selectedEmp) return
    const patch = { deskItem: itemId === 'none' ? undefined : itemId }
    const updated = await platform.updateEmployee(selectedEmp.id, patch)
    if (updated) {
      setEmployees(prev => prev.map(e => (e.id === updated.id ? updated : e)))
      eventBus.emit('employee:updated', updated)
    }
  }
  const applyPlate = async (style: TeamPlateStyle) => {
    try {
      const next: Settings = await platform.updateSettings({ teamPlateStyle: style })
      setCurrentPlate(next.teamPlateStyle ?? 'wood')
      eventBus.emit('office:settings', next)
    } catch (err) {
      console.error('팻말 변경 실패:', err)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🛍 상점 — 사무실 꾸미기</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p className="modal-hint">
            가구·꾸미기·비품을 골라 사무실을 자기 스타일로 꾸며보세요. 1차 무료 시즌 진행 중.
          </p>

          {/* 팻말 카탈로그 (Day 11) — 즉시 적용 가능 */}
          <h3 style={{ marginTop: 8 }}>🪧 팀 팻말 디자인</h3>
          <p style={{ fontSize: 12, opacity: 0.7, margin: '4px 0 8px' }}>
            클릭으로 모든 팀의 팻말 스타일이 즉시 변경됩니다. (현재: <strong>{PLATE_CATALOG.find(p => p.id === currentPlate)?.name ?? currentPlate}</strong>)
          </p>
          <div className="shop-grid">
            {PLATE_CATALOG.map(plate => {
              const isActive = plate.id === currentPlate
              return (
                <div key={plate.id} className="shop-item" style={isActive ? { outline: '2px solid #8a5a2a' } : {}}>
                  <div className="shop-item-emoji">{plate.emoji}</div>
                  <div className="shop-item-name">{plate.name}</div>
                  <div className="shop-item-desc">{plate.desc}</div>
                  <button
                    className="shop-item-btn"
                    onClick={() => applyPlate(plate.id)}
                    disabled={isActive}
                  >
                    {isActive ? '✓ 사용 중' : '적용'}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 액세서리·책상 소품 (Day 11 v2.5 C·D) — 시각 비활성화 (그리드 너무 작음, PNG·그리드 확대 후 활성화 예정) */}
          {false && (<>
          <h3 style={{ marginTop: 16 }}>👓 액세서리 & 🪴 책상 소품</h3>
          {employees.length === 0 ? (
            <p style={{ fontSize: 12, opacity: 0.7 }}>먼저 직원을 채용하세요.</p>
          ) : (
            <>
              <p style={{ fontSize: 12, opacity: 0.7, margin: '4px 0 6px' }}>
                직원 선택:
                <select
                  value={selectedEmpId}
                  onChange={e => setSelectedEmpId(e.target.value)}
                  style={{ marginLeft: 6, padding: 2 }}
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.emoji} {emp.name} · {emp.role}
                    </option>
                  ))}
                </select>
              </p>
              <p style={{ fontSize: 12, opacity: 0.7, margin: '8px 0 4px' }}>
                액세서리 (현재: <strong>{ACCESSORY_CATALOG.find(a => a.id === (selectedEmp?.accessoryId ?? 'none'))?.name}</strong>)
              </p>
              <div className="shop-grid">
                {ACCESSORY_CATALOG.map(acc => {
                  const isActive = (selectedEmp?.accessoryId ?? 'none') === acc.id
                  return (
                    <div key={acc.id} className="shop-item" style={{ minHeight: 'auto', ...(isActive ? { outline: '2px solid #8a5a2a' } : {}) }}>
                      <div className="shop-item-emoji" style={{ fontSize: 22 }}>{acc.emoji}</div>
                      <div className="shop-item-name">{acc.name}</div>
                      <button
                        className="shop-item-btn"
                        onClick={() => applyAccessory(acc.id)}
                        disabled={isActive}
                      >
                        {isActive ? '✓' : '적용'}
                      </button>
                    </div>
                  )
                })}
              </div>
              <p style={{ fontSize: 12, opacity: 0.7, margin: '12px 0 4px' }}>
                책상 소품 (현재: <strong>{DESK_ITEM_CATALOG.find(d => d.id === (selectedEmp?.deskItem ?? 'none'))?.name}</strong>)
              </p>
              <div className="shop-grid">
                {DESK_ITEM_CATALOG.map(item => {
                  const isActive = (selectedEmp?.deskItem ?? 'none') === item.id
                  return (
                    <div key={item.id} className="shop-item" style={{ minHeight: 'auto', ...(isActive ? { outline: '2px solid #8a5a2a' } : {}) }}>
                      <div className="shop-item-emoji" style={{ fontSize: 22 }}>{item.emoji}</div>
                      <div className="shop-item-name">{item.name}</div>
                      <button
                        className="shop-item-btn"
                        onClick={() => applyDeskItem(item.id)}
                        disabled={isActive}
                      >
                        {isActive ? '✓' : '적용'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}
          </>)}

          {/* 감정 미리보기 갤러리 (Day 11 v2.5 A) */}
          <h3 style={{ marginTop: 16 }}>🎭 감정 표현 미리보기 (12종)</h3>
          <p style={{ fontSize: 12, opacity: 0.7, margin: '4px 0 8px' }}>
            클릭하면 모든 직원 말풍선에 5초간 표시. 트리거 매핑은 나중에 결정.
          </p>
          <div className="shop-grid">
            {EMOTION_GALLERY.map(em => (
              <div key={em.id} className="shop-item" style={{ minHeight: 'auto' }}>
                <div className="shop-item-emoji" style={{ fontSize: 24 }}>{em.emoji}</div>
                <div className="shop-item-name">{em.name}</div>
                <button
                  className="shop-item-btn"
                  onClick={() => eventBus.emit('agent:set-emotion', { agentId: '*', emotion: em.id, expireMs: 5000 })}
                >
                  미리보기
                </button>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: 16 }}>🪑 가구·꾸미기 (P2 #25 — 일부 활성화)</h3>
          <div className="shop-notice">
            ✅ <strong>8종 배치 가능</strong> — "사무실에 추가" 클릭 시 화면 중앙에 배치됩니다. 드래그로 이동, 우클릭으로 제거. 나머지는 다음 업데이트.
          </div>

          <div className="shop-grid">
            {SHOP_CATALOG.map(item => {
              // FURNITURE_SPECS와 매칭되는 ID만 배치 가능 (8종)
              const PLACEABLE_IDS = new Set([
                'plant-large', 'bookshelf-tall', 'vending-soda',
                'sofa', 'calendar', 'frame', 'trash-can', 'lounge-table',
              ])
              const isPlaceable = PLACEABLE_IDS.has(item.id)
              return (
                <div key={item.id} className="shop-item">
                  <div className="shop-item-emoji">{item.emoji}</div>
                  <div className="shop-item-name">{item.name}</div>
                  <div className="shop-item-cat">{item.category}</div>
                  <div className="shop-item-desc">{item.desc}</div>
                  {isPlaceable ? (
                    <button
                      className="shop-item-btn"
                      onClick={() => {
                        // 화면 중앙에 배치 (xRatio 0.5, yRatio 0.5)
                        eventBus.emit('furniture:placed', { itemId: item.id, xRatio: 0.5, yRatio: 0.5 })
                      }}
                    >
                      🏢 사무실에 추가
                    </button>
                  ) : (
                    <button className="shop-item-btn" disabled title="다음 업데이트">
                      곧 구매 가능
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn-secondary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}
