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
      <p class="total-stars">总星数：{{ userStore.totalStars }} / 12</p>
    </header>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else class="levels-container">
      <section
        v-for="[stage, stageLevels] in stages"
        :key="stage"
        class="stage-section"
      >
        <h2 class="stage-title">{{ STAGE_NAMES[stage] }}</h2>
        <div class="level-grid">
          <div
            v-for="level in stageLevels"
            :key="level.id"
            class="level-card"
            :class="{ 'level-card--locked': !userStore.isLevelUnlocked(level.id, levels) }"
            @click="userStore.isLevelUnlocked(level.id, levels) && goToLevel(level.id)"
          >
            <template v-if="userStore.isLevelUnlocked(level.id, levels)">
              <div class="level-name">{{ level.name }}</div>
              <div class="level-description">{{ level.description }}</div>
              <StarRating :stars="userStore.getLevelStars(level.id)" />
              <div v-if="userStore.getLevelBestScore(level.id) > 0" class="level-score">
                最高分：{{ userStore.getLevelBestScore(level.id) }}
              </div>
            </template>
            <template v-else>
              <div class="lock-icon">&#x1F512;</div>
              <div class="level-name">未解锁</div>
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
  margin-bottom: 0.25rem;
}

.total-stars {
  font-size: 1rem;
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
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stage-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.level-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.level-card {
  background: var(--surface-glass-strong);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.level-card:hover:not(.level-card--locked) {
  transform: translateY(-4px);
  border-color: var(--color-primary);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.25);
}

.level-card:active:not(.level-card--locked) {
  transform: translateY(-1px) scale(0.97);
}

.level-card--locked {
  cursor: not-allowed;
  opacity: 0.45;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.25rem;
}

.level-card--locked .lock-icon {
  font-size: 1.5rem;
}

.level-card--locked .level-name {
  font-size: 0.9rem;
  color: var(--text-muted);
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
}

.level-score {
  font-size: 0.8rem;
  color: var(--text-faint);
}

@media (max-width: 480px) {
  .level-grid {
    grid-template-columns: 1fr;
  }
}
</style>