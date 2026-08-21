<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import type { Process, ProcessGroup, KnowledgeArea } from '@/data/types'

const props = defineProps<{
  processes: Process[]
  processGroups: ProcessGroup[]
  knowledgeAreas: KnowledgeArea[]
}>()

const userStore = useUserStore()

type Dimension = 'position' | 'definition' | 'itto'

/** 维度切换（定位/定义/ITTO 三视角） */
const dimension = ref<Dimension>('position')
const DIM_LABELS: Record<Dimension, string> = {
  position: '定位',
  definition: '定义',
  itto: 'ITTO',
}

/** 过程组 × 知识领域 → 唯一过程（49 矩阵自然分布） */
function findProcess(pgId: string, kaId: string): Process | undefined {
  return props.processes.find(p => p.processGroupId === pgId && p.knowledgeAreaId === kaId)
}

/** 格子档位色级：'none'=未练习 / '0'=生疏 / '1'=巩固 / '2'=掌握 */
function cellLevel(process: Process | undefined): 'none' | '0' | '1' | '2' {
  if (!process) return 'none'
  if (!userStore.hasMasteryRecord(process.id, dimension.value)) return 'none'
  const box = userStore.getMasteryBox(process.id, dimension.value)
  return String(box) as '0' | '1' | '2'
}

/** tooltip 文案：过程全名 + 档位 */
function cellTitle(process: Process | undefined): string {
  if (!process) return ''
  const level = cellLevel(process)
  const boxText = level === 'none' ? '未练习' : level === '2' ? '掌握' : level === '1' ? '巩固' : '生疏'
  return `${process.name} · ${DIM_LABELS[dimension.value]}：${boxText}`
}

const gridTemplateColumns = computed(() => `64px repeat(${props.processGroups.length}, minmax(0, 1fr))`)
</script>

<template>
  <div class="mastery-heatmap">
    <!-- 维度切换 -->
    <div class="dim-switch">
      <button
        v-for="(label, dim) in DIM_LABELS"
        :key="dim"
        class="dim-btn"
        :class="{ active: dimension === dim }"
        @click="dimension = dim as Dimension"
      >{{ label }}</button>
      <div class="heatmap-legend">
        <span class="legend-dot lv-2"></span>掌握
        <span class="legend-dot lv-1"></span>巩固
        <span class="legend-dot lv-0"></span>生疏
        <span class="legend-dot lv-none"></span>未练习
      </div>
    </div>

    <!-- 5 过程组（列）× 10 知识领域（行）热力矩阵 -->
    <div class="heatmap-scroll">
      <div class="heatmap-grid" :style="{ gridTemplateColumns }">
        <!-- 左上角空白 + 列头 -->
        <div class="hm-cell hm-corner"></div>
        <div
          v-for="pg in processGroups"
          :key="pg.id"
          class="hm-cell hm-col-header"
          :title="pg.name"
        >{{ pg.shortName }}</div>

        <!-- 行：知识领域 -->
        <template v-for="ka in knowledgeAreas" :key="ka.id">
          <div class="hm-cell hm-row-header" :title="ka.name">{{ ka.shortName }}</div>
          <div
            v-for="pg in processGroups"
            :key="pg.id + '-' + ka.id"
            class="hm-cell hm-data"
            :class="'lv-' + cellLevel(findProcess(pg.id, ka.id))"
            :data-tip="cellTitle(findProcess(pg.id, ka.id))"
          ></div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mastery-heatmap {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dim-switch {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.dim-btn {
  padding: 0.35rem 0.9rem;
  background: var(--surface-glass);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.dim-btn.active {
  background: rgba(99, 102, 241, 0.25);
  border-color: var(--color-primary);
  color: #fff;
}

.heatmap-legend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  margin-left: 8px;
}

.legend-dot:first-child {
  margin-left: 0;
}

.lv-2 { background: #10b981; }
.lv-1 { background: #f59e0b; }
.lv-0 { background: #ef4444; }
.lv-none { background: #475569; }

.heatmap-scroll {
  overflow-x: auto;
}

.heatmap-grid {
  display: grid;
  gap: 3px;
  min-width: 420px;
}

.hm-cell {
  border-radius: 4px;
  min-height: 26px;
}

.hm-corner {
  background: transparent;
}

.hm-col-header,
.hm-row-header {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hm-row-header {
  justify-content: flex-end;
}

/* 数据格：按档位着色，hover 显示过程全名 + 档位 tooltip */
.hm-data {
  position: relative;
  cursor: default;
  transition: transform 0.15s ease;
}

.hm-data:hover {
  transform: scale(1.12);
  z-index: 2;
}

.hm-data::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: rgba(15, 12, 41, 0.95);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 20;
}

.hm-data:hover::after {
  opacity: 1;
}
</style>
