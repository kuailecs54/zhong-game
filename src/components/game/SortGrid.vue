<script setup lang="ts">
import type { Process, ColumnInfo } from '@/data/types'

defineProps<{
  columns: ColumnInfo[]
  selectedCard: Process | null
  feedback: { columnId: string; type: 'correct' | 'wrong' } | null
}>()

const emit = defineEmits<{
  place: [columnId: string]
}>()
</script>

<template>
  <div class="book-shelf">
    <div
      v-for="col in columns"
      :key="col.id"
      class="shelf-cell"
      :class="[
        selectedCard ? 'has-selected' : '',
        feedback?.columnId === col.id && feedback.type === 'correct' ? 'feedback-correct' : '',
        feedback?.columnId === col.id && feedback.type === 'wrong' ? 'feedback-wrong' : '',
      ]"
      @click="emit('place', col.id)"
    >
      <div class="shelf-label">
        <span class="shelf-dot" :style="{ backgroundColor: col.color }"></span>
        <span class="shelf-name">{{ col.name }}</span>
      </div>
      <div class="shelf-slot">
        <div v-if="selectedCard" class="book-spine">
          <span class="spine-text">{{ selectedCard.shortName }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.book-shelf {
  display: flex;
  gap: 0.5rem;
  padding: 0.6rem 0.5rem;
  background: linear-gradient(180deg, #6b4423, #4a2d15);
  border-top: 4px solid #8b5a2b;
  border-radius: 10px 10px 0 0;
  box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.45);
}

.shelf-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.4rem;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(0, 0, 0, 0.35);
  border-radius: 8px;
  cursor: default;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.shelf-cell.has-selected {
  cursor: pointer;
  border-color: rgba(99, 102, 241, 0.7);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
}

.shelf-cell.has-selected:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
}

.shelf-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: #f5e6c8;
  white-space: nowrap;
}

.shelf-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.shelf-name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.shelf-slot {
  flex: 1;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.38);
  border: 1px dashed rgba(245, 230, 200, 0.25);
  border-radius: 6px;
}

.book-spine {
  display: flex;
  align-items: center;
  padding: 0.35rem 0.6rem;
  background: linear-gradient(90deg, #7c4a24, #a9743f);
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.spine-text {
  font-size: 0.7rem;
  font-weight: 600;
  color: #f5e6c8;
  white-space: nowrap;
}

/* 正确反馈 */
.shelf-cell.feedback-correct {
  animation: shelfCorrect 0.5s ease;
}

@keyframes shelfCorrect {
  0% {
    background: rgba(0, 0, 0, 0.28);
  }
  30% {
    background: rgba(16, 185, 129, 0.35);
  }
  100% {
    background: rgba(16, 185, 129, 0.18);
  }
}

/* 错误反馈 */
.shelf-cell.feedback-wrong {
  animation: shelfWrong 0.6s ease;
}

@keyframes shelfWrong {
  0% {
    transform: translateX(0);
    background: rgba(0, 0, 0, 0.28);
  }
  15% {
    background: rgba(239, 68, 68, 0.3);
  }
  20% {
    transform: translateX(-6px);
  }
  40% {
    transform: translateX(6px);
  }
  60% {
    transform: translateX(-4px);
  }
  80% {
    transform: translateX(4px);
  }
  100% {
    transform: translateX(0);
    background: rgba(239, 68, 68, 0.16);
  }
}

@media (max-width: 480px) {
  .shelf-label {
    font-size: 0.7rem;
  }

  .shelf-slot {
    min-height: 44px;
  }
}
</style>
