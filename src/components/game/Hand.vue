<script setup lang="ts">
defineProps<{
  x: number
  y: number
}>()
</script>

<template>
  <div class="hand" :style="{ left: x + '%', top: y + 'px' }">
    <svg viewBox="0 0 24 24" class="hand-svg" aria-hidden="true">
      <path d="M23,4v12.5c0,1.93-1.57,3.5-3.5,3.5c-0.74,0-1.42-0.23-2-0.62c-0.13,0.13-0.27,0.26-0.42,0.37C16.5,20.88,15.68,21,15,21c-0.35,0-0.69-0.05-1-0.13c-0.12,0.2-0.25,0.39-0.4,0.57C12.88,22.3,11.78,23,10.5,23c-0.26,0-0.53-0.03-0.78-0.08C8.78,22.62,7.68,21.9,7,20.86l-3.77-4.62c-0.76-0.93-0.65-2.3,0.25-3.1c0.85-0.76,2.09-0.65,2.82,0.18L7,14.4V4c0-1.1,0.9-2,2-2s2,0.9,2,2v5h1V3c0-1.1,0.9-2,2-2s2,0.9,2,2v6h1V4c0-1.1,0.9-2,2-2s2,0.9,2,2v5h1V4c0-1.1,0.9-2,2-2s2,0.9,2,2L23,4z"/>
    </svg>
  </div>
</template>

<style scoped>
.hand {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 64px;
  height: 64px;
  z-index: 15;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.45));
}

.hand-svg {
  width: 56px;
  height: 56px;
  fill: #fcd34d;
}

@media (max-width: 480px) {
  .hand {
    width: 52px;
    height: 52px;
  }

  .hand-svg {
    width: 46px;
    height: 46px;
  }
}
</style>
