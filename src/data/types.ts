/** 布局类型：columns = 列模式，matrix = 矩阵模式 */
export type LayoutType = 'columns' | 'matrix'

/** 星级评定阈值 */
export interface StarThresholds {
  /** 1星门槛（通关） */
  oneStar: number
  /** 2星所需最低准确率 */
  twoStarAccuracy: number
  /** 3星所需最低准确率 */
  threeStarAccuracy: number
}

/** 卡片池配置 */
export interface CardPoolConfig {
  /** 卡片来源 */
  source: 'all' | 'processGroups' | 'knowledgeAreas' | 'specific'
  /** 限定过程组ID列表（source为processGroups或specific时使用） */
  processGroupIds?: string[]
  /** 限定知识领域ID列表（source为knowledgeAreas或specific时使用） */
  knowledgeAreaIds?: string[]
  /** 指定过程ID列表 */
  processIds?: string[]
  /** 难度范围 [最小值, 最大值] */
  difficultyRange?: [number, number]
  /** 仅保留指定的过程ID（白名单，向后兼容可选） */
  includeIds?: string[]
  /** 排除指定的过程ID（黑名单） */
  excludeIds?: string[]
  /** 易混淆对ID列表，干扰项加权使用，本阶段仅保留结构 */
  confusingPairIds?: string[][]
}

/** ITTO 分区题配置 */
export interface ITTOQuizConfig {
  sectionsPerQuestion: number
  correctPerSection: number
  distractorsPerSection: number
}

/** 关卡配置 */
export interface LevelConfig {
  /** 关卡ID，格式 "sort-{stage}-{number}" */
  id: string
  /** 关卡名称 */
  name: string
  /** 阶段 1-4 */
  stage: number
  /** 阶段内序号 1-3 */
  number: number
  /** 关卡描述 */
  description: string
  /** 布局类型 */
  layoutType: LayoutType
  /** 列对应的过程组或知识领域ID数组 */
  columns: string[]
  /** 行对应的知识领域ID数组（仅matrix模式） */
  rows?: string[]
  /** 卡片池配置 */
  cardPool: CardPoolConfig
  /** 每张卡的倒计时秒数（挑战模式启用，缺省无倒计时） */
  timePerCard?: number
  /** 生命值（仅挑战模式生效） */
  lives?: number
  /** 提示道具数量 */
  hintCount?: number
  /** 冰冻道具数量 */
  freezeCount?: number
  /** 护盾道具数量 */
  shieldCount?: number
  /** 星级评定阈值 */
  starThresholds: StarThresholds
  /** 玩法模式：sort=归类模式，itto=ITTO 测验模式，definition=定义挑战，缺省 sort */
  mode?: 'sort' | 'itto' | 'definition'
  /** ITTO 分区题配置（仅 ITTO 关卡需要） */
  ittoQuiz?: ITTOQuizConfig
}

/** 过程组数据 */
export interface ProcessGroup {
  id: string
  name: string
  shortName: string
  color: string
}

/** 知识领域数据 */
export interface KnowledgeArea {
  id: string
  name: string
  shortName: string
}

/** 单个过程元数据 */
export interface Process {
  id: string
  name: string
  processGroupId: string
  knowledgeAreaId: string
  difficulty: number
  /** 难度权重覆盖（可选，向后兼容） */
  difficultyWeight?: number
  /** 过程定义（L2 学习字段，后续 loader 断言非空） */
  definition?: string
  /** 主要作用（L2 学习字段，后续 loader 断言非空） */
  role?: string
  /** 记忆口诀（≤20 字，后续 loader 断言非空） */
  mnemonic?: string
}

/** ITTO 单项 */
export interface ITTOItem {
  name: string
  tags?: string[]
  description?: string
}

/** ITTO 数据 */
export interface ITTO {
  inputs: ITTOItem[]
  toolsAndTechniques: ITTOItem[]
  outputs: ITTOItem[]
}

/** ITTO 题目分区 */
export type ITTOCategory = 'inputs' | 'tools' | 'outputs'

/** 单个 ITTO 分区的不可变题面 */
export interface ITTOSectionPlan {
  readonly category: ITTOCategory
  readonly correct: readonly string[]
  readonly options: readonly string[]
}

/** 单个过程在本轮关卡中的不可变 ITTO 题面 */
export interface ITTOQuestionPlan {
  readonly processId: string
  readonly sections: readonly ITTOSectionPlan[]
}

/** 矩阵单元格 */
export interface ProcessMatrixCell {
  process: Process
  processGroup: ProcessGroup
  knowledgeArea: KnowledgeArea
}

/** 过程矩阵 */
export interface ProcessMatrix {
  /** 按知识领域分组 */
  byKnowledgeArea: Record<string, ProcessMatrixCell[]>
  /** 按过程组分组 */
  byProcessGroup: Record<string, ProcessMatrixCell[]>
  /** 二维矩阵 [knowledgeAreaIndex][processGroupIndex] */
  grid: (ProcessMatrixCell | null)[][]
}

/** 反馈状态（processId 指向被归类的本体，clearFeedback 据此清理选中态） */
export interface FeedbackState {
  type: 'correct' | 'wrong'
  columnId: string
  rowId?: string
  /** 被归类的过程 id，用于 clearFeedback 取消选中 */
  processId: string
}

/** 错题记录 */
export interface WrongRecord {
  processId: string
  processName: string
  chosenColumnId: string
  correctColumnId: string
  correctRowId?: string
  chosenRowId?: string
  /** 是否为超时漏接（未作答） */
  missed?: boolean
}

/** 行信息（矩阵模式用） */
export interface RowInfo {
  id: string
  name: string
  color: string
}

/** 列信息 */
export interface ColumnInfo {
  id: string
  name: string
  color: string
}

/** 用户进度 */
export interface UserProgress {
  username: string
  progress: Record<string, LevelProgress>
}

/** 关卡进度 */
export interface LevelProgress {
  stars: number     // 0-3
  bestScore: number // 最高分数
}
