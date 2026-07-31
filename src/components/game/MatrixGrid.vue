<script setup lang="ts">
import type { Process, ColumnInfo, RowInfo } from '@/data/types'

defineProps<{
  columns: ColumnInfo[]
  rows: RowInfo[]
  selectedCard: Process | null
  feedback: { rowId?: string; columnId?: string; type: 'correct' | 'wrong' } | null
}>()

const emit = defineEmits<{
  place: [payload: { rowId: string; columnId: string }]
}>()
</script>

<template>
  <div class="matrix-grid-wrapper">
    <div class="matrix-grid">
      <!-- 左上角空白 -->
      <div class="matrix-cell matrix-corner"></div>

      <!-- 列头 -->
      <div
        v-for="col in columns"
        :key="col.id"
        class="matrix-cell matrix-col-header"
        :style="{ borderBottomColor: col.color }"
      >
        <span class="col-header-text">{{ col.name }}</span>
      </div>

      <!-- 行 -->
      <template v-for="row in rows" :key="row.id">
        <!-- 行头 -->
        <div
          class="matrix-cell matrix-row-header"
          :style="{ borderRightColor: row.color }"
        >
          <span class="row-header-text">{{ row.name }}</span>
        </div>

        <!-- 格子 -->
        <div
          v-for="col in columns"
          :key="col.id + '-' + row.id"
          class="matrix-cell matrix-grid-cell"
          :class="[
            selectedCard ? 'has-selected' : '',
            feedback?.columnId === col.id && feedback?.rowId === row.id && feedback.type === 'correct' ? 'feedback-correct' : '',
            feedback?.columnId === col.id && feedback?.rowId === row.id && feedback.type === 'wrong' ? 'feedback-wrong' : '',
          ]"
          :style="{
            borderTopColor: col.color,
            borderLeftColor: row.color,
          }"
          @click="emit('place', { rowId: row.id, columnId: col.id })"
        >
          <div
            class="cell-indicator"
            :style="{ backgroundColor: col.color }"
          ></div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.matrix-grid-wrapper {
  width: 100%;
  overflow-x: auto;
  overflow-y: auto;
  max-height: 55vh;
  -webkit-overflow-scrolling: touch;
  background: linear-gradient(180deg, #6b4423, #4a2d15);
  border-top: 4px solid #8b5a2b;
  border-radius: 10px 10px 0 0;
  box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.45);
}

.matrix-grid {
  display: grid;
  grid-template-columns: 60px repeat(5, 1fr);
  gap: 3px;
  padding: 4px;
  min-width: 400px;
}

.matrix-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.matrix-corner {
  background: transparent;
}

.matrix-col-header {
  background: rgba(255, 255, 255, 0.08);
  padding: 6px 4px;
  border-bottom: 3px solid;
  font-size: 0.75rem;
  font-weight: 700;
  color: #f1f5f9;
  text-align: center;
  min-height: 36px;
}

.col-header-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.matrix-row-header {
  background: rgba(255, 255, 255, 0.08);
  padding: 4px 6px;
  border-right: 3px solid;
  font-size: 0.7rem;
  font-weight: 600;
  color: #cbd5e1;
  text-align: right;
  justify-content: flex-end;
  min-height: 36px;
}

.row-header-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.matrix-grid-cell {
  background: rgba(255, 255, 255, 0.06);
  border: 1.5px solid rgba(255, 255, 255, 0.12);
  border-top: 3px solid;
  border-left: 3px solid;
  cursor: default;
  min-height: 36px;
  padding: 2px;
  position: relative;
}

.matrix-grid-cell.has-selected {
  cursor: pointer;
  border-color: rgba(99, 102, 241, 0.6);
  background: rgba(99, 102, 241, 0.15);
}

.matrix-grid-cell.has-selected:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.3);
  z-index: 2;
}

.cell-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  opacity: 0.4;
}

/* 正确反馈 */
.matrix-grid-cell.feedback-correct {
  animation: matrixCorrect 0.5s ease;
}

@keyframes matrixCorrect {
  0% {
    background: transparent;
    transform: scale(1);
  }
  30% {
    background: rgba(16, 185, 129, 0.25);
    transform: scale(1.08);
  }
  100% {
    background: rgba(16, 185, 129, 0.12);
    transform: scale(1);
  }
}

/* 错误反馈 */
.matrix-grid-cell.feedback-wrong {
  animation: matrixWrong 0.6s ease;
}

@keyframes matrixWrong {
  0% {
    transform: translateX(0);
    background: transparent;
  }
  15% {
    background: rgba(239, 68, 68, 0.2);
  }
  20% {
    transform: translateX(-5px);
  }
  40% {
    transform: translateX(5px);
  }
  60% {
    transform: translateX(-3px);
  }
  80% {
    transform: translateX(3px);
  }
  100% {
    transform: translateX(0);
    background: rgba(239, 68, 68, 0.1);
  }
}

/* 响应式：小屏幕 */
@media (max-width: 600px) {
  .matrix-grid {
    grid-template-columns: 44px repeat(5, 1fr);
    gap: 2px;
    padding: 2px;
    min-width: 320px;
  }

  .matrix-col-header {
    font-size: 0.6rem;
    padding: 4px 2px;
    min-height: 28px;
  }

  .matrix-row-header {
    font-size: 0.55rem;
    padding: 3px 4px;
    min-height: 28px;
  }

  .matrix-grid-cell {
    min-height: 28px;
    border-width: 1px;
    border-top-width: 2px;
    border-left-width: 2px;
  }

  .cell-indicator {
    width: 4px;
    height: 4px;
  }
}

@media (max-width: 400px) {
  .matrix-grid {
    grid-template-columns: 36px repeat(5, 1fr);
    min-width: 280px;
  }

  .matrix-col-header {
    font-size: 0.5rem;
    padding: 3px 1px;
    min-height: 24px;
  }

  .matrix-row-header {
    font-size: 0.5rem;
    padding: 2px 3px;
    min-height: 24px;
  }

  .matrix-grid-cell {
    min-height: 24px;
  }
}
</style>