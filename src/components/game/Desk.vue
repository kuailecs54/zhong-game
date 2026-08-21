<script setup lang="ts">
import type { Process } from '@/data/types'
import FallingCard from './FallingCard.vue'

// TODO(T6): 重写下落玩法为点选即放——Desk 原托盘/捕获/拖拽逻辑已下线，仅保留占位结构。
// 点选即放玩法由 GameView 直接调用 store.classify，不再经过书桌拖拽。
defineProps<{
  cards: Process[]
  capacity: number
  feedbackIndex?: number | null
  feedbackType?: 'correct' | 'wrong' | null
  hint?: boolean
  /** 当前被拖拽的托盘索引，用于半透明原位置卡片 */
  draggingIndex?: number | null
}>()
</script>

<template>
  <!-- TODO(T6): 重写下落玩法为点选即放——书桌托盘临时占位，待 GameView 重写后移除 -->
  <div class="desk" :class="{ 'is-full': cards.length >= capacity, 'is-hint': hint }">
    <div class="desk-header">
      <span class="desk-title">书桌</span>
      <span class="desk-count" :class="{ 'count-full': cards.length >= capacity }">
        {{ cards.length }}/{{ capacity }}
      </span>
    </div>
    <div class="desk-surface">
      <template v-if="cards.length > 0">
        <div
          v-for="(card, index) in cards"
          :key="index"
          class="desk-card"
          :class="{
            'feedback-pop': feedbackIndex === index && feedbackType === 'correct',
            'feedback-shake': feedbackIndex === index && feedbackType === 'wrong',
            'is-dragging': draggingIndex === index,
          }"
          role="button"
          tabindex="0"
          :aria-label="`书桌卡片：${card.name}`"
        >
          <FallingCard
            :process="card"
            :compact="true"
            :feedback="
              feedbackIndex === index
                ? (feedbackType ?? 'none')
                : 'none'
            "
          />
        </div>
      </template>
      <p v-else class="desk-hint">书桌（点选即放玩法占位）</p>
    </div>
  </div>
</template>

<style scoped>
.desk {
  flex-shrink: 0;
  padding: 0.5rem 1rem 0.75rem;
  background: linear-gradient(180deg, #7c4a24 0%, #5c3317 100%);
  border-top: 1px solid rgba(0, 0, 0, 0.35);
  box-shadow:
    inset 0 4px 12px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 -2px 8px rgba(0, 0, 0, 0.2);
  position: relative;
}

.desk-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.desk-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #f5e6c8;
  letter-spacing: 0.08em;
}

.desk-count {
  font-size: 0.75rem;
  font-weight: 700;
  color: #d9c9a8;
  background: rgba(0, 0, 0, 0.15);
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-full);
}

.desk-surface {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 52px;
  padding: 0.35rem 0.5rem;
  background: linear-gradient(180deg, #a9743f, #8b5a2b);
  border: 1px solid rgba(0, 0, 0, 0.25);
  border-radius: 8px;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.3), inset 0 -1px 0 rgba(255, 255, 255, 0.08);
  overflow-x: auto;
}

.desk-hint {
  margin: 0;
  font-size: 0.85rem;
  color: #f5e6c8;
  opacity: 0.85;
}
</style>
