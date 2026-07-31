<script setup lang="ts">
import type { Process } from '@/data/types'
import FallingCard from './FallingCard.vue'

defineProps<{
  cards: Process[]
  capacity: number
  feedbackIndex?: number | null
  feedbackType?: 'correct' | 'wrong' | null
  hint?: boolean
  /** 当前被拖拽的托盘索引，用于半透明原位置卡片 */
  draggingIndex?: number | null
}>()

const emit = defineEmits<{
  dragstart: [trayIndex: number, process: Process]
  dragend: []
}>()

function onPointerDown(e: PointerEvent, index: number, process: Process) {
  // 右键不启动拖拽
  if (e.button !== 0) return
  e.preventDefault()
  emit('dragstart', index, process)
}
</script>

<template>
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
          @pointerdown="onPointerDown($event, index, card)"
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
      <p v-else class="desk-hint">点击掉落的书本接住，会放到书桌上</p>
      <p class="desk-remaining" v-if="cards.length < capacity && cards.length > 0">
        还可放 {{ capacity - cards.length }} 张
      </p>
    </div>
    <transition name="hint-fade">
      <p v-if="hint" class="drop-hint-msg">没放准，拖到对应的书架再松手</p>
    </transition>
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

/* 木纹纹理叠加 */
.desk::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 40px,
      rgba(255, 255, 255, 0.02) 40px,
      rgba(255, 255, 255, 0.02) 41px
    );
  pointer-events: none;
  border-radius: inherit;
}

.desk.is-full {
  box-shadow:
    inset 0 4px 12px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 0 0 2px var(--color-error),
    0 0 16px rgba(239, 68, 68, 0.3);
}

.desk.is-hint {
  animation: deskHintPulse 1s var(--ease-soft);
}

@keyframes deskHintPulse {
  0%, 100% {
    box-shadow:
      inset 0 4px 12px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 -2px 8px rgba(0, 0, 0, 0.2);
  }
  35% {
    box-shadow:
      inset 0 4px 12px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 0 0 3px rgba(251, 191, 36, 0.6),
      0 0 28px rgba(251, 191, 36, 0.35),
      0 -2px 8px rgba(0, 0, 0, 0.2);
  }
  70% {
    box-shadow:
      inset 0 4px 12px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 0 0 1px rgba(251, 191, 36, 0.3),
      0 0 12px rgba(251, 191, 36, 0.2),
      0 -2px 8px rgba(0, 0, 0, 0.2);
  }
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

.desk-count.count-full {
  color: var(--color-error);
  font-weight: 800;
  background: rgba(239, 68, 68, 0.15);
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

.desk-remaining {
  margin: 0 0 0 auto;
  font-size: 0.7rem;
  color: #f5e6c8;
  opacity: 0.7;
  white-space: nowrap;
}

.desk-card {
  flex-shrink: 0;
  touch-action: none;
  cursor: grab;
  transition: opacity 0.15s ease, transform 0.15s var(--ease-spring);
}

.desk-card:active {
  cursor: grabbing;
}

.desk-card.is-dragging {
  opacity: 0.2;
  transform: scale(0.9);
}

.feedback-pop {
  animation: deskPop 0.4s var(--ease-spring);
}

@keyframes deskPop {
  0% { transform: scale(1); }
  30% { transform: scale(1.12); }
  100% { transform: scale(1); }
}

.feedback-shake {
  animation: deskShake 0.5s var(--ease-soft);
}

@keyframes deskShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-5px); }
  40% { transform: translateX(5px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}

/* 放置失败提示 */
.drop-hint-msg {
  margin: 0.35rem 0 0;
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #fbbf24;
  text-align: center;
  line-height: 1.3;
  white-space: nowrap;
  text-shadow: 0 0 8px rgba(251, 191, 36, 0.3);
}

.hint-fade-enter-active {
  transition: opacity 0.15s ease, transform 0.15s var(--ease-out-expo);
}
.hint-fade-leave-active {
  transition: opacity 0.4s ease;
}
.hint-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.hint-fade-leave-to {
  opacity: 0;
}

/* 触摸设备横屏：书桌托盘压扁 */
@media (pointer: coarse) and (orientation: landscape) {
  .desk-surface { min-height: 44px; padding: 0.25rem 0.75rem; }
}
</style>
