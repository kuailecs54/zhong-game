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

  // 游戏阶段
  gamePhase: GamePhase
  isPlaying: boolean
  isPaused: boolean
  isFrozen: boolean
  freezeRemaining: number // 剩余冰冻秒数
  freezeCount: number // 剩余冰冻道具数

  // 反馈
  feedbackState: FeedbackState | null

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
    gamePhase: 'start',
    isPlaying: false,
    isPaused: false,
    isFrozen: false,
    freezeRemaining: 0,
    freezeCount: 0,
    feedbackState: null,
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
    correctAccuracy: (state): number => {
      const total = state.correctCount + state.wrongCount
      return total > 0 ? state.correctCount / total : 0
    },
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
      this.gamePhase = 'start'
      this.isPlaying = false
      this.isPaused = false
      this.isFrozen = false
      this.freezeRemaining = 0
      this.freezeCount = level.freezeCount
      this.feedbackState = null
      this.gameTime = 0
      this.currentSpeed = level.initialFallSpeed
      this.currentSpawnInterval = level.initialSpawnInterval
    },

    /**
     * 设置游戏阶段
     */
    setGamePhase(phase: GamePhase) {
      this.gamePhase = phase
      this.isPlaying = phase === 'playing'
      this.isPaused = phase === 'paused'
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

      // 正解卡片
      const target = this.processPool[Math.floor(Math.random() * this.processPool.length)]
      this.fallingCards.push(this.createCard(target, true, this.pickNonOverlappingX(areaWidth)))

      // 干扰项卡片（同波内不重复）
      const distractorCount = Math.min(this.distractorCount, this.distractorPool.length)
      for (const process of pickDistinct(this.distractorPool, distractorCount)) {
        if (this.fallingCards.length >= maxFalling) break
        this.fallingCards.push(this.createCard(process, false, this.pickNonOverlappingX(areaWidth)))
      }
    },

    /**
     * 创建一张下落中的卡片
     */
    createCard(process: Process, isTarget: boolean, x: number): FallingCard {
      return {
        id: generateCardId(),
        process,
        isTarget,
        x,
        y: -60, // 从顶部外进入
        speed: this.currentSpeed,
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
     * 捕获下落中的卡片到托盘
     */
    captureCard(cardId: string): boolean {
      if (!this.isPlaying || this.isPaused || this.feedbackActive) return false
      if (this.captureTray.length >= this.trayCapacity) return false

      const index = this.fallingCards.findIndex(c => c.id === cardId)
      if (index === -1) return false

      const card = this.fallingCards[index]
      this.fallingCards.splice(index, 1)
      this.captureTray.push(card.process)
      return true
    },

    /**
     * 放置卡片到某列（或矩阵中的某格）
     * 通过托盘索引指定要放置的卡片
     */
    placeCard(trayIndex: number, columnId: string, rowId?: string): 'correct' | 'wrong' | null {
      if (!this.isPlaying || this.isPaused || this.feedbackActive) return null
      if (trayIndex < 0 || trayIndex >= this.captureTray.length) return null

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

      this.feedbackState = {
        type: isCorrect ? 'correct' : 'wrong',
        columnId,
        rowId,
        trayIndex,
      }

      if (isCorrect) {
        this.combo++
        const multiplier = this.comboMultiplier
        this.score += 100 * multiplier
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

        // 延迟清除反馈（移除卡片）
        setTimeout(() => this.clearFeedback(), 500)
      } else {
        this.combo = 0
        this.score = Math.max(0, this.score - 50)
        this.wrongCount++

        // 延迟清除反馈
        setTimeout(() => this.clearFeedback(), 600)
      }

      return isCorrect ? 'correct' : 'wrong'
    },

    clearFeedback() {
      if (!this.feedbackState) return

      // 放置的卡片（无论正确还是错误）都从托盘移除
      this.captureTray.splice(this.feedbackState.trayIndex, 1)
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

      // 移动下落卡片
      const heightScale = Math.min(1, gameAreaHeight / SPEED_BASELINE_HEIGHT)
      const cardsToRemove: string[] = []
      for (const card of this.fallingCards) {
        card.y += card.speed * heightScale * deltaTime
        // 卡片底部超出游戏区域
        if (card.y - 60 > gameAreaHeight) {
          cardsToRemove.push(card.id)
        }
      }

      // 处理掉到底部的卡片
      for (const cardId of cardsToRemove) {
        const idx = this.fallingCards.findIndex(c => c.id === cardId)
        if (idx !== -1) {
          const [card] = this.fallingCards.splice(idx, 1)
          // 只有正解卡片掉地扣生命，干扰项掉地直接消失
          if (card.isTarget) {
            this.loseLife()
          }
        }
      }
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
      nextCardId = 0
      this.fallingCards = []
      this.shelvedBooks = []
      this.captureTray = []
      this.score = 0
      this.lives = this.level.lives
      this.combo = 0
      this.correctCount = 0
      this.wrongCount = 0
      this.gamePhase = 'start'
      this.isPlaying = false
      this.isPaused = false
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
     * 结束游戏
     */
    endGame(success: boolean) {
      this.isPlaying = false
      this.gamePhase = success ? 'won' : 'lost'
    },
  },
})
