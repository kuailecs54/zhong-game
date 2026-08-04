<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
import FallingCard from '@/components/game/FallingCard.vue'
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

// ===== 拖拽状态 =====
const dragCard = ref<Process | null>(null)
const dragTrayIndex = ref<number>(-1)
const dragX = ref(0)
const dragY = ref(0)
const isDragging = ref(false)

// 拖拽时高亮的目标（column/row）
const dragHighlightTarget = ref<{ columnId: string; rowId?: string } | null>(null)

// 捕获飞入动画：记录刚被捕获的卡片，临时渲染飞行副本
interface CaptureAnimation {
  id: string
  process: Process
  x: number
  y: number
  startTime: number
}
const captureAnimations = ref<Map<string, CaptureAnimation>>(new Map())
const captureAnimationsList = computed(() => Array.from(captureAnimations.value.values()))
const CAPTURE_ANIMATION_DURATION = 450

// 浮动得分文字
interface FloatingText {
  id: string
  text: string
  x: number
  y: number
  color: string
}
const floatingTexts = ref<FloatingText[]>([])
let floatingTextId = 0

// 放置失败提示
const dropHint = ref(false)
let dropHintTimer: ReturnType<typeof setTimeout> | null = null
function showDropHint() {
  if (dropHintTimer) clearTimeout(dropHintTimer)
  dropHint.value = true
  dropHintTimer = setTimeout(() => { dropHint.value = false }, 1200)
}

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

function onFallingPointerDown(e: PointerEvent, cardId: string) {
  e.preventDefault()
  e.stopPropagation()

  const card = gameStore.fallingCards.find(c => c.id === cardId)
  if (!card) return

  // 先启动捕获飞入动画
  captureAnimations.value.set(cardId, {
    id: cardId,
    process: card.process,
    x: card.x,
    y: card.y,
    startTime: performance.now(),
  })

  // 延迟清理动画副本
  setTimeout(() => {
    captureAnimations.value.delete(cardId)
  }, CAPTURE_ANIMATION_DURATION)

  // 调用 store 真正捕获（移除下落卡片并加入书桌托盘）
  gameStore.captureCard(cardId)
}

function handleFreeze() {
  gameStore.activateFreeze()
}

function handlePause() {
  togglePause()
}

// ===== 拖拽处理 =====

function onDragStart(trayIndex: number, process: Process) {
  if (!gameStore.isPlaying || gameStore.isPaused || gameStore.feedbackActive) return
  dragCard.value = process
  dragTrayIndex.value = trayIndex
  isDragging.value = true
  // 注册全局事件监听（确保拖到任意位置都能释放）
  document.addEventListener('pointermove', onDragMove)
  document.addEventListener('pointerup', onDragEnd)
  document.addEventListener('touchmove', onTouchMove, { passive: false })
  document.addEventListener('touchend', onDragEnd)
}

function updateDragHighlight() {
  if (!isDragging.value || !dragCard.value) {
    dragHighlightTarget.value = null
    return
  }

  const hitEl = document.elementFromPoint(dragX.value, dragY.value)
  if (!hitEl) {
    dragHighlightTarget.value = null
    return
  }

  const target = hitEl.closest('[data-column-id]') as HTMLElement | null
  if (!target) {
    dragHighlightTarget.value = null
    return
  }

  const columnId = target.dataset.columnId!
  const rowId = target.dataset.rowId

  // 仅当目标可放置时才高亮
  let placeable = false
  if (gameStore.layoutType === 'matrix' && rowId) {
    placeable = dragCard.value.processGroupId === columnId && dragCard.value.knowledgeAreaId === rowId
  } else {
    placeable = gameStore.columnType === 'processGroup'
      ? dragCard.value.processGroupId === columnId
      : dragCard.value.knowledgeAreaId === columnId
  }

  if (placeable) {
    dragHighlightTarget.value = { columnId, rowId }
  } else {
    dragHighlightTarget.value = null
  }
}

function onDragMove(e: PointerEvent) {
  if (!isDragging.value) return
  dragX.value = e.clientX
  dragY.value = e.clientY
  updateDragHighlight()
}

function onDragEnd(e: PointerEvent | TouchEvent) {
  if (!isDragging.value) return

  const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX
  const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY

  // 移除全局监听
  document.removeEventListener('pointermove', onDragMove)
  document.removeEventListener('pointerup', onDragEnd)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onDragEnd)

  let result: 'correct' | 'wrong' | null = null

  // 命中检测：查找指针下方的目标元素
  const hitEl = document.elementFromPoint(clientX, clientY)
  let placed = false
  if (hitEl) {
    // 向上查找带 data-column-id 的元素（书架单元或矩阵格子）
    const target = hitEl.closest('[data-column-id]') as HTMLElement | null
    if (target) {
      const columnId = target.dataset.columnId!
      const rowId = target.dataset.rowId // matrix 模式下有
      result = gameStore.placeCard(dragTrayIndex.value, columnId, rowId || undefined)
      placed = result !== null
    }
  }

  // columns 模式下，直接命中失败时做面板内吸附（找最近的书架单元）
  if (!placed && gameStore.layoutType === 'columns' && shelfPanelRef.value) {
    const panelRect = shelfPanelRef.value.getBoundingClientRect()
    if (
      clientX >= panelRect.left && clientX <= panelRect.right &&
      clientY >= panelRect.top && clientY <= panelRect.bottom
    ) {
      // 在面板内部：找离松手点最近的 .shelf-unit
      const units = shelfPanelRef.value.querySelectorAll('.shelf-unit')
      let bestDist = Infinity
      let bestEl: HTMLElement | null = null
      for (const u of units) {
        const rect = (u as HTMLElement).getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const dist = Math.hypot(clientX - cx, clientY - cy)
        if (dist < bestDist) {
          bestDist = dist
          bestEl = u as HTMLElement
        }
      }
      if (bestEl) {
        const columnId = bestEl.dataset.columnId!
        result = gameStore.placeCard(dragTrayIndex.value, columnId)
        placed = result !== null
      }
    }
  }

  // 正确放置：弹出浮动得分
  if (result === 'correct') {
    const gained = 100 * gameStore.comboMultiplier
    spawnFloatingText(`+${gained}`, clientX, clientY, '#34d399')
  }

  // 未成功放置或放错 → 显示提示
  if (!placed || result === 'wrong') {
    showDropHint()
  }

  // 清理拖拽状态
  dragCard.value = null
  dragTrayIndex.value = -1
  isDragging.value = false
  dragHighlightTarget.value = null
}

function spawnFloatingText(text: string, x: number, y: number, color: string) {
  const id = `ft-${floatingTextId++}`
  floatingTexts.value.push({ id, text, x, y, color })
  setTimeout(() => {
    floatingTexts.value = floatingTexts.value.filter(ft => ft.id !== id)
  }, 900)
}

// 防止默认触摸行为（拖拽时）
function onTouchMove(e: TouchEvent) {
  if (isDragging.value) {
    e.preventDefault()
    const touch = e.touches[0]
    if (touch) {
      dragX.value = touch.clientX
      dragY.value = touch.clientY
      updateDragHighlight()
    }
  }
}

onMounted(() => {
  initGame()
})

onUnmounted(() => {
  // 清理可能残留的拖拽监听
  document.removeEventListener('pointermove', onDragMove)
  document.removeEventListener('pointerup', onDragEnd)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onDragEnd)
  if (dropHintTimer) clearTimeout(dropHintTimer)
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
            <span class="info-icon">❤️</span>
            <span class="info-label">生命</span>
            <span class="info-value">{{ gameStore.level?.lives ?? 3 }} 条</span>
          </div>
          <div class="info-item">
            <span class="info-icon">❄️</span>
            <span class="info-label">冰冻道具</span>
            <span class="info-value">{{ gameStore.level?.freezeCount ?? 0 }} 个</span>
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

      <!-- 主区域：游戏区 + 书架侧面板 -->
      <div class="main-area">
        <!-- 游戏区域 -->
        <div
          ref="gameAreaRef"
          class="game-area"
          :class="{
            'is-paused': gameStore.isPaused,
            'is-frozen': gameStore.isFrozen,
          }"
        >
          <!-- 冰冻 vignette -->
          <div v-if="gameStore.isFrozen" class="freeze-vignette"></div>

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
            @pointerdown="onFallingPointerDown($event, card.id)"
          >
            <FallingCard
              :process="card.process"
              :isFrozen="gameStore.isFrozen"
            />
          </div>

          <!-- 捕获飞入动画卡片 -->
          <Teleport to="body">
            <div
              v-for="anim in captureAnimationsList"
              :key="anim.id"
              class="capture-flyer"
              :style="{
                left: anim.x + '%',
                top: anim.y + 'px',
              }"
            >
              <FallingCard
                :process="anim.process"
                :compact="true"
                :captured="true"
              />
            </div>
          </Teleport>

          <!-- matrix 模式：底部矩阵网格 -->
          <div
            v-if="gameStore.layoutType !== 'columns'"
            class="sort-grid-container"
          >
            <MatrixGrid
              :columns="gameStore.columnInfos"
              :rows="gameStore.rowInfos"
              :dragCard="dragCard"
              :feedback="matrixFeedback"
              :shelvedBooks="gameStore.shelvedBooks"
              :highlightTarget="dragHighlightTarget"
              @place="(p) => gameStore.placeCard(dragTrayIndex, p.columnId, p.rowId)"
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
            :shelvedBooks="gameStore.shelvedBooks"
            :dragCard="dragCard"
            :feedback="columnFeedback"
            :highlightTarget="dragHighlightTarget"
            :unit-width="shelfUnitWidth"
            @place="(colId) => gameStore.placeCard(dragTrayIndex, colId)"
          />
        </aside>
      </div>

      <!-- 书桌 -->
      <Desk
        :cards="gameStore.captureTray"
        :capacity="gameStore.trayCapacity"
        :feedbackIndex="gameStore.feedbackState?.trayIndex ?? null"
        :feedbackType="gameStore.feedbackState?.type ?? null"
        :hint="dropHint"
        :draggingIndex="dragTrayIndex"
        @dragstart="onDragStart"
      />
    </template>

    <!-- 拖拽浮层（跟手的书本） -->
    <Teleport to="body">
      <div
        v-if="isDragging && dragCard"
        class="drag-ghost"
        :class="{ 'over-target': !!dragHighlightTarget }"
        :style="{ left: dragX + 'px', top: dragY + 'px' }"
      >
        <FallingCard :process="dragCard" :compact="true" />
      </div>
    </Teleport>

    <!-- 浮动得分文字 -->
    <Teleport to="body">
      <div
        v-for="ft in floatingTexts"
        :key="ft.id"
        class="floating-text"
        :style="{
          left: ft.x + 'px',
          top: ft.y + 'px',
          color: ft.color,
        }"
      >
        {{ ft.text }}
      </div>
    </Teleport>
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

/* 下落卡片容器（扩大点击命中区域） */
.falling-card-container {
  position: absolute;
  transform: translateX(-50%);
  z-index: var(--z-falling);
  transition: none;
  padding: 12px;
  margin: -12px;
}

/* 捕获飞入动画卡片 */
.capture-flyer {
  position: fixed;
  transform: translateX(-50%);
  z-index: var(--z-falling);
  pointer-events: none;
  padding: 12px;
  margin: -12px;
}

/* 目标区域容器（matrix 模式底部） */
.sort-grid-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 5;
}

/* ===== 拖拽浮层 ===== */
.drag-ghost {
  position: fixed;
  transform: translate(-50%, -50%) scale(1.08);
  pointer-events: none;
  z-index: var(--z-drag-ghost);
  opacity: 0.92;
  filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.55));
  transition: transform 0.15s var(--ease-soft), filter 0.15s var(--ease-soft);
}

.drag-ghost.over-target {
  transform: translate(-50%, -50%) scale(1.12);
  filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 16px rgba(99, 102, 241, 0.35));
}

/* 浮动得分文字 */
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
</style>
