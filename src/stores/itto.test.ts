import { expect, test, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIttoStore } from './itto'
import type { ITTO } from '@/data/types'

const pool = [
  {
    process: { id: 'p001', name: '制定项目章程', processGroupId: 'initiating', knowledgeAreaId: 'integration', difficulty: 2 },
    itto: { inputs: [{ name: '协议' }], toolsAndTechniques: [{ name: '专家判断' }], outputs: [{ name: '项目章程' }] } as ITTO,
  },
]

beforeEach(() => setActivePinia(createPinia()))

test('题目正确项必含真实 ITTO，且生成干扰项', () => {
  const s = useIttoStore()
  s.startQuiz(pool)
  const q = s.currentQuestion
  expect(q).toBeTruthy()
  expect(q!.correctInputs).toContain('协议')
  expect(q!.optionsInputs.length).toBeGreaterThanOrEqual(q!.correctInputs.length)
})

test('提交后按各区判定计分', () => {
  const s = useIttoStore()
  s.startQuiz(pool)
  s.toggleSelection('inputs', '协议')
  s.toggleSelection('tools', '专家判断')
  s.toggleSelection('outputs', '项目章程')
  const r = s.submit()
  expect(r.inputs).toBe(true)
  expect(r.tools).toBe(true)
  expect(r.outputs).toBe(true)
  expect(s.score).toBe(1)
})
