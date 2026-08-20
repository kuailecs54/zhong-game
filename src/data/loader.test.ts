import { describe, it, expect } from 'vitest'
import { getProcessesForLevel } from './loader'
import type { LevelConfig, Process, CardPoolConfig } from './types'

function proc(id: string, difficulty = 3, pg = 'planning', ka = 'scope'): Process {
  return { id, name: id, processGroupId: pg, knowledgeAreaId: ka, difficulty } as Process
}

function level(overrides: Partial<CardPoolConfig> & { source?: CardPoolConfig['source'] } = {}): LevelConfig {
  const { source = 'all', ...rest } = overrides
  return {
    id: 'sort-1-1',
    name: 'Test',
    stage: 1,
    number: 1,
    description: 'test',
    layoutType: 'columns',
    columns: ['planning'],
    cardPool: { source, ...rest },
    targetCount: 5,
    initialFallSpeed: 100,
    initialSpawnInterval: 1000,
    minSpawnInterval: 300,
    speedIncreaseRate: 0.1,
    speedIncreaseEvery: 5,
    lives: 3,
    freezeCount: 1,
    trayCapacity: 4,
    starThresholds: { oneStar: 5, twoStarAccuracy: 0.7, threeStarAccuracy: 0.9, threeStarMinLives: 1 },
  } as LevelConfig
}

describe('getProcessesForLevel', () => {
  const processes: Process[] = [
    proc('p1', 1),
    proc('p2', 3),
    proc('p3', 5),
    proc('p4', 7),
    proc('p5', 9),
  ]

  it('difficultyRange 过滤保留区间内过程', () => {
    const result = getProcessesForLevel(level({ difficultyRange: [3, 7] }), processes)
    expect(result.map(p => p.id)).toEqual(['p2', 'p3', 'p4'])
  })

  it('includeIds 白名单仅保留指定 ID', () => {
    const result = getProcessesForLevel(level({ includeIds: ['p1', 'p3'] }), processes)
    expect(result.map(p => p.id)).toEqual(['p1', 'p3'])
  })

  it('excludeIds 黑名单过滤掉指定 ID', () => {
    const result = getProcessesForLevel(level({ excludeIds: ['p2', 'p5'] }), processes)
    expect(result.map(p => p.id)).toEqual(['p1', 'p3', 'p4'])
  })

  it('includeIds 与 difficultyRange 组合为交集过滤', () => {
    const result = getProcessesForLevel(
      level({ includeIds: ['p1', 'p2', 'p3', 'p4'], difficultyRange: [2, 5] }),
      processes,
    )
    expect(result.map(p => p.id)).toEqual(['p2', 'p3'])
  })

  it('excludeIds 与 difficultyRange 组合按序过滤', () => {
    const result = getProcessesForLevel(
      level({ excludeIds: ['p3'], difficultyRange: [1, 9] }),
      processes,
    )
    expect(result.map(p => p.id)).toEqual(['p1', 'p2', 'p4', 'p5'])
  })

  it('空池不抛错返回空数组（白名单无匹配）', () => {
    const result = getProcessesForLevel(level({ includeIds: ['nonexistent'] }), processes)
    expect(result).toEqual([])
  })
})
