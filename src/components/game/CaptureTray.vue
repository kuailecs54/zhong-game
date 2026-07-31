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
  <div class="capture-tray" :class="{ 'is-full': cards.length >= capacity }">
    <div class="tray-cards">
      <div
        v-for="(card, index) in cards"
        :key="index"
        class="tray-card-wrapper"
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
      <div class="tray-empty-slots">
        <div
          v-for="slot in Math.max(0, capacity - cards.length)"
          :key="'empty-' + slot"
          class="tray-empty-slot"
        >
          <span class="slot-placeholder">+</span>
        </div>
      </div>
    </div>
    <div class="tray-info">
      <span class="tray-count" :class="{ 'count-full': cards.length >= capacity }">
        {{ cards.length }}/{{ capacity }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.capture-tray {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  background: rgba(30, 33, 58, 0.95);
  border-top: 1px solid var(--border-subtle);
  border-radius: 12px 12px 0 0;
  transition: border-color 0.3s ease, background 0.3s ease;
}

.capture-tray.is-full {
  border-color: var(--color-error);
  background: rgba(69, 10, 10, 0.95);
}

.tray-cards {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 48px;
}

.tray-card-wrapper {
  transition: transform 0.2s ease;
}

.tray-card-wrapper.is-selected {
  transform: translateY(-6px);
}

.tray-card-wrapper.is-selected .falling-card {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4);
}

.tray-empty-slots {
  display: flex;
  gap: 0.5rem;
}

.tray-empty-slot {
  width: 60px;
  height: 40px;
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slot-placeholder {
  color: var(--text-faint);
  font-size: 1.2rem;
  font-weight: 300;
}

.tray-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tray-count {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 500;
}

.count-full {
  color: var(--color-error);
  font-weight: 700;
}
</style>