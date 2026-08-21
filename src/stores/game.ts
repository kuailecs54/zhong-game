import { defineStore } from 'pinia'
import type {
  LevelConfig,
  LayoutType,
  Process,
  FeedbackState,
  ColumnInfo,
  RowInfo,
  WrongRecord,
} from '@/data/types'

type ColumnType = 'processGroup' | 'knowledgeArea'

/** 游戏阶段（单一真相源，isPlaying/isPaused 由 getter 派生） */
type GamePhase = 'start' | 'playing' | 'paused'

interface GameState {
  // 关卡配置
  level: LevelConfig | null
  columnInfos: ColumnInfo[]
  columnType: ColumnType
  layoutType: LayoutType
  rowInfos: RowInfo[]

  // 卡片池
  processPool: Process[]
  /** 按目标列（过程组/知识领域）分桶的过程池，正解卡按列均衡抽取用 */
  processPoolByColumn: Record<string, Process[]>

  // 已放置（正确归类）的过程 id，用于判定关卡完成
  placedProcessIds: string[]
  // 当前选中的待归类过程 id（点选即放玩法）
  selectedProcessId: string | null

  // 分数与状态
  /** 简单计分：恒等于 correctCount（保留字段供结算页展示） */
  score: number
  correctCount: number
  wrongCount: number
  /** 错题历史（用于结算与回顾） */
  wrongHistory: WrongRecord[]

  // 游戏阶段（单一真相源，isPlaying/isPaused 由 getter 派生）
  gamePhase: GamePhase

  // 反馈（单例，行列级锁；点选即放玩法不再需要 trayIndex）
  feedbackState: FeedbackState | null
  /** 反馈定时器 id，reset/start 时 clearTimeout 避免 stale 回调 */
  feedbackTimer: ReturnType<typeof setTimeout> | null
}

const PROCESS_GROUP_COLORS: Record<string, string> = {
  initiating: '#e74c3c',
  planning: '#3498db',
  executing: '#2ecc71',
  monitoring_controlling: '#f39c12',
  closing: '#9b59b6',
}

const KNOWLEDGE_AREA_COLORS: Record<string, string> = {
  integration: '#e74c3c',
  scope: '#3498db',
  schedule: '#2ecc71',
  cost: '#f39c12',
  quality: '#9b59b6',
  resources: '#1abc9c',
  communications: '#e67e22',
  risk: '#e91e63',
  procurement: '#00bcd4',
  stakeholders: '#ff5722',
}

function determineColumnType(level: LevelConfig, processGroups: { id: string }[]): ColumnType {
  if (level.cardPool.source === 'processGroups') return 'processGroup'
  if (level.cardPool.source === 'knowledgeAreas') return 'knowledgeArea'
  // 对于 'all' 或 'specific'，检测第一个列ID是否属于过程组
  const pgIds = new Set(processGroups.map(pg => pg.id))
  if (level.columns.length > 0 && pgIds.has(level.columns[0])) {
    return 'processGroup'
  }
  return 'knowledgeArea'
}

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    level: null,
    columnInfos: [],
    columnType: 'processGroup',
    layoutType: 'columns',
    rowInfos: [],
    processPool: [],
    processPoolByColumn: {},
    placedProcessIds: [],
    selectedProcessId: null,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    wrongHistory: [],
    gamePhase: 'start',
    feedbackState: null,
    feedbackTimer: null,
  }),

  getters: {
    targetCount: (state): number => state.level?.targetCount ?? 0,
    /** 玩法模式：sort=归类模式，itto=ITTO 测验模式，缺省 sort */
    mode: (state): 'sort' | 'itto' => state.level?.mode ?? 'sort',
    /** 关卡完成：已正确归类数 >= 目标数 */
    isLevelComplete: (state): boolean =>
      state.placedProcessIds.length >= (state.level?.targetCount ?? 0),
    /** 准确率 = correct / (correct + wrong)，无作答时归 0 */
    correctAccuracy: (state): number => {
      const total = state.correctCount + state.wrongCount
      return total > 0 ? state.correctCount / total : 0
    },
    // 游戏阶段派生（单一真相源：gamePhase）
    isPlaying: (state): boolean => state.gamePhase === 'playing',
    isPaused: (state): boolean => state.gamePhase === 'paused',
    /** 当前选中的待归类过程 */
    selectedProcess: (state): Process | null =>
      state.processPool.find(p => p.id === state.selectedProcessId) ?? null,
  },

  actions: {
    startLevel(
      level: LevelConfig,
      processPool: Process[],
      processGroups: { id: string; name: string; shortName: string; color: string }[],
      knowledgeAreas: { id: string; name: string; shortName: string }[],
      _allProcesses: Process[],
    ) {
      this.level = level
      this.processPool = processPool

      this.layoutType = level.layoutType
      this.columnType = determineColumnType(level, processGroups)

      // 按目标列（过程组/知识领域）分桶过程池，供正解卡按列均衡抽取
      this.processPoolByColumn = {}
      for (const process of processPool) {
        const colId = this.columnType === 'processGroup' ? process.processGroupId : process.knowledgeAreaId
        ;(this.processPoolByColumn[colId] ??= []).push(process)
      }

      // 构建列信息
      this.columnInfos = level.columns.map(colId => {
        if (this.columnType === 'processGroup' || this.layoutType === 'matrix') {
          const pg = processGroups.find(g => g.id === colId)
          return {
            id: colId,
            name: pg?.name ?? colId,
            color: pg?.color ?? PROCESS_GROUP_COLORS[colId] ?? '#666',
          }
        }
        const ka = knowledgeAreas.find(a => a.id === colId)
        return {
          id: colId,
          name: ka?.name ?? colId,
          color: KNOWLEDGE_AREA_COLORS[colId] ?? '#666',
        }
      })

      // 构建行信息（矩阵模式）
      this.rowInfos = []
      if (this.layoutType === 'matrix' && level.rows) {
        this.rowInfos = level.rows.map(rowId => {
          const ka = knowledgeAreas.find(a => a.id === rowId)
          return {
            id: rowId,
            name: ka?.name ?? rowId,
            color: KNOWLEDGE_AREA_COLORS[rowId] ?? '#666',
          }
        })
      }

      // 重置归类进度
      this.placedProcessIds = []
      this.selectedProcessId = null
      this.score = 0
      this.correctCount = 0
      this.wrongCount = 0
      this.wrongHistory = []
      // 唯一真相源：仅写 gamePhase；isPlaying/isPaused 由 getter 派生
      this.gamePhase = 'start'
      if (this.feedbackTimer) {
        clearTimeout(this.feedbackTimer)
        this.feedbackTimer = null
      }
      this.feedbackState = null
    },

    /**
     * 设置游戏阶段（唯一写入点，其他处不得直接改 isPlaying/isPaused）
     */
    setGamePhase(phase: GamePhase) {
      this.gamePhase = phase
    },

    /**
     * 选中待归类过程（点选即放玩法）
     */
    selectCard(processId: string) {
      this.selectedProcessId = processId
    },

    /**
     * 归类判定：将当前选中的过程放入指定列（矩阵模式需同时指定行）
     * 通过 selectedProcessId 确定待归类过程；仅当游戏进行中且有选中过程时生效
     */
    classify(columnId: string, rowId?: string): 'correct' | 'wrong' {
      if (!this.isPlaying || !this.selectedProcessId) return 'wrong'

      const process = this.processPool.find(p => p.id === this.selectedProcessId)
      if (!process) return 'wrong'

      // 判定逻辑
      let isCorrect: boolean
      if (this.layoutType === 'matrix' && rowId) {
        // 矩阵模式：同时匹配过程组和知识领域
        isCorrect = process.processGroupId === columnId && process.knowledgeAreaId === rowId
      } else {
        // 列模式：只匹配过程组或知识领域
        isCorrect = this.columnType === 'processGroup'
          ? process.processGroupId === columnId
          : process.knowledgeAreaId === columnId
      }

      // 若已有反馈（指向其他槽位），先清掉之前的定时器与状态，允许新放置覆盖
      if (this.feedbackTimer) {
        clearTimeout(this.feedbackTimer)
        this.feedbackTimer = null
      }

      this.feedbackState = {
        type: isCorrect ? 'correct' : 'wrong',
        columnId,
        rowId,
        processId: process.id,
      }

      if (isCorrect) {
        this.correctCount++
        // 简单计分：恒等于正确数
        this.score = this.correctCount
        if (!this.placedProcessIds.includes(process.id)) {
          this.placedProcessIds.push(process.id)
        }
        this.feedbackTimer = setTimeout(() => this.clearFeedback(), 500)
      } else {
        this.wrongCount++
        // 记录错题
        const correctColumnId = this.columnType === 'processGroup' ? process.processGroupId : process.knowledgeAreaId
        const correctRowId = this.layoutType === 'matrix' ? process.knowledgeAreaId : undefined
        this.wrongHistory.push({
          processId: process.id,
          processName: process.name,
          chosenColumnId: columnId,
          correctColumnId,
          correctRowId,
          chosenRowId: rowId,
        })
        this.feedbackTimer = setTimeout(() => this.clearFeedback(), 600)
      }

      return isCorrect ? 'correct' : 'wrong'
    },

    /**
     * 清除反馈状态并取消当前选中（下一轮点选重新选择）
     */
    clearFeedback() {
      if (this.feedbackTimer) {
        clearTimeout(this.feedbackTimer)
        this.feedbackTimer = null
      }
      this.feedbackState = null
      this.selectedProcessId = null
    },

    /**
     * 重置关卡（保留 level 配置，清空归类进度）
     */
    resetLevel() {
      if (!this.level) return
      if (this.feedbackTimer) {
        clearTimeout(this.feedbackTimer)
        this.feedbackTimer = null
      }
      this.placedProcessIds = []
      this.selectedProcessId = null
      this.score = 0
      this.correctCount = 0
      this.wrongCount = 0
      this.wrongHistory = []
      this.gamePhase = 'start'
      this.feedbackState = null
    },
  },
})
