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
import { useUserStore } from '@/stores/user'

type ColumnType = 'processGroup' | 'knowledgeArea'

/** 游戏阶段（单一真相源，isPlaying/isPaused 由 getter 派生） */
type GamePhase = 'start' | 'playing' | 'paused'

/** 难度模式：challenge=倒计时+生命，relaxed=均无 */
export type DifficultyMode = 'challenge' | 'relaxed'

/** 复习队列项：enqueuedAtCardIndex 记录入队时的已抽卡数，用于间隔控制 */
interface ReviewItem {
  processId: string
  enqueuedAtCardIndex: number
}

/** 复习卡重现所需的最小间隔（张数） */
const REVIEW_INTERVAL = 3

/** 道具剩余数量 */
interface ItemCounts {
  hint: number
  freeze: number
  shield: number
}

interface GameState {
  // 关卡配置
  level: LevelConfig | null
  columnInfos: ColumnInfo[]
  columnType: ColumnType
  layoutType: LayoutType
  rowInfos: RowInfo[]

  // 卡片池
  processPool: Process[]

  // ===== 统一引擎队列 =====
  /** 出题队列（存过程 id，洗牌后顺序） */
  queue: string[]
  /** 复习队列（答错/超时的卡延迟重现） */
  reviewQueue: ReviewItem[]
  /** 当前卡过程 id（null 表示无当前卡） */
  currentCardId: string | null
  /** 已抽取的卡片总数（含复习卡） */
  cardsDrawn: number

  // 计分与连击
  combo: number
  maxCombo: number
  score: number
  correctCount: number
  wrongCount: number
  /** 超时漏接数 */
  missedCount: number
  /** 错题历史（用于结算与回顾） */
  wrongHistory: WrongRecord[]

  // 双模式 / 倒计时 / 生命
  difficultyMode: DifficultyMode
  /** 当前卡剩余秒数（挑战模式 tick 递减） */
  timeLeft: number
  livesLeft: number

  // 道具
  items: ItemCounts
  /** 护盾激活中（下次判定消耗） */
  shieldActiveUntilAnswer: boolean
  /** 冰冻剩余 tick 数（100 = 10 秒 × 100ms） */
  freezeTicksLeft: number
  /** 提示高亮截止时间戳（供 UI 高亮正确位置 3 秒） */
  hintActiveUntil: number

  // 已完成（答对的过程 id，书架渲染用）
  placedProcessIds: string[]

  // 游戏阶段（单一真相源，isPlaying/isPaused 由 getter 派生）
  gamePhase: GamePhase

  // 反馈（单例，行列级锁）
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

/** Fisher-Yates 洗牌（返回新数组） */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    level: null,
    columnInfos: [],
    columnType: 'processGroup',
    layoutType: 'columns',
    rowInfos: [],
    processPool: [],

    queue: [],
    reviewQueue: [],
    currentCardId: null,
    cardsDrawn: 0,

    combo: 0,
    maxCombo: 0,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    missedCount: 0,
    wrongHistory: [],

    difficultyMode: 'challenge',
    timeLeft: 0,
    livesLeft: 0,

    items: { hint: 0, freeze: 0, shield: 0 },
    shieldActiveUntilAnswer: false,
    freezeTicksLeft: 0,
    hintActiveUntil: 0,

    placedProcessIds: [],
    gamePhase: 'start',
    feedbackState: null,
    feedbackTimer: null,
  }),

  getters: {
    /** 玩法模式：sort=归类，itto=ITTO 测验，definition=定义挑战，缺省 sort */
    mode: (state): 'sort' | 'itto' | 'definition' => state.level?.mode ?? 'sort',
    /** 本关总题数（由卡池派生，供 HUD 进度展示） */
    totalCount: (state): number => state.processPool.length,
    /**
     * 过关判定 = 出题队列与复习队列均清空且无当前卡（D2：完成数由卡池派生）
     */
    isLevelComplete: (state): boolean =>
      state.queue.length === 0 && state.reviewQueue.length === 0 && !state.currentCardId,
    /** 连击倍率 = min(5, 1 + floor(combo/3)) */
    comboMultiplier: (state): number => Math.min(5, 1 + Math.floor(state.combo / 3)),
    /** 失败判定：仅挑战模式下生命归零 */
    isFailed: (state): boolean =>
      state.difficultyMode === 'challenge' && state.livesLeft <= 0 && state.level !== null,
    /** 准确率 = correct / (correct + wrong)，无作答时归 0 */
    correctAccuracy: (state): number => {
      const total = state.correctCount + state.wrongCount
      return total > 0 ? state.correctCount / total : 0
    },
    // 游戏阶段派生（单一真相源：gamePhase）
    isPlaying: (state): boolean => state.gamePhase === 'playing',
    isPaused: (state): boolean => state.gamePhase === 'paused',
    /** 当前卡对应的过程对象 */
    currentProcess: (state): Process | null =>
      state.processPool.find(p => p.id === state.currentCardId) ?? null,
  },

  actions: {
    /**
     * 开始关卡：构建列/行信息、洗牌入队、初始化全部计数。
     * options.difficultyMode 缺省 'challenge'。
     */
    startLevel(
      level: LevelConfig,
      processPool: Process[],
      processGroups: { id: string; name: string; shortName: string; color: string }[],
      knowledgeAreas: { id: string; name: string; shortName: string }[],
      options?: { difficultyMode?: DifficultyMode },
    ) {
      this.level = level
      this.processPool = processPool

      this.layoutType = level.layoutType
      this.columnType = determineColumnType(level, processGroups)

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

      // 初始化引擎状态（队列洗牌 + 全部计数归零）
      this.difficultyMode = options?.difficultyMode ?? 'challenge'
      this.initRound()
      // 唯一真相源：仅写 gamePhase；isPlaying/isPaused 由 getter 派生
      this.gamePhase = 'start'
    },

    /**
     * 重置本局回合状态：重建队列与全部计数（startLevel 与 resetLevel 共用）
     */
    initRound() {
      this.queue = shuffle(this.processPool.map(p => p.id))
      this.reviewQueue = []
      this.currentCardId = null
      this.cardsDrawn = 0

      this.combo = 0
      this.maxCombo = 0
      this.score = 0
      this.correctCount = 0
      this.wrongCount = 0
      this.missedCount = 0
      this.wrongHistory = []

      this.timeLeft = this.level?.timePerCard ?? 0
      this.livesLeft = this.level?.lives ?? 0
      this.items = {
        hint: this.level?.hintCount ?? 0,
        freeze: this.level?.freezeCount ?? 0,
        shield: this.level?.shieldCount ?? 0,
      }
      this.shieldActiveUntilAnswer = false
      this.freezeTicksLeft = 0
      this.hintActiveUntil = 0

      this.placedProcessIds = []
      if (this.feedbackTimer) {
        clearTimeout(this.feedbackTimer)
        this.feedbackTimer = null
      }
      this.feedbackState = null

      // 关卡开始/重开即抽取首卡（drill-engine「WHEN 关卡开始…THEN 抽取下一张卡」），
      // 否则 tick() 空转烧时间、timeout() 无卡死锁
      this.drawNext()
    },

    /**
     * 设置游戏阶段（唯一写入点，其他处不得直接改 isPlaying/isPaused）
     */
    setGamePhase(phase: GamePhase) {
      this.gamePhase = phase
    },

    /**
     * 设置难度模式（开始界面选择后调用）
     */
    setDifficultyMode(mode: DifficultyMode) {
      this.difficultyMode = mode
    },

    /**
     * 抽取下一张卡：
     * - 复习卡优先：最早入队且距上次出现已间隔 ≥3 张者先出；
     * - 无满足间隔的复习卡且普通队列非空 → 先出普通队列；
     * - 普通队列空而复习卡未到间隔 → 强制出最早复习卡。
     */
    drawNext() {
      if (this.currentCardId) return

      let nextId: string | undefined
      const eligibleReview = this.reviewQueue.filter(
        item => this.cardsDrawn - item.enqueuedAtCardIndex >= REVIEW_INTERVAL,
      )
      if (eligibleReview.length > 0) {
        // reviewQueue 按入队时间升序，取最早满足间隔者
        nextId = eligibleReview[0].processId
        this.reviewQueue = this.reviewQueue.filter(item => item.processId !== nextId)
      } else if (this.queue.length > 0) {
        nextId = this.queue.shift()
      } else if (this.reviewQueue.length > 0) {
        // 普通队列耗尽：强制出最早复习卡
        nextId = this.reviewQueue.shift()!.processId
      }

      if (!nextId) return
      this.currentCardId = nextId
      this.cardsDrawn++
      this.timeLeft = this.level?.timePerCard ?? 0
    },

    /**
     * 对当前卡作答（L1 定位判定）：矩阵需行列同时匹配，列模式只匹配列。
     * 答对 → 连击/计分/移除复习项并立即抽下一张；答错 → handleWrong 流程。
     */
    answer(columnId: string, rowId?: string): 'correct' | 'wrong' {
      if (!this.isPlaying || !this.currentCardId) return 'wrong'

      const process = this.processPool.find(p => p.id === this.currentCardId)
      if (!process) return 'wrong'

      // 判定逻辑（同旧 classify）
      let isCorrect: boolean
      if (this.layoutType === 'matrix' && rowId) {
        isCorrect = process.processGroupId === columnId && process.knowledgeAreaId === rowId
      } else {
        isCorrect = this.columnType === 'processGroup'
          ? process.processGroupId === columnId
          : process.knowledgeAreaId === columnId
      }

      // 若已有反馈，先清掉之前的定时器与状态，允许新作答覆盖
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
        this.handleCorrect(process)
        this.feedbackTimer = setTimeout(() => this.clearFeedback(), 500)
      } else {
        this.handleWrong(process, columnId, rowId, false)
      }

      return isCorrect ? 'correct' : 'wrong'
    },

    /**
     * 答对奖励路径（L1 answer 与 L2/L3 submitQuizResult 共用）：
     * 连击/计分/最高连击/正确数、复习卡答对移除、上架，随后清当前卡并抽下一张。
     */
    handleCorrect(process: Process) {
      this.correctCount++
      this.combo++
      this.score += 10 * this.comboMultiplier
      this.maxCombo = Math.max(this.maxCombo, this.combo)
      // 复习卡答对才从复习队列移除（drawNext 抽出时已移除，此处兜底）
      this.reviewQueue = this.reviewQueue.filter(item => item.processId !== process.id)
      if (!this.placedProcessIds.includes(process.id)) {
        this.placedProcessIds.push(process.id)
      }
      // 写入掌握度：维度由关卡模式映射（sort→position / definition→definition / itto→itto）
      this.recordMastery(process.id, true)
      // 清当前卡并立即抽下一张
      this.currentCardId = null
      this.drawNext()
    },

    /** 掌握度维度映射并写入 user store（关卡未装载时跳过） */
    recordMastery(processId: string, correct: boolean) {
      if (!this.level) return
      const dimension = this.level.mode === 'definition'
        ? 'definition'
        : this.level.mode === 'itto' ? 'itto' : 'position'
      useUserStore().recordAnswer(processId, dimension, correct)
    },

    /**
     * L2 定义挑战 / L3 ITTO 作答器提交入口：
     * 判定已在作答器内完成，此处仅驱动引擎奖励/惩罚与推进。
     * chosenLabel 记入错题历史的 chosenColumnId（quiz 模式无列归属，仅作留痕）。
     */
    submitQuizResult(isCorrect: boolean, chosenLabel?: string): 'correct' | 'wrong' {
      const process = this.currentProcess
      if (!this.isPlaying || !process) return 'wrong'

      // 若已有反馈，先清掉之前的定时器与状态
      if (this.feedbackTimer) {
        clearTimeout(this.feedbackTimer)
        this.feedbackTimer = null
      }
      // quiz 模式无书架列/格，反馈不指向具体位置（columnId 留空）
      this.feedbackState = {
        type: isCorrect ? 'correct' : 'wrong',
        columnId: '',
        rowId: undefined,
        processId: process.id,
      }

      if (isCorrect) {
        this.handleCorrect(process)
        this.feedbackTimer = setTimeout(() => this.clearFeedback(), 500)
      } else {
        this.handleWrong(process, chosenLabel ?? '', undefined, false)
      }

      return isCorrect ? 'correct' : 'wrong'
    },

    /**
     * 答错/超时统一处理：
     * - 护盾激活：免罚（不扣命、连击不清）但仍入复习队列并消耗护盾；
     * - 否则：连击清零，挑战模式扣一条命；
     * - 一律加入复习队列等待重现，随后抽下一张卡。
     */
    handleWrong(process: Process, chosenColumnId: string, chosenRowId: string | undefined, missed: boolean) {
      this.wrongCount++

      const correctColumnId = this.columnType === 'processGroup' ? process.processGroupId : process.knowledgeAreaId
      const correctRowId = this.layoutType === 'matrix' ? process.knowledgeAreaId : undefined
      this.wrongHistory.push({
        processId: process.id,
        processName: process.name,
        chosenColumnId,
        correctColumnId,
        correctRowId,
        chosenRowId,
        missed,
      })

      if (this.shieldActiveUntilAnswer) {
        // 护盾抵消惩罚：不扣命、连击不清零，消耗护盾
        this.shieldActiveUntilAnswer = false
      } else {
        this.combo = 0
        if (this.difficultyMode === 'challenge') {
          this.livesLeft--
        }
      }

      // 写入掌握度：护盾免罚的答错同样归 0（掌握度语义与免罚无关）
      this.recordMastery(process.id, false)

      // 入复习队列（记录入队时已抽卡数，供间隔判定）
      if (!this.reviewQueue.some(item => item.processId === process.id)) {
        this.reviewQueue.push({ processId: process.id, enqueuedAtCardIndex: this.cardsDrawn })
      }

      this.feedbackTimer = setTimeout(() => this.clearFeedback(), 600)
      this.currentCardId = null
      this.drawNext()
    },

    /**
     * 倒计时 tick（100ms 粒度，由外部 setInterval 驱动）：
     * 仅挑战模式且进行中生效；冰冻期间只递减冰冻计数不扣时间。
     */
    tick() {
      if (!this.isPlaying || this.difficultyMode !== 'challenge') return
      // 无当前卡时不做任何倒计时动作（防止空转烧时间触发死锁）
      if (!this.currentCardId) return
      if (this.freezeTicksLeft > 0) {
        this.freezeTicksLeft--
        return
      }
      this.timeLeft = Math.max(0, this.timeLeft - 0.1)
      if (this.timeLeft <= 0) {
        this.timeout()
      }
    },

    /**
     * 超时漏接：missedCount 加 1 后按答错流程处理当前卡
     */
    timeout() {
      const process = this.currentProcess
      if (!process) return

      this.missedCount++
      // 超时未作答：反馈指向正确位置（wrong 类型），错题记录 chosenColumnId 留空
      const correctColumnId = this.columnType === 'processGroup' ? process.processGroupId : process.knowledgeAreaId
      const correctRowId = this.layoutType === 'matrix' ? process.knowledgeAreaId : undefined
      if (this.feedbackTimer) {
        clearTimeout(this.feedbackTimer)
        this.feedbackTimer = null
      }
      this.feedbackState = {
        type: 'wrong',
        columnId: correctColumnId,
        rowId: correctRowId,
        processId: process.id,
      }
      this.handleWrong(process, '', undefined, true)
    },

    /**
     * 使用提示道具：高亮正确答案位置 3 秒
     */
    useHint() {
      if (this.items.hint <= 0 || !this.currentProcess) return
      this.items.hint--
      this.hintActiveUntil = Date.now() + 3000
    },

    /**
     * 使用冰冻道具：暂停倒计时 10 秒（100 ticks × 100ms）
     */
    useFreeze() {
      if (this.items.freeze <= 0) return
      this.items.freeze--
      this.freezeTicksLeft = 100
    },

    /**
     * 使用护盾道具：本题答错免罚且不断连击（下次判定消耗）
     */
    useShield() {
      if (this.items.shield <= 0) return
      this.items.shield--
      this.shieldActiveUntilAnswer = true
    },

    /**
     * 清除反馈状态（下一轮反馈重新设置）
     */
    clearFeedback() {
      if (this.feedbackTimer) {
        clearTimeout(this.feedbackTimer)
        this.feedbackTimer = null
      }
      this.feedbackState = null
    },

    /**
     * 重置关卡（保留 level 配置与难度模式，重建队列与全部计数）
     */
    resetLevel() {
      if (!this.level) return
      this.initRound()
      this.gamePhase = 'start'
    },
  },
})
