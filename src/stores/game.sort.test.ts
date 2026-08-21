import { test, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from './game'
import type { LevelConfig, Process, ProcessGroup, KnowledgeArea } from '@/data/types'

function makeLevel(over: Partial<LevelConfig> = {}): LevelConfig {
  return {
    id: 'sort-1-1', name: '初识过程组', stage: 1, number: 1,
    description: '', layoutType: 'columns', columns: ['initiating', 'closing'],
    cardPool: { source: 'processGroups', processGroupIds: ['initiating', 'closing'] },
    targetCount: 2, lives: 3, freezeCount: 1, trayCapacity: 6,
    initialFallSpeed: 40, initialSpawnInterval: 4000, minSpawnInterval: 2000,
    speedIncreaseRate: 0.08, speedIncreaseEvery: 5, starThresholds: { oneStar: 2, twoStarAccuracy: 0.8, threeStarAccuracy: 1, threeStarMinLives: 2 },
    ...over,
  } as LevelConfig
}
const processes: Process[] = [
  { id: 'p001', name: '制定项目章程', processGroupId: 'initiating', knowledgeAreaId: 'integration', difficulty: 2 },
  { id: 'p007', name: '结束项目或阶段', processGroupId: 'closing', knowledgeAreaId: 'integration', difficulty: 2 },
]
const pgs: ProcessGroup[] = [
  { id: 'initiating', name: '启动过程组', shortName: '启动', color: '#e74c3c' },
  { id: 'closing', name: '收尾过程组', shortName: '收尾', color: '#9b59b6' },
]
const kas: KnowledgeArea[] = [{ id: 'integration', name: '整合', shortName: '整合' }]

beforeEach(() => setActivePinia(createPinia()))

test('classify 列模式判正确/错误', () => {
  const s = useGameStore()
  s.startLevel(makeLevel(), processes, pgs, kas, processes)
  s.setGamePhase('playing')
  s.selectCard('p001')
  expect(s.classify('initiating')).toBe('correct')
  s.selectCard('p007')
  expect(s.classify('initiating')).toBe('wrong')
  expect(s.correctCount).toBe(1)
  expect(s.wrongCount).toBe(1)
})

test('classify 矩阵模式同时判过程组与知识领域', () => {
  const s = useGameStore()
  s.startLevel(makeLevel({ layoutType: 'matrix', columns: ['initiating'], rows: ['integration'] }), processes, pgs, kas, processes)
  s.setGamePhase('playing')
  s.selectCard('p001')
  expect(s.classify('initiating', 'integration')).toBe('correct')
  s.selectCard('p001')
  expect(s.classify('initiating', 'scope')).toBe('wrong')
})
