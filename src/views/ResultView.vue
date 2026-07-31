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
        v-for="i in 24"
        :key="i"
        class="particle"
        :style="{
          '--i': i,
          left: `${(i * 47) % 100}%`,
          animationDelay: `${(i * 0.1)}s`,
          animationDuration: `${2.5 + (i % 5) * 0.3}s`,
          backgroundColor: i % 4 === 0 ? '#fbbf24' : i % 4 === 1 ? '#34d399' : i % 4 === 2 ? '#60a5fa' : '#f472b6',
        }"
      ></div>
    </div>

    <div class="result-card">
      <div class="card-highlight"></div>
      <div v-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>
      <template v-else>
        <h1 class="result-title">{{ won ? '🎉 恭喜通关！' : '💔 游戏失败' }}</h1>
        <p class="result-level-name">{{ levelName }}</p>

        <!-- 星级 -->
        <div class="result-stars" v-if="won">
          <span
            v-for="i in 3"
            :key="i"
            class="result-star"
            :class="{ 'star-filled': i <= stars }"
            :style="{ animationDelay: `${0.2 + (i - 1) * 0.2}s` }"
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
                :fill="i <= stars ? 'url(#result-star-gradient)' : 'rgba(255,255,255,0.15)'"
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
            :style="{ animationDelay: `${0.4 + idx * 0.1}s` }"
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
            <span>下一关</span>
            <span class="btn-arrow">→</span>
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
  box-shadow: 0 0 10px currentColor;
}

.particle:nth-child(3n) {
  width: 4px;
  height: 4px;
}

.particle:nth-child(5n) {
  width: 8px;
  height: 8px;
}

@keyframes particleRise {
  0% {
    opacity: 0;
    transform: translateY(0) scale(0.5);
  }
  8% {
    opacity: 0.9;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 0;
    transform: translateY(-110vh) scale(1.3) rotate(180deg);
  }
}

.result-card {
  position: relative;
  z-index: 1;
  background: var(--surface-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-lg), inset 0 1px 0 rgba(255,255,255,0.1);
  animation: resultIn 0.6s var(--ease-out-expo);
  overflow: hidden;
}

/* 玻璃高光 */
.result-card .card-highlight {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  pointer-events: none;
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
  position: relative;
  color: var(--text-faint);
  padding: 2rem;
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

.result-title {
  position: relative;
  font-size: 1.7rem;
  font-weight: 900;
  margin-bottom: 0.25rem;
}

.result-win .result-title {
  color: var(--color-success);
  text-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
}

.result-lose .result-title {
  color: var(--color-error);
  text-shadow: 0 0 16px rgba(239, 68, 68, 0.3);
}

.result-level-name {
  position: relative;
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-bottom: 1.2rem;
}

.result-stars {
  position: relative;
  display: flex;
  justify-content: center;
  gap: 0.8rem;
  margin-bottom: 1.5rem;
}

.result-star {
  width: 2.8rem;
  height: 2.8rem;
  color: rgba(255, 255, 255, 0.15);
  opacity: 0;
  transform: scale(0) rotate(-30deg);
  animation: starPop 0.6s var(--ease-spring) forwards;
}

.result-star__svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.5));
}

.result-star.star-filled {
  opacity: 1;
}

@keyframes starPop {
  0% {
    opacity: 0;
    transform: scale(0) rotate(-30deg);
  }
  55% {
    opacity: 1;
    transform: scale(1.3) rotate(10deg);
  }
  75% {
    transform: scale(0.95) rotate(-3deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}

.result-stats {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-bottom: 1.5rem;
  text-align: left;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 1rem 1.25rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  opacity: 0;
  transform: translateY(10px);
  animation: statIn 0.5s var(--ease-out-expo) forwards;
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
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--text-primary);
}

.stat-correct {
  color: var(--color-success);
  text-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
}

.stat-wrong {
  color: var(--color-error);
  text-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
}

.result-actions {
  position: relative;
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
  transition: transform 0.25s var(--ease-spring), box-shadow 0.25s ease, background 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.result-btn:hover {
  transform: translateY(-2px);
}

.result-btn:active {
  transform: translateY(0) scale(0.98);
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
  box-shadow: 0 8px 30px rgba(16, 185, 129, 0.5);
}

.btn-arrow {
  font-size: 1.2rem;
  transition: transform 0.2s ease;
}

.btn-next:hover .btn-arrow {
  transform: translateX(3px);
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
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

/* 触摸设备横屏：结果卡片紧凑化 */
@media (pointer: coarse) and (orientation: landscape) {
  .result-card {
    padding: 1.25rem 1.5rem;
  }

  .result-title {
    font-size: 1.3rem;
    margin-bottom: 0.15rem;
  }

  .result-level-name {
    margin-bottom: 0.75rem;
  }

  .result-stars {
    margin-bottom: 0.5rem;
  }

  .result-star {
    width: 1.8rem;
    height: 1.8rem;
  }

  .result-stats {
    gap: 0.15rem;
    margin-bottom: 0.75rem;
    padding: 0.6rem 1rem;
  }

  .stat-row {
    padding: 0.15rem 0;
  }

  .result-actions {
    gap: 0.35rem;
  }

  .result-btn {
    padding: 0.55rem 1.2rem;
    font-size: 0.9rem;
  }

  .btn-next {
    padding: 0.65rem 1.2rem;
    font-size: 0.95rem;
  }
}
</style>
