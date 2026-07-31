<script setup lang="ts">
defineProps<{
  score: number
  lives: number
  maxLives: number
  combo: number
  comboMultiplier: number
  correctCount: number
  targetCount: number
  freezeCount: number
  isFrozen: boolean
  isPaused: boolean
}>()

const emit = defineEmits<{
  freeze: []
  pause: []
}>()
</script>

<template>
  <div class="game-hud">
    <div class="hud-left">
      <div class="hud-score">
        <span class="score-label">分数</span>
        <span class="score-value" :key="score">{{ score.toLocaleString() }}</span>
      </div>
    </div>

    <div class="hud-right">
      <!-- 生命值 -->
      <div class="hud-item hud-lives" title="生命值">
        <span
          v-for="i in maxLives"
          :key="i"
          class="heart"
          :class="{ 'heart-lost': i > lives }"
        >
          {{ i > lives ? '♡' : '♥' }}
        </span>
      </div>

      <!-- 连击 -->
      <div class="hud-item hud-combo" v-if="combo > 0">
        <span class="combo-text" :class="{ 'combo-hot': comboMultiplier >= 4 }" :key="combo">
          x{{ comboMultiplier }}
        </span>
        <span class="combo-label">连击</span>
      </div>

      <!-- 进度 -->
      <div class="hud-item hud-progress">
        <span class="progress-text">{{ correctCount }}/{{ targetCount }}</span>
      </div>

      <!-- 冰冻道具 -->
      <button
        class="hud-btn freeze-btn"
        :class="{ 'is-active': isFrozen, 'is-disabled': freezeCount <= 0 }"
        :disabled="freezeCount <= 0"
        title="冰冻道具（3秒）"
        @click="emit('freeze')"
      >
        ❄️
        <span class="btn-count">{{ freezeCount }}</span>
      </button>

      <!-- 暂停 -->
      <button
        class="hud-btn pause-btn"
        @click="emit('pause')"
        :title="isPaused ? '继续' : '暂停'"
      >
        {{ isPaused ? '▶' : '⏸' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.game-hud {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1rem;
  background: rgba(15, 12, 41, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #f1f5f9;
  border-bottom: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-sm);
  gap: 1rem;
  flex-shrink: 0;
  z-index: 40;
}

.hud-left {
  display: flex;
  align-items: center;
}

.hud-score {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.score-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.score-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-star);
  line-height: 1.2;
  display: inline-block;
  animation: scorePop 0.25s ease;
}

@keyframes scorePop {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
}

.hud-right {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.hud-item {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.heart {
  font-size: 1.3rem;
  color: #f87171;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.heart-lost {
  opacity: 0.25;
  transform: scale(0.7);
}

.combo-text {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--color-warning);
  display: inline-block;
  animation: comboPop 0.25s ease;
}

.combo-text.combo-hot {
  color: #f97316;
  text-shadow: 0 0 8px rgba(249, 115, 22, 0.5);
}

@keyframes comboPop {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
}

.combo-label {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.progress-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-accent);
}

.hud-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--surface-glass-strong);
  color: #e2e8f0;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.hud-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  transform: translateY(-1px);
}

.hud-btn.is-active {
  border-color: var(--color-freeze);
  background: rgba(56, 189, 248, 0.2);
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
}

.hud-btn.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.hud-btn.is-disabled:hover {
  background: var(--surface-glass-strong);
  transform: none;
}

.btn-count {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-freeze);
}

/* 移动端适配 */
@media (max-width: 480px) {
  .game-hud {
    padding: 0.5rem 0.6rem;
    gap: 0.5rem;
  }

  .score-value {
    font-size: 1.2rem;
  }

  .hud-right {
    gap: 0.5rem;
  }

  .heart {
    font-size: 1.1rem;
  }

  .combo-label {
    display: none;
  }
}
</style>
