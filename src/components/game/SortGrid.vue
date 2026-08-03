<script setup lang="ts">
import { computed } from 'vue'
import type { Process, ColumnInfo, ShelvedBook } from '@/data/types'
import { buildShelfLayers, layerCapacityFor, spineWidthFor } from '@/utils/shelfLayout'
import type { MergedSpine, ShelfLayer } from '@/utils/shelfLayout'

const props = defineProps<{
  columns: ColumnInfo[]
  columnType: 'processGroup' | 'knowledgeArea'
  shelvedBooks: ShelvedBook[]
  /** 当前正在拖拽的书本（null 表示未在拖拽） */
  dragCard: Process | null
  feedback: { columnId: string; type: 'correct' | 'wrong' } | null
  /** 当前拖拽高亮目标 */
  highlightTarget?: { columnId: string; rowId?: string } | null
  /** 书架单元估算宽度（px），由 GameView 传入 */
  unitWidth: number
}>()

const emit = defineEmits<{
  place: [columnId: string]
}>()

/** 按列分组的书本索引 */
const booksByColumn = computed(() => {
  const map = new Map<string, ShelvedBook[]>()
  for (const col of props.columns) {
    map.set(col.id, [])
  }
  for (const book of props.shelvedBooks) {
    const arr = map.get(book.columnId)
    if (arr) arr.push(book)
  }
  return map
})

/**
 * 按容量填层：书种少时单层并排；超过每层容量自动加层（自下而上填充）。
 * 层号 0 = 最底层；同种书在层内合并为 1 本书脊 + ×N 角标（固定宽，不增厚）。
 * 算法由 @/utils/shelfLayout 的 buildShelfLayers 提供（已单测覆盖）。
 */
const layerData = computed(() => {
  const result = new Map<string, ShelfLayer[]>()
  const capacity = layerCapacityFor(props.unitWidth)

  for (const col of props.columns) {
    const books = booksByColumn.value.get(col.id) ?? []
    result.set(col.id, buildShelfLayers(books.map(b => b.process), capacity))
  }
  return result
})

/** 每列的层数（= 已用层数，至少 1，无预规划空层板） */
const colLayerCounts = computed(() => {
  const map = new Map<string, number>()
  for (const col of props.columns) {
    const layers = layerData.value.get(col.id)
    map.set(col.id, Math.max(1, layers?.length ?? 0))
  }
  return map
})

/**
 * 幽灵预览：已有同种书 → 其所在层；新书 → 最低有空位层末尾
 */
const ghostPreview = computed(() => {
  if (!props.dragCard) return null
  const map = new Map<string, number>()
  const capacity = layerCapacityFor(props.unitWidth)

  for (const col of props.columns) {
    if (!isPlaceable(col.id)) continue
    const layers = layerData.value.get(col.id) ?? []

    // 已有同种书 → 其所在层
    const existingIdx = layers.findIndex(l =>
      l.spines.some(s => s.process.id === props.dragCard!.id)
    )
    if (existingIdx >= 0) {
      map.set(col.id, existingIdx)
      continue
    }
    // 新书 → 最低有空位层；无空位 → 开新层
    const targetIdx = layers.findIndex(l => l.spines.length < capacity)
    map.set(col.id, targetIdx >= 0 ? targetIdx : layers.length)
  }
  return map
})

/** 判断某列是否可放入当前拖拽卡片 */
function isPlaceable(colId: string): boolean {
  if (!props.dragCard) return false
  if (props.columnType === 'processGroup') {
    return props.dragCard.processGroupId === colId
  }
  return props.dragCard.knowledgeAreaId === colId
}

/** 获取某列某层的书脊数据 */
function getSpinesAtLayer(colId: string, layer: number): MergedSpine[] | undefined {
  const entries = layerData.value.get(colId)
  if (!entries) return undefined
  return entries.find(e => e.layer === layer)?.spines
}

/** 某列某层是否有幽灵预览 */
function hasGhost(colId: string, layer: number): boolean {
  return (ghostPreview.value?.get(colId) ?? -1) === layer && isPlaceable(colId)
}
</script>

<template>
  <div class="shelves-container">
    <div
      v-for="col in columns"
      :key="col.id"
      class="shelf-unit"
      :data-column-id="col.id"
      :class="[
        feedback?.columnId === col.id && feedback.type === 'correct' ? 'feedback-correct' : '',
        feedback?.columnId === col.id && feedback.type === 'wrong' ? 'feedback-wrong' : '',
        isPlaceable(col.id) ? 'placeable' : '',
        highlightTarget?.columnId === col.id ? 'drag-target-active' : '',
      ]"
      @click="emit('place', col.id)"
    >
      <!-- 书架顶部标签 -->
      <div class="shelf-header" :class="{ 'header-placeable': isPlaceable(col.id) }">
        <span class="header-dot" :style="{ backgroundColor: col.color }"></span>
        <span class="header-name">{{ col.name }}</span>
      </div>

      <!-- 书架主体 -->
      <div class="shelf-body">
        <!-- 从顶层到底层渲染 -->
        <div
          v-for="layerIdx in (colLayerCounts.get(col.id) ?? 1)"
          :key="'layer-' + col.id + '-' + layerIdx"
          class="shelf-layer"
        >
          <!-- 层板 -->
          <div class="layer-board"></div>

          <!-- 书脊区域：竖版书脊直立排列 -->
          <div class="layer-spines">
            <template v-if="getSpinesAtLayer(col.id, (colLayerCounts.get(col.id) ?? 1) - layerIdx)">
              <div
                v-for="(spine, si) in getSpinesAtLayer(col.id, (colLayerCounts.get(col.id) ?? 1) - layerIdx)!"
                :key="si"
                class="book-spine"
                :style="{ width: spineWidthFor(unitWidth) + 'px' }"
              >
                <span class="spine-text">{{ spine.process.name }}</span>
                <span v-if="spine.count > 1" class="spine-count">×{{ spine.count }}</span>
              </div>
            </template>

            <!-- 幽灵预览 -->
            <div
              v-if="hasGhost(col.id, (colLayerCounts.get(col.id) ?? 1) - layerIdx)"
              class="ghost-spine"
              :style="{ width: spineWidthFor(unitWidth) + 'px' }"
            >
              <span class="ghost-text">{{ dragCard?.name }}</span>
            </div>
          </div>
        </div>

        <!-- 最底层板 -->
        <div class="layer-board layer-board-bottom"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shelves-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
  padding: 4px;
}

/* ===== 单个书架单元 ===== */
.shelf-unit {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: linear-gradient(180deg, #5a3518 0%, #3e2210 100%);
  border: 2px solid #7c5230;
  border-radius: 8px;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  cursor: default;
  transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s var(--ease-soft);
  overflow: hidden;
  position: relative;
}

/* 书架顶部柔和灯光 */
.shelf-unit::before {
  content: '';
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 35%;
  background: radial-gradient(ellipse at center top, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
  pointer-events: none;
  z-index: 1;
}

.shelf-unit.placeable {
  cursor: pointer;
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(99, 102, 241, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.shelf-unit.placeable:hover {
  border-color: rgba(99, 102, 241, 0.7);
  box-shadow:
    0 2px 12px rgba(99, 102, 241, 0.25),
    0 0 0 1px rgba(99, 102, 241, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.shelf-unit.drag-target-active {
  transform: scale(1.03);
  border-color: rgba(99, 102, 241, 0.85);
  box-shadow:
    0 0 0 2px rgba(99, 102, 241, 0.45),
    0 0 24px rgba(99, 102, 241, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  animation: targetPulse 1s var(--ease-soft) infinite;
}

@keyframes targetPulse {
  0%, 100% { box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.45), 0 0 24px rgba(99, 102, 241, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05); }
  50% { box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.6), 0 0 32px rgba(99, 102, 241, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05); }
}

/* ===== 书架顶部标签 ===== */
.shelf-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 4px 6px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.shelf-header.header-placeable {
  background: rgba(99, 102, 241, 0.12);
}

.header-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
}

.header-name {
  font-size: 0.65rem;
  font-weight: 700;
  color: #f5e6c8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== 书架主体 ===== */
.shelf-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0 2px;
}

/* ===== 层 ===== */
.shelf-layer {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.layer-board {
  flex-shrink: 0;
  height: 4px;
  background: linear-gradient(180deg, #8b6340, #6b4828);
  box-shadow:
    0 2px 3px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  border-radius: 1px;
}

.layer-board-bottom {
  background: linear-gradient(180deg, #9a7050, #7c5230);
  box-shadow:
    0 2px 5px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.layer-spines {
  flex: 1;
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
  gap: 2px;
  padding: 2px 4px;
  min-height: 0;
}

/* ===== 竖版书脊 ===== */
.book-spine {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  background: linear-gradient(180deg, #7c4a24, #a9743f);
  border-radius: 3px;
  box-shadow:
    1px 0 2px rgba(0, 0, 0, 0.3),
    inset 1px 0 0 rgba(255, 255, 255, 0.1);
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  transition: height 0.25s var(--ease-soft);
}

/* 层数越高，书脊略矮，模拟堆叠透视 */
.shelf-layer:nth-child(1) .book-spine { height: 92%; }
.shelf-layer:nth-child(2) .book-spine { height: 88%; }
.shelf-layer:nth-child(3) .book-spine { height: 84%; }
.shelf-layer:nth-child(4) .book-spine { height: 80%; }
.shelf-layer:nth-child(n+5) .book-spine { height: 76%; }

.spine-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 9px;
  font-weight: 600;
  color: #f5e6c8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
  line-height: 1.1;
  max-height: 100%;
  padding: 2px 0;
}

.spine-count {
  position: absolute;
  top: -3px;
  right: -3px;
  background: #ef4444;
  color: #fff;
  font-size: 0.45rem;
  font-weight: 700;
  padding: 1px 3px;
  border-radius: 6px;
  line-height: 1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

/* ===== 幽灵书脊 ===== */
.ghost-spine {
  min-height: 0;
  height: 100%;
  border: 2px dashed rgba(99, 102, 241, 0.55);
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  flex-shrink: 0;
  animation: ghostPulse 1.2s ease-in-out infinite;
}

@keyframes ghostPulse {
  0%, 100% { opacity: 0.5; border-color: rgba(99, 102, 241, 0.45); }
  50% { opacity: 0.75; border-color: rgba(99, 102, 241, 0.7); }
}

.ghost-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 8px;
  color: rgba(99, 102, 241, 0.6);
  overflow: hidden;
  max-height: 100%;
  padding: 2px 0;
}

/* ===== 反馈动画 ===== */
.shelf-unit.feedback-correct {
  animation: shelfCorrect 0.6s var(--ease-spring);
}

@keyframes shelfCorrect {
  0% { transform: scale(1); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4); }
  20% { transform: scale(0.96); box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.6), 0 4px 20px rgba(16, 185, 129, 0.4); }
  50% { transform: scale(1.03); box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.35), 0 3px 14px rgba(16, 185, 129, 0.25); }
  100% { transform: scale(1); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4); }
}

.shelf-unit.feedback-wrong {
  animation: shelfWrong 0.6s var(--ease-soft);
}

@keyframes shelfWrong {
  0% { transform: translateX(0); }
  12% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.6), 0 2px 14px rgba(239, 68, 68, 0.35); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
  100% { transform: translateX(0); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4); }
}

/* ===== 响应式 ===== */
@media (max-width: 600px) {
  .shelves-container {
    gap: 4px;
    padding: 2px;
  }

  .shelf-header {
    padding: 3px 4px;
  }

  .header-name {
    font-size: 0.55rem;
  }

  .spine-text {
    font-size: 8px;
  }

  .ghost-text {
    font-size: 7px;
  }
}

/* 触摸设备横屏：书架格子紧凑 */
@media (pointer: coarse) and (orientation: landscape) {
  .shelf-unit { padding: 2px; }
  .shelf-unit .spine-text { font-size: 0.6rem; }
}
</style>
