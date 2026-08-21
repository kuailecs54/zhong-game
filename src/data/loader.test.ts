import { describe, it, expect, test } from 'vitest'
import { getProcessesForLevel, getITTOForLevel } from './loader'
import type { LevelConfig, Process, CardPoolConfig, ITTO } from './types'

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

describe('getITTOForLevel', () => {
  const processes = [
    { id: 'p001', name: '制定项目章程', processGroupId: 'initiating', knowledgeAreaId: 'integration', difficulty: 2 },
    { id: 'p002', name: '制定项目管理计划', processGroupId: 'planning', knowledgeAreaId: 'integration', difficulty: 3 },
  ]
  const itto: Record<string, ITTO> = {
    p001: { inputs: [{ name: '协议' }], toolsAndTechniques: [{ name: '专家判断' }], outputs: [{ name: '项目章程' }] },
    p002: { inputs: [{ name: '项目章程' }], toolsAndTechniques: [{ name: '专家判断' }], outputs: [{ name: '项目管理计划' }] },
  }
  const level = { id: 'itto-1', mode: 'itto' as const, cardPool: { source: 'specific' as const, processIds: ['p001'] } }

  test('仅返回关卡池内过程对应的 ITTO', () => {
    const result = getITTOForLevel(level as any, processes as any, itto)
    expect(result).toHaveLength(1)
    expect(result[0].process.id).toBe('p001')
    expect(result[0].itto.outputs[0].name).toBe('项目章程')
  })
})
