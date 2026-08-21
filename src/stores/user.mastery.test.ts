import { describe, test, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from './user'

beforeEach(() => setActivePinia(createPinia()))

describe('recordAnswer Leitner 升降档', () => {
  test('答对升档封顶 2，答错归 0', () => {
    const s = useUserStore()
    s.recordAnswer('p1', 'position', true)
    expect(s.getMasteryBox('p1', 'position')).toBe(1)
    s.recordAnswer('p1', 'position', true)
    expect(s.getMasteryBox('p1', 'position')).toBe(2)
    // 已封顶，继续答对不再升
    s.recordAnswer('p1', 'position', true)
    expect(s.getMasteryBox('p1', 'position')).toBe(2)
    // 答错归 0
    s.recordAnswer('p1', 'position', false)
    expect(s.getMasteryBox('p1', 'position')).toBe(0)
  })

  test('三维维度相互独立且可区分未练习', () => {
    const s = useUserStore()
    s.recordAnswer('p1', 'position', true)
    expect(s.getMasteryBox('p1', 'definition')).toBe(0)
    expect(s.hasMasteryRecord('p1', 'definition')).toBe(false)
    expect(s.hasMasteryRecord('p1', 'position')).toBe(true)
    s.recordAnswer('p1', 'itto', true)
    expect(s.getMasteryBox('p1', 'itto')).toBe(1)
    expect(s.getMasteryBox('p1', 'position')).toBe(1) // 不串维度
  })

  test('加载惰性衰减：超 7 天降一档、生疏保持 0、7 天内不变', () => {
    const s = useUserStore()
    const day = 24 * 60 * 60 * 1000
    s.mastery = {
      p1: { position: { box: 2, lastSeen: Date.now() - 8 * day } }, // 超 7 天 → 降为 1
      p2: { position: { box: 1, lastSeen: Date.now() - 1 * day } }, // 未超 → 保持 1
      p3: { position: { box: 0, lastSeen: Date.now() - 30 * day } }, // 生疏 → 保持 0
    }
    s.loadFromStorage()
    expect(s.getMasteryBox('p1', 'position')).toBe(1)
    expect(s.getMasteryBox('p2', 'position')).toBe(1)
    expect(s.getMasteryBox('p3', 'position')).toBe(0)
  })
})
