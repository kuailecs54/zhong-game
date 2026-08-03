<script setup lang="ts">
import { computed } from 'vue'
import type { Process } from '@/data/types'

const props = defineProps<{
  process: Process
  isFrozen?: boolean
  feedback?: 'none' | 'correct' | 'wrong'
  compact?: boolean
  captured?: boolean
}>()

// 书本封皮颜色（按过程组区分）
const BOOK_COVER_COLORS: Record<string, string> = {
  initiating: '#c0392b',
  planning: '#2471a3',
  executing: '#1e8449',
  monitoring_controlling: '#b9770e',
  closing: '#7d3c98',
}

const coverColor = computed(() => BOOK_COVER_COLORS[props.process.processGroupId] ?? '#8b5a2b')

</script>

<template>
  <div
    class="falling-card"
    :class="[
      feedback === 'correct' ? 'feedback-correct' : '',
      feedback === 'wrong' ? 'feedback-wrong' : '',
      isFrozen ? 'is-frozen' : '',
      compact ? 'is-compact' : '',
      captured ? 'is-captured' : '',
    ]"
  >
    <!-- 冰冻霜冻覆盖层 -->
    <div v-if="isFrozen" class="ice-overlay"></div>

    <!-- 书脊（左侧窄条） -->
    <div class="book-spine-edge"></div>

    <!-- 封面主体 -->
    <div class="book-cover" :style="{ background: `linear-gradient(135deg, ${coverColor}, ${coverColor}dd)` }">
      <!-- 书口（纸张边缘，右侧） -->
      <div class="book-pages"></div>

      <!-- 封面装饰线 -->
      <div class="cover-border"></div>

      <!-- 封面内容 -->
      <div class="cover-content">
        <span class="cover-title">{{ process.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.falling-card {
  display: flex;
  align-items: stretch;
  border-radius: 4px 6px 6px 4px;
  cursor: pointer;
  user-select: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.3s ease;
  box-shadow:
    2px 4px 12px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  overflow: hidden;
  animation: cardSpawn 0.25s ease;
}

@keyframes cardSpawn {
  from {
    opacity: 0;
    transform: scale(0.7) rotate(-3deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

/* 书脊（左侧窄条，深色木质感） */
.book-spine-edge {
  width: 8px;
  flex-shrink: 0;
  background: linear-gradient(180deg,
    rgba(0, 0, 0, 0.5) 0%,
    rgba(0, 0, 0, 0.3) 30%,
    rgba(0, 0, 0, 0.5) 100%
  );
  box-shadow: inset -1px 0 2px rgba(0, 0, 0, 0.3);
}

/* 封面主体 */
.book-cover {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 76px;
  max-width: 110px;
  padding: 0.45rem 0.7rem 0.45rem 0.55rem;
}

/* 书口（右侧纸张边缘，浅色细条） */
.book-pages {
  position: absolute;
  right: 0;
  top: 2px;
  bottom: 2px;
  width: 3px;
  background: linear-gradient(180deg,
    #f5f0e8 0%,
    #e8e0d0 40%,
    #f5f0e8 60%,
    #ddd5c5 100%
  );
  border-radius: 0 2px 2px 0;
  box-shadow: 1px 0 2px rgba(0, 0, 0, 0.15);
}

/* 封面装饰边框 */
.cover-border {
  position: absolute;
  inset: 3px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  pointer-events: none;
}

/* 封面内容 */
.cover-content {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
  z-index: 1;
  max-width: 100%;
}

.cover-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.25;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.5),
    0 0 8px rgba(0, 0, 0, 0.2);
  letter-spacing: 0.02em;
  overflow-wrap: break-word;
  white-space: normal;
  text-align: center;
}

/* 悬停效果 */
.falling-card:hover {
  transform: translateY(-4px) scale(1.06);
  box-shadow:
    4px 10px 28px rgba(0, 0, 0, 0.5),
    0 0 22px rgba(99, 102, 241, 0.35),
    0 0 0 2px rgba(99, 102, 241, 0.3);
}

.falling-card:hover .book-cover {
  filter: brightness(1.12);
}

.falling-card:active {
  transform: translateY(0) scale(0.95);
  transition-duration: 0.08s;
}

/* 冰冻霜冻覆盖层 */
.ice-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  border-radius: inherit;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 40%, rgba(147, 197, 253, 0.2) 100%);
  box-shadow:
    inset 0 0 12px rgba(147, 197, 253, 0.4),
    0 0 0 2px rgba(96, 165, 250, 0.45);
}

.ice-overlay::before {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 2px;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.35) 0%, transparent 2px),
    radial-gradient(circle at 70% 20%, rgba(255, 255, 255, 0.25) 0%, transparent 1.5px),
    radial-gradient(circle at 45% 70%, rgba(255, 255, 255, 0.3) 0%, transparent 2px),
    radial-gradient(circle at 85% 65%, rgba(255, 255, 255, 0.2) 0%, transparent 1.5px);
}

/* 冻结状态 */
.is-frozen {
  opacity: 0.75;
  filter: saturate(0.55) brightness(0.92);
}

/* 捕获飞入书桌动画 */
.is-captured {
  animation: cardCaptured 0.45s var(--ease-out-expo) forwards;
  pointer-events: none;
}

@keyframes cardCaptured {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(60px) scale(0.85);
  }
}

/* 正确反馈 */
.feedback-correct {
  animation: cardCorrect 0.5s ease forwards;
}

@keyframes cardCorrect {
  0% { transform: scale(1); }
  30% {
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.7);
    transform: scale(1.1);
  }
  100% {
    transform: scale(1.1);
    opacity: 0;
  }
}

/* 错误反馈 */
.feedback-wrong {
  animation: cardWrong 0.6s ease;
}

@keyframes cardWrong {
  0% { transform: translateX(0); }
  10% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.6); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(6px); }
  100% { transform: translateX(0); }
}

/* ===== 紧凑模式（书桌） ===== */
.is-compact {
  border-radius: 3px 4px 4px 3px;
}

.is-compact .book-spine-edge {
  width: 5px;
}

.is-compact .book-cover {
  padding: 0.2rem 0.5rem 0.2rem 0.35rem;
  min-width: 56px;
  max-width: 90px;
}

.is-compact .book-pages {
  width: 2px;
}

.is-compact .cover-title {
  font-size: 0.62rem;
}

.is-compact .cover-border {
  inset: 2px;
}

/* ===== 响应式 ===== */
@media (max-width: 480px) {
  .book-cover {
    min-width: 68px;
    max-width: 100px;
    padding: 0.35rem 0.6rem 0.35rem 0.45rem;
  }

  .cover-title {
    font-size: 0.65rem;
  }

  .is-compact .book-cover {
    min-width: 50px;
    max-width: 80px;
  }

  .is-compact .cover-title {
    font-size: 0.56rem;
  }
}
</style>
