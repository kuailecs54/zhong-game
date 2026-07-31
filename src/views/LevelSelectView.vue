<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { loadLevels } from '@/data/loader'
import type { LevelConfig } from '@/data/types'
import StarRating from '@/components/ui/StarRating.vue'

const router = useRouter()
const userStore = useUserStore()

const levels = ref<LevelConfig[]>([])
const loading = ref(true)

const STAGE_NAMES: Record<number, string> = {
  1: '第一阶段 \u00B7 入门',
  2: '第二阶段 \u00B7 过程组',
  3: '第三阶段 \u00B7 知识领域',
  4: '第四阶段 \u00B7 矩阵挑战',
}

const STAGE_COLORS: Record<number, string> = {
  1: 'var(--stage-1)',
  2: 'var(--stage-2)',
  3: 'var(--stage-3)',
  4: 'var(--stage-4)',
}

const TOTAL_STARS = 12

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
    levels.value = await loadLevels()
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
</script>

<template>
  <div class="level-select">
    <header class="level-header">
      <h1 class="welcome-msg">欢迎，{{ userStore.username }}</h1>
      <div class="stars-progress">
        <div class="stars-progress__bar">
          <div
            class="stars-progress__fill"
            :style="{ width: (userStore.totalStars / TOTAL_STARS * 100) + '%' }"
          ></div>
        </div>
        <span class="stars-progress__text">总星数 {{ userStore.totalStars }} / {{ TOTAL_STARS }}</span>
      </div>
    </header>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else class="levels-container">
      <section
        v-for="[stage, stageLevels] in stages"
        :key="stage"
        class="stage-section"
        :style="{ borderLeftColor: STAGE_COLORS[stage] }"
      >
        <h2 class="stage-title">
          <span class="stage-dot" :style="{ backgroundColor: STAGE_COLORS[stage] }"></span>
          {{ STAGE_NAMES[stage] }}
        </h2>
        <div class="level-grid">
          <div
            v-for="level in stageLevels"
            :key="level.id"
            class="level-card"
            :class="{ 'level-card--locked': !userStore.isLevelUnlocked(level.id, levels) }"
            :style="{ '--stage-color': STAGE_COLORS[stage] }"
            @click="userStore.isLevelUnlocked(level.id, levels) && goToLevel(level.id)"
          >
            <template v-if="userStore.isLevelUnlocked(level.id, levels)">
              <div class="level-card__accent" :style="{ backgroundColor: STAGE_COLORS[stage] }"></div>
              <div class="level-name">{{ level.name }}</div>
              <div class="level-description">{{ level.description }}</div>
              <div class="level-meta">
                <StarRating :stars="userStore.getLevelStars(level.id)" />
                <span v-if="userStore.getLevelBestScore(level.id) > 0" class="level-score">
                  {{ userStore.getLevelBestScore(level.id) }}
                </span>
              </div>
            </template>
            <template v-else>
              <div class="lock-icon">&#x1F512;</div>
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
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
  min-height: 100vh;
  background: var(--bg-gradient);
}

.level-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-top: 1rem;
}

.welcome-msg {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.stars-progress {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  min-width: 220px;
}

.stars-progress__bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
}

.stars-progress__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-star), #f59e0b);
  border-radius: var(--radius-full);
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.35);
  transition: width 0.8s var(--ease-out-expo);
}

.stars-progress__text {
  font-size: 0.85rem;
  color: var(--color-star);
  font-weight: 600;
}

.loading {
  text-align: center;
  color: var(--text-faint);
  padding: 3rem;
}

.levels-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.stage-section {
  background: var(--surface-glass);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--border-subtle);
  border-left: 4px solid;
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stage-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.stage-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
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
  transition: transform 0.25s var(--ease-soft), border-color 0.25s var(--ease-soft), box-shadow 0.25s var(--ease-soft);
}

.level-card__accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  box-shadow: 0 0 12px var(--stage-color, var(--color-primary));
}

.level-card:hover:not(.level-card--locked) {
  transform: translateY(-6px) scale(1.01);
  border-color: var(--stage-color, var(--color-primary));
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.06),
    0 0 24px color-mix(in srgb, var(--stage-color, var(--color-primary)) 25%, transparent);
}

.level-card:active:not(.level-card--locked) {
  transform: translateY(-2px) scale(0.98);
}

.level-card--locked {
  cursor: not-allowed;
  opacity: 0.55;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.25rem;
  min-height: 120px;
}

.level-card--locked:hover {
  opacity: 0.85;
  border-color: rgba(255, 255, 255, 0.25);
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
  font-weight: 600;
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
  font-size: 0.8rem;
  color: var(--color-star);
  font-weight: 700;
}

@media (max-width: 480px) {
  .level-grid {
    grid-template-columns: 1fr;
  }

  .stars-progress {
    min-width: 180px;
  }
}
</style>
