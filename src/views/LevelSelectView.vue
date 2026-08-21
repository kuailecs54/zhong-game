<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { loadLevels, loadProcesses, loadProcessGroups, loadKnowledgeAreas } from '@/data/loader'
import type { LevelConfig, Process, ProcessGroup, KnowledgeArea } from '@/data/types'
import { Star, Trophy, LockOne, Rocket } from '@icon-park/vue-next'
import StarRating from '@/components/ui/StarRating.vue'
import MasteryHeatmap from '@/components/game/MasteryHeatmap.vue'

const router = useRouter()
const userStore = useUserStore()

const levels = ref<LevelConfig[]>([])
const loading = ref(true)

// ===== 掌握度仪表盘数据 =====
const showDashboard = ref(false)
const processesData = ref<Process[]>([])
const processGroupsData = ref<ProcessGroup[]>([])
const knowledgeAreasData = ref<KnowledgeArea[]>([])

/** 薄弱项：position 维度 box<2 或无记录的过程 */
const weakProcesses = computed(() =>
  processesData.value.filter(p => {
    if (!userStore.hasMasteryRecord(p.id, 'position')) return true
    return userStore.getMasteryBox(p.id, 'position') < 2
  }),
)

/**
 * 薄弱特训：以非掌握项为卡池构造合成 L1 关卡（绕过解锁链），
 * 存 sessionStorage 后跳转，GameView 读取并走正常 startLevel。
 */
function startWeakTraining() {
  if (weakProcesses.value.length === 0) return
  const level: LevelConfig = {
    id: 'weak-training',
    name: '薄弱特训',
    stage: 99,
    number: 1,
    description: `针对 ${weakProcesses.value.length} 个未掌握过程的定位特训`,
    layoutType: 'columns',
    columns: ['initiating', 'planning', 'executing', 'monitoring_controlling', 'closing'],
    cardPool: { source: 'specific', processIds: weakProcesses.value.map(p => p.id) },
    timePerCard: 12,
    lives: 3,
    hintCount: 1,
    freezeCount: 1,
    shieldCount: 1,
    starThresholds: { oneStar: 1, twoStarAccuracy: 0.8, threeStarAccuracy: 0.9 },
  }
  sessionStorage.setItem('custom-level', JSON.stringify(level))
  router.push('/game/weak-training')
}

const STAGE_NAMES: Record<number, string> = {
  1: '第一阶段 \u00B7 定位入门',
  2: '第二阶段 \u00B7 定位进阶',
  3: '第三阶段 \u00B7 定位挑战',
  4: '第四阶段 \u00B7 矩阵定位',
  5: '第五阶段 \u00B7 定义挑战',
  6: '第六阶段 \u00B7 ITTO 补全',
}

const STAGE_COLORS: Record<number, string> = {
  1: 'var(--stage-1)',
  2: 'var(--stage-2)',
  3: 'var(--stage-3)',
  4: 'var(--stage-4)',
  5: '#34d399',
  6: '#fb923c',
}

/** 模式标签文案 */
function modeLabel(mode?: string): string {
  if (mode === 'itto') return 'ITTO'
  if (mode === 'definition') return '定义'
  return '归类'
}

function getUnlockHint(levelId: string): string {
  const sorted = [...levels.value].sort((a, b) => {
    if (a.stage !== b.stage) return a.stage - b.stage
    return a.number - b.number
  })
  const idx = sorted.findIndex(l => l.id === levelId)
  if (idx <= 0) return '默认解锁'
  const prev = sorted[idx - 1]
  return `通关「${prev.name}」获得 1 星后解锁`
}

onMounted(async () => {
  try {
    const [levelList, processList, processGroupList, knowledgeAreaList] = await Promise.all([
      loadLevels(),
      loadProcesses(),
      loadProcessGroups(),
      loadKnowledgeAreas(),
    ])
    levels.value = levelList
    processesData.value = processList
    processGroupsData.value = processGroupList
    knowledgeAreasData.value = knowledgeAreaList
  } catch {
    // Handle error silently
  } finally {
    loading.value = false
  }
})

const sortedLevels = computed(() => {
  return [...levels.value].sort((a, b) => {
    if (a.stage !== b.stage) return a.stage - b.stage
    return a.number - b.number
  })
})

/** 总星数上限 = 全部关卡 ×3（关卡增减自适应，不硬编码） */
const TOTAL_STARS = computed(() => levels.value.length * 3)

const stages = computed(() => {
  const map = new Map<number, LevelConfig[]>()
  for (const level of sortedLevels.value) {
    const list = map.get(level.stage)
    if (list) {
      list.push(level)
    } else {
      map.set(level.stage, [level])
    }
  }
  return Array.from(map.entries()).sort(([a], [b]) => a - b)
})

function goToLevel(levelId: string) {
  router.push(`/game/${levelId}`)
}

function onLevelKeydown(e: KeyboardEvent, levelId: string) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    if (userStore.isLevelUnlocked(levelId, levels.value)) goToLevel(levelId)
  }
}
</script>

<template>
  <div class="level-select">
    <!-- 背景装饰 -->
    <div class="level-bg-decor">
      <div class="bg-orb bg-orb--1"></div>
      <div class="bg-orb bg-orb--2"></div>
    </div>

    <header class="level-header">
      <h1 class="welcome-msg">欢迎，{{ userStore.username }}</h1>
      <div class="stars-progress">
        <div class="stars-progress__bar">
          <div
            class="stars-progress__fill"
            :style="{ width: (userStore.totalStars / TOTAL_STARS * 100) + '%' }"
          ></div>
          <div class="stars-progress__glow" :style="{ left: (userStore.totalStars / TOTAL_STARS * 100) + '%' }"></div>
        </div>
        <span class="stars-progress__text">
          <Star :size="16" fill="currentColor" class="star-icon" />
          总星数 {{ userStore.totalStars }} / {{ TOTAL_STARS }}
        </span>
      </div>

      <!-- 薄弱特训入口：以非掌握项为卡池，绕过解锁链 -->
      <button
        class="weak-training-btn"
        :class="{ 'is-empty': weakProcesses.length === 0 }"
        :disabled="weakProcesses.length === 0 || loading"
        :title="weakProcesses.length === 0 ? '全部过程已掌握，暂无需特训' : `针对 ${weakProcesses.length} 个未掌握过程开一局定位特训`"
        @click="startWeakTraining"
      >
        <Rocket :size="16" fill="currentColor" class="wt-icon" />
        薄弱特训（{{ weakProcesses.length }}）
      </button>

      <!-- 掌握度仪表盘开关 -->
      <button class="dashboard-toggle" @click="showDashboard = !showDashboard">
        {{ showDashboard ? '收起掌握度仪表盘 ▲' : '展开掌握度仪表盘 ▼' }}
      </button>
    </header>

    <!-- 掌握度热力图（选关页展示档位不违反无剧透：非作答界面） -->
    <section v-if="showDashboard" class="dashboard-section">
      <MasteryHeatmap
        :processes="processesData"
        :process-groups="processGroupsData"
        :knowledge-areas="knowledgeAreasData"
      />
    </section>

    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <span>加载中...</span>
    </div>

    <div v-else class="levels-container">
      <section
        v-for="[stage, stageLevels] in stages"
        :key="stage"
        class="stage-section"
        :style="{ '--stage-color': STAGE_COLORS[stage] }"
      >
        <h2 class="stage-title">
          <span class="stage-dot" :style="{ backgroundColor: STAGE_COLORS[stage] }"></span>
          <span class="stage-name-text">{{ STAGE_NAMES[stage] }}</span>
          <span class="stage-count">{{ stageLevels.length }} 关</span>
        </h2>
        <div class="level-grid">
          <div
            v-for="(level, idx) in stageLevels"
            :key="level.id"
            class="level-card"
            :class="{ 'level-card--locked': !userStore.isLevelUnlocked(level.id, levels) }"
            :style="{ '--stage-color': STAGE_COLORS[stage], animationDelay: `${idx * 0.06}s` }"
            role="button"
            :tabindex="userStore.isLevelUnlocked(level.id, levels) ? 0 : -1"
            :aria-label="userStore.isLevelUnlocked(level.id, levels) ? `关卡：${level.name}，${level.description}` : `未解锁：${getUnlockHint(level.id)}`"
            :aria-disabled="!userStore.isLevelUnlocked(level.id, levels) ? 'true' : 'false'"
            @click="userStore.isLevelUnlocked(level.id, levels) && goToLevel(level.id)"
            @keydown="onLevelKeydown($event, level.id)"
          >
            <template v-if="userStore.isLevelUnlocked(level.id, levels)">
              <div class="level-card__accent" :style="{ backgroundColor: STAGE_COLORS[stage] }"></div>
              <div class="level-card__top">
                <span class="level-number">{{ level.number }}</span>
                <StarRating :stars="userStore.getLevelStars(level.id)" />
              </div>
              <div class="level-name">{{ level.name }}</div>
              <span v-if="level.mode === 'itto'" class="level-mode-tag itto-tag">ITTO</span>
              <span v-else-if="level.mode === 'definition'" class="level-mode-tag def-tag">定义</span>
              <span v-else class="level-mode-tag sort-tag">{{ modeLabel(level.mode) }}</span>
              <div class="level-description">{{ level.description }}</div>
              <div class="level-meta">
                <span v-if="userStore.getLevelBestScore(level.id) > 0" class="level-score">
                  <Trophy :size="14" fill="currentColor" class="score-icon" />
                  {{ userStore.getLevelBestScore(level.id) }}
                </span>
                <span class="play-hint">点击开始</span>
              </div>
            </template>
            <template v-else>
              <div class="lock-icon"><LockOne :size="28" fill="currentColor" /></div>
              <div class="level-name">未解锁</div>
              <div class="lock-tooltip">{{ getUnlockHint(level.id) }}</div>
            </template>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.level-select {
  position: relative;
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
  min-height: 100vh;
  background: var(--bg-gradient);
  overflow: hidden;
}

/* 背景装饰 */
.level-bg-decor {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.3;
}

.bg-orb--1 {
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, rgba(34, 211, 238, 0.25), transparent 70%);
  top: -100px;
  right: -80px;
}

.bg-orb--2 {
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, rgba(244, 114, 182, 0.2), transparent 70%);
  bottom: -60px;
  left: -50px;
}

.level-header {
  position: relative;
  z-index: 1;
  text-align: center;
  margin-bottom: 2rem;
  padding-top: 1rem;
  animation: headerIn 0.5s var(--ease-out-expo);
}

@keyframes headerIn {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}

.welcome-msg {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
  background: linear-gradient(135deg, #f1f5f9, #a5b4fc);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.stars-progress {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-width: 240px;
}

.stars-progress__bar {
  position: relative;
  width: 100%;
  height: 10px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  overflow: visible;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.stars-progress__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-star), #f59e0b, #fbbf24);
  border-radius: var(--radius-full);
  box-shadow: 0 0 14px rgba(251, 191, 36, 0.4);
  transition: width 0.8s var(--ease-out-expo);
  position: relative;
}

.stars-progress__glow {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-star);
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.6), 0 0 0 3px rgba(251, 191, 36, 0.2);
  transition: left 0.8s var(--ease-out-expo);
}

.stars-progress__text {
  font-size: 0.85rem;
  color: var(--color-star);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.star-icon {
  font-size: 1rem;
}

/* ===== 薄弱特训入口 ===== */
.weak-training-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.9rem;
  padding: 0.55rem 1.2rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-strong));
  color: #fff;
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--glow-primary);
  transition: transform 0.2s var(--ease-spring), box-shadow 0.2s ease, opacity 0.2s ease;
}

.weak-training-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(99, 102, 241, 0.5);
}

.weak-training-btn.is-empty {
  opacity: 0.45;
  cursor: not-allowed;
}

.wt-icon {
  flex-shrink: 0;
}

/* ===== 掌握度仪表盘 ===== */
.dashboard-toggle {
  display: block;
  margin: 0.75rem auto 0;
  padding: 0.35rem 0.9rem;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.dashboard-toggle:hover {
  color: var(--text-primary);
  border-color: rgba(255, 255, 255, 0.3);
}

.dashboard-section {
  position: relative;
  z-index: 1;
  margin-bottom: 2rem;
  padding: 1.25rem;
  background: var(--surface-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.loading {
  position: relative;
  z-index: 1;
  text-align: center;
  color: var(--text-faint);
  padding: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.levels-container {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.stage-section {
  background: var(--surface-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-subtle);
  border-left: 4px solid var(--stage-color, var(--color-primary));
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  animation: sectionIn 0.5s var(--ease-out-expo) both;
}

@keyframes sectionIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.stage-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--border-subtle);
}

.stage-name-text {
  flex: 1;
}

.stage-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-faint);
  background: rgba(255, 255, 255, 0.06);
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
}

.stage-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 10px currentColor;
  flex-shrink: 0;
}

.level-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.level-card {
  position: relative;
  background: var(--surface-glass-strong);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 1rem;
  padding-left: calc(1rem + 5px);
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.3s var(--ease-spring), border-color 0.25s var(--ease-soft), box-shadow 0.3s var(--ease-soft);
  animation: cardIn 0.4s var(--ease-out-expo) both;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(10px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.level-card__accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  box-shadow: 0 0 14px var(--stage-color, var(--color-primary));
}

.level-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.level-number {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text-faint);
  background: rgba(255, 255, 255, 0.06);
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-full);
}

.level-card:hover:not(.level-card--locked) {
  transform: translateY(-6px) scale(1.02);
  border-color: var(--stage-color, var(--color-primary));
  box-shadow:
    0 14px 36px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.06),
    0 0 28px color-mix(in srgb, var(--stage-color, var(--color-primary)) 25%, transparent);
}

.level-card:active:not(.level-card--locked) {
  transform: translateY(-2px) scale(0.98);
  transition-duration: 0.1s;
}

.level-card--locked {
  cursor: not-allowed;
  opacity: 0.5;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.25rem;
  min-height: 120px;
}

.level-card:focus-visible:not(.level-card--locked) {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.level-card--locked:hover {
  opacity: 0.75;
  border-color: rgba(255, 255, 255, 0.2);
}

.level-card--locked .lock-icon {
  font-size: 1.5rem;
  filter: grayscale(0.3);
}

.level-card--locked .level-name {
  font-size: 0.95rem;
  color: var(--text-muted);
}

.lock-tooltip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translateX(-50%) translateY(6px);
  padding: 0.45rem 0.7rem;
  background: rgba(15, 12, 41, 0.95);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s var(--ease-out-expo);
  box-shadow: var(--shadow-md);
  z-index: 10;
}

.lock-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: var(--border-subtle);
}

.level-card--locked:hover .lock-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.level-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.level-description {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.level-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 0.3rem;
}

.level-score {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.8rem;
  color: var(--color-star);
  font-weight: 700;
}

.score-icon {
  font-size: 0.75rem;
}

.play-hint {
  font-size: 0.7rem;
  color: var(--text-faint);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.level-mode-tag {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.itto-tag {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
}
.sort-tag {
  background: rgba(99, 102, 241, 0.12);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.25);
}
.def-tag {
  background: rgba(52, 211, 153, 0.12);
  color: #6ee7b7;
  border: 1px solid rgba(52, 211, 153, 0.25);
}

.level-card:hover .play-hint {
  opacity: 1;
}

@media (max-width: 480px) {
  .level-grid {
    grid-template-columns: 1fr;
  }

  .stars-progress {
    min-width: 200px;
  }

  .welcome-msg {
    font-size: 1.3rem;
  }
}
</style>
