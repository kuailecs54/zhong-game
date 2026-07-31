<script setup lang="ts">
defineProps<{
  stars: number
  maxStars?: number
}>()

const MAX = 3
</script>

<template>
  <span class="star-rating" role="img" :aria-label="`星级 ${stars} / ${maxStars || MAX}`">
    <svg width="0" height="0" class="star-defs">
      <defs>
        <linearGradient id="star-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24" />
          <stop offset="100%" stop-color="#f59e0b" />
        </linearGradient>
      </defs>
    </svg>
    <span
      v-for="i in (maxStars || MAX)"
      :key="i"
      class="star"
      :class="{ 'star--filled': i <= stars, 'star--empty': i > stars }"
    >
      <svg viewBox="0 0 24 24" class="star-svg">
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          :fill="i <= stars ? 'url(#star-gradient)' : 'currentColor'"
        />
      </svg>
    </span>
  </span>
</template>

<style scoped>
.star-rating {
  display: inline-flex;
  gap: 3px;
  line-height: 1;
}

.star-defs {
  position: absolute;
  width: 0;
  height: 0;
}

.star {
  display: inline-flex;
  width: 1.25rem;
  height: 1.25rem;
  transition: transform 0.2s var(--ease-spring);
}

.star-svg {
  width: 100%;
  height: 100%;
}

.star--filled {
  color: var(--color-star);
  filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.5));
  animation: starFilledPop 0.3s var(--ease-spring) both;
}

@keyframes starFilledPop {
  0% { transform: scale(0.8); }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.star--empty {
  color: rgba(255, 255, 255, 0.15);
}
</style>