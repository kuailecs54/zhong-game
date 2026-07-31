<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
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

const progress = computed(() => {
  if (props.targetCount <= 0) return 0
  return Math.min(100, (props.correctCount / props.targetCount) * 100)
})
</script>

<template>
  <div class="game-hud">
    <div class="hud-left">
      <div class="hud-score">
        <span class="score-label">分数</span>
        <span class="score-value" :key="score">{{ score.toLocaleString() }}</span>
      </div>
      <div class="hud-progress">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          <div class="progress-glow" :style="{ left: progress + '%' }"></div>
        </div>
        <div class="progress-info">
          <span class="progress-text">{{ correctCount }} / {{ targetCount }}</span>
          <span class="progress-pct" v-if="targetCount > 0">{{ Math.round(progress) }}%</span>
        </div>
      </div>
    </div>

    <div class="hud-right">
      <!-- 生命值 -->
      <div class="hud-item hud-lives" title="生命值">
        <svg width="0" height="0" class="heart-defs">
          <defs>
            <linearGradient id="heart-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f87171" />
              <stop offset="100%" stop-color="#ef4444" />
            </linearGradient>
          </defs>
        </svg>
        <span
          v-for="i in maxLives"
          :key="i"
          class="heart"
          :class="{ 'heart-lost': i > lives, 'heart-beat': i <= lives && lives === 1 }"
        >
          <svg viewBox="0 0 24 24" class="heart-svg">
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill="url(#heart-gradient)"
            />
          </svg>
        </span>
      </div>

      <!-- 连击 -->
      <div class="hud-item hud-combo" v-if="combo > 0">
        <span class="combo-text" :class="{ 'combo-hot': comboMultiplier >= 4, 'combo-fire': comboMultiplier >= 6 }" :key="combo">
          x{{ comboMultiplier }}
        </span>
        <span class="combo-label">连击</span>
      </div>

      <!-- 冰冻道具 -->
      <button
        class="hud-btn freeze-btn"
        :class="{ 'is-active': isFrozen, 'is-disabled': freezeCount <= 0, 'is-ready': freezeCount > 0 && !isFrozen }"
        :disabled="freezeCount <= 0"
        title="冰冻道具（3秒）"
        @click="emit('freeze')"
      >
        <span class="freeze-icon">❄️</span>
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
  padding: 0.55rem 1rem;
  background: rgba(15, 12, 41, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  color: #f1f5f9;
  border-bottom: 1px solid var(--border-subtle);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  gap: 1rem;
  flex-shrink: 0;
  z-index: var(--z-hud);
}

.hud-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;
}

.hud-score {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 80px;
}

.score-label {
  font-size: var(--font-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.score-value {
  font-size: 1.6rem;
  font-weight: 900;
  color: var(--color-star);
  line-height: 1.1;
  display: inline-block;
  text-shadow: 0 0 16px rgba(251, 191, 36, 0.4);
  animation: scorePop 0.25s var(--ease-spring);
}

@keyframes scorePop {
  0% { transform: scale(1); }
  40% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.hud-progress {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
  max-width: 240px;
  min-width: 80px;
}

.progress-track {
  position: relative;
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  overflow: visible;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-primary), #a78bfa);
  border-radius: var(--radius-full);
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.35);
  transition: width 0.4s var(--ease-out-expo);
  position: relative;
}

.progress-glow {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 14px rgba(34, 211, 238, 0.6), 0 0 0 2px rgba(34, 211, 238, 0.2);
  transition: left 0.4s var(--ease-out-expo);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-text {
  font-size: var(--font-xs);
  color: var(--text-muted);
  font-weight: 600;
}

.progress-pct {
  font-size: 0.65rem;
  color: var(--color-accent);
  font-weight: 700;
}

.hud-right {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.hud-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.heart-defs {
  position: absolute;
  width: 0;
  height: 0;
}

.heart {
  display: inline-flex;
  width: 1.4rem;
  height: 1.4rem;
  transition: opacity 0.25s ease, transform 0.25s var(--ease-spring);
  filter: drop-shadow(0 0 4px rgba(248, 113, 113, 0.35));
}

.heart-svg {
  width: 100%;
  height: 100%;
}

.heart-lost {
  opacity: 0.2;
  transform: scale(0.6) rotate(-15deg);
  filter: grayscale(0.8);
  animation: heartBreak 0.5s var(--ease-soft);
}

@keyframes heartBreak {
  0% { transform: scale(1) rotate(0); opacity: 1; }
  40% { transform: scale(0.75) rotate(-10deg); opacity: 0.5; }
  100% { transform: scale(0.6) rotate(-15deg); opacity: 0.2; }
}

.heart-beat {
  animation: heartBeat 1.1s ease-in-out infinite;
}

@keyframes heartBeat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.15); }
  30% { transform: scale(1); }
  45% { transform: scale(1.1); }
  60% { transform: scale(1); }
}

.combo-text {
  font-size: 1.3rem;
  font-weight: 900;
  color: var(--color-warning);
  display: inline-block;
  animation: comboPop 0.3s var(--ease-spring);
}

.combo-text.combo-hot {
  color: #f97316;
  text-shadow: 0 0 12px rgba(249, 115, 22, 0.6), 0 0 24px rgba(249, 115, 22, 0.3);
  animation: comboPop 0.3s var(--ease-spring), comboGlow 1.2s ease-in-out infinite;
}

.combo-text.combo-fire {
  color: #ef4444;
  text-shadow: 0 0 14px rgba(239, 68, 68, 0.7), 0 0 28px rgba(239, 68, 68, 0.4);
  animation: comboPop 0.3s var(--ease-spring), comboGlowFire 0.8s ease-in-out infinite;
}

@keyframes comboPop {
  0% { transform: scale(1); }
  40% { transform: scale(1.4); }
  100% { transform: scale(1); }
}

@keyframes comboGlow {
  0%, 100% { text-shadow: 0 0 12px rgba(249, 115, 22, 0.6), 0 0 24px rgba(249, 115, 22, 0.3); }
  50% { text-shadow: 0 0 18px rgba(249, 115, 22, 0.8), 0 0 36px rgba(249, 115, 22, 0.45); }
}

@keyframes comboGlowFire {
  0%, 100% { text-shadow: 0 0 14px rgba(239, 68, 68, 0.7), 0 0 28px rgba(239, 68, 68, 0.4); }
  50% { text-shadow: 0 0 22px rgba(239, 68, 68, 0.9), 0 0 40px rgba(239, 68, 68, 0.5); }
}

.combo-label {
  font-size: var(--font-xs);
  color: var(--text-muted);
}

.hud-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--surface-glass-strong);
  color: #e2e8f0;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  min-height: 36px;
  min-width: 44px;
  justify-content: center;
}

.hud-btn:hover:not(.is-disabled) {
  background: rgba(255, 255, 255, 0.18);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.freeze-btn.is-ready {
  border-color: var(--color-freeze);
  background: rgba(56, 189, 248, 0.12);
  animation: freezeReady 1.6s ease-in-out infinite;
}

@keyframes freezeReady {
  0%, 100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.25); }
  50% { box-shadow: 0 0 16px 4px rgba(56, 189, 248, 0.25); }
}

.freeze-btn.is-active {
  border-color: var(--color-freeze);
  background: rgba(56, 189, 248, 0.25);
  box-shadow: 0 0 18px rgba(56, 189, 248, 0.5);
}

.hud-btn.is-disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.hud-btn.is-disabled:hover {
  background: var(--surface-glass-strong);
  transform: none;
  box-shadow: none;
}

.freeze-icon {
  font-size: 1rem;
  filter: drop-shadow(0 0 3px rgba(56, 189, 248, 0.4));
}

.btn-count {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--color-freeze);
}

/* 移动端适配 */
@media (max-width: 640px) {
  .game-hud {
    padding: 0.45rem 0.6rem;
    gap: 0.6rem;
  }

  .hud-left {
    gap: 0.6rem;
  }

  .score-value {
    font-size: 1.25rem;
  }

  .hud-progress {
    max-width: 130px;
  }

  .hud-right {
    gap: 0.5rem;
  }

  .heart {
    width: 1.15rem;
    height: 1.15rem;
  }

  .combo-label {
    display: none;
  }

  .hud-btn {
    min-height: 34px;
    min-width: 38px;
    padding: 0.3rem 0.45rem;
  }
}

/* 触摸设备横屏：HUD 压扁，节省纵向空间 */
@media (pointer: coarse) and (orientation: landscape) {
  .game-hud { padding: 0.3rem 0.75rem; }
}
</style>
