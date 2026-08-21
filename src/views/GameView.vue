<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useIttoStore } from '@/stores/itto'
import { useUserStore } from '@/stores/user'
import type { Process } from '@/data/types'
import {
  loadLevels,
  loadProcesses,
  loadProcessGroups,
  loadKnowledgeAreas,
  loadITTO,
  getLevelById,
  getProcessesForLevel,
  getITTOForLevel,
} from '@/data/loader'

import GameHUD from '@/components/game/GameHUD.vue'
import SortGrid from '@/components/game/SortGrid.vue'
import MatrixGrid from '@/components/game/MatrixGrid.vue'
import ITTOQuiz from '@/components/game/ITTOQuiz.vue'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()
const ittoStore = useIttoStore()
const userStore = useUserStore()

const levelId = route.params.levelId as string
const isLoading = ref(true)
const loadError = ref('')

const gameMode = computed(() => gameStore.level?.mode ?? 'sort')

// ===== 列/矩阵反馈 =====
const columnFeedback = computed(() => {
  const fs = gameStore.feedbackState
  if (!fs) return null
  return { columnId: fs.columnId, type: fs.type as 'correct' | 'wrong' }
})

const matrixFeedback = computed(() => {
  const fs = gameStore.feedbackState
  if (!fs) return null
  return { rowId: fs.rowId, columnId: fs.columnId, type: fs.type as 'correct' | 'wrong' }
})

const placedProcessList = computed<Process[]>(() =>
  gameStore.processPool.filter(p => gameStore.placedProcessIds.includes(p.id)),
)

const levelDescription = computed(() => {
  const level = gameStore.level
  if (!level) return ''
  const colCount = level.columns.length
  const rowCount = level.rows?.length ?? 0
  if (level.layoutType === 'matrix' && rowCount > 0) {
    return `${colCount}列 · ${rowCount}行`
  }
  return `${colCount}列`
})

// 书架面板宽度
const shelfPanelWidth = computed(() => {
  const n = gameStore.columnInfos.length
  return `${Math.min(520, Math.max(130, n * 110 + (n - 1) * 8 + 16))}px`
})

const shelfUnitWidth = computed(() => {
  const n = gameStore.columnInfos.length
  if (n === 0) return 0
  return Math.round((parseFloat(shelfPanelWidth.value) - 16 - (n - 1) * 8) / n)
})

// ===== sort 模式过关判定 =====
watch(
  () => gameStore.isLevelComplete,
  (val) => {
    if (val && gameMode.value === 'sort') {
      navigateToResult(true)
    }
  },
)

// ===== itto 模式过关判定 =====
const ittoComplete = computed(() => ittoStore.total > 0 && ittoStore.index >= ittoStore.total - 1 && ittoStore.submitted)

function calculateStars() {
  const level = gameStore.level
  if (!level) return 0
  const accuracy = gameMode.value === 'itto' ? ittoStore.accuracy : gameStore.correctAccuracy
  const thresholds = level.starThresholds
  let stars = 0
  if (accuracy > 0) stars = 1
  if (accuracy >= thresholds.twoStarAccuracy) stars = 2
  if (accuracy >= thresholds.threeStarAccuracy) stars = 3
  return stars
}

function navigateToResult(won: boolean) {
  const stars = calculateStars()
  const level = gameStore.level
  if (!level) return
  const accuracy = gameMode.value === 'itto' ? ittoStore.accuracy : gameStore.correctAccuracy

  userStore.saveProgress(level.id, stars, Math.round(accuracy * 100))

  let nextLevelId: string | undefined
  const sortedLevels = [...allLevels.value].sort((a, b) => {
    if (a.stage !== b.stage) return a.stage - b.stage
    return a.number - b.number
  })
  const idx = sortedLevels.findIndex(l => l.id === level.id)
  if (idx !== -1 && idx < sortedLevels.length - 1) {
    nextLevelId = sortedLevels[idx + 1].id
  }

  const payload = {
    won,
    stars,
    score: Math.round(accuracy * 100),
    correctCount: gameMode.value === 'itto' ? ittoStore.score : gameStore.correctCount,
    wrongCount: gameStore.wrongCount,
    missedCount: 0,
    accuracy,
    nextLevelId,
    wrongHistory: gameStore.wrongHistory.slice(0, 10),
  }
  try {
    sessionStorage.setItem(`result:${level.id}`, JSON.stringify(payload))
  } catch { /* ignore */ }
  router.push({
    name: 'Result',
    params: { levelId: level.id },
    state: payload,
  })
}

// ===== 开始游戏 =====
function handleStartGame() {
  gameStore.setGamePhase('playing')
}

// ===== 关卡数据加载 =====
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

    const mode = level.mode ?? 'sort'

    if (mode === 'sort') {
      const processPool = getProcessesForLevel(level, processes)
      if (processPool.length === 0) {
        loadError.value = '关卡卡片池为空'
        isLoading.value = false
        return
      }
      gameStore.startLevel(level, processPool, processGroups, knowledgeAreas, processes)
    } else {
      // itto 模式
      const ittoData = await loadITTO()
      const pool = getITTOForLevel(level, processes, ittoData)
      if (pool.length === 0) {
        loadError.value = '关卡 ITTO 池为空'
        isLoading.value = false
        return
      }
      // 先装载 gameStore 的列/行信息（共用 gameStore.level）
      const processPool = getProcessesForLevel(level, processes)
      gameStore.startLevel(level, processPool, processGroups, knowledgeAreas, processes)
      // 聚合全局 ITTO 名称
      const allInputs: string[] = []
      const allTools: string[] = []
      const allOutputs: string[] = []
      for (const k of Object.keys(ittoData)) {
        ittoData[k].inputs.forEach(i => allInputs.push(i.name))
        ittoData[k].toolsAndTechniques.forEach(t => allTools.push(t.name))
        ittoData[k].outputs.forEach(o => allOutputs.push(o.name))
      }
      ittoStore.startQuiz(pool, { inputs: allInputs, tools: allTools, outputs: allOutputs })
    }

    isLoading.value = false
  } catch (e) {
    loadError.value = `加载关卡数据失败: ${e instanceof Error ? e.message : '未知错误'}`
    isLoading.value = false
  }
}

// ===== sort 模式交互 =====
function classifyToColumn(columnId: string) {
  if (!gameStore.selectedProcessId) return
  gameStore.classify(columnId)
}

function classifyToCell(columnId: string, rowId: string) {
  if (!gameStore.selectedProcessId) return
  gameStore.classify(columnId, rowId)
}

onMounted(() => {
  initGame()
})
</script>

<template>
  <div class="game-view">
    <!-- 加载 -->
    <div v-if="isLoading" class="game-loading">
      <div class="loading-spinner"></div>
      <p>加载关卡...</p>
    </div>

    <!-- 错误 -->
    <div v-else-if="loadError" class="game-error">
      <p class="error-text">{{ loadError }}</p>
      <button class="back-btn" @click="router.push('/levels')">返回关卡选择</button>
    </div>

    <!-- 开始界面 -->
    <div v-else-if="gameStore.gamePhase === 'start'" class="start-screen">
      <div class="start-bg-decor">
        <div class="bg-orb bg-orb--1"></div>
        <div class="bg-orb bg-orb--2"></div>
      </div>

      <div class="start-card">
        <div class="card-highlight"></div>
        <h1 class="start-title">{{ gameStore.level?.name ?? '关卡' }}</h1>
        <p class="start-description">{{ gameStore.level?.description ?? '' }}</p>
        <div class="start-guide">
          <span class="guide-icon">{{ gameMode === 'itto' ? '📝' : '📖' }}</span>
          <span v-if="gameMode === 'itto'">给出过程名，选出正确的输入/工具与技术/输出</span>
          <span v-else>点击过程卡牌选中，然后点击目标列/格完成归类</span>
        </div>

        <div class="start-info">
          <div class="info-item">
            <span class="info-icon">🎯</span>
            <span class="info-label">目标</span>
            <span class="info-value">{{ gameMode === 'itto' ? `完成 ${gameStore.targetCount} 道题` : `正确归类 ${gameStore.targetCount} 个过程` }}</span>
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

    <!-- 游戏中 -->
    <template v-else-if="gameStore.gamePhase === 'playing' || gameStore.gamePhase === 'paused'">
      <GameHUD
        :score="gameMode === 'itto' ? Math.round(ittoStore.accuracy * 100) : gameStore.score"
        :correctCount="gameMode === 'itto' ? ittoStore.score : gameStore.correctCount"
        :targetCount="gameStore.targetCount"
        :isPaused="gameStore.isPaused"
      />

      <!-- sort 模式 -->
      <template v-if="gameMode === 'sort'">
        <div class="main-area">
          <div class="game-area">
            <!-- 选卡区 -->
            <div class="card-tray">
              <button
                v-for="p in gameStore.processPool"
                :key="p.id"
                class="process-card"
                :class="{
                  selected: gameStore.selectedProcessId === p.id,
                  placed: gameStore.placedProcessIds.includes(p.id),
                  'correct-flash': gameStore.feedbackState?.processId === p.id && gameStore.feedbackState.type === 'correct',
                  'wrong-flash': gameStore.feedbackState?.processId === p.id && gameStore.feedbackState.type === 'wrong',
                }"
                :disabled="gameStore.placedProcessIds.includes(p.id)"
                @click="gameStore.selectCard(p.id)"
              >{{ p.name }}</button>
            </div>
          </div>

          <!-- matrix 模式：底部矩阵 -->
          <div v-if="gameStore.layoutType !== 'columns'" class="sort-grid-container">
            <MatrixGrid
              :columns="gameStore.columnInfos"
              :rows="gameStore.rowInfos"
              :selectedProcess="gameStore.selectedProcess"
              :feedback="matrixFeedback"
              :placedProcesses="placedProcessList"
              @place="(p) => classifyToCell(p.columnId, p.rowId)"
            />
          </div>

          <!-- columns 模式：侧边书架 -->
          <aside
            v-if="gameStore.layoutType === 'columns'"
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
      </template>

      <!-- itto 模式 -->
      <template v-else>
        <div class="itto-area">
          <ITTOQuiz />
          <div v-if="ittoComplete" class="itto-complete">
            <button class="result-btn" @click="navigateToResult(true)">查看结果</button>
          </div>
        </div>
      </template>
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
  border: 4px solid rgba(255,255,255,0.1);
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.game-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 1rem;
}

.error-text { color: var(--color-error); font-size: 1.1rem; }

.back-btn {
  padding: 0.6rem 1.5rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-strong));
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 1rem;
  cursor: pointer;
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

.start-bg-decor { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.start-bg-decor .bg-orb { position: absolute; border-radius: 50%; filter: blur(100px); opacity: 0.3; }
.bg-orb--1 { width: 350px; height: 350px; background: radial-gradient(circle, rgba(99,102,241,0.25), transparent 70%); top: -100px; right: -80px; }
.bg-orb--2 { width: 280px; height: 280px; background: radial-gradient(circle, rgba(34,211,238,0.2), transparent 70%); bottom: -60px; left: -50px; }

.start-card {
  position: relative; z-index: 1; margin: auto;
  background: var(--surface-glass); backdrop-filter: blur(20px);
  border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);
  padding: 2.5rem 2rem; max-width: 420px; width: 100%; text-align: center;
  box-shadow: var(--shadow-lg);
  animation: cardIn 0.5s var(--ease-out-expo);
  overflow: hidden;
}

.start-card .card-highlight { position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%); border-radius: var(--radius-lg) var(--radius-lg) 0 0; pointer-events: none; }

@keyframes cardIn { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

.start-title {
  position: relative; font-size: 1.8rem; font-weight: 900;
  background: linear-gradient(135deg, #c7d2fe, #22d3ee, #a78bfa);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  margin-bottom: 0.75rem;
}

.start-description { position: relative; font-size: 0.95rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 1rem; }

.start-guide {
  position: relative; display: flex; align-items: flex-start; gap: 0.5rem;
  font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 1rem;
  padding: 0.6rem 0.75rem; background: rgba(255,255,255,0.05);
  border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); text-align: left;
}

.guide-icon { font-size: 1.1rem; flex-shrink: 0; }

.start-info {
  position: relative; display: flex; flex-direction: column; gap: 0.55rem;
  margin-bottom: 2rem; text-align: left;
  background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md); padding: 1rem 1.25rem;
}

.info-item { display: flex; align-items: center; gap: 0.5rem; }
.info-icon { font-size: 0.9rem; width: 1.4rem; text-align: center; flex-shrink: 0; }
.info-label { font-size: 0.85rem; color: var(--text-faint); font-weight: 500; min-width: 60px; }
.info-value { font-size: 0.9rem; color: var(--text-primary); font-weight: 600; }

.start-btn {
  position: relative; width: 100%; padding: 0.9rem 2rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-strong));
  color: #fff; border: none; border-radius: var(--radius-md);
  font-size: 1.15rem; font-weight: 800; cursor: pointer;
  transition: transform 0.25s var(--ease-spring), box-shadow 0.25s ease;
  box-shadow: var(--glow-primary); overflow: hidden;
}
.start-btn .btn-text { position: relative; z-index: 1; }
.start-btn .btn-shimmer { position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transition: left 0.5s ease; }
.start-btn:hover .btn-shimmer { left: 100%; }
.start-btn:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 8px 30px rgba(99,102,241,0.5); }

/* ===== sort 模式主区域 ===== */
.main-area { display: flex; flex: 1; min-height: 0; }

.game-area { flex: 1; position: relative; overflow: hidden; background: var(--bg-gradient-game); min-height: 0; }

/* 选卡区 */
.card-tray {
  display: flex; flex-wrap: wrap; gap: 8px; padding: 16px;
  align-content: flex-start;
}

.process-card {
  padding: 8px 14px;
  background: rgba(255,255,255,0.08);
  border: 2px solid rgba(255,255,255,0.15);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.process-card:hover:not(:disabled) {
  border-color: var(--color-accent);
  background: rgba(34,211,238,0.1);
  transform: translateY(-2px);
}

.process-card.selected {
  border-color: var(--color-primary);
  background: rgba(99,102,241,0.2);
  box-shadow: 0 0 12px rgba(99,102,241,0.3);
  transform: translateY(-2px);
}

.process-card.placed {
  opacity: 0.35;
  cursor: default;
  border-color: rgba(255,255,255,0.05);
}

.process-card.correct-flash {
  border-color: #10b981;
  background: rgba(16,185,129,0.2);
  animation: flashCorrect 0.5s ease;
}

.process-card.wrong-flash {
  border-color: #ef4444;
  background: rgba(239,68,68,0.15);
  animation: flashWrong 0.5s ease;
}

@keyframes flashCorrect { 0% { transform: scale(1); } 30% { transform: scale(1.1); } 100% { transform: scale(1); } }
@keyframes flashWrong { 0% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } 100% { transform: translateX(0); } }

/* 书架侧面板 */
.book-shelf-panel { flex-shrink: 0; min-width: 160px; }

.sort-grid-container { position: absolute; bottom: 0; left: 0; right: 0; z-index: 5; }

/* ===== itto 模式 ===== */
.itto-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  padding: 1rem;
}

.itto-complete {
  margin-top: 1rem;
  text-align: center;
}

.result-btn {
  padding: 0.8rem 2rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-strong));
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--glow-primary);
}

/* 移动端适配 */
@media (max-width: 768px) and (pointer: coarse) and (orientation: portrait) {
  .main-area { flex-direction: column-reverse; }
  .book-shelf-panel { width: 100% !important; min-width: auto; max-height: 28vh; overflow-y: auto; border-top: 1px solid rgba(0,0,0,0.25); }
  .card-tray { padding: 10px; }
  .process-card { font-size: 0.75rem; padding: 6px 10px; }
}

@media (max-width: 480px) {
  .start-card { padding: 2rem 1.25rem; }
  .start-title { font-size: 1.5rem; }
}
</style>
