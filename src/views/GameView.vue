<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useUserStore } from '@/stores/user'
import type { Process, ITTO, ProcessGroup, KnowledgeArea, LevelConfig } from '@/data/types'
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
import { playCorrect, playWrong } from '@/utils/sound'

import { Edit, BookOpen, Target, ChartHistogram } from '@icon-park/vue-next'
import GameHUD from '@/components/game/GameHUD.vue'
import MatrixGrid from '@/components/game/MatrixGrid.vue'
import ITTOQuiz from '@/components/game/ITTOQuiz.vue'
import PauseOverlay from '@/components/game/PauseOverlay.vue'
import CardStage from '@/components/game/CardStage.vue'
import FeedbackOverlay from '@/components/game/FeedbackOverlay.vue'
import DefinitionQuiz from '@/components/game/DefinitionQuiz.vue'
import AnswerCards from '@/components/game/AnswerCards.vue'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()
const userStore = useUserStore()

const levelId = route.params.levelId as string
const isLoading = ref(true)
const loadError = ref('')

const gameMode = computed(() => gameStore.level?.mode ?? 'sort')

// ===== 全量数据（供 DefinitionQuiz 干扰项与 FeedbackOverlay 归属名查询） =====
const allProcesses = ref<Process[]>([])
const processGroupsData = ref<ProcessGroup[]>([])
const knowledgeAreasData = ref<KnowledgeArea[]>([])
const pgNames = computed<Record<string, string>>(() =>
  Object.fromEntries(processGroupsData.value.map(g => [g.id, g.name])),
)
const kaNames = computed<Record<string, string>>(() =>
  Object.fromEntries(knowledgeAreasData.value.map(a => [a.id, a.name])),
)

// ===== L3 ITTO 数据（当前题由引擎 currentProcess 派生） =====
const ittoDataMap = ref<Record<string, ITTO>>({})
const ittoGlobalPool = ref<{ inputs: string[]; tools: string[]; outputs: string[] }>({
  inputs: [], tools: [], outputs: [],
})
const currentIttoQuestion = computed(() => {
  const p = gameStore.currentProcess
  if (!p || !ittoDataMap.value[p.id]) return null
  return { process: p, itto: ittoDataMap.value[p.id] }
})
/** ITTO 答错复盘停留态：停留期间暂停引擎倒计时，避免批改阅读时被超时二次扣罚 */
const ittoHold = ref(false)

// ===== 双模式选择（开始界面，选中写回 user store 持久化） =====
const selectedMode = ref<'challenge' | 'relaxed'>(userStore.settings.difficultyMode ?? 'challenge')

function selectMode(mode: 'challenge' | 'relaxed') {
  selectedMode.value = mode
  userStore.setSettings({ difficultyMode: mode })
}

// ===== 矩阵反馈 =====
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

// ===== 过关判定（队列清空）与失败判定（生命归零），三模式统一 =====
watch(
  () => gameStore.isLevelComplete,
  (val) => {
    if (val && gameStore.isPlaying) {
      navigateToResult(true)
    }
  },
)

watch(
  () => gameStore.isFailed,
  (val) => {
    if (val && gameStore.isPlaying) {
      navigateToResult(false)
    }
  },
)

function calculateStars() {
  const level = gameStore.level
  if (!level) return 0
  const accuracy = gameStore.correctAccuracy
  const thresholds = level.starThresholds
  let stars = 0
  if (accuracy > 0) stars = 1
  if (accuracy >= thresholds.twoStarAccuracy) stars = 2
  if (accuracy >= thresholds.threeStarAccuracy) stars = 3
  // 三星附加条件：挑战=零漏接；轻松=零错误（D5）
  if (stars === 3) {
    if (gameStore.difficultyMode === 'relaxed') {
      if (gameStore.wrongCount + gameStore.missedCount > 0) stars = 2
    } else if (gameStore.missedCount > 0) {
      stars = 2
    }
  }
  return stars
}

function navigateToResult(won: boolean) {
  const stars = calculateStars()
  const level = gameStore.level
  if (!level) return
  const accuracy = gameStore.correctAccuracy

  // 合成练习关（薄弱特训/只练错题）不计入关卡进度与总星数
  if (allLevels.value.some(l => l.id === level.id)) {
    userStore.saveProgress(level.id, stars, Math.round(accuracy * 100))
  }

  let nextLevelId: string | undefined
  const sortedLevels = [...allLevels.value].sort((a, b) => {
    if (a.stage !== b.stage) return a.stage - b.stage
    return a.number - b.number
  })
  const idx = sortedLevels.findIndex(l => l.id === level.id)
  if (idx !== -1 && idx < sortedLevels.length - 1) {
    nextLevelId = sortedLevels[idx + 1].id
  }

  // 错题本增强：附正确归属中文名（过程组 × 知识领域）与口诀
  const enrichedWrongHistory = gameStore.wrongHistory.slice(0, 10).map(w => {
    const proc = allProcesses.value.find(p => p.id === w.processId)
    return {
      ...w,
      chosenLabel: w.chosenColumnId
        ? (pgNames.value[w.chosenColumnId] ?? kaNames.value[w.chosenColumnId] ?? w.chosenColumnId)
        : '',
      correctPgLabel: pgNames.value[proc?.processGroupId ?? ''] ?? proc?.processGroupId ?? '',
      correctKaLabel: kaNames.value[proc?.knowledgeAreaId ?? ''] ?? proc?.knowledgeAreaId ?? '',
      mnemonic: proc?.mnemonic,
    }
  })

  const payload = {
    won,
    stars,
    score: gameStore.score,
    correctCount: gameStore.correctCount,
    wrongCount: gameStore.wrongCount,
    missedCount: gameStore.missedCount,
    maxCombo: gameStore.maxCombo,
    accuracy,
    nextLevelId,
    wrongHistory: enrichedWrongHistory,
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
  // 应用开始界面选择的双模式（startLevel 已用 user store 上次选择初始化）
  gameStore.setDifficultyMode(selectedMode.value)
  gameStore.setGamePhase('playing')
}

// ===== 暂停遮罩：重新开始（resetLevel 会把 phase 置回 start，需再置 playing）=====
function handleRestart() {
  gameStore.resetLevel()
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
    allProcesses.value = processes
    processGroupsData.value = processGroups
    knowledgeAreasData.value = knowledgeAreas

    // 合成关卡（薄弱特训 / 只练错题）：优先于常规关卡查找——合成关 id 不在 levels.json 中，
    // 若先走 getLevelById 会因未命中而提前报「关卡不存在」，永远到不了本分支
    let finalLevel: LevelConfig | null = null
    if (levelId === 'weak-training' || levelId === 'wrong-drill') {
      let custom: LevelConfig | null = null
      try {
        const raw = sessionStorage.getItem('custom-level')
        if (raw) custom = JSON.parse(raw) as LevelConfig
      } catch { /* ignore */ }
      sessionStorage.removeItem('custom-level')
      if (!custom || custom.id !== levelId) {
        loadError.value = '练习关卡已失效，请重新从选关页进入'
        isLoading.value = false
        return
      }
      finalLevel = custom
    } else {
      finalLevel = getLevelById(levelId, levels) ?? null
      if (!finalLevel) {
        loadError.value = `关卡 ${levelId} 不存在`
        isLoading.value = false
        return
      }
    }

    const mode = finalLevel.mode ?? 'sort'

    if (mode === 'itto') {
      // L3 ITTO：引擎队列仍为过程 id，itto 数据按当前卡派生传给作答器
      const ittoData = await loadITTO()
      ittoDataMap.value = ittoData
      const pool = getITTOForLevel(finalLevel, processes, ittoData)
      if (pool.length === 0) {
        loadError.value = '关卡 ITTO 池为空'
        isLoading.value = false
        return
      }
      const allInputs: string[] = []
      const allTools: string[] = []
      const allOutputs: string[] = []
      for (const k of Object.keys(ittoData)) {
        ittoData[k].inputs.forEach(i => allInputs.push(i.name))
        ittoData[k].toolsAndTechniques.forEach(t => allTools.push(t.name))
        ittoData[k].outputs.forEach(o => allOutputs.push(o.name))
      }
      ittoGlobalPool.value = { inputs: allInputs, tools: allTools, outputs: allOutputs }
    }

    // 统一入口：三模式共用 startLevel（队列 = 卡池过程 id 洗牌）
    const processPool = getProcessesForLevel(finalLevel, processes)
    if (processPool.length === 0) {
      loadError.value = '关卡卡片池为空'
      isLoading.value = false
      return
    }
    gameStore.startLevel(finalLevel, processPool, processGroups, knowledgeAreas, {
      difficultyMode: userStore.settings.difficultyMode ?? 'challenge',
    })

    isLoading.value = false
  } catch (e) {
    loadError.value = `加载关卡数据失败: ${e instanceof Error ? e.message : '未知错误'}`
    isLoading.value = false
  }
}

// ===== sort 模式交互（统一引擎 answer 判定） =====
function answerColumn(columnId: string) {
  gameStore.answer(columnId)
}

function answerCell(columnId: string, rowId: string) {
  gameStore.answer(columnId, rowId)
}

// ===== 音效反馈（settings.soundEnabled===false 时不播，默认开） =====
watch(
  () => gameStore.feedbackState,
  (fs) => {
    if (!fs || userStore.settings.soundEnabled === false) return
    if (fs.type === 'correct') {
      // 连击倍率 ≥2（combo≥3）时音高递增升调
      playCorrect(gameStore.comboMultiplier)
    } else {
      playWrong()
    }
  },
)

function toggleSound() {
  const next = userStore.settings.soundEnabled === false
  userStore.setSettings({ soundEnabled: next })
}

// ===== 键盘快捷键（仅 playing 且非输入框聚焦时生效）=====
// Esc：暂停/继续切换；数字键 1-9/0：sort 列模式选第 N 列作答（矩阵关不支持键盘）
function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

function onKeydown(e: KeyboardEvent) {
  if (isTypingTarget(e)) return

  // Esc：全模式暂停/继续切换
  if (e.key === 'Escape') {
    if (gameStore.isPlaying) gameStore.setGamePhase('paused')
    else if (gameStore.isPaused) gameStore.setGamePhase('playing')
    return
  }

  if (!gameStore.isPlaying) return
  // 数字键选列：仅 sort 列模式（矩阵关需行列同时指定，仅支持点击）
  if (gameMode.value === 'sort' && gameStore.layoutType === 'columns') {
    const digit = e.key >= '1' && e.key <= '9' ? Number(e.key) : e.key === '0' ? 10 : 0
    if (digit >= 1 && digit <= gameStore.columnInfos.length) {
      gameStore.answer(gameStore.columnInfos[digit - 1].id)
    }
  }
}

// ===== 引擎心跳：100ms 粒度驱动倒计时（暂停/轻松模式由 tick 内部守卫跳过）=====
let tickTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  initGame()
  tickTimer = setInterval(() => {
    // ITTO 答错复盘停留期间暂停倒计时，避免阅读解析时被超时二次扣罚
    if (!ittoHold.value) gameStore.tick()
  }, 100)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
  window.removeEventListener('keydown', onKeydown)
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
          <component :is="gameMode === 'itto' ? Edit : BookOpen" :size="20" class="guide-icon" />
          <span v-if="gameMode === 'itto'">给出过程名，选出正确的输入/工具与技术/输出（Enter 提交）</span>
          <span v-else-if="gameMode === 'definition'">阅读题面后点选答案（Tab 切换选项 + Enter 提交）</span>
          <span v-else>记住当前过程，点击目标列/格完成归类（列模式可用数字键 1-9/0；Esc 暂停）</span>
        </div>

        <div class="start-info">
          <div class="info-item">
            <Target :size="18" class="info-icon" />
            <span class="info-label">目标</span>
            <span class="info-value">{{ gameMode === 'itto' ? `完成 ${gameStore.totalCount} 道题` : `正确归类 ${gameStore.totalCount} 个过程` }}</span>
          </div>
          <div class="info-item">
            <ChartHistogram :size="18" class="info-icon" />
            <span class="info-label">难度</span>
            <span class="info-value">{{ levelDescription }}</span>
          </div>
        </div>

        <!-- 双模式选择 -->
        <div class="mode-select">
          <button
            class="mode-btn"
            :class="{ active: selectedMode === 'challenge' }"
            @click="selectMode('challenge')"
          >挑战模式</button>
          <button
            class="mode-btn"
            :class="{ active: selectedMode === 'relaxed' }"
            @click="selectMode('relaxed')"
          >轻松模式</button>
        </div>
        <p class="mode-hint">{{ selectedMode === 'challenge' ? '限时作答，答错扣生命' : '无倒计时与生命，轻松练习' }}</p>

        <!-- 音效开关（默认开） -->
        <button
          class="sound-toggle"
          :class="{ off: userStore.settings.soundEnabled === false }"
          @click="toggleSound"
        >{{ userStore.settings.soundEnabled === false ? '🔇 音效关' : '🔊 音效开' }}</button>

        <button class="start-btn" @click="handleStartGame">
          <span class="btn-text">开始游戏</span>
          <span class="btn-shimmer"></span>
        </button>
      </div>
    </div>

    <!-- 游戏中 -->
    <template v-else-if="gameStore.gamePhase === 'playing' || gameStore.gamePhase === 'paused'">
      <GameHUD
        :score="gameStore.score"
        :correctCount="gameStore.correctCount"
        :targetCount="gameStore.totalCount"
        :isPaused="gameStore.isPaused"
        :difficultyMode="gameStore.difficultyMode"
        :livesLeft="gameStore.livesLeft"
        :livesTotal="gameStore.level?.lives ?? 0"
        :combo="gameStore.combo"
        :timeLeft="gameStore.timeLeft"
        :items="gameStore.items"
        :freezeTicksLeft="gameStore.freezeTicksLeft"
        :hintActiveUntil="gameStore.hintActiveUntil"
        :progressText="`题目 ${Math.min(gameStore.correctCount + 1, gameStore.totalCount)} / ${gameStore.totalCount}`"
        @pause="gameStore.setGamePhase('paused')"
        @use-hint="gameStore.useHint()"
        @use-freeze="gameStore.useFreeze()"
        @use-shield="gameStore.useShield()"
      />

      <!-- 反馈浮层（口诀闪现 / 纠错，附过程组×知识领域归属） -->
      <FeedbackOverlay :pg-names="pgNames" :ka-names="kaNames" />

      <!-- 暂停遮罩 -->
      <PauseOverlay
        v-if="gameStore.isPaused"
        @resume="gameStore.setGamePhase('playing')"
        @restart="handleRestart"
        @quit="router.push('/levels')"
      />

      <!-- L1 归类模式：居中大卡 + 底部答案卡组（列）/ 矩阵（矩阵） -->
      <template v-if="gameMode === 'sort'">
        <div class="main-area">
          <div class="game-area">
            <!-- 居中大卡（书本外观 + 倒计时条） -->
            <CardStage :show-guide="true" />
          </div>

          <!-- columns 模式：底部答案卡组 -->
          <AnswerCards
            v-if="gameStore.layoutType === 'columns'"
            :columns="gameStore.columnInfos"
            :column-type="gameStore.columnType"
            :placed-processes="placedProcessList"
            :hint-active-until="gameStore.hintActiveUntil"
            @place="(colId) => answerColumn(colId)"
          />

          <!-- matrix 模式：底部矩阵 -->
          <div v-else class="sort-grid-container">
            <MatrixGrid
              :columns="gameStore.columnInfos"
              :rows="gameStore.rowInfos"
              :feedback="matrixFeedback"
              :placedProcesses="placedProcessList"
              @place="(p) => answerCell(p.columnId, p.rowId)"
            />
          </div>
        </div>
      </template>

      <!-- L2 定义挑战模式：倒计时外壳 + 定义题作答器 -->
      <template v-else-if="gameMode === 'definition'">
        <div class="main-area">
          <div class="game-area definition-stage">
            <!-- 仅倒计时条外壳 -->
            <CardStage :show-guide="false" bar-only />
            <!-- 定义题作答器（随当前卡切换重出新题） -->
            <DefinitionQuiz
              v-if="gameStore.currentProcess"
              :key="gameStore.currentCardId ?? 'none'"
              :processes="allProcesses"
              @result="(isCorrect, label) => gameStore.submitQuizResult(isCorrect, label)"
            />
          </div>
        </div>
      </template>

      <!-- L3 ITTO 模式：作答器套统一引擎外壳 -->
      <template v-else>
        <div class="itto-area">
          <ITTOQuiz
            v-if="currentIttoQuestion"
            :key="gameStore.currentCardId ?? 'none'"
            :question="currentIttoQuestion"
            :global-pool="ittoGlobalPool"
            :pg-names="pgNames"
            :ka-names="kaNames"
            @hold="(h) => (ittoHold = h)"
            @result="(isCorrect, label) => gameStore.submitQuizResult(isCorrect, label)"
          />
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

/* ===== 双模式选择 ===== */
.mode-select {
  position: relative;
  display: flex;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.mode-btn {
  flex: 1;
  padding: 0.6rem 0;
  background: var(--surface-glass);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.mode-btn.active {
  background: rgba(99, 102, 241, 0.25);
  border-color: var(--color-primary);
  color: #fff;
}

.mode-hint {
  position: relative;
  font-size: 0.75rem;
  color: var(--text-faint);
  margin-bottom: 1rem;
}

/* 音效开关 */
.sound-toggle {
  position: relative;
  margin-bottom: 1.25rem;
  padding: 0.35rem 0.9rem;
  background: var(--surface-glass);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
}

.sound-toggle.off {
  opacity: 0.6;
}

.sound-toggle:hover {
  border-color: rgba(255, 255, 255, 0.3);
  color: var(--text-primary);
}

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

/* ===== sort 模式主区域：纵向三段（大卡 / 答案卡组或矩阵） ===== */
.main-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  position: relative;
}

.game-area { flex: 1; position: relative; overflow: hidden; background: var(--bg-gradient-game); min-height: 0; }

.sort-grid-container { position: absolute; bottom: 0; left: 0; right: 0; z-index: 5; }

/* ===== L2 定义挑战模式：倒计时条 + 题面作答器纵向排列 ===== */
.definition-stage {
  display: flex;
  flex-direction: column;
}

.definition-stage :deep(.card-stage) {
  height: auto;
  flex-shrink: 0;
}

.definition-stage :deep(.definition-quiz) {
  flex: 1;
  height: auto;
  min-height: 0;
}

/* ===== itto 模式 ===== */
.itto-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  padding: 1rem;
}

@media (max-width: 480px) {
  .start-card { padding: 2rem 1.25rem; }
  .start-title { font-size: 1.5rem; }
}
</style>
