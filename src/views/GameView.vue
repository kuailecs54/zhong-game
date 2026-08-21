<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useUserStore } from '@/stores/user'
import type { Process } from '@/data/types'
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
import SortGrid from '@/components/game/SortGrid.vue'
import MatrixGrid from '@/components/game/MatrixGrid.vue'
import Desk from '@/components/game/Desk.vue'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()
const userStore = useUserStore()

const levelId = route.params.levelId as string

// 游戏区域 ref
const gameAreaRef = ref<HTMLElement | null>(null)
const shelfPanelRef = ref<HTMLElement | null>(null)

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

// 已正确归类（上架）的过程列表：从 processPool 中筛出 placedProcessIds 对应的过程
const placedProcessList = computed<Process[]>(() =>
  gameStore.processPool.filter(p => gameStore.placedProcessIds.includes(p.id)),
)

// 关卡描述
const levelDescription = computed(() => {
  const level = gameStore.level
  if (!level) return ''
  const colCount = level.columns.length
  const rowCount = level.rows?.length ?? 0
  // TODO(T6): 重写下落玩法为点选即放——原初始下落速度标签已下线
  if (level.layoutType === 'matrix' && rowCount > 0) {
    return `${colCount}列 · ${rowCount}行`
  }
  return `${colCount}列`
})

// TODO(T6): 重写下落玩法为点选即放——干扰项相关逻辑已下线
const hasDistractors = computed(() => false)

// 书架面板宽度
const shelfPanelWidth = computed(() => {
  const n = gameStore.columnInfos.length
  return `${Math.min(520, Math.max(130, n * 110 + (n - 1) * 8 + 16))}px`
})

// 每个书架单元的估算宽度（与面板宽度公式同源）
const shelfUnitWidth = computed(() => {
  const n = gameStore.columnInfos.length
  if (n === 0) return 0
  return Math.round((parseFloat(shelfPanelWidth.value) - 16 - (n - 1) * 8) / n)
})

// TODO(T6): 重写下落玩法为点选即放——放置失败/溢出/错题提示状态已下线，待 T6 重写后清理

// 检查游戏结束/胜利
// TODO(T6): 重写下落玩法为点选即放——原 endGame/isGameOver 已移除，胜利判定由 isLevelComplete 直接驱动
watch(
  () => gameStore.isLevelComplete,
  (val) => {
    if (val && gameStore.isPlaying) {
      const won = true
      stopLoop()
      navigateToResult(won)
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
  // TODO(T6): 重写下落玩法为点选即放——原 threeStarMinLives 依赖 lives，暂按准确率给 3 星
  if (stars >= 2 && accuracy >= thresholds.threeStarAccuracy) {
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

  const payload = {
    won,
    stars,
    score: gameStore.score,
    correctCount: gameStore.correctCount,
    wrongCount: gameStore.wrongCount,
    // TODO(T6): 重写下落玩法为点选即放——missedCount 已下线
    missedCount: 0,
    accuracy: gameStore.correctAccuracy,
    nextLevelId,
    wrongHistory: gameStore.wrongHistory.slice(0, 10),
  }
  // sessionStorage 兜底：刷新后 ResultView 仍可恢复
  try {
    sessionStorage.setItem(`result:${level.id}`, JSON.stringify(payload))
  } catch {
    // ignore
  }
  router.push({
    name: 'Result',
    params: { levelId: level.id },
    state: payload,
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

// TODO(T6): 重写下落玩法为点选即放——原下落卡捕获/拖拽/冻结逻辑已下线，待 GameView 重写后替换
function handlePause() {
  togglePause()
}

// ===== 点选即放：选中过程后点击列/格子归类 =====
function classifyToColumn(columnId: string) {
  // TODO(T6): 重写下落玩法为点选即放——此处仅做归类判定占位，真实交互在 T6 接入
  gameStore.classify(columnId)
}

function classifyToCell(columnId: string, rowId: string) {
  // TODO(T6): 重写下落玩法为点选即放——此处仅做归类判定占位，真实交互在 T6 接入
  gameStore.classify(columnId, rowId)
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
      <!-- 背景装饰 -->
      <div class="start-bg-decor">
        <div class="bg-orb bg-orb--1"></div>
        <div class="bg-orb bg-orb--2"></div>
      </div>

      <div class="start-card">
        <div class="card-highlight"></div>
        <h1 class="start-title">{{ gameStore.level?.name ?? '关卡' }}</h1>
        <p class="start-description">{{ gameStore.level?.description ?? '' }}</p>
        <div class="start-guide">
          <span class="guide-icon">📖</span>
          <span>点击掉落的书本接住放到书桌；从书桌拖拽书本到对应的书架归类</span>
        </div>
        <p v-if="hasDistractors" class="start-distractor-tip">
          ⚠️ 掉落的卡片可能包含干扰项（不属于本关），干扰项掉地不扣生命，请专注归类本关卡片
        </p>

        <div class="start-info">
          <div class="info-item">
            <span class="info-icon">🎯</span>
            <span class="info-label">目标</span>
            <span class="info-value">正确放置 {{ gameStore.targetCount }} 张卡片</span>
          </div>
          <div class="info-item">
            <span class="info-icon">📊</span>
            <span class="info-label">难度</span>
            <span class="info-value">{{ levelDescription }}</span>
          </div>
          <div class="info-item">
            <span class="info-icon">📊</span>
            <span class="info-label">难度</span>
            <span class="info-value">{{ levelDescription }}</span>
          </div>
        </div>

        <button class="start-btn" @click="handleStartGame">
          <span class="btn-text">开始游戏</span>
          <span class="btn-shimmer"></span>
        </button>
      </div>
    </div>

    <!-- 游戏界面 -->
    <template v-else-if="gameStore.gamePhase === 'playing' || gameStore.gamePhase === 'paused'">
      <!-- HUD -->
      <GameHUD
        :score="gameStore.score"
        :correctCount="gameStore.correctCount"
        :targetCount="gameStore.targetCount"
        :isPaused="gameStore.isPaused"
        @pause="handlePause"
      />

      <!-- 主区域：游戏区 + 书架侧面板 -->
      <div class="main-area">
        <!-- 游戏区域 -->
        <div
          ref="gameAreaRef"
          class="game-area"
          :class="{
            'is-paused': gameStore.isPaused,
          }"
        >
          <!-- 暂停覆盖层 -->
          <div v-if="gameStore.isPaused" class="pause-overlay">
            <span class="pause-text">已暂停</span>
            <button class="resume-btn" @click="handlePause">继续游戏</button>
          </div>

          <!-- matrix 模式：底部矩阵网格 -->
          <div
            v-if="gameStore.layoutType !== 'columns'"
            class="sort-grid-container"
          >
            <MatrixGrid
              :columns="gameStore.columnInfos"
              :rows="gameStore.rowInfos"
              :selectedProcess="gameStore.selectedProcess"
              :feedback="matrixFeedback"
              :placedProcesses="placedProcessList"
              @place="(p) => classifyToCell(p.columnId, p.rowId)"
            />
          </div>
        </div>

        <!-- 书架侧面板（仅 columns 模式） -->
        <aside
          v-if="gameStore.layoutType === 'columns'"
          ref="shelfPanelRef"
          class="book-shelf-panel"
          :style="{ width: shelfPanelWidth }"
        >
          <SortGrid
            :columns="gameStore.columnInfos"
            :columnType="gameStore.columnType"
            :placedProcesses="placedProcessList"
            :selectedProcess="gameStore.selectedProcess"
            :feedback="columnFeedback"
            :unit-width="shelfUnitWidth"
            @place="(colId) => classifyToColumn(colId)"
          />
        </aside>
      </div>

      <!-- 书桌（点选即放玩法占位，待 T6 重写） -->
      <Desk
        :cards="gameStore.processPool"
        :capacity="1"
      />
    </template>

    <!-- TODO(T6): 重写下落玩法为点选即放——拖拽浮层/浮动文字/溢出提示等已下线，待 T6 清理 -->
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
  position: relative;
  overflow-y: auto;
}

/* 背景装饰 */
.start-bg-decor {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.start-bg-decor .bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.3;
}

.start-bg-decor .bg-orb--1 {
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.25), transparent 70%);
  top: -100px;
  right: -80px;
}

.start-bg-decor .bg-orb--2 {
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, rgba(34, 211, 238, 0.2), transparent 70%);
  bottom: -60px;
  left: -50px;
}

.start-card {
  position: relative;
  z-index: 1;
  margin: auto;
  background: var(--surface-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
  max-width: 420px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-lg), inset 0 1px 0 rgba(255,255,255,0.1);
  animation: cardIn 0.5s var(--ease-out-expo);
  overflow: hidden;
}

/* 玻璃高光 */
.start-card .card-highlight {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  pointer-events: none;
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
  position: relative;
  font-size: 1.8rem;
  font-weight: 900;
  background: linear-gradient(135deg, #c7d2fe 0%, #22d3ee 50%, #a78bfa 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.75rem;
  filter: drop-shadow(0 0 16px rgba(99, 102, 241, 0.35));
}

.start-description {
  position: relative;
  font-size: 0.95rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 1rem;
}

.start-guide {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 1rem;
  padding: 0.6rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  text-align: left;
}

.guide-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.start-distractor-tip {
  position: relative;
  font-size: 0.85rem;
  color: var(--color-warning);
  line-height: 1.5;
  margin-bottom: 1.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: var(--radius-sm);
  text-align: left;
}

.start-info {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-bottom: 2rem;
  text-align: left;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 1rem 1.25rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-icon {
  font-size: 0.9rem;
  width: 1.4rem;
  text-align: center;
  flex-shrink: 0;
}

.info-label {
  font-size: 0.85rem;
  color: var(--text-faint);
  font-weight: 500;
  min-width: 60px;
}

.info-value {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 600;
}

.start-btn {
  position: relative;
  width: 100%;
  padding: 0.9rem 2rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-strong));
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1.15rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.25s var(--ease-spring), box-shadow 0.25s ease;
  box-shadow: var(--glow-primary);
  overflow: hidden;
}

.start-btn .btn-text {
  position: relative;
  z-index: 1;
}

.start-btn .btn-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s ease;
}

.start-btn:hover .btn-shimmer {
  left: 100%;
}

.start-btn:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 8px 30px rgba(99, 102, 241, 0.5);
}

.start-btn:active {
  transform: translateY(0) scale(0.98);
}

/* ===== 主区域（游戏 + 书架） ===== */
.main-area {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* 游戏区域 */
.game-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--bg-gradient-game);
  min-height: 0;
}

.game-area.is-paused {
  filter: blur(2px);
}

/* 书架侧面板 */
.book-shelf-panel {
  flex-shrink: 0;
  min-width: 160px;
}

/* 冰冻 vignette */
.freeze-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 15;
  box-shadow:
    inset 0 0 80px 20px rgba(56, 189, 248, 0.18),
    inset 0 0 30px 6px rgba(147, 197, 253, 0.12);
  animation: freezeVignette 2s ease-in-out infinite;
}

@keyframes freezeVignette {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 1; }
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
  background: rgba(56, 189, 248, 0.95);
  color: #fff;
  padding: 0.35rem 1.1rem;
  border-radius: var(--radius-full);
  font-size: 0.95rem;
  font-weight: 800;
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.55), 0 0 0 4px rgba(56, 189, 248, 0.12);
  animation: freezeTimerPulse 1.2s ease-in-out infinite;
}

@keyframes freezeTimerPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 20px rgba(56, 189, 248, 0.55), 0 0 0 4px rgba(56, 189, 248, 0.12);
  }
  50% {
    transform: scale(1.06);
    box-shadow: 0 0 30px rgba(56, 189, 248, 0.75), 0 0 0 6px rgba(56, 189, 248, 0.18);
  }
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

/* 下落卡片容器（扩大点击命中区域）
   合成分层优化：高频 y 移动当前仍为 top 直写（store card.y 每帧变更），
   先以 will-change/contain 提升为合成层，后续可精化为 transform: translate3d(x,y,0) 以完全走合成器。 */
.falling-card-container {
  position: absolute;
  transform: translateX(-50%);
  z-index: var(--z-falling);
  transition: none;
  padding: 12px;
  margin: -12px;
  will-change: transform;
  contain: layout paint;
}

/* 捕获飞入动画卡片 — Teleport 到 body 的飞行副本，fixed+translate 已走合成器，补 will-change */
.capture-flyer {
  position: fixed;
  transform: translateX(-50%);
  z-index: var(--z-falling);
  pointer-events: none;
  padding: 12px;
  margin: -12px;
  will-change: transform, opacity;
  contain: layout paint;
}

/* 目标区域容器（matrix 模式底部） */
.sort-grid-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 5;
}

/* ===== 拖拽浮层 — Teleport fixed，已为 translate 跟手，补 will-change/contain 固化合成层 ===== */
.drag-ghost {
  position: fixed;
  transform: translate(-50%, -50%) scale(1.08);
  pointer-events: none;
  z-index: var(--z-drag-ghost);
  opacity: 0.92;
  filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.55));
  transition: transform 0.15s var(--ease-soft), filter 0.15s var(--ease-soft);
  will-change: transform;
  contain: layout paint;
}

.drag-ghost.over-target {
  transform: translate(-50%, -50%) scale(1.12);
  filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 16px rgba(99, 102, 241, 0.35));
}

/* 浮动得分文字 — Teleport fixed + transform 动画，已走合成器，补 will-change */
.floating-text {
  position: fixed;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: var(--z-drag-ghost);
  font-size: 1.3rem;
  font-weight: 900;
  text-shadow:
    0 2px 8px rgba(0, 0, 0, 0.5),
    0 0 20px currentColor;
  animation: floatTextUp 1s var(--ease-out-expo) forwards;
  will-change: transform, opacity;
  contain: layout paint;
}

@keyframes floatTextUp {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.6);
  }
  15% {
    opacity: 1;
    transform: translate(-50%, -60%) scale(1.2);
  }
  30% {
    transform: translate(-50%, -70%) scale(1.05);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -150%) scale(0.9);
  }
}

/* 移动端适配 */
@media (max-width: 768px) and (pointer: coarse) and (orientation: portrait) {
  .main-area {
    flex-direction: column-reverse;
  }

  .book-shelf-panel {
    width: 100% !important;
    min-width: auto;
    max-height: 28vh;
    overflow-y: auto;
    border-top: 1px solid rgba(0, 0, 0, 0.25);
  }

  .game-area {
    flex: 1;
  }

  .sort-grid-container {
    max-height: 30vh;
    overflow-y: auto;
  }
}

/* 触摸设备横屏：并排布局 + 书架宽度封顶 + 矩阵网格安全高度 */
@media (max-width: 820px) and (pointer: coarse) and (orientation: landscape) {
  .book-shelf-panel {
    max-width: 45vw !important;
    min-width: 130px;
  }
  .sort-grid-container {
    max-height: 58vh;
    overflow-y: auto;
  }
}

@media (max-width: 480px) {
  .start-card {
    padding: 2rem 1.25rem;
  }

  .start-title {
    font-size: 1.5rem;
  }
}

/* 托盘溢出与正确归属提示 */
.overflow-toast,
.correct-hint {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-drag-ghost);
  padding: 0.4rem 0.9rem;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 700;
  pointer-events: none;
  text-align: center;
  max-width: 90vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.overflow-toast {
  bottom: 88px;
  background: rgba(239, 68, 68, 0.92);
  color: #fff;
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
}
.correct-hint {
  bottom: 52px;
  background: rgba(16, 185, 129, 0.92);
  color: #fff;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);
}
.toast-pop-enter-active { transition: opacity 0.18s ease, transform 0.18s var(--ease-spring); }
.toast-pop-leave-active { transition: opacity 0.3s ease; }
.toast-pop-enter-from { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.98); }
.toast-pop-leave-to { opacity: 0; }
</style>
