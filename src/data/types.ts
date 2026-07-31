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
  /** 3星所需最低剩余生命值 */
  threeStarMinLives: number
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
  /** 需要正确放置的卡片数 */
  targetCount: number
  /** 初始下落速度（像素/秒） */
  initialFallSpeed: number
  /** 初始生成间隔（毫秒） */
  initialSpawnInterval: number
  /** 最小生成间隔（毫秒） */
  minSpawnInterval: number
  /** 每完成一定数量后速度增加比例 */
  speedIncreaseRate: number
  /** 每完成多少张卡加速一次 */
  speedIncreaseEvery: number
  /** 每波干扰项数量（缺省按阶段推导） */
  distractorCount?: number
  /** 生命值 */
  lives: number
  /** 冰冻道具数量 */
  freezeCount: number
  /** 托盘容量 */
  trayCapacity: number
  /** 星级评定阈值 */
  starThresholds: StarThresholds
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
  shortName: string
  processGroupId: string
  knowledgeAreaId: string
  difficulty: number
}

/** ITTO 单项 */
export interface ITTOItem {
  name: string
  tags?: string[]
}

/** ITTO 数据 */
export interface ITTO {
  inputs: ITTOItem[]
  toolsAndTechniques: ITTOItem[]
  outputs: ITTOItem[]
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

/** 下落中的卡片实例 */
export interface FallingCard {
  /** 唯一实例ID */
  id: string
  /** 过程数据 */
  process: Process
  /** 水平位置（百分比 0-100） */
  x: number
  /** 垂直位置（像素，相对于游戏区域顶部） */
  y: number
  /** 当前下落速度（像素/秒） */
  speed: number
  /** 是否为本关正解卡片（false 表示干扰项） */
  isTarget: boolean
}

/** 反馈状态 */
export interface FeedbackState {
  type: 'correct' | 'wrong'
  columnId: string
  rowId?: string
  trayIndex: number
}

/** 已上架的书（正确放置的卡片积累） */
export interface ShelvedBook {
  /** 唯一实例ID */
  id: string
  /** 过程数据 */
  process: Process
  /** 列ID（columns 模式为过程组/知识领域ID，matrix 模式为过程组ID） */
  columnId: string
  /** 行ID（仅 matrix 模式） */
  rowId?: string
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