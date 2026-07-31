<script setup lang="ts">
import type { Process } from '@/data/types'
import FallingCard from './FallingCard.vue'

defineProps<{
  cards: Process[]
  selectedIndex: number | null
  capacity: number
  feedbackIndex?: number | null
  feedbackType?: 'correct' | 'wrong' | null
}>()

const emit = defineEmits<{
  select: [index: number]
}>()
</script>

<template>
  <div class="desk" :class="{ 'is-full': cards.length >= capacity }">
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
          :class="{ 'is-selected': selectedIndex === index }"
          @click="emit('select', index)"
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
      <p v-else class="desk-hint">移动小手接住掉落的卡片，会放到书桌上</p>
      <p class="desk-remaining" v-if="cards.length < capacity && cards.length > 0">
        还可放 {{ capacity - cards.length }} 张
      </p>
    </div>
  </div>
</template>

<style scoped>
.desk {
  flex-shrink: 0;
  padding: 0.5rem 1rem 0.75rem;
  background: linear-gradient(180deg, #7c4a24, #5c3317);
  border-top: 1px solid rgba(0, 0, 0, 0.35);
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.35), 0 -2px 8px rgba(0, 0, 0, 0.2);
  transition: box-shadow 0.3s ease;
}

.desk.is-full {
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.35), 0 0 0 2px var(--color-error);
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
  font-weight: 600;
  color: #d9c9a8;
}

.desk-count.count-full {
  color: var(--color-error);
  font-weight: 700;
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
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.3);
  overflow-x: auto;
}

.desk-hint {
  margin: 0;
  font-size: 0.85rem;
  color: #f5e6c8;
  opacity: 0.9;
}

.desk-remaining {
  margin: 0 0 0 auto;
  font-size: 0.7rem;
  color: #f5e6c8;
  opacity: 0.75;
  white-space: nowrap;
}

.desk-card {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.desk-card.is-selected {
  transform: translateY(-6px);
}

.desk-card.is-selected :deep(.falling-card) {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4);
}
</style>
