<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import type { Process, ColumnInfo } from '@/data/types'
import { useUserStore } from '@/stores/user'
import { useGameStore } from '@/stores/game'

const props = defineProps<{
  /** 答案卡组（过程组或知识领域列） */
  columns: ColumnInfo[]
  /** 列类型（决定已放置过程归列依据） */
  columnType: 'processGroup' | 'knowledgeArea'
  /** 已正确归类（上架）的过程 */
  placedProcesses: Process[]
  /** 提示道具高亮截止时间戳 */
  hintActiveUntil: number
}>()

const emit = defineEmits<{
  place: [columnId: string]
}>()

const userStore = useUserStore()
const gameStore = useGameStore()

/** 按列分组的已放置过程 */
const placedByColumn = computed(() => {
  const map = new Map<string, Process[]>()
  for (const col of props.columns) map.set(col.id, [])
  for (const p of props.placedProcesses) {
    const colId = props.columnType === 'processGroup' ? p.processGroupId : p.knowledgeAreaId
    const arr = map.get(colId)
    if (arr) arr.push(p)
  }
  return map
})

/** 掌握度 chip 边框档位：2=金色实线 / 1=默认无框 / 0=虚线（仅已上架书有 chip，无剧透） */
function chipClass(p: Process): string {
  const box = userStore.getMasteryBox(p.id, 'position')
  if (box >= 2) return 'chip-m2'
  if (box <= 0) return 'chip-m0'
  return ''
}

/** 提示道具高亮：激活 3 秒内高亮正确列（提示是唯一合法的正确性高亮） */
const hintGlow = ref(false)
let hintTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => props.hintActiveUntil,
  (val) => {
    if (val && val > Date.now()) {
      hintGlow.value = true
      if (hintTimer) clearTimeout(hintTimer)
      hintTimer = setTimeout(() => { hintGlow.value = false }, 3000)
    } else {
      hintGlow.value = false
    }
  },
)
onUnmounted(() => {
  if (hintTimer) clearTimeout(hintTimer)
})

/** 提示激活时的高亮目标列（由当前卡正确归属推导） */
const hintColumnId = computed(() => {
  if (!hintGlow.value) return null
  const cur = gameStore.currentProcess
  if (!cur) return null
  return props.columnType === 'processGroup' ? cur.processGroupId : cur.knowledgeAreaId
})
</script>

<template>
  <div class="answer-cards">
    <button
      v-for="col in columns"
      :key="col.id"
      class="answer-card"
      :class="{ 'hint-glow': hintColumnId === col.id }"
      :data-column-id="col.id"
      :aria-label="`放置到 ${col.name}`"
      @click="emit('place', col.id)"
    >
      <!-- 左侧组色竖条 -->
      <span class="card-accent" :style="{ backgroundColor: col.color }"></span>
      <span class="card-main">
        <span class="card-name">{{ col.name }}</span>
        <!-- 迷你书脊 chips：仅显示已上架书 -->
        <span v-if="(placedByColumn.get(col.id) ?? []).length" class="chip-row">
          <span
            v-for="p in placedByColumn.get(col.id)"
            :key="p.id"
            class="mini-spine"
            :class="chipClass(p)"
            :style="{ backgroundColor: col.color }"
            :title="p.name"
          ></span>
        </span>
      </span>
      <!-- 右上角收集计数 -->
      <span class="collect-count">已收集 {{ (placedByColumn.get(col.id) ?? []).length }}</span>
    </button>
  </div>
</template>

<style scoped>
.answer-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  padding: 12px 16px;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

/* ===== 答案卡 ===== */
.answer-card {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 10px 12px 10px 0;
  background: var(--surface-glass);
  border: 1.5px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s var(--ease-soft);
}

/* 中性 hover 高亮：与正确性无关，所有卡统一 */
.answer-card:hover {
  border-color: rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.08);
}

.answer-card:active {
  transform: scale(0.98);
}

/* 提示道具：正确列金色脉冲描边 3 秒（唯一合法高亮） */
.answer-card.hint-glow {
  border-color: var(--color-star);
  animation: hintPulse 1s ease-in-out infinite;
}

@keyframes hintPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.5); }
  50% { box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.25); }
}

/* 落位脉冲：飞卡落位时短促高亮一次（由 CardStage 飞行结束触发） */
.answer-card.land-pulse {
  animation: landPulse 0.6s var(--ease-spring);
}

@keyframes landPulse {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  100% { box-shadow: 0 0 0 14px rgba(16, 185, 129, 0); }
}

/* 左侧组色竖条 */
.card-accent {
  width: 4px;
  flex-shrink: 0;
  border-radius: 2px;
}

.card-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-name {
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 迷你书脊 chips 行 */
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  min-height: 28px;
  align-items: flex-end;
}

.mini-spine {
  width: 8px;
  height: 28px;
  border-radius: 2px;
  opacity: 0.55;
  flex-shrink: 0;
}

/* 掌握度档位边框 */
.mini-spine.chip-m2 {
  opacity: 1;
  border: 1.5px solid #fbbf24;
}

.mini-spine.chip-m0 {
  border: 1.5px dashed #94a3b8;
}

/* 右上角收集计数 */
.collect-count {
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.06);
  padding: 1px 6px;
  border-radius: var(--radius-full);
}
</style>
