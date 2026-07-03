/**
 * M-2F-0 멀티모델 기반 — 모델 라우팅·단가 순수 로직 테스트.
 *
 * registry.ts는 electron을 import하지 않으므로 (§8 설계 원칙) vitest에서 직접 로드 가능.
 * 비용 카운터의 계산 축(estimateCostUsd)도 여기서 검증한다.
 */

import { describe, it, expect } from 'vitest'
import { providerFromModel, getProvider } from '../../electron/llm/registry'
import { MODEL_INFO, estimateCostUsd, type Model } from '../../src/shared/types'

const ALL_MODELS = Object.keys(MODEL_INFO) as Model[]

describe('providerFromModel — 모델명 → provider 라우팅', () => {
  it('claude-* → anthropic', () => {
    expect(providerFromModel('claude-opus-4-7')).toBe('anthropic')
    expect(providerFromModel('claude-sonnet-4-7')).toBe('anthropic')
    expect(providerFromModel('claude-haiku-4-7')).toBe('anthropic')
  })
  it('gemini-* → google', () => {
    expect(providerFromModel('gemini-2-5-pro')).toBe('google')
    expect(providerFromModel('gemini-2-5-flash')).toBe('google')
  })
  it('gpt-* → openai (M-2F-0 신규)', () => {
    expect(providerFromModel('gpt-5-mini')).toBe('openai')
  })
  it('MODEL_INFO의 provider 필드와 라우팅 결과가 전 모델에서 일치', () => {
    for (const m of ALL_MODELS) {
      expect(providerFromModel(m)).toBe(MODEL_INFO[m].provider)
    }
  })
})

describe('getProvider — provider 인스턴스', () => {
  it('세 provider 모두 LLMProvider 형태(chat/invalidateCache)를 유지', () => {
    for (const name of ['anthropic', 'google', 'openai'] as const) {
      const p = getProvider(name)
      expect(p.name).toBe(name)
      expect(typeof p.chat).toBe('function')
      expect(typeof p.invalidateCache).toBe('function')
    }
  })
})

describe('estimateCostUsd — 비용 카운터 계산 축', () => {
  it('gpt-5-mini: 입력 1M + 출력 1M = $0.25 + $2.00', () => {
    expect(estimateCostUsd('gpt-5-mini', 1_000_000, 1_000_000)).toBeCloseTo(2.25, 6)
  })
  it('기존 모델 단가는 변하지 않음 (claude-sonnet-4-7: $3/$15)', () => {
    expect(estimateCostUsd('claude-sonnet-4-7', 1_000_000, 1_000_000)).toBeCloseTo(18, 6)
  })
  it('모든 paid 모델은 0보다 큰 비용이 계산됨 (일일 한도 판정에 포함)', () => {
    for (const m of ALL_MODELS) {
      if (MODEL_INFO[m].tier !== 'paid') continue
      expect(estimateCostUsd(m, 1000, 1000)).toBeGreaterThan(0)
    }
  })
})
