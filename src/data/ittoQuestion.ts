import type {
  ITTO,
  ITTOCategory,
  ITTOItem,
  ITTOQuestionPlan,
  ITTOQuizConfig,
  ITTOSectionPlan,
  Process,
} from './types'

type Random = () => number

const CATEGORIES: readonly ITTOCategory[] = ['inputs', 'tools', 'outputs']

function shuffle<T>(items: readonly T[], random: Random): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

function getItems(itto: ITTO, category: ITTOCategory): ITTOItem[] {
  if (category === 'tools') return itto.toolsAndTechniques
  return itto[category]
}

function uniqueNames(items: readonly ITTOItem[]): string[] {
  return [...new Set(items.map(item => item.name))]
}

function sampleCorrect(items: readonly ITTOItem[], limit: number, random: Random): string[] {
  const core = items.filter(item => item.tags?.includes('core'))
  const common = items.filter(item => !item.tags?.includes('core'))
  return [...shuffle(core, random), ...shuffle(common, random)]
    .slice(0, Math.min(limit, items.length))
    .map(item => item.name)
}

function collectCandidateNames(
  processes: readonly Process[],
  allITTO: Readonly<Record<string, ITTO>>,
  category: ITTOCategory,
): string[] {
  return processes.flatMap(process => allITTO[process.id] ? uniqueNames(getItems(allITTO[process.id], category)) : [])
}

function createDistractors(
  current: Process,
  currentITTO: ITTO,
  allProcesses: readonly Process[],
  allITTO: Readonly<Record<string, ITTO>>,
  category: ITTOCategory,
  limit: number,
  random: Random,
): string[] {
  const excluded = new Set(uniqueNames(getItems(currentITTO, category)))
  const selected = new Set<string>()
  const otherProcesses = allProcesses.filter(process => process.id !== current.id)
  const layers = [
    otherProcesses.filter(process => process.knowledgeAreaId === current.knowledgeAreaId),
    otherProcesses.filter(process => process.processGroupId === current.processGroupId),
    otherProcesses,
  ]

  for (const layer of layers) {
    const candidates = shuffle(collectCandidateNames(layer, allITTO, category), random)
    for (const name of candidates) {
      if (excluded.has(name) || selected.has(name)) continue
      selected.add(name)
      if (selected.size === limit) return [...selected]
    }
  }
  return [...selected]
}

export function createITTOQuestionPlan(
  current: Process,
  currentITTO: ITTO,
  allProcesses: readonly Process[],
  allITTO: Readonly<Record<string, ITTO>>,
  config: ITTOQuizConfig,
  random: Random = Math.random,
): ITTOQuestionPlan {
  const categories = shuffle(CATEGORIES, random).slice(0, config.sectionsPerQuestion)
  const sections = categories.map<ITTOSectionPlan>(category => {
    const correct = sampleCorrect(getItems(currentITTO, category), config.correctPerSection, random)
    const distractors = createDistractors(
      current,
      currentITTO,
      allProcesses,
      allITTO,
      category,
      config.distractorsPerSection,
      random,
    )
    return Object.freeze({
      category,
      correct: Object.freeze(correct),
      options: Object.freeze(shuffle([...correct, ...distractors], random)),
    })
  })
  return Object.freeze({ processId: current.id, sections: Object.freeze(sections) })
}

export function createITTOQuestionPlans(
  processPool: readonly Process[],
  allProcesses: readonly Process[],
  allITTO: Readonly<Record<string, ITTO>>,
  config: ITTOQuizConfig,
  random: Random = Math.random,
): Readonly<Record<string, ITTOQuestionPlan>> {
  return Object.freeze(Object.fromEntries(
    processPool
      .filter(process => allITTO[process.id])
      .map(process => [
        process.id,
        createITTOQuestionPlan(process, allITTO[process.id], allProcesses, allITTO, config, random),
      ]),
  ))
}

export function isITTOSelectionCorrect(
  plan: ITTOQuestionPlan,
  selections: Partial<Record<ITTOCategory, readonly string[]>>,
): boolean {
  return plan.sections.every(section => {
    const selected = selections[section.category] ?? []
    return selected.length === section.correct.length
      && selected.every(name => section.correct.includes(name))
  })
}
