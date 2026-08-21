import { test, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from './game'
import type { LevelConfig, Process, ProcessGroup, KnowledgeArea } from '@/data/types'

function makeLevel(over: Partial<LevelConfig> = {}): LevelConfig {
  return {
    id: 'sort-1-1', name: '初识过程组', stage: 1, number: 1,
    description: '', layoutType: 'columns', columns: ['initiating', 'closing'],
    cardPool: { source: 'processGroups', processGroupIds: ['initiating', 'closing'] },
    timePerCard: 10, lives: 3, hintCount: 1, freezeCount: 1, shieldCount: 1,
    starThresholds: { oneStar: 2, twoStarAccuracy: 0.8, threeStarAccuracy: 1 },
    ...over,
  } as LevelConfig
}
/** 构造 n 个过程（id: p1..pn），过程组在 initiating/closing 间交替（偶数下标=initiating） */
function makeProcesses(n: number): Process[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `过程${i + 1}`,
    processGroupId: i % 2 === 0 ? 'initiating' : 'closing',
    knowledgeAreaId: 'integration',
    difficulty: 2,
  }))
}
const pgs: ProcessGroup[] = [
  { id: 'initiating', name: '启动过程组', shortName: '启动', color: '#e74c3c' },
  { id: 'closing', name: '收尾过程组', shortName: '收尾', color: '#9b59b6' },
]
const kas: KnowledgeArea[] = [{ id: 'integration', name: '整合', shortName: '整合' }]

/** 开始关卡并固定出题顺序为池子原始顺序（消除洗牌随机性与自动抽首卡的影响），随后抽出第一张卡 */
function startDeterministic(s: ReturnType<typeof useGameStore>, level: LevelConfig, processes: Process[], mode?: 'challenge' | 'relaxed') {
  s.startLevel(level, processes, pgs, kas, mode ? { difficultyMode: mode } : undefined)
  // 覆盖洗牌结果为确定顺序，并撤销 startLevel 自动抽的首卡后重抽
  s.queue = processes.map(p => p.id)
  s.currentCardId = null
  s.cardsDrawn = 0
  s.timeLeft = level.timePerCard ?? 0
  s.setGamePhase('playing')
  s.drawNext()
}

/** 按过程组返回正确列 id */
function correctCol(processId: string): string {
  return Number(processId.slice(1)) % 2 === 1 ? 'initiating' : 'closing'
}

beforeEach(() => setActivePinia(createPinia()))

test('startLevel 后自动抽取首卡：currentCardId 非空且 queue 减一（回归：无卡死锁）', () => {
  const s = useGameStore()
  const processes = makeProcesses(3)
  s.startLevel(makeLevel(), processes, pgs, kas)
  expect(s.currentCardId).not.toBeNull()
  expect(s.queue.length).toBe(processes.length - 1)
})

test('无当前卡时 tick() 不改变 timeLeft（回归：倒计时空转）', () => {
  const s = useGameStore()
  const processes = makeProcesses(2)
  startDeterministic(s, makeLevel({ timePerCard: 10 }), processes)
  // 构造无当前卡场景
  s.currentCardId = null
  s.timeLeft = 10
  s.tick()
  s.tick()
  expect(s.timeLeft).toBe(10)
})

test('answer 列模式判正确/错误', () => {
  const s = useGameStore()
  const processes = makeProcesses(2) // p1=initiating, p2=closing
  startDeterministic(s, makeLevel(), processes)
  expect(s.currentCardId).toBe('p1')
  expect(s.answer('initiating')).toBe('correct')
  // 答对后立即抽下一张
  expect(s.currentCardId).toBe('p2')
  expect(s.answer('initiating')).toBe('wrong')
  expect(s.correctCount).toBe(1)
  expect(s.wrongCount).toBe(1)
})

test('answer 矩阵模式同时判过程组与知识领域', () => {
  const s = useGameStore()
  const processes = makeProcesses(2)
  startDeterministic(s, makeLevel({ layoutType: 'matrix', columns: ['initiating'], rows: ['integration'] }), processes)
  expect(s.answer('initiating', 'integration')).toBe('correct')
  // p2 答错行
  expect(s.answer('initiating', 'scope')).toBe('wrong')
})

test('过关判定 = 出题队列与复习队列清空且无当前卡', () => {
  const s = useGameStore()
  const processes = makeProcesses(2)
  startDeterministic(s, makeLevel(), processes)
  expect(s.isLevelComplete).toBe(false)
  s.answer(correctCol('p1'))
  s.answer(correctCol('p2'))
  expect(s.isLevelComplete).toBe(true)
})

test('答错进入复习队列，间隔未到时先出普通队列、间隔≥3 时复习卡优先', () => {
  const s = useGameStore()
  const processes = makeProcesses(5) // p1..p5
  startDeterministic(s, makeLevel(), processes)
  // 抽卡#1：p1 答错 → 入复习队列 enqueuedAtCardIndex=1，自动抽卡#2
  expect(s.answer('closing')).toBe('wrong')
  expect(s.reviewQueue.map(r => r.processId)).toEqual(['p1'])
  expect(s.currentCardId).toBe('p2') // 间隔 2-1=1 < 3 → 普通队列优先
  // p2 答对 → 自动抽卡#3：间隔 3-1=2 < 3 → 普通队列
  s.answer(correctCol('p2'))
  expect(s.currentCardId).toBe('p3')
  // p3 答对 → 自动抽卡#4：间隔 4-1=3 未到（此刻 cardsDrawn=3，间隔 2）→ 普通队列
  s.answer(correctCol('p3'))
  expect(s.currentCardId).toBe('p4')
  // p4 答对 → 自动抽卡#5：间隔 5-1=4 ≥ 3 → 复习卡 p1 优先于普通队列的 p5
  s.answer(correctCol('p4'))
  expect(s.currentCardId).toBe('p1')
  expect(s.queue).toEqual(['p5'])
  // 复习卡 p1 答对 → 从复习队列移除
  s.answer(correctCol('p1'))
  expect(s.reviewQueue.length).toBe(0)
})

test('普通队列耗尽时强制出最早复习卡（即使未到间隔）', () => {
  const s = useGameStore()
  const processes = makeProcesses(2)
  startDeterministic(s, makeLevel(), processes)
  s.answer('closing') // p1(initiating) 错 → review@1，自动抽 p2
  s.answer('initiating') // p2(closing) 错 → review@2，队列空 → 强制出最早的 p1
  expect(s.currentCardId).toBe('p1')
  expect(s.reviewQueue.map(r => r.processId)).toEqual(['p2'])
})

test('复习卡答对后从复习队列移除并可通关', () => {
  const s = useGameStore()
  const processes = makeProcesses(1)
  startDeterministic(s, makeLevel(), processes)
  s.answer('closing') // p1 错 → 入队，队列空强制重现 p1
  expect(s.currentCardId).toBe('p1')
  expect(s.isLevelComplete).toBe(false)
  s.answer('initiating') // 重现答对 → 移除复习项
  expect(s.reviewQueue.length).toBe(0)
  expect(s.isLevelComplete).toBe(true)
})

test('计分公式 score += 10 × min(5, 1+floor(combo/3))', () => {
  const s = useGameStore()
  const processes = makeProcesses(7)
  startDeterministic(s, makeLevel(), processes)
  // 连击 1..7 → 倍率 1,1,2,2,2,3,3 → 得分 10×14 = 140
  for (let i = 1; i <= 7; i++) {
    s.answer(correctCol(`p${i}`))
  }
  expect(s.combo).toBe(7)
  expect(s.maxCombo).toBe(7)
  expect(s.score).toBe(140)
})

test('答错连击清零、挑战模式扣生命', () => {
  const s = useGameStore()
  const processes = makeProcesses(3)
  startDeterministic(s, makeLevel(), processes)
  s.answer('initiating') // 对 combo=1
  s.answer('initiating') // 错 combo 清零、livesLeft 3→2
  expect(s.combo).toBe(0)
  expect(s.livesLeft).toBe(2)
  expect(s.isFailed).toBe(false)
})

test('挑战模式生命归零触发 isFailed', () => {
  const s = useGameStore()
  const processes = makeProcesses(3)
  startDeterministic(s, makeLevel({ lives: 1 }), processes)
  s.answer('closing') // 错 → livesLeft 0
  expect(s.isFailed).toBe(true)
})

test('超时计 missedCount 并按答错流程处理', () => {
  const s = useGameStore()
  const processes = makeProcesses(2)
  startDeterministic(s, makeLevel({ timePerCard: 0.1 }), processes)
  s.timeLeft = 0.1
  s.tick() // 归零触发 timeout
  expect(s.missedCount).toBe(1)
  expect(s.wrongCount).toBe(1)
  expect(s.wrongHistory[0]?.missed).toBe(true)
  expect(s.reviewQueue.map(r => r.processId)).toContain('p1')
  expect(s.livesLeft).toBe(2)
})

test('轻松模式无倒计时且不扣生命', () => {
  const s = useGameStore()
  const processes = makeProcesses(2)
  startDeterministic(s, makeLevel(), processes, 'relaxed')
  s.answer('closing') // 错
  expect(s.livesLeft).toBe(3) // 不扣命
  expect(s.isFailed).toBe(false)
  // tick 不递减倒计时
  const before = s.timeLeft
  s.tick()
  s.tick()
  expect(s.timeLeft).toBe(before)
})

test('护盾免罚不断连击但仍入复习队列', () => {
  const s = useGameStore()
  const processes = makeProcesses(4)
  startDeterministic(s, makeLevel({ shieldCount: 1 }), processes)
  s.answer(correctCol('p1')) // 对 combo=1
  s.answer(correctCol('p2')) // 对 combo=2
  expect(s.items.shield).toBe(1)
  s.useShield()
  expect(s.items.shield).toBe(0)
  s.answer('closing') // p3(initiating) 答错但有护盾
  expect(s.combo).toBe(2) // 连击不断
  expect(s.livesLeft).toBe(3) // 不扣命
  expect(s.reviewQueue.some(r => r.processId === 'p3')).toBe(true) // 仍入队
})

test('道具数量为 0 时使用无效', () => {
  const s = useGameStore()
  const processes = makeProcesses(2)
  startDeterministic(s, makeLevel({ hintCount: 0, freezeCount: 0, shieldCount: 0 }), processes)
  s.useHint()
  s.useFreeze()
  s.useShield()
  expect(s.hintActiveUntil).toBe(0)
  expect(s.freezeTicksLeft).toBe(0)
  expect(s.shieldActiveUntilAnswer).toBe(false)
})

test('冰冻道具暂停倒计时 10 秒', () => {
  const s = useGameStore()
  const processes = makeProcesses(2)
  startDeterministic(s, makeLevel({ timePerCard: 10 }), processes)
  s.useFreeze()
  expect(s.freezeTicksLeft).toBe(100)
  for (let i = 0; i < 100; i++) s.tick()
  expect(s.timeLeft).toBe(10) // 冰冻期间时间不减少
  expect(s.freezeTicksLeft).toBe(0)
  s.tick()
  expect(s.timeLeft).toBeCloseTo(9.9, 5) // 冰冻结束后恢复递减
})

test('submitQuizResult 正确路径：连击计分并推进队列', () => {
  const s = useGameStore()
  const processes = makeProcesses(3)
  startDeterministic(s, makeLevel(), processes)
  expect(s.submitQuizResult(true, '过程1')).toBe('correct')
  expect(s.correctCount).toBe(1)
  expect(s.combo).toBe(1)
  expect(s.score).toBe(10)
  // 立即推进到下一张
  expect(s.currentCardId).toBe('p2')
})

test('submitQuizResult 错误路径：复习入队、连击清零、挑战扣命', () => {
  const s = useGameStore()
  const processes = makeProcesses(3)
  startDeterministic(s, makeLevel(), processes)
  expect(s.submitQuizResult(false, '选了干扰项')).toBe('wrong')
  expect(s.wrongCount).toBe(1)
  expect(s.combo).toBe(0)
  expect(s.livesLeft).toBe(2)
  expect(s.reviewQueue.some(r => r.processId === 'p1')).toBe(true)
  // chosenLabel 记入错题历史
  expect(s.wrongHistory[0]?.chosenColumnId).toBe('选了干扰项')
})

test('submitQuizResult 与护盾兼容：免罚不断连击仍入队', () => {
  const s = useGameStore()
  const processes = makeProcesses(4)
  startDeterministic(s, makeLevel({ shieldCount: 1 }), processes)
  s.submitQuizResult(true) // combo=1
  s.useShield()
  s.submitQuizResult(false) // 护盾抵消
  expect(s.combo).toBe(1)
  expect(s.livesLeft).toBe(3)
  expect(s.reviewQueue.some(r => r.processId === 'p2')).toBe(true)
})

test('resetLevel 重建队列与全部计数', () => {
  const s = useGameStore()
  const processes = makeProcesses(2)
  startDeterministic(s, makeLevel(), processes)
  s.answer('closing') // 错
  expect(s.wrongCount).toBe(1)
  s.resetLevel()
  expect(s.score).toBe(0)
  expect(s.wrongCount).toBe(0)
  expect(s.missedCount).toBe(0)
  expect(s.reviewQueue.length).toBe(0)
  // 重开后自动抽出首卡（队列 2 张 → 剩 1 张）
  expect(s.currentCardId).not.toBeNull()
  expect(s.queue.length).toBe(1)
  expect(s.gamePhase).toBe('start')
})
