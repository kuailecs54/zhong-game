<script setup lang="ts">
import { computed } from 'vue'
import type { Process } from '@/data/types'

const props = defineProps<{
  process: Process
  isFrozen?: boolean
  feedback?: 'none' | 'correct' | 'wrong'
  compact?: boolean
}>()

const emit = defineEmits<{
  capture: []
}>()

function handleClick(e: MouseEvent) {
  // 书桌模式：不拦截点击，让事件冒泡到书桌卡片的 select 处理
  if (props.compact) return
  e.stopPropagation()
  emit('capture')
}

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
    ]"
    :style="{ backgroundColor: coverColor }"
    @click="handleClick"
  >
    <span class="book-spine"></span>
    <span class="book-cover">
      <span class="card-name">{{ process.shortName }}</span>
    </span>
  </div>
</template>

<style scoped>
.falling-card {
  display: flex;
  align-items: stretch;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.3s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  animation: cardSpawn 0.25s ease;
}

@keyframes cardSpawn {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.book-spine {
  width: 7px;
  background: rgba(0, 0, 0, 0.35);
  flex-shrink: 0;
}

.book-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.8rem;
  min-width: 74px;
}

.falling-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
}

.falling-card:active {
  transform: translateY(0);
}

.card-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.3;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* 冻结状态 */
.is-frozen {
  opacity: 0.6;
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.4);
}

/* 正确反馈 */
.feedback-correct {
  animation: cardCorrect 0.5s ease forwards;
}

@keyframes cardCorrect {
  0% {
    transform: scale(1);
  }
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
  0% {
    transform: translateX(0);
  }
  10% {
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.6);
  }
  20% {
    transform: translateX(-8px);
  }
  40% {
    transform: translateX(8px);
  }
  60% {
    transform: translateX(-6px);
  }
  80% {
    transform: translateX(6px);
  }
  100% {
    transform: translateX(0);
  }
}

/* 紧凑模式（书桌） */
.is-compact {
  border-radius: 3px;
}

.is-compact .book-cover {
  padding: 0.3rem 0.5rem;
  min-width: 54px;
}

.is-compact .book-spine {
  width: 5px;
}

.is-compact .card-name {
  font-size: 0.75rem;
}
</style>