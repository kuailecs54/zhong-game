import { describe, expect, test } from 'vitest'
import type { ITTO, ITTOQuizConfig, Process } from './types'
import { createITTOQuestionPlan, createITTOQuestionPlans, isITTOSelectionCorrect } from './ittoQuestion'

const config: ITTOQuizConfig = {
  sectionsPerQuestion: 2,
  correctPerSection: 2,
  distractorsPerSection: 3,
}

function process(id: string, knowledgeAreaId: string, processGroupId: string): Process {
  return { id, name: id, knowledgeAreaId, processGroupId, difficulty: 1 }
}

function itto(inputs: string[], tools: string[], outputs: string[], core: string[] = []): ITTO {
  const items = (names: string[]) => names.map(name => ({ name, tags: core.includes(name) ? ['core'] : ['common'] }))
  return { inputs: items(inputs), toolsAndTechniques: items(tools), outputs: items(outputs) }
}

const current = process('current', 'scope', 'planning')
const sameArea = process('same-area', 'scope', 'executing')
const sameGroup = process('same-group', 'risk', 'planning')
const global = process('global', 'cost', 'closing')
const allProcesses = [current, sameArea, sameGroup, global]
const allITTO: Record<string, ITTO> = {
  current: itto(['当前输入 A', '当前输入 B'], ['当前工具 A'], ['当前输出 A', '当前输出 B', '当前输出 C'], ['当前输入 B', '当前输出 C']),
  'same-area': itto(['同领域输入 A', '同领域输入 B', '当前输入 A'], ['同领域工具 A'], ['同领域输出 A', '重复输出']),
  'same-group': itto(['同组输入 A'], ['同组工具 A'], ['同组输出 A', '重复输出']),
  global: itto(['全局输入 A'], ['全局工具 A'], ['全局输出 A']),
}

describe('createITTOQuestionPlan', () => {
  test('同屏生成两个不同分区并限制正确项数量', () => {
    const plan = createITTOQuestionPlan(current, allITTO.current, allProcesses, allITTO, config, () => 0.99)
    expect(plan.sections).toHaveLength(2)
    expect(new Set(plan.sections.map(section => section.category)).size).toBe(2)
    expect(plan.sections.every(section => section.correct.length <= config.correctPerSection)).toBe(true)
  })

  test('核心项优先，真实项不足时使用全部真实项', () => {
    const plan = createITTOQuestionPlan(current, allITTO.current, allProcesses, allITTO, config, () => 0.99)
    const input = plan.sections.find(section => section.category === 'inputs')
    const tools = plan.sections.find(section => section.category === 'tools')
    expect(input?.correct).toContain('当前输入 B')
    expect(tools?.correct).toEqual(['当前工具 A'])
  })

  test('候选项排除当前过程全部真实项并按名称去重', () => {
    const plan = createITTOQuestionPlan(current, allITTO.current, allProcesses, allITTO, config, () => 0.99)
    for (const section of plan.sections) {
      expect(new Set(section.options).size).toBe(section.options.length)
      const currentNames = section.category === 'inputs'
        ? allITTO.current.inputs.map(item => item.name)
        : section.category === 'tools'
          ? allITTO.current.toolsAndTechniques.map(item => item.name)
          : allITTO.current.outputs.map(item => item.name)
      const unselectedReal = currentNames.filter(name => !section.correct.includes(name))
      expect(section.options.some(name => unselectedReal.includes(name))).toBe(false)
    }
  })

  test('干扰项按同知识领域、同过程组、全局逐层补足', () => {
    const plan = createITTOQuestionPlan(current, allITTO.current, allProcesses, allITTO, config, () => 0.99)
    const input = plan.sections.find(section => section.category === 'inputs')!
    const distractors = input.options.filter(name => !input.correct.includes(name))
    expect(distractors).toEqual(expect.arrayContaining(['同领域输入 A', '同领域输入 B', '同组输入 A']))
    expect(distractors).not.toContain('全局输入 A')
  })

  test('候选池不足时使用全部可用唯一干扰项', () => {
    const sparseITTO = {
      current: allITTO.current,
      'same-area': itto(['仅有干扰项'], [], []),
    }
    const plan = createITTOQuestionPlan(current, allITTO.current, [current, sameArea], sparseITTO, config, () => 0.99)
    const input = plan.sections.find(section => section.category === 'inputs')!
    expect(input.options.filter(name => !input.correct.includes(name))).toEqual(['仅有干扰项'])
  })
})

describe('createITTOQuestionPlans', () => {
  test('同一轮按过程缓存同一对象，新一轮可生成不同方案', () => {
    const first = createITTOQuestionPlans([current], allProcesses, allITTO, config, () => 0.99)
    expect(first.current).toBe(first.current)
    const second = createITTOQuestionPlans([current], allProcesses, allITTO, config, () => 0)
    expect(second.current).not.toEqual(first.current)
  })
})

describe('isITTOSelectionCorrect', () => {
  test('两个展示分区都集合完全匹配时答对', () => {
    const plan = createITTOQuestionPlan(current, allITTO.current, allProcesses, allITTO, config, () => 0.99)
    const selections = Object.fromEntries(plan.sections.map(section => [section.category, [...section.correct]]))
    expect(isITTOSelectionCorrect(plan, selections)).toBe(true)
  })

  test('任一区多选、错选或漏选时答错', () => {
    const plan = createITTOQuestionPlan(current, allITTO.current, allProcesses, allITTO, config, () => 0.99)
    const selections = Object.fromEntries(plan.sections.map(section => [section.category, [...section.correct]]))
    const first = plan.sections[0]
    const distractor = first.options.find(option => !first.correct.includes(option))!
    expect(isITTOSelectionCorrect(plan, { ...selections, [first.category]: [...first.correct, distractor] })).toBe(false)
    expect(isITTOSelectionCorrect(plan, { ...selections, [first.category]: first.correct.slice(1) })).toBe(false)
  })
})
