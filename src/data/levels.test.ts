import { describe, expect, test } from 'vitest'
import type { LevelConfig } from './types'
import rawLevels from '../../public/data/levels.json'

const levels = rawLevels as LevelConfig[]

describe('ITTO 关卡配置', () => {
  test('五个 ITTO 关卡使用双分区、三个干扰项和渐进难度', () => {
    const expected: Record<string, { correct: number; time: number }> = {
      'itto-1-1': { correct: 1, time: 25 },
      'itto-2-1': { correct: 1, time: 25 },
      'itto-3-1': { correct: 2, time: 30 },
      'itto-6-1': { correct: 3, time: 35 },
      'itto-6-2': { correct: 3, time: 35 },
    }
    const ittoLevels = levels.filter(level => level.mode === 'itto')
    expect(ittoLevels.map(level => level.id).sort()).toEqual(Object.keys(expected).sort())
    for (const level of ittoLevels) {
      expect(level.ittoQuiz).toEqual({
        sectionsPerQuestion: 2,
        correctPerSection: expected[level.id].correct,
        distractorsPerSection: 3,
      })
      expect(level.timePerCard).toBe(expected[level.id].time)
    }
  })

  test('非 ITTO 关卡无需 ittoQuiz 配置', () => {
    expect(levels.filter(level => level.mode !== 'itto').every(level => level.ittoQuiz === undefined)).toBe(true)
  })
})
