/**
 * 상점 모달 (P2 #24) — 가구 카탈로그 미리보기.
 *
 * 1차 구현: 카탈로그 표시만. 구매·배치는 P2 #25 (드래그앤드롭) 다음 단계.
 * 가격 시스템: 결정 보류 — 1차는 무료 시즌 가정.
 */

import './ShopModal.css'

type ShopItem = {
  id: string
  emoji: string
  name: string
  desc: string
  category: '가구' | '꾸미기' | '비품'
}

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
          <div className="shop-notice">
            ⚠️ <strong>지금은 카탈로그 미리보기</strong> 단계입니다. 구매 + 배치(드래그앤드롭)는 다음 업데이트에서 활성화됩니다.
          </div>

          <div className="shop-grid">
            {SHOP_CATALOG.map(item => (
              <div key={item.id} className="shop-item">
                <div className="shop-item-emoji">{item.emoji}</div>
                <div className="shop-item-name">{item.name}</div>
                <div className="shop-item-cat">{item.category}</div>
                <div className="shop-item-desc">{item.desc}</div>
                <button className="shop-item-btn" disabled title="다음 업데이트">
                  곧 구매 가능
                </button>
              </div>
            ))}
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
