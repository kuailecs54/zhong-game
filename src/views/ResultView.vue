<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { loadLevels } from '@/data/loader'
import type { LevelConfig } from '@/data/types'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()

const levelId = route.params.levelId as string

// 从路由 state 读取结果数据，fallback 到 store
const resultData = history.state as {
  won?: boolean
  stars?: number
  score?: number
  correctCount?: number
  wrongCount?: number
  accuracy?: number
  nextLevelId?: string
} | null

const won = ref(resultData?.won ?? false)
const stars = ref(resultData?.stars ?? 0)
const score = ref(resultData?.score ?? 0)
const correctCount = ref(resultData?.correctCount ?? 0)
const wrongCount = ref(resultData?.wrongCount ?? 0)
const accuracy = ref(resultData?.accuracy ?? 0)
const nextLevelId = ref(resultData?.nextLevelId ?? '')

const levelName = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    const levels = await loadLevels()
    const level = levels.find((l: LevelConfig) => l.id === levelId)
    if (level) {
      levelName.value = level.name
    }

    // 如果路由没有 state，尝试从 store 获取
    if (!resultData || !resultData.won) {
      // 回退到 game store 的值
      if (gameStore.level) {
        levelName.value = gameStore.level.name
      }
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }

  // 清除游戏状态
  gameStore.resetLevel()
})

function handleRetry() {
  router.push(`/game/${levelId}`)
}

function handleNextLevel() {
  if (nextLevelId.value) {
    router.push(`/game/${nextLevelId.value}`)
  }
}

function handleBackToLevels() {
  router.push('/levels')
}
</script>

<template>
  <div class="result-view" :class="won ? 'result-win' : 'result-lose'">
    <div class="result-card">
      <div v-if="loading" class="loading">加载中...</div>
      <template v-else>
        <h1 class="result-title">{{ won ? '恭喜通关！' : '游戏失败' }}</h1>
        <p class="result-level-name">{{ levelName }}</p>

        <!-- 星级 -->
        <div class="result-stars" v-if="won">
          <span
            v-for="i in 3"
            :key="i"
            class="result-star"
            :class="{ 'star-filled': i <= stars }"
          >
            {{ i <= stars ? '★' : '☆' }}
          </span>
        </div>

        <!-- 统计数据 -->
        <div class="result-stats">
          <div class="stat-row">
            <span class="stat-label">得分</span>
            <span class="stat-value">{{ score.toLocaleString() }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">正确</span>
            <span class="stat-value stat-correct">{{ correctCount }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">错误</span>
            <span class="stat-value stat-wrong">{{ wrongCount }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">准确率</span>
            <span class="stat-value">{{ (accuracy * 100).toFixed(0) }}%</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="result-actions">
          <button class="result-btn btn-retry" @click="handleRetry">
            重新挑战
          </button>
          <button
            v-if="won && nextLevelId"
            class="result-btn btn-next"
            @click="handleNextLevel"
          >
            下一关
          </button>
          <button class="result-btn btn-back" @click="handleBackToLevels">
            返回选关
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.result-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
  background: var(--bg-gradient);
}

.result-view.result-win {
  background: linear-gradient(160deg, #052e16 0%, #0f0c29 45%, #24243e 100%);
}

.result-view.result-lose {
  background: linear-gradient(160deg, #450a0a 0%, #0f0c29 45%, #24243e 100%);
}

.result-card {
  background: var(--surface-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-lg);
  animation: resultIn 0.5s ease;
}

@keyframes resultIn {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.loading {
  color: var(--text-faint);
  padding: 2rem;
}

.result-title {
  font-size: 1.6rem;
  font-weight: 800;
  margin-bottom: 0.25rem;
}

.result-win .result-title {
  color: var(--color-success);
}

.result-lose .result-title {
  color: var(--color-error);
}

.result-level-name {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-bottom: 1.2rem;
}

.result-stars {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.2rem;
}

.result-star {
  font-size: 2.2rem;
  color: rgba(255, 255, 255, 0.25);
  transition: color 0.3s ease, transform 0.3s ease;
}

.result-star.star-filled {
  color: var(--color-star);
  text-shadow: 0 0 12px rgba(251, 191, 36, 0.6);
  animation: starPop 0.5s ease;
}

@keyframes starPop {
  0% {
    transform: scale(0) rotate(-30deg);
  }
  50% {
    transform: scale(1.3) rotate(10deg);
  }
  100% {
    transform: scale(1) rotate(0);
  }
}

.result-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  text-align: left;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 1rem 1.25rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 0.3rem 0;
  border-bottom: 1px solid var(--border-subtle);
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-label {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.stat-value {
  font-weight: 700;
  color: var(--text-primary);
}

.stat-correct {
  color: var(--color-success);
}

.stat-wrong {
  color: var(--color-error);
}

.result-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.result-btn {
  width: 100%;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.result-btn:hover {
  transform: translateY(-2px);
}

.result-btn:active {
  transform: translateY(0);
}

.btn-retry {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-strong));
  color: #fff;
  box-shadow: var(--glow-primary);
}

.btn-next {
  background: linear-gradient(135deg, var(--color-success), #059669);
  color: #fff;
  box-shadow: var(--glow-success);
}

.btn-back {
  background: var(--surface-glass-strong);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.18);
}
</style>