<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useUserStore } from '@/stores/user'
import {
  loadLevels,
  loadProcesses,
  loadProcessGroups,
  loadKnowledgeAreas,
  getLevelById,
  getProcessesForLevel,
} from '@/data/loader'
import { useGameLoop } from '@/composables/useGameLoop'

import GameHUD from '@/components/game/GameHUD.vue'
import FallingCard from '@/components/game/FallingCard.vue'
import SortGrid from '@/components/game/SortGrid.vue'
import MatrixGrid from '@/components/game/MatrixGrid.vue'
import Desk from '@/components/game/Desk.vue'
import Hand from '@/components/game/Hand.vue'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()
const userStore = useUserStore()

const levelId = route.params.levelId as string

// 游戏区域 ref
const gameAreaRef = ref<HTMLElement | null>(null)

// 小手位置：x 百分比、y 像素（相对游戏区域顶部）
const handX = ref(50)
const handY = ref(0)

// 数据加载状态
const isLoading = ref(true)
const loadError = ref('')

// 游戏循环
const { start: startLoop, stop: stopLoop, togglePause } = useGameLoop(gameAreaRef)

// 计算列反馈（columns 模式）
const columnFeedback = computed(() => {
  const fs = gameStore.feedbackState
  if (!fs) return null
  return { columnId: fs.columnId, type: fs.type as 'correct' | 'wrong' }
})

// 计算矩阵反馈（matrix 模式）
const matrixFeedback = computed(() => {
  const fs = gameStore.feedbackState
  if (!fs) return null
  return { rowId: fs.rowId, columnId: fs.columnId, type: fs.type as 'correct' | 'wrong' }
})

// 关卡描述
const levelDescription = computed(() => {
  const level = gameStore.level
  if (!level) return ''
  const colCount = level.columns.length
  const rowCount = level.rows?.length ?? 0
  const speedLabel = level.initialFallSpeed >= 60 ? '高速' : level.initialFallSpeed >= 50 ? '中速' : '低速'
  if (level.layoutType === 'matrix' && rowCount > 0) {
    return `${colCount}列 · ${rowCount}行 · ${speedLabel}`
  }
  return `${colCount}列 · ${speedLabel}`
})

// 是否本关存在干扰项
const hasDistractors = computed(() => gameStore.distractorCount > 0 && gameStore.distractorPool.length > 0)

// 检查游戏结束/胜利
watch(
  () => gameStore.isLevelComplete,
  (val) => {
    if (val && gameStore.isPlaying) {
      const won = true
      gameStore.endGame(won)
      stopLoop()
      navigateToResult(won)
    }
  },
)

watch(
  () => gameStore.isGameOver,
  (val) => {
    if (val) {
      stopLoop()
      navigateToResult(false)
    }
  },
)

function calculateStars() {
  const level = gameStore.level
  if (!level) return 0
  const thresholds = level.starThresholds
  const accuracy = gameStore.correctAccuracy

  let stars = 0
  if (gameStore.correctCount >= thresholds.oneStar) {
    stars = 1
  }
  if (stars >= 1 && accuracy >= thresholds.twoStarAccuracy) {
    stars = 2
  }
  if (stars >= 2 && accuracy >= thresholds.threeStarAccuracy && gameStore.lives >= thresholds.threeStarMinLives) {
    stars = 3
  }
  return stars
}

function navigateToResult(won: boolean) {
  const stars = calculateStars()
  const level = gameStore.level
  if (!level) return

  userStore.saveProgress(level.id, stars, gameStore.score)

  // 查找下一关
  let nextLevelId: string | undefined
  if (level) {
    const sortedLevels = [...allLevels.value].sort((a, b) => {
      if (a.stage !== b.stage) return a.stage - b.stage
      return a.number - b.number
    })
    const idx = sortedLevels.findIndex(l => l.id === level.id)
    if (idx !== -1 && idx < sortedLevels.length - 1) {
      nextLevelId = sortedLevels[idx + 1].id
    }
  }

  router.push({
    name: 'Result',
    params: { levelId: level.id },
    state: {
      won,
      stars,
      score: gameStore.score,
      correctCount: gameStore.correctCount,
      wrongCount: gameStore.wrongCount,
      accuracy: gameStore.correctAccuracy,
      nextLevelId,
    },
  })
}

function handleStartGame() {
  gameStore.setGamePhase('playing')
  requestAnimationFrame(() => {
    startLoop()
  })
}

// 关卡数据缓存（用于计算下一关）
const allLevels = ref<Awaited<ReturnType<typeof loadLevels>>>([])

async function initGame() {
  isLoading.value = true
  loadError.value = ''

  try {
    const [levels, processes, processGroups, knowledgeAreas] = await Promise.all([
      loadLevels(),
      loadProcesses(),
      loadProcessGroups(),
      loadKnowledgeAreas(),
    ])

    allLevels.value = levels

    const level = getLevelById(levelId, levels)
    if (!level) {
      loadError.value = `关卡 ${levelId} 不存在`
      isLoading.value = false
      return
    }

    const processPool = getProcessesForLevel(level, processes)
    if (processPool.length === 0) {
      loadError.value = '关卡卡片池为空'
      isLoading.value = false
      return
    }

    gameStore.startLevel(level, processPool, processGroups, knowledgeAreas, processes)
    isLoading.value = false
  } catch (e) {
    loadError.value = `加载关卡数据失败: ${e instanceof Error ? e.message : '未知错误'}`
    isLoading.value = false
  }
}

function onAreaMove(e: MouseEvent | TouchEvent) {
  const rect = gameAreaRef.value?.getBoundingClientRect()
  if (!rect) return
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  handX.value = Math.min(92, Math.max(8, ((clientX - rect.left) / rect.width) * 100))
  handY.value = Math.max(0, clientY - rect.top)
}

function handleCapture(cardId: string) {
  gameStore.captureCard(cardId)
}

function handleTraySelect(index: number) {
  gameStore.selectTrayCard(index)
}

function handlePlace(columnId: string) {
  gameStore.placeCard(columnId)
}

function handleMatrixPlace(payload: { rowId: string; columnId: string }) {
  gameStore.placeCard(payload.columnId, payload.rowId)
}

function handleFreeze() {
  gameStore.activateFreeze()
}

function handlePause() {
  togglePause()
}

onMounted(() => {
  initGame()
})
</script>

<template>
  <div class="game-view">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="game-loading">
      <div class="loading-spinner"></div>
      <p>加载关卡...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="loadError" class="game-error">
      <p class="error-text">{{ loadError }}</p>
      <button class="back-btn" @click="router.push('/levels')">返回关卡选择</button>
    </div>

    <!-- 开始界面 -->
    <div v-else-if="gameStore.gamePhase === 'start'" class="start-screen">
      <div class="start-card">
        <h1 class="start-title">{{ gameStore.level?.name ?? '关卡' }}</h1>
        <p class="start-description">{{ gameStore.level?.description ?? '' }}</p>
        <p class="start-guide">
          玩法：移动小手对准掉落的书本，点击接住放入书桌；点书桌上的书选中，再点对应的书架归类
        </p>
        <p v-if="hasDistractors" class="start-distractor-tip">
          注意：掉落的卡片可能包含干扰项（不属于本关），干扰项掉地不扣生命，请专注归类本关卡片
        </p>

        <div class="start-info">
          <div class="info-item">
            <span class="info-label">目标</span>
            <span class="info-value">正确放置 {{ gameStore.targetCount }} 张卡片</span>
          </div>
          <div class="info-item">
            <span class="info-label">难度</span>
            <span class="info-value">{{ levelDescription }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">生命</span>
            <span class="info-value">{{ gameStore.level?.lives ?? 3 }} 条</span>
          </div>
          <div class="info-item">
            <span class="info-label">冰冻道具</span>
            <span class="info-value">{{ gameStore.level?.freezeCount ?? 0 }} 个</span>
          </div>
        </div>

        <button class="start-btn" @click="handleStartGame">
          开始游戏
        </button>
      </div>
    </div>

    <!-- 游戏界面 -->
    <template v-else-if="gameStore.gamePhase === 'playing' || gameStore.gamePhase === 'paused'">
      <!-- HUD -->
      <GameHUD
        :score="gameStore.score"
        :lives="gameStore.lives"
        :maxLives="gameStore.level?.lives ?? 3"
        :combo="gameStore.combo"
        :comboMultiplier="gameStore.comboMultiplier"
        :correctCount="gameStore.correctCount"
        :targetCount="gameStore.targetCount"
        :freezeCount="gameStore.freezeCount"
        :isFrozen="gameStore.isFrozen"
        :isPaused="gameStore.isPaused"
        @freeze="handleFreeze"
        @pause="handlePause"
      />

      <!-- 游戏区域 -->
      <div
        ref="gameAreaRef"
        class="game-area"
        :class="{ 'is-paused': gameStore.isPaused }"
        @mousemove="onAreaMove"
        @touchmove="onAreaMove"
      >
        <!-- 冰冻覆盖层 -->
        <div v-if="gameStore.isFrozen" class="freeze-overlay">
          <span class="freeze-timer">{{ Math.ceil(gameStore.freezeRemaining) }}s</span>
        </div>

        <!-- 暂停覆盖层 -->
        <div v-if="gameStore.isPaused" class="pause-overlay">
          <span class="pause-text">已暂停</span>
          <button class="resume-btn" @click="handlePause">继续游戏</button>
        </div>

        <!-- 下落卡片 -->
        <div
          v-for="card in gameStore.fallingCards"
          :key="card.id"
          class="falling-card-container"
          :style="{
            left: card.x + '%',
            top: card.y + 'px',
          }"
        >
          <FallingCard
            :process="card.process"
            :isFrozen="gameStore.isFrozen"
            @capture="handleCapture(card.id)"
          />
        </div>

        <!-- 小手（跟随鼠标，点击接书） -->
        <Hand :x="handX" :y="handY" />

        <!-- 目标区域（底部） -->
        <div class="sort-grid-container">
          <!-- columns 模式 -->
          <SortGrid
            v-if="gameStore.layoutType === 'columns'"
            :columns="gameStore.columnInfos"
            :selectedCard="
              gameStore.selectedTrayIndex !== null
                ? gameStore.captureTray[gameStore.selectedTrayIndex] ?? null
                : null
            "
            :feedback="columnFeedback"
            @place="handlePlace"
          />
          <!-- matrix 模式 -->
          <MatrixGrid
            v-else
            :columns="gameStore.columnInfos"
            :rows="gameStore.rowInfos"
            :selectedCard="
              gameStore.selectedTrayIndex !== null
                ? gameStore.captureTray[gameStore.selectedTrayIndex] ?? null
                : null
            "
            :feedback="matrixFeedback"
            @place="handleMatrixPlace"
          />
        </div>
      </div>

      <!-- 书桌 -->
      <Desk
        :cards="gameStore.captureTray"
        :selectedIndex="gameStore.selectedTrayIndex"
        :capacity="gameStore.trayCapacity"
        :feedbackIndex="gameStore.feedbackState?.trayIndex ?? null"
        :feedbackType="gameStore.feedbackState?.type ?? null"
        @select="handleTraySelect"
      />
    </template>
  </div>
</template>

<style scoped>
.game-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-gradient-game);
}

/* 加载状态 */
.game-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 1rem;
  color: var(--text-muted);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 错误状态 */
.game-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 1rem;
}

.error-text {
  color: var(--color-error);
  font-size: 1.1rem;
}

.back-btn {
  padding: 0.6rem 1.5rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-strong));
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 1rem;
  cursor: pointer;
  box-shadow: var(--glow-primary);
}

.back-btn:hover {
  background: linear-gradient(135deg, #818cf8, var(--color-primary-strong));
}

/* ===== 开始界面 ===== */
.start-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 1rem;
  background: var(--bg-gradient);
}

.start-card {
  background: var(--surface-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
  max-width: 420px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-lg);
  animation: cardIn 0.4s ease;
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.start-title {
  font-size: 1.8rem;
  font-weight: 800;
  background: linear-gradient(135deg, #a5b4fc 0%, #22d3ee 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.75rem;
}

.start-description {
  font-size: 0.95rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.start-guide {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 1rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

.start-distractor-tip {
  font-size: 0.85rem;
  color: var(--color-warning, #f59e0b);
  line-height: 1.5;
  margin-bottom: 1.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: var(--radius-sm);
}

.start-info {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 2rem;
  text-align: left;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 1rem 1.25rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 0.85rem;
  color: var(--text-faint);
  font-weight: 500;
}

.info-value {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 600;
}

.start-btn {
  width: 100%;
  padding: 0.9rem 2rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-strong));
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1.15rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: var(--glow-primary);
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(99, 102, 241, 0.45);
}

.start-btn:active {
  transform: translateY(0);
}

/* 游戏区域 */
.game-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--bg-gradient-game);
  min-height: 0;
  cursor: none;
}

.game-area.is-paused {
  filter: blur(2px);
}

/* 冰冻覆盖层 */
.freeze-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 0.5rem;
  z-index: 20;
  pointer-events: none;
}

.freeze-timer {
  background: rgba(56, 189, 248, 0.9);
  color: #fff;
  padding: 0.3rem 1rem;
  border-radius: var(--radius-full);
  font-size: 0.9rem;
  font-weight: 700;
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.5);
  animation: pulse 1s ease infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* 暂停覆盖层 */
.pause-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: rgba(15, 12, 41, 0.6);
  backdrop-filter: blur(4px);
  z-index: 30;
}

.pause-text {
  font-size: 2rem;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.resume-btn {
  padding: 0.6rem 2rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-strong));
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 1rem;
  cursor: pointer;
  box-shadow: var(--glow-primary);
}

.resume-btn:hover {
  background: linear-gradient(135deg, #818cf8, var(--color-primary-strong));
}

/* 下落卡片容器 */
.falling-card-container {
  position: absolute;
  transform: translateX(-50%);
  z-index: 10;
  transition: none;
}

/* 目标区域容器 */
.sort-grid-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 5;
}

/* 移动端适配 */
@media (max-width: 480px) {
  .start-card {
    padding: 2rem 1.25rem;
  }

  .start-title {
    font-size: 1.5rem;
  }
}
</style>