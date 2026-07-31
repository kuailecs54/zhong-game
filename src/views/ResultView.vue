<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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

const statItems = computed(() => [
  { label: '得分', value: score.value.toLocaleString(), type: 'neutral' as const },
  { label: '正确', value: String(correctCount.value), type: 'correct' as const },
  { label: '错误', value: String(wrongCount.value), type: 'wrong' as const },
  { label: '准确率', value: `${(accuracy.value * 100).toFixed(0)}%`, type: 'neutral' as const },
])

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
    <!-- 庆祝光斑粒子（仅胜利） -->
    <div v-if="won" class="celebration">
      <div
        v-for="i in 18"
        :key="i"
        class="particle"
        :style="{
          '--i': i,
          left: `${(i * 47) % 100}%`,
          animationDelay: `${(i * 0.12)}s`,
          backgroundColor: i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#34d399' : '#60a5fa',
        }"
      ></div>
    </div>

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
            :style="{ animationDelay: `${(i - 1) * 0.15}s` }"
          >
            <svg viewBox="0 0 24 24" class="result-star__svg">
              <defs>
                <linearGradient id="result-star-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#fbbf24" />
                  <stop offset="100%" stop-color="#f59e0b" />
                </linearGradient>
              </defs>
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                :fill="i <= stars ? 'url(#result-star-gradient)' : 'rgba(255,255,255,0.18)'"
              />
            </svg>
          </span>
        </div>

        <!-- 统计数据 -->
        <div class="result-stats">
          <div
            v-for="(item, idx) in statItems"
            :key="item.label"
            class="stat-row"
            :style="{ animationDelay: `${0.35 + idx * 0.08}s` }"
          >
            <span class="stat-label">{{ item.label }}</span>
            <span class="stat-value" :class="{
              'stat-correct': item.type === 'correct',
              'stat-wrong': item.type === 'wrong',
            }">{{ item.value }}</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="result-actions">
          <button
            v-if="won && nextLevelId"
            class="result-btn btn-next"
            @click="handleNextLevel"
          >
            下一关
          </button>
          <button class="result-btn btn-retry" @click="handleRetry">
            重新挑战
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
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
  background: var(--bg-gradient);
  overflow: hidden;
}

.result-view.result-win {
  background: linear-gradient(160deg, #052e16 0%, #0f0c29 45%, #24243e 100%);
}

.result-view.result-lose {
  background: linear-gradient(160deg, #450a0a 0%, #0f0c29 45%, #24243e 100%);
}

/* 庆祝光斑粒子 */
.celebration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.particle {
  position: absolute;
  bottom: -10px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  opacity: 0;
  animation: particleRise 3s var(--ease-soft) infinite;
  box-shadow: 0 0 8px currentColor;
}

@keyframes particleRise {
  0% {
    opacity: 0;
    transform: translateY(0) scale(0.5);
  }
  10% {
    opacity: 0.8;
  }
  60% {
    opacity: 0.6;
  }
  100% {
    opacity: 0;
    transform: translateY(-110vh) scale(1.2);
  }
}

.result-card {
  position: relative;
  z-index: 1;
  background: var(--surface-glass);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-lg);
  animation: resultIn 0.55s var(--ease-out-expo);
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
  font-size: 1.7rem;
  font-weight: 800;
  margin-bottom: 0.25rem;
}

.result-win .result-title {
  color: var(--color-success);
  text-shadow: 0 0 18px rgba(16, 185, 129, 0.35);
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
  gap: 0.6rem;
  margin-bottom: 1.2rem;
}

.result-star {
  width: 2.6rem;
  height: 2.6rem;
  color: rgba(255, 255, 255, 0.2);
  opacity: 0;
  transform: scale(0) rotate(-30deg);
  animation: starPop 0.55s var(--ease-spring) forwards;
}

.result-star__svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.45));
}

.result-star.star-filled {
  opacity: 1;
}

@keyframes starPop {
  0% {
    opacity: 0;
    transform: scale(0) rotate(-30deg);
  }
  60% {
    opacity: 1;
    transform: scale(1.25) rotate(8deg);
  }
  100% {
    opacity: 1;
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
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--border-subtle);
  opacity: 0;
  transform: translateY(10px);
  animation: statIn 0.45s var(--ease-out-expo) forwards;
}

.stat-row:last-child {
  border-bottom: none;
}

@keyframes statIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s var(--ease-soft), box-shadow 0.2s var(--ease-soft), background 0.2s var(--ease-soft);
}

.result-btn:hover {
  transform: translateY(-2px);
}

.result-btn:active {
  transform: translateY(0);
}

/* 主按钮：下一关 */
.btn-next {
  background: linear-gradient(135deg, #34d399, #059669);
  color: #fff;
  font-size: 1.05rem;
  padding: 0.95rem 1.5rem;
  box-shadow: var(--glow-success);
}

.btn-next:hover {
  box-shadow: 0 6px 28px rgba(16, 185, 129, 0.5);
}

/* 次按钮：重新挑战 */
.btn-retry {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-strong));
  color: #fff;
  box-shadow: var(--glow-primary);
}

.btn-retry:hover {
  box-shadow: 0 6px 26px rgba(99, 102, 241, 0.5);
}

/* 弱按钮：返回选关 */
.btn-back {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
  font-weight: 600;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}
</style>
