import type { LevelConfig, ProcessGroup, KnowledgeArea, Process, ITTO } from './types'

/**
 * 加载过程组数据
 */
export async function loadProcessGroups(): Promise<ProcessGroup[]> {
  const response = await fetch('/data/process-groups.json')
  if (!response.ok) {
    throw new Error(`Failed to load process groups: ${response.statusText}`)
  }
  return response.json()
}

/**
 * 加载知识领域数据
 */
export async function loadKnowledgeAreas(): Promise<KnowledgeArea[]> {
  const response = await fetch('/data/knowledge-areas.json')
  if (!response.ok) {
    throw new Error(`Failed to load knowledge areas: ${response.statusText}`)
  }
  return response.json()
}

/**
 * 加载过程数据
 */
export async function loadProcesses(): Promise<Process[]> {
  const response = await fetch('/data/processes.json')
  if (!response.ok) {
    throw new Error(`Failed to load processes: ${response.statusText}`)
  }
  return response.json()
}

/**
 * 加载 ITTO 数据
 */
export async function loadITTO(): Promise<Record<string, ITTO>> {
  const response = await fetch('/data/itto.json')
  if (!response.ok) {
    throw new Error(`Failed to load ITTO data: ${response.statusText}`)
  }
  return response.json()
}

/**
 * 加载所有关卡配置
 */
export async function loadLevels(): Promise<LevelConfig[]> {
  const response = await fetch('/data/levels.json')
  if (!response.ok) {
    throw new Error(`Failed to load levels: ${response.statusText}`)
  }
  return response.json()
}

/**
 * 根据关卡ID获取关卡配置
 */
export function getLevelById(id: string, levels: LevelConfig[]): LevelConfig | undefined {
  return levels.find(level => level.id === id)
}

/**
 * 根据阶段获取关卡列表（按阶段内序号排序）
 */
export function getLevelsByStage(stage: number, levels: LevelConfig[]): LevelConfig[] {
  return levels
    .filter(level => level.stage === stage)
    .sort((a, b) => a.number - b.number)
}

/**
 * 根据关卡配置筛选出对应的过程列表
 */
export function getProcessesForLevel(level: LevelConfig, processes: Process[]): Process[] {
  const { cardPool } = level

  switch (cardPool.source) {
    case 'all':
      return processes

    case 'processGroups': {
      const groupIds = cardPool.processGroupIds ?? []
      return processes.filter(p => groupIds.includes(p.processGroupId))
    }

    case 'knowledgeAreas': {
      const areaIds = cardPool.knowledgeAreaIds ?? []
      return processes.filter(p => areaIds.includes(p.knowledgeAreaId))
    }

    case 'specific': {
      let result = processes

      if (cardPool.processGroupIds && cardPool.processGroupIds.length > 0) {
        result = result.filter(p => cardPool.processGroupIds!.includes(p.processGroupId))
      }
      if (cardPool.knowledgeAreaIds && cardPool.knowledgeAreaIds.length > 0) {
        result = result.filter(p => cardPool.knowledgeAreaIds!.includes(p.knowledgeAreaId))
      }
      if (cardPool.processIds && cardPool.processIds.length > 0) {
        result = result.filter(p => cardPool.processIds!.includes(p.id))
      }

      return result
    }

    default:
      return processes
  }
}

/**
 * 预期矩阵分布（知识领域 -> 按过程组顺序的过程数）
 * 过程组顺序：initiating, planning, executing, monitoring_controlling, closing
 */
const EXPECTED_MATRIX: Record<string, number[]> = {
  integration:       [1, 1, 2, 2, 1], // 制定项目章程, 制定项目管理计划, 指导与管理项目工作+管理项目知识, 监控项目工作+实施整体变更控制, 结束项目或阶段
  scope:             [0, 4, 0, 2, 0], // 规划范围管理+收集需求+定义范围+创建WBS, 确认范围+控制范围
  schedule:          [0, 5, 0, 1, 0], // 规划进度管理+定义活动+排列活动顺序+估算活动持续时间+制定进度计划, 控制进度
  cost:              [0, 3, 0, 1, 0], // 规划成本管理+估算成本+制定预算, 控制成本
  quality:           [0, 1, 1, 1, 0], // 规划质量管理, 管理质量, 控制质量
  resources:         [0, 2, 3, 1, 0], // 规划资源管理+估算活动资源, 获取资源+建设团队+管理团队, 控制资源
  communications:    [0, 1, 1, 1, 0], // 规划沟通管理, 管理沟通, 监督沟通
  risk:              [0, 5, 1, 1, 0], // 规划风险管理+识别风险+实施定性风险分析+实施定量风险分析+规划风险应对, 实施风险应对, 监督风险
  procurement:       [0, 1, 1, 1, 0], // 规划采购管理, 实施采购, 控制采购
  stakeholders:      [1, 1, 1, 1, 0], // 识别相关方, 规划相关方参与, 管理相关方参与, 监督相关方参与
}

/** 过程组顺序 */
const PROCESS_GROUP_ORDER = ['initiating', 'planning', 'executing', 'monitoring_controlling', 'closing']

/**
 * 验证过程矩阵分布
 */
export function validateProcessMatrix(
  processes: Process[],
  processGroups: ProcessGroup[],
  knowledgeAreas: KnowledgeArea[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 1. 验证总过程数 = 49
  if (processes.length !== 49) {
    errors.push(`总过程数应为 49，实际为 ${processes.length}`)
  }

  // 2. 验证每个过程的 processGroupId 和 knowledgeAreaId 都有效
  const validProcessGroupIds = new Set(processGroups.map(pg => pg.id))
  const validKnowledgeAreaIds = new Set(knowledgeAreas.map(ka => ka.id))

  for (const process of processes) {
    if (!validProcessGroupIds.has(process.processGroupId)) {
      errors.push(`过程 "${process.name}" (${process.id}) 的 processGroupId "${process.processGroupId}" 无效`)
    }
    if (!validKnowledgeAreaIds.has(process.knowledgeAreaId)) {
      errors.push(`过程 "${process.name}" (${process.id}) 的 knowledgeAreaId "${process.knowledgeAreaId}" 无效`)
    }
  }

  // 3. 验证矩阵中每个格子的数量符合预期
  const actualMatrix: Record<string, number[]> = {}
  for (const ka of knowledgeAreas) {
    actualMatrix[ka.id] = [0, 0, 0, 0, 0]
  }

  for (const process of processes) {
    const pgIndex = PROCESS_GROUP_ORDER.indexOf(process.processGroupId)
    if (pgIndex === -1) {
      errors.push(`过程 "${process.name}" 的过程组 "${process.processGroupId}" 不在预期顺序中`)
      continue
    }
    if (actualMatrix[process.knowledgeAreaId]) {
      actualMatrix[process.knowledgeAreaId][pgIndex]++
    }
  }

  for (const ka of knowledgeAreas) {
    const expected = EXPECTED_MATRIX[ka.id]
    const actual = actualMatrix[ka.id]
    if (!expected) {
      errors.push(`知识领域 "${ka.name}" 缺少预期矩阵配置`)
      continue
    }
    for (let i = 0; i < PROCESS_GROUP_ORDER.length; i++) {
      if (actual[i] !== expected[i]) {
        const pgName = processGroups.find(pg => pg.id === PROCESS_GROUP_ORDER[i])?.name || PROCESS_GROUP_ORDER[i]
        errors.push(`知识领域 "${ka.name}" 在 "${pgName}" 中应有 ${expected[i]} 个过程，实际为 ${actual[i]}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 便捷加载所有数据
 */
export async function loadAllData() {
  const [processGroups, knowledgeAreas, processes, itto] = await Promise.all([
    loadProcessGroups(),
    loadKnowledgeAreas(),
    loadProcesses(),
    loadITTO(),
  ])

  const validation = validateProcessMatrix(processes, processGroups, knowledgeAreas)

  return {
    processGroups,
    knowledgeAreas,
    processes,
    itto,
    validation,
  }
}