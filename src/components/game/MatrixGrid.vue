<script setup lang="ts">
import { computed } from 'vue'
import type { Process, ColumnInfo, RowInfo } from '@/data/types'
import { useUserStore } from '@/stores/user'

const props = defineProps<{
  columns: ColumnInfo[]
  rows: RowInfo[]
  feedback: { rowId?: string; columnId?: string; type: 'correct' | 'wrong' } | null
  /** 已正确归类（上架）的过程列表 */
  placedProcesses: Process[]
}>()

const emit = defineEmits<{
  place: [payload: { rowId: string; columnId: string }]
}>()

const userStore = useUserStore()

/** 掌握度书脊样式档位：与 AnswerCards 同一套规则（2=金色、1=木质、0=虚线） */
function masteryClass(processId: string): string {
  const box = userStore.getMasteryBox(processId, 'position')
  if (box >= 2) return 'mastery-2'
  if (box <= 0) return 'mastery-0'
  return ''
}

/** 列头动态列宽：按列数生成，替代硬编码 repeat(5,1fr)，2/5/10 列均合理分布 */
const gridTemplateColumns = computed(
  () => `minmax(56px, 96px) repeat(${props.columns.length}, minmax(0, 1fr))`,
)

/** 动态最小宽度：保证窄屏横向滚动而非过度压缩 */
const gridMinWidth = computed(() => `${72 + props.columns.length * 76}px`)

/** 缓存每个格子的已放书列表 */
const cellBooks = computed(() => {
  const map = new Map<string, Process[]>()
  for (const proc of props.placedProcesses) {
    const key = `${proc.processGroupId}|${proc.knowledgeAreaId}`
    const list = map.get(key) ?? []
    list.push(proc)
    map.set(key, list)
  }
  return map
})

function getCellBooks(colId: string, rowId: string): Process[] {
  return cellBooks.value.get(`${colId}|${rowId}`) ?? []
}

function cellHasBooks(colId: string, rowId: string): boolean {
  return getCellBooks(colId, rowId).length > 0
}
</script>

<template>
  <div class="matrix-grid-wrapper">
    <div class="matrix-grid" :style="{ gridTemplateColumns, minWidth: gridMinWidth }">
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
          :data-column-id="col.id"
          :data-row-id="row.id"
          role="button"
          tabindex="0"
          :aria-label="`放置到 ${col.name} × ${row.name}`"
          :class="[
            feedback?.columnId === col.id && feedback?.rowId === row.id && feedback.type === 'correct' ? 'feedback-correct' : '',
            feedback?.columnId === col.id && feedback?.rowId === row.id && feedback.type === 'wrong' ? 'feedback-wrong' : '',
          ]"
          :style="{
            borderTopColor: col.color,
            borderLeftColor: row.color,
          }"
          @click="emit('place', { rowId: row.id, columnId: col.id })"
          @keydown.enter.prevent="emit('place', { rowId: row.id, columnId: col.id })"
          @keydown.space.prevent="emit('place', { rowId: row.id, columnId: col.id })"
        >
          <!-- 格内书脊：每过程独立一根（无重复计数徽章），hover/点按显示全名 -->
          <div v-if="cellHasBooks(col.id, row.id)" class="cell-spines">
            <div
              v-for="b in getCellBooks(col.id, row.id)"
              :key="b.id"
              class="cell-spine"
              :class="masteryClass(b.id)"
              :data-name="b.name"
            >
              <span class="cell-spine__text">{{ b.name }}</span>
            </div>
          </div>

          <!-- 空状态指示点 -->
          <div
            v-else
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
  /* 列宽与最小宽度由内联样式按列数动态生成 */
  gap: 3px;
  padding: 4px;
}

.matrix-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
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
  min-height: 90px;
}

.row-header-text {
  white-space: nowrap;
}

.matrix-grid-cell {
  background: rgba(255, 255, 255, 0.06);
  border: 1.5px solid rgba(255, 255, 255, 0.12);
  border-top: 3px solid;
  border-left: 3px solid;
  cursor: pointer;
  min-height: 90px;
  padding: 2px;
  position: relative;
}

/* 中性 hover 高亮：与正确性无关，所有格子统一 */
.matrix-grid-cell:hover {
  background: rgba(255, 255, 255, 0.12);
}

/* 键盘焦点可见性 */
.matrix-grid-cell:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.matrix-grid-cell.drag-target-active {
  transform: scale(1.06);
  border-color: rgba(99, 102, 241, 0.9);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.45), 0 0 20px rgba(99, 102, 241, 0.35);
  z-index: 3;
  animation: matrixTargetPulse 1s var(--ease-soft) infinite;
}

@keyframes matrixTargetPulse {
  0%, 100% { box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.45), 0 0 20px rgba(99, 102, 241, 0.35); }
  50% { box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.6), 0 0 28px rgba(99, 102, 241, 0.5); }
}

.cell-indicator {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  opacity: 0.35;
}

/* 格内书脊组：每过程独立一根固定宽书脊 */
.cell-spines {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 2px;
  height: 96%;
}

.cell-spine {
  position: relative;
  width: 14px;
  background: linear-gradient(180deg, #7c4a24, #a9743f);
  border-radius: 3px;
  box-shadow:
    1px 0 2px rgba(0, 0, 0, 0.35),
    inset 1px 0 0 rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  /* 落位脉冲：新上架书脊挂载时短促高亮一次（与 AnswerCards 同一套视觉语言） */
  animation: spineLand 0.5s var(--ease-spring);
}

@keyframes spineLand {
  0% { filter: brightness(1.7); }
  100% { filter: brightness(1); }
}

/* ===== 掌握度书脊样式（与 AnswerCards 同一套规则，仅作用于已上架书） ===== */
.cell-spine.mastery-2 {
  background: linear-gradient(180deg, #a16207, #eab308);
  border: 1.5px solid #fbbf24;
  box-shadow:
    1px 0 2px rgba(0, 0, 0, 0.35),
    0 0 6px rgba(251, 191, 36, 0.45),
    inset 1px 0 0 rgba(255, 255, 255, 0.15);
}

.cell-spine.mastery-0 {
  border: 1.5px dashed rgba(245, 230, 200, 0.55);
  filter: saturate(0.45);
}

/* ===== 书脊 tooltip：hover/点按显示完整过程名 ===== */
.cell-spine::after {
  content: attr(data-name);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: rgba(15, 12, 41, 0.95);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 30;
}

.cell-spine:hover::after,
.cell-spine:active::after {
  opacity: 1;
}

.cell-spine__text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  padding: 2px 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

/* 正确反馈 */
.matrix-grid-cell.feedback-correct {
  animation: matrixCorrect 0.6s var(--ease-spring);
}

@keyframes matrixCorrect {
  0% {
    background: transparent;
    transform: scale(1);
  }
  25% {
    background: rgba(16, 185, 129, 0.3);
    transform: scale(1.1);
    box-shadow: 0 0 16px rgba(16, 185, 129, 0.4);
  }
  100% {
    background: rgba(16, 185, 129, 0.1);
    transform: scale(1);
    box-shadow: none;
  }
}

/* 错误反馈 */
.matrix-grid-cell.feedback-wrong {
  animation: matrixWrong 0.6s var(--ease-soft);
}

@keyframes matrixWrong {
  0% {
    transform: translateX(0);
    background: transparent;
  }
  12% {
    background: rgba(239, 68, 68, 0.25);
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.3);
  }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
  100% {
    transform: translateX(0);
    background: rgba(239, 68, 68, 0.08);
    box-shadow: none;
  }
}

/* 响应式：小屏幕（列宽由内联样式动态生成，此处仅紧凑化字号与间距） */
@media (max-width: 600px) {
  .matrix-grid {
    gap: 2px;
    padding: 2px;
  }

  .matrix-col-header {
    font-size: 0.6rem;
    padding: 4px 2px;
    min-height: 28px;
  }

  .matrix-row-header {
    font-size: 0.55rem;
    padding: 3px 4px;
    min-height: 80px;
  }

  .matrix-grid-cell {
    min-height: 80px;
    border-width: 1px;
    border-top-width: 2px;
    border-left-width: 2px;
  }

  .cell-spine__text {
    font-size: 9px;
  }

  .cell-indicator {
    width: 4px;
    height: 4px;
  }
}

@media (max-width: 400px) {
  .matrix-col-header {
    font-size: 0.5rem;
    padding: 3px 1px;
    min-height: 24px;
  }

  .matrix-row-header {
    font-size: 0.5rem;
    padding: 2px 3px;
    min-height: 72px;
  }

  .matrix-grid-cell {
    min-height: 72px;
  }

  .cell-spine__text {
    font-size: 8px;
  }
}

/* 触摸设备横屏：矩阵格子紧凑 */
@media (pointer: coarse) and (orientation: landscape) {
  .matrix-grid-cell { padding: 1px; }
  .matrix-grid-cell .cell-spine__text { font-size: 0.5rem; }
}
</style>
