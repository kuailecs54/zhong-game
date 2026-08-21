<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'
import type { FeedbackState } from '@/data/types'

defineProps<{
  /** 是否显示「点击下方列/格放置」引导文案（sort 模式显示，definition 模式隐藏） */
  showGuide?: boolean
  /** 仅渲染倒计时条外壳（definition 模式题面由 DefinitionQuiz 呈现） */
  barOnly?: boolean
}>()

const gameStore = useGameStore()

/** 根节点（飞卡起点取当前卡 rect 用） */
const stageRef = ref<HTMLElement | null>(null)

/** 倒计时进度百分比（relaxed 模式整条不渲染） */
const timePercent = computed(() => {
  const total = gameStore.level?.timePerCard ?? 0
  if (total <= 0) return 100
  return Math.max(0, Math.min(100, (gameStore.timeLeft / total) * 100))
})

/** 剩余时间 ≤30% 进入告警态（变红 + pulse） */
const timeCritical = computed(() => {
  const total = gameStore.level?.timePerCard ?? 0
  return total > 0 && gameStore.timeLeft / total <= 0.3
})

/**
 * 答对飞卡动画（FLIP 式）：从当前卡 rect 中心克隆迷你卡，
 * 飞向目标位置——列布局=对应答案卡中心（.answer-card[data-column-id]），
 * 矩阵布局=对应格子中心；0.45s ease-in transform 过渡，
 * 落点元素加 land-pulse 短促脉冲表示落位。
 * prefers-reduced-motion 时跳过飞行（卡片入场已降级为淡入）。
 */
let lastClone: HTMLElement | null = null

function flyToTarget(fs: FeedbackState) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const proc = gameStore.processPool.find(p => p.id === fs.processId)
  const originEl = stageRef.value?.querySelector('.book-card')
  const targetSel = gameStore.layoutType === 'matrix'
    ? `[data-column-id="${fs.columnId}"][data-row-id="${fs.rowId}"]`
    : `.answer-card[data-column-id="${fs.columnId}"]`
  const targetEl = document.querySelector(targetSel)
  if (!proc || !originEl || !targetEl) return

  const from = originEl.getBoundingClientRect()
  const to = targetEl.getBoundingClientRect()
  const clone = document.createElement('div')
  clone.className = 'fly-book-clone'
  clone.textContent = proc.name
  clone.style.left = `${from.left + from.width / 2}px`
  clone.style.top = `${from.top + from.height / 2}px`
  document.body.appendChild(clone)
  lastClone = clone

  requestAnimationFrame(() => {
    const dx = to.left + to.width / 2 - (from.left + from.width / 2)
    const dy = to.top + to.height / 2 - (from.top + from.height / 2)
    clone.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.25)`
    clone.style.opacity = '0.2'
  })

  window.setTimeout(() => {
    clone.remove()
    if (lastClone === clone) lastClone = null
    // 落点短促脉冲（AnswerCards / MatrixGrid 各自定义 .land-pulse 动画）
    targetEl.classList.add('land-pulse')
    window.setTimeout(() => targetEl.classList.remove('land-pulse'), 650)
  }, 470)
}

watch(
  () => gameStore.feedbackState,
  (fs) => {
    if (!fs || fs.type !== 'correct') return
    flyToTarget(fs)
  },
)

onUnmounted(() => {
  lastClone?.remove()
  lastClone = null
})
</script>

<template>
  <div ref="stageRef" class="card-stage">
    <!-- 倒计时细进度条（挑战模式；barOnly 时静态排列作外壳） -->
    <div
      v-if="gameStore.difficultyMode === 'challenge'"
      class="timebar"
      :class="{ critical: timeCritical, static: barOnly }"
    >
      <div class="timebar-fill" :style="{ width: timePercent + '%' }"></div>
    </div>

    <div v-if="!barOnly" class="stage-inner">
      <!-- 当前卡：key 绑定触发入场动画 -->
      <div
        v-if="gameStore.currentProcess"
        :key="gameStore.currentCardId ?? ''"
        class="book-card"
      >
        <span class="spine-bar"></span>
        <div class="card-body">
          <span class="card-name">{{ gameStore.currentProcess.name }}</span>
          <span v-if="showGuide" class="card-guide">点击下方答案卡放置</span>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- 飞卡克隆挂载于 body，需非 scoped 样式 -->
<style>
.fly-book-clone {
  position: fixed;
  z-index: 9999;
  transform: translate(-50%, -50%);
  padding: 6px 14px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-strong));
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  border-radius: 10px;
  box-shadow: var(--shadow-lg);
  white-space: nowrap;
  pointer-events: none;
  transition: transform 0.45s ease-in, opacity 0.45s ease-in;
}
</style>

<style scoped>
.card-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 16px;
  position: relative;
}

.stage-inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== 书本外观大卡 ===== */
.book-card {
  position: relative;
  display: flex;
  align-items: stretch;
  background: var(--surface-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: cardEnter 0.25s ease-out;
}

/* 左侧竖向书脊条 */
.spine-bar {
  width: 10px;
  flex-shrink: 0;
  background: linear-gradient(180deg, var(--color-primary), var(--color-primary-strong));
  border-radius: 3px 0 0 3px;
}

.card-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.75rem 2.25rem;
}

.card-name {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  text-align: center;
  line-height: 1.35;
}

.card-guide {
  font-size: 0.75rem;
  color: var(--text-faint);
}

/* 新卡入场动画 */
@keyframes cardEnter {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== 倒计时细进度条 ===== */
.timebar {
  position: absolute;
  top: 0;
  left: 16px;
  right: 16px;
  height: 3px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.timebar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-primary));
  border-radius: var(--radius-full);
  /* linear 0.1s 对齐 tick 粒度 */
  transition: width 0.1s linear;
}

.timebar.critical .timebar-fill {
  background: #ef4444;
  animation: criticalPulse 0.8s ease-in-out infinite;
}

/* barOnly 外壳模式：进度条静态排列（definition 模式顶部） */
.timebar.static {
  position: static;
  margin: 12px 16px 0;
}

@keyframes criticalPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

/* ===== 减少动态偏好：全部动画降级为淡入（飞卡动画在 JS 侧直接跳过） ===== */
@media (prefers-reduced-motion: reduce) {
  .book-card {
    animation: cardFadeIn 0.25s ease-out;
  }

  .timebar.critical .timebar-fill {
    animation: none;
  }
}

@keyframes cardFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ===== 触摸横屏紧凑化：HUD+大卡合计占高约 ≤100px ===== */
@media (pointer: coarse) and (orientation: landscape) {
  .card-stage {
    padding: 8px;
  }

  .card-body {
    padding: 0.6rem 1.25rem;
    gap: 0.15rem;
  }

  .card-name {
    font-size: 1.05rem;
  }

  .card-guide {
    display: none;
  }
}

/* 竖屏 coarse：卡体适度收紧 */
@media (max-width: 768px) and (pointer: coarse) and (orientation: portrait) {
  .card-body {
    padding: 1.1rem 1.5rem;
  }

  .card-name {
    font-size: 1.2rem;
  }
}
</style>
