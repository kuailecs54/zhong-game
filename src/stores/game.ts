import { defineStore } from 'pinia'
import type {
  LevelConfig,
  LayoutType,
  Process,
  FallingCard,
  FeedbackState,
  ColumnInfo,
  RowInfo,
  ShelvedBook,
  WrongRecord,
} from '@/data/types'

/** 下落速度缩放基准高度（px）：区域高度低于该值则速度按比例缩小，保证手机横屏难度与桌面一致 */
const SPEED_BASELINE_HEIGHT = 700

/** 下落卡片渲染宽度（px，含书脊与封面），生成时用于避免水平重叠 */
const FALLING_CARD_WIDTH_PX = 110
/** 下落卡片水平间距（px） */
const FALLING_CARD_GAP_PX = 8
/** 下落卡片视觉盒高（px，含容器内边距），用于判断顶部附近是否可能重叠 */
const FALLING_CARD_HEIGHT_PX = 74
/** 水平可用范围（百分比，留边避免卡片贴边被裁切） */
const X_MIN = 8
const X_MAX = 92

type ColumnType = 'processGroup' | 'knowledgeArea'

type GamePhase = 'start' | 'playing' | 'paused' | 'won' | 'lost'

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
  distractorPool: Process[]
  distractorCount: number

  // 下落中的卡片
  fallingCards: FallingCard[]

  // 已上架的书（正确放置的卡片积累）
  shelvedBooks: ShelvedBook[]

  // 托盘
  captureTray: Process[]

  // 分数与状态
  score: number
  lives: number
  combo: number
  correctCount: number
  wrongCount: number
  /** 正解卡漏接计数（掉地未捕获的 isTarget 数） */
  missedCount: number
  /** 错题历史（用于结算与闪卡） */
  wrongHistory: WrongRecord[]
  /** 过程出现次数（可选，供后续错题队列权重用） */
  processSeen: Record<string, number>
  /** 错题闪卡队列：错题过程 id，去重保留最近 12 */
  wrongFlashQueue: string[]
  /** 托盘溢出时被顶掉的最旧卡（供 Toast 提示，可选） */
  lastEvictedProcess: Process | null

  // 游戏阶段（单一真相源，isPlaying/isPaused 由 getter 派生）
  gamePhase: GamePhase
  isFrozen: boolean
  freezeRemaining: number // 剩余冰冻秒数
  freezeCount: number // 剩余冰冻道具数

  // 反馈（单例，卡槽级锁；捕获不受限，放置仅锁同一 trayIndex）
  feedbackState: FeedbackState | null
  /** 反馈定时器 id，reset/start 时 clearTimeout 避免 stale splice */
  feedbackTimer: ReturnType<typeof setTimeout> | null

  // 时间与速度
  gameTime: number
  currentSpeed: number
  currentSpawnInterval: number
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

let nextCardId = 0
function generateCardId(): string {
  return `card-${nextCardId++}`
}

/**
 * 缺省干扰项数量：按关卡阶段与序号推导（低难度少干扰，逐级递增）
 */
function defaultDistractorCount(stage: number, number: number): number {
  if (stage === 1) return Math.max(0, number - 1)
  if (stage === 2) return 1
  if (stage === 3) return 2
  if (stage === 4) return 3
  return 0
}

/**
 * 从数组中随机不重复抽取 count 个元素
 */
/** 关内难度 shaping：随 correctCount 递增的干扰项数，上限 base+2 且不超过干扰池大小 */
function effectiveDistractorCount(base: number, correctCount: number, poolSize: number): number {
  const eff = base + Math.floor(correctCount / 10)
  return Math.min(poolSize, Math.min(base + 2, eff))
}

/** 错题闪卡优先：30% 概率从 wrongFlashQueue 中抽取一个仍在正解池的过程，否则按列均衡抽取 */
function pickWithFlashQueue(
  pool: Process[],
  poolByColumn: Record<string, Process[]>,
  columnInfos: { id: string }[],
  wrongFlashQueue: string[],
): Process {
  if (wrongFlashQueue.length > 0 && Math.random() < 0.3) {
    // 从队尾（最近错题）向前查找仍在正解池中的过程
    const poolById = new Map(pool.map(p => [p.id, p] as const))
    for (let i = wrongFlashQueue.length - 1; i >= 0; i--) {
      const pid = wrongFlashQueue[i]
      const proc = poolById.get(pid)
      if (proc) return proc
    }
  }
  // 回退：按列均衡抽取
  const columnIds = columnInfos
    .map(col => col.id)
    .filter(id => (poolByColumn[id]?.length ?? 0) > 0)
  if (columnIds.length > 0) {
    const columnPool = poolByColumn[columnIds[Math.floor(Math.random() * columnIds.length)]]
    return columnPool[Math.floor(Math.random() * columnPool.length)]
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

function pickDistinct<T>(arr: T[], count: number): T[] {
  const copy = [...arr]
  const picked: T[] = []
  while (picked.length < count && copy.length > 0) {
    const i = Math.floor(Math.random() * copy.length)
    picked.push(copy.splice(i, 1)[0])
  }
  return picked
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
    distractorPool: [],
    distractorCount: 0,
    fallingCards: [],
    shelvedBooks: [],
    captureTray: [],
    score: 0,
    lives: 3,
    combo: 0,
    correctCount: 0,
    wrongCount: 0,
    missedCount: 0,
    wrongHistory: [],
    processSeen: {},
    wrongFlashQueue: [],
    lastEvictedProcess: null,
    gamePhase: 'start',
    isFrozen: false,
    freezeRemaining: 0,
    freezeCount: 0,
    feedbackState: null,
    feedbackTimer: null,
    gameTime: 0,
    currentSpeed: 40,
    currentSpawnInterval: 4000,
  }),

  getters: {
    targetCount: (state): number => state.level?.targetCount ?? 0,
    maxLives: (state): number => state.level?.lives ?? 3,
    trayCapacity: (state): number => state.level?.trayCapacity ?? 3,
    isGameOver: (state): boolean => state.lives <= 0,
    isLevelComplete: (state): boolean => state.correctCount >= (state.level?.targetCount ?? 0),
    feedbackActive: (state): boolean => state.feedbackState !== null,
    comboMultiplier: (state): number => Math.min(state.combo, 5),
    /** 准确率 = correct / (correct + wrong + missedCount)，漏接纳入分母 */
    correctAccuracy: (state): number => {
      const total = state.correctCount + state.wrongCount + state.missedCount
      return total > 0 ? state.correctCount / total : 0
    },
    // 游戏阶段派生（单一真相源：gamePhase）
    isPlaying: (state): boolean => state.gamePhase === 'playing',
    isPaused: (state): boolean => state.gamePhase === 'paused',
  },

  actions: {
    startLevel(
      level: LevelConfig,
      processPool: Process[],
      processGroups: { id: string; name: string; shortName: string; color: string }[],
      knowledgeAreas: { id: string; name: string; shortName: string }[],
      allProcesses: Process[],
    ) {
      nextCardId = 0
      this.level = level
      this.processPool = processPool
      this.distractorPool = []
      this.distractorCount = 0

      // 干扰项池 = 全部过程 - 本关正解池；无干扰项空间的关卡（全量关）自动为 0
      const poolIds = new Set(processPool.map(p => p.id))
      this.distractorPool = allProcesses.filter(p => !poolIds.has(p.id))
      this.distractorCount = level.distractorCount ?? defaultDistractorCount(level.stage, level.number)
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

      this.fallingCards = []
      this.shelvedBooks = []
      this.captureTray = []
      this.score = 0
      this.lives = level.lives
      this.combo = 0
      this.correctCount = 0
      this.wrongCount = 0
      this.missedCount = 0
      this.wrongHistory = []
      this.processSeen = {}
      this.wrongFlashQueue = []
      this.lastEvictedProcess = null
      // 唯一真相源：仅写 gamePhase；isPlaying/isPaused 由 getter 派生
      this.gamePhase = 'start'
      this.isFrozen = false
      this.freezeRemaining = 0
      this.freezeCount = level.freezeCount
      if (this.feedbackTimer) {
        clearTimeout(this.feedbackTimer)
        this.feedbackTimer = null
      }
      this.feedbackState = null
      this.gameTime = 0
      this.currentSpeed = level.initialFallSpeed
      this.currentSpawnInterval = level.initialSpawnInterval
    },

    /**
     * 设置游戏阶段（唯一写入点，其他处不得直接改 isPlaying/isPaused）
     */
    setGamePhase(phase: GamePhase) {
      this.gamePhase = phase
    },

    /**
     * 生成一波新卡片：1 张正解 + N 张干扰项，添加到下落列表。
     * 每张卡的水平位置做非重叠排布，并限制同时下落的总数，避免后续关卡卡片堆积重叠。
     */
    spawnWave(areaWidth = 600, areaHeight = 600) {
      if (!this.isPlaying || this.isPaused || this.processPool.length === 0) return

      // 同时下落的卡片上限（按区域高度自适应）：下落区越矮能同时容纳的卡片越少，
      // 防止近顶带饱和导致排布回退、卡片重叠
      const maxFalling = Math.max(4, Math.min(14, Math.round(areaHeight / 30)))
      if (this.fallingCards.length >= maxFalling) return

      // 正解卡片：30% 概率优先从错题闪卡队列抽取，否则按列均衡抽取
      const target = pickWithFlashQueue(this.processPool, this.processPoolByColumn, this.columnInfos, this.wrongFlashQueue)
      this.fallingCards.push(this.createCard(target, true, this.pickNonOverlappingX(areaWidth)))

      // 干扰项卡片（同波内不重复）：关内随 correctCount 递增，上限 base+2
      const effectiveCount = effectiveDistractorCount(this.distractorCount, this.correctCount, this.distractorPool.length)
      const distractorCount = effectiveCount
      for (const process of pickDistinct(this.distractorPool, distractorCount)) {
        if (this.fallingCards.length >= maxFalling) break
        this.fallingCards.push(this.createCard(process, false, this.pickNonOverlappingX(areaWidth)))
      }
    },

    /**
     * 创建一张下落中的卡片
     * speed 快照仅作微随机装饰（0.95-1.05），实际移动由 updateGame 统一用 currentSpeed，保证加速即时体感一致
     */
    createCard(process: Process, isTarget: boolean, x: number): FallingCard {
      const jitter = 0.95 + Math.random() * 0.1
      return {
        id: generateCardId(),
        process,
        isTarget,
        x,
        y: -60, // 从顶部外进入
        speed: this.currentSpeed * jitter,
      }
    },

    /**
     * 挑选一个不与其他卡片水平重叠的 x 位置（百分比）。
     * 卡片同速下落、相对位置恒定，因此只需在生成时检查顶部附近（y < 0）的卡片一次。
     * 以随机+拒绝为主，空间不足时回退到可用范围内最大空隙的中心。
     */
    pickNonOverlappingX(areaWidth: number): number {
      const minDistPx = FALLING_CARD_WIDTH_PX + FALLING_CARD_GAP_PX
      const occupied = this.fallingCards
        .filter((c) => c.y < FALLING_CARD_HEIGHT_PX - 60) // 顶部附近（生成点为 y=-60），可能与本波新卡片视觉重叠
        .map((c) => (c.x / 100) * areaWidth)

      // 随机尝试若干次
      for (let i = 0; i < 12; i++) {
        const x = X_MIN + Math.random() * (X_MAX - X_MIN)
        const px = (x / 100) * areaWidth
        if (occupied.every((o) => Math.abs(px - o) >= minDistPx)) return x
      }

      // 回退：可用范围内最大空隙的中心
      const rangeStart = (X_MIN / 100) * areaWidth
      const rangeEnd = (X_MAX / 100) * areaWidth
      const pts = [...occupied].sort((a, b) => a - b)
      let bestCenter = rangeStart
      let bestGap = 0
      let prev = rangeStart
      for (const p of pts) {
        if (p - prev > bestGap) {
          bestGap = p - prev
          bestCenter = (p + prev) / 2
        }
        prev = Math.max(prev, p)
      }
      if (rangeEnd - prev > bestGap) {
        bestCenter = (rangeEnd + prev) / 2
      }
      return (bestCenter / areaWidth) * 100
    },

    /**
     * 捕获下落中的卡片到托盘（不受 feedback 阻塞，卡槽级锁仅在 placeCard 体现）
     */
    captureCard(cardId: string): boolean {
      if (!this.isPlaying || this.isPaused) return false

      const index = this.fallingCards.findIndex(c => c.id === cardId)
      if (index === -1) return false

      // 托盘已满：自动顶掉最旧卡并扣 10 分（不低于 0），再收纳新卡
      if (this.captureTray.length >= this.trayCapacity) {
        const evicted = this.captureTray.shift()!
        this.lastEvictedProcess = evicted
        this.score = Math.max(0, this.score - 10)
      } else {
        this.lastEvictedProcess = null
      }

      const card = this.fallingCards[index]
      this.fallingCards.splice(index, 1)
      this.captureTray.push(card.process)
      this.processSeen[card.process.id] = (this.processSeen[card.process.id] ?? 0) + 1
      return true
    },

    /**
     * 放置卡片到某列（或矩阵中的某格）
     * 通过托盘索引指定要放置的卡片；仅当该 trayIndex 正处于反馈中时才阻塞（卡槽级锁）
     */
    placeCard(trayIndex: number, columnId: string, rowId?: string): 'correct' | 'wrong' | null {
      if (!this.isPlaying || this.isPaused) return null
      if (trayIndex < 0 || trayIndex >= this.captureTray.length) return null
      // 卡槽级锁：仅当 feedbackState 指向同一 trayIndex 时才阻塞
      if (this.feedbackState && this.feedbackState.trayIndex === trayIndex) return null

      const card = this.captureTray[trayIndex]

      // 判定逻辑
      let isCorrect: boolean
      if (this.layoutType === 'matrix' && rowId) {
        // 矩阵模式：同时匹配过程组和知识领域
        isCorrect = card.processGroupId === columnId && card.knowledgeAreaId === rowId
      } else {
        // 列模式：只匹配过程组或知识领域
        isCorrect = this.columnType === 'processGroup'
          ? card.processGroupId === columnId
          : card.knowledgeAreaId === columnId
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
        trayIndex,
        processId: card.id,
      }

      if (isCorrect) {
        this.combo++
        // 极速放置（捕获到放置 <1.5s）额外 +20：以 capture 时的 processSeen 计数近似，简化为 combo 连续时奖励
        const fastBonus = this.combo >= 2 ? 20 : 0
        const multiplier = this.comboMultiplier
        this.score += 100 * multiplier + fastBonus
        this.correctCount++

        // 正确放置的书上架积累
        this.shelvedBooks.push({
          id: generateCardId(),
          process: card,
          columnId,
          rowId,
        })

        // 计算加速步数
        const steps = Math.floor(this.correctCount / this.level!.speedIncreaseEvery)
        this.currentSpeed = this.level!.initialFallSpeed * (1 + this.level!.speedIncreaseRate * steps)
        this.currentSpawnInterval = Math.max(
          this.level!.minSpawnInterval,
          this.level!.initialSpawnInterval * (1 - this.level!.speedIncreaseRate * steps),
        )

        // 延迟清除反馈（移除卡片），保存 timer 供 reset/start 时清理
        this.feedbackTimer = setTimeout(() => this.clearFeedback(), 500)
      } else {
        this.combo = 0
        this.score = Math.max(0, this.score - 50)
        this.wrongCount++
        // 记录错题
        const correctColumnId = this.columnType === 'processGroup' ? card.processGroupId : card.knowledgeAreaId
        const correctRowId = this.layoutType === 'matrix' ? card.knowledgeAreaId : undefined
        this.wrongHistory.push({
          processId: card.id,
          processName: card.name,
          chosenColumnId: columnId,
          correctColumnId,
          correctRowId,
          chosenRowId: rowId,
        })
        // 错题闪卡队列：去重后追加，保留最近 12
        {
          const q = this.wrongFlashQueue
          const existing = q.indexOf(card.id)
          if (existing !== -1) q.splice(existing, 1)
          q.push(card.id)
          while (q.length > 12) q.shift()
        }

        this.feedbackTimer = setTimeout(() => this.clearFeedback(), 600)
      }

      return isCorrect ? 'correct' : 'wrong'
    },

    clearFeedback() {
      if (!this.feedbackState) return
      if (this.feedbackTimer) {
        clearTimeout(this.feedbackTimer)
        this.feedbackTimer = null
      }
      const pid = this.feedbackState.processId
      const ti = this.feedbackState.trayIndex
      // 优先按原位校验，避免同 processId 重复时误删首个
      if (this.captureTray[ti]?.id === pid) {
        this.captureTray.splice(ti, 1)
      } else {
        const idx = this.captureTray.findIndex(p => p.id === pid)
        if (idx !== -1) this.captureTray.splice(idx, 1)
        else if (ti >= 0 && ti < this.captureTray.length) {
          this.captureTray.splice(ti, 1)
        }
      }
      this.feedbackState = null
    },

    /**
     * 每帧更新游戏状态
     */
    updateGame(deltaTime: number, gameAreaHeight: number) {
      if (!this.isPlaying || this.isPaused) return

      // 处理冰冻倒计时
      if (this.isFrozen) {
        this.freezeRemaining -= deltaTime
        if (this.freezeRemaining <= 0) {
          this.isFrozen = false
          this.freezeRemaining = 0
        }
        // 冰冻期间不移动卡片
        return
      }

      this.gameTime += deltaTime

      // 移动下落卡片：统一用 currentSpeed（加速即时生效），card.speed 仅作微随机快照，移动时以 currentSpeed 为准
      const heightScale = Math.min(1, gameAreaHeight / SPEED_BASELINE_HEIGHT)
      let pendingLives = 0
      for (const card of this.fallingCards) {
        // 统一速度模型：每帧用 currentSpeed，避免旧卡快照导致加速体感延迟
        card.y += this.currentSpeed * heightScale * deltaTime
      }
      const remaining: typeof this.fallingCards = []
      for (const card of this.fallingCards) {
        if (card.y - 60 > gameAreaHeight) {
          if (card.isTarget) {
            this.missedCount++
            pendingLives++
          }
          // 干扰项直接丢弃
        } else {
          remaining.push(card)
        }
      }
      this.fallingCards = remaining
      for (let i = 0; i < pendingLives; i++) this.loseLife()
    },

    /**
     * 减少生命值
     */
    loseLife() {
      this.lives = Math.max(0, this.lives - 1)
      this.combo = 0
      if (this.lives <= 0) {
        this.endGame(false)
      }
    },

    /**
     * 重置关卡
     */
    resetLevel() {
      if (!this.level) return
      if (this.feedbackTimer) {
        clearTimeout(this.feedbackTimer)
        this.feedbackTimer = null
      }
      nextCardId = 0
      this.fallingCards = []
      this.shelvedBooks = []
      this.captureTray = []
      this.score = 0
      this.lives = this.level.lives
      this.combo = 0
      this.correctCount = 0
      this.wrongCount = 0
      this.missedCount = 0
      this.wrongHistory = []
      this.processSeen = {}
      this.wrongFlashQueue = []
      this.lastEvictedProcess = null
      this.gamePhase = 'start'
      this.isFrozen = false
      this.freezeRemaining = 0
      this.freezeCount = this.level.freezeCount
      this.feedbackState = null
      this.gameTime = 0
      this.currentSpeed = this.level.initialFallSpeed
      this.currentSpawnInterval = this.level.initialSpawnInterval
    },

    /**
     * 使用冰冻道具
     */
    activateFreeze() {
      if (!this.isPlaying || this.isPaused || this.freezeCount <= 0 || this.isFrozen) return
      this.freezeCount--
      this.isFrozen = true
      this.freezeRemaining = 3
    },

    /**
     * 结束游戏（仅写 gamePhase，isPlaying 由 getter 派生）
     */
    endGame(success: boolean) {
      this.gamePhase = success ? 'won' : 'lost'
    },
  },
})
