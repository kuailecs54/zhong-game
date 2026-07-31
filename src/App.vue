<script setup lang="ts">
import { watch } from 'vue'
import { useRotateGate } from '@/composables/useRotateGate'
import { useGameStore } from '@/stores/game'
import RotateGate from '@/components/RotateGate.vue'

const { showGate, requestLandscape } = useRotateGate()
const gameStore = useGameStore()

watch(showGate, (gated) => {
  if (gated && gameStore.isPlaying && !gameStore.isPaused) {
    gameStore.setGamePhase('paused')
  }
})
</script>

<template>
  <div id="app-container">
    <RouterView v-slot="{ Component }">
      <Transition name="fade-slide" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
    <RotateGate v-if="showGate" @request-landscape="requestLandscape" />
  </div>
</template>

<style scoped>
#app-container {
  min-height: 100vh;
  overflow-x: hidden;
}

/* 页面切换：更丝滑的淡入滑动 */
.fade-slide-enter-active {
  transition: opacity 0.35s var(--ease-out-expo), transform 0.35s var(--ease-out-expo);
}

.fade-slide-leave-active {
  transition: opacity 0.2s var(--ease-soft), transform 0.2s var(--ease-soft);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.985);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.99);
}
</style>
