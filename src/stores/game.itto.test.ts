import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { KnowledgeArea, LevelConfig, Process, ProcessGroup } from '@/data/types'
import { useGameStore } from './game'
import { useUserStore } from './user'

const level: LevelConfig = {
  id: 'itto-test',
  name: 'ITTO 测试',
  stage: 1,
  number: 1,
  mode: 'itto',
  description: '',
  layoutType: 'columns',
  columns: ['planning'],
  cardPool: { source: 'specific', processIds: ['p1'] },
  ittoQuiz: { sectionsPerQuestion: 2, correctPerSection: 1, distractorsPerSection: 3 },
  timePerCard: 1,
  lives: 3,
  starThresholds: { oneStar: 1, twoStarAccuracy: 0.8, threeStarAccuracy: 1 },
}
const processes: Process[] = [{
  id: 'p1',
  name: '制定项目管理计划',
  processGroupId: 'planning',
  knowledgeAreaId: 'integration',
  difficulty: 1,
}]
const processGroups: ProcessGroup[] = [{
  id: 'planning', name: '规划过程组', shortName: '规划', color: '#3498db',
}]
const knowledgeAreas: KnowledgeArea[] = [{
  id: 'integration', name: '项目整合管理', shortName: '整合',
}]

function start() {
  const game = useGameStore()
  game.startLevel(level, processes, processGroups, knowledgeAreas)
  game.setGamePhase('playing')
  return game
}

beforeEach(() => {
  setActivePinia(createPinia())
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  })
})

describe('ITTO 统一引擎回归', () => {
  test('双分区题仍按一个过程计一道题和一次判定', () => {
    const game = start()
    expect(game.totalCount).toBe(1)
    game.submitQuizResult(true)
    expect(game.correctCount).toBe(1)
    expect(game.wrongCount).toBe(0)
    expect(game.isLevelComplete).toBe(true)
  })

  test('答错和超时各只扣一条生命并只保留一个复习项', () => {
    const wrong = start()
    wrong.submitQuizResult(false)
    expect(wrong.livesLeft).toBe(2)
    expect(wrong.reviewQueue).toHaveLength(0)
    expect(wrong.currentCardId).toBe('p1')
    wrong.submitQuizResult(true)
    expect(wrong.isLevelComplete).toBe(true)

    setActivePinia(createPinia())
    const timeout = start()
    timeout.timeLeft = 0.1
    timeout.tick()
    expect(timeout.livesLeft).toBe(2)
    expect(timeout.missedCount).toBe(1)
    expect(timeout.currentCardId).toBe('p1')
  })

  test('掌握度按过程每次判定记录一次且持久化结构不变', () => {
    const game = start()
    const user = useUserStore()
    game.submitQuizResult(false)
    expect(user.getMasteryBox('p1', 'itto')).toBe(0)
    game.submitQuizResult(true)
    expect(user.getMasteryBox('p1', 'itto')).toBe(1)

    const stored = JSON.parse(localStorage.getItem('pm-sort-game-user')!)
    expect(Object.keys(stored).sort()).toEqual(['mastery', 'progress', 'settings', 'username'])
    expect(stored.mastery.p1.itto).toEqual({ box: 1, lastSeen: expect.any(Number) })
  })
})
