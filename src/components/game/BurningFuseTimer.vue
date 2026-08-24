<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { deriveBurningFuseState } from './burningFuse'

const props = withDefaults(defineProps<{
  visualPaused?: boolean
}>(), {
  visualPaused: false,
})

const gameStore = useGameStore()
const state = computed(() => deriveBurningFuseState(
  gameStore.timeLeft,
  gameStore.level?.timePerCard ?? 0,
  gameStore.freezeTicksLeft > 0,
  props.visualPaused || gameStore.isPaused,
))
</script>

<template>
  <div
    v-if="gameStore.difficultyMode === 'challenge'"
    class="burning-fuse"
    :class="{ critical: state.critical, 'final-five': state.finalFive, frozen: state.frozen, paused: state.paused }"
    role="timer"
    :aria-label="`剩余 ${state.seconds} 秒`"
  >
    <span class="fuse-time">{{ state.seconds }}s</span>
    <div class="fuse-track" aria-hidden="true">
      <div class="fuse-rope" :style="{ width: `${state.percent}%` }">
        <span v-if="state.percent > 0 && state.percent < 100" class="fuse-tip">
          <span v-if="state.frozen" class="fuse-ice">❄</span>
          <span v-else class="fuse-flame"></span>
        </span>
      </div>
      <div class="fuse-ash" :style="{ width: `${100 - state.percent}%` }"></div>
    </div>
  </div>
</template>

<style scoped>
.burning-fuse {
  --fuse-alert: #f97316;
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  width: min(720px, calc(100% - 32px));
  min-height: 28px;
  margin: 8px auto 4px;
}

.fuse-time {
  display: grid;
  place-items: center;
  width: 64px;
  height: 42px;
  color: #fbbf24;
  font-size: 13px;
  font-weight: 800;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.fuse-track {
  position: relative;
  display: flex;
  height: 12px;
  border-radius: 3px;
  background: rgba(15, 23, 42, 0.55);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.fuse-ash {
  height: 100%;
  background: repeating-linear-gradient(90deg, #64748b 0 4px, #334155 4px 8px);
  opacity: 0.55;
}

.fuse-rope {
  position: relative;
  height: 100%;
  min-width: 0;
  border-radius: 3px 0 0 3px;
  background: repeating-linear-gradient(115deg, #d6a45d 0 5px, #9a6234 5px 9px, #e4bb78 9px 13px);
  box-shadow: inset 0 2px rgba(255, 255, 255, 0.18), inset 0 -2px rgba(69, 37, 17, 0.35);
  transition: width 0.1s linear;
}

.fuse-tip {
  position: absolute;
  top: 50%;
  right: 0;
  width: 24px;
  height: 28px;
  transform: translate(50%, -50%);
}

.fuse-flame {
  position: absolute;
  left: 5px;
  top: 3px;
  width: 15px;
  height: 20px;
  border-radius: 70% 30% 65% 35%;
  background: radial-gradient(circle at 55% 70%, #fff7ae 0 15%, #fbbf24 16% 42%, #f97316 43% 70%, #dc2626 71%);
  filter: drop-shadow(0 0 7px rgba(249, 115, 22, 0.8));
  transform: rotate(12deg);
  animation: flameFlicker 0.38s ease-in-out infinite alternate;
}

.fuse-ice {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #bae6fd;
  font-size: 21px;
  text-shadow: 0 0 8px #38bdf8;
}

.burning-fuse.critical {
  --fuse-alert: #ef4444;
}

.burning-fuse.critical .fuse-time { color: #f87171; }
.burning-fuse.critical .fuse-track { box-shadow: 0 0 12px rgba(239, 68, 68, 0.35), inset 0 0 0 1px rgba(248, 113, 113, 0.35); }
.burning-fuse.critical:not(.paused) { animation: fuseWarning 0.8s ease-in-out infinite; }
.burning-fuse.frozen .fuse-rope { filter: saturate(0.7) brightness(1.25); box-shadow: inset 0 0 0 2px rgba(125, 211, 252, 0.45); }
.burning-fuse.paused .fuse-flame { animation-play-state: paused; }

.burning-fuse.final-five .fuse-time {
  color: #fff;
  font-size: 30px;
  line-height: 1;
  background: #dc2626;
  border: 2px solid #fecaca;
  border-radius: 7px;
  box-shadow: 0 0 18px rgba(239, 68, 68, 0.75);
  text-shadow: 0 2px 0 rgba(127, 29, 29, 0.7);
}

.burning-fuse.final-five:not(.paused) .fuse-time {
  animation: finalCountdownBeat 1s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
}

@keyframes flameFlicker {
  from { transform: rotate(8deg) scale(0.9, 1); }
  to { transform: rotate(16deg) scale(1.08, 0.94); }
}

@keyframes fuseWarning {
  50% { opacity: 0.72; }
}

@keyframes finalCountdownBeat {
  0% { transform: scale(1.18); }
  32% { transform: scale(1); }
  100% { transform: scale(1); }
}

@media (pointer: coarse) and (orientation: landscape) {
  .burning-fuse {
    grid-template-columns: 52px minmax(0, 1fr);
    gap: 7px;
    min-height: 22px;
    margin-top: 3px;
  }
  .fuse-time { width: 52px; height: 34px; font-size: 11px; }
  .burning-fuse.final-five .fuse-time { font-size: 24px; }
  .fuse-track { height: 9px; }
  .fuse-tip { transform: translate(50%, -50%) scale(0.82); }
}

@media (prefers-reduced-motion: reduce) {
  .fuse-rope { transition: none; }
  .fuse-flame, .burning-fuse.critical:not(.paused), .burning-fuse.final-five:not(.paused) .fuse-time { animation: none; }
}
</style>
