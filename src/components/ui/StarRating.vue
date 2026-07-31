<script setup lang="ts">
defineProps<{
  stars: number
  maxStars?: number
}>()
</script>

<template>
  <span class="star-rating" :class="`star-rating--${maxStars || 3}`">
    <span
      v-for="i in (maxStars || 3)"
      :key="i"
      class="star"
      :class="{ 'star--filled': i <= stars, 'star--empty': i > stars }"
    >
      {{ i <= stars ? '\u2605' : '\u2606' }}
    </span>
  </span>
</template>

<style scoped>
.star-rating {
  display: inline-flex;
  gap: 2px;
  font-size: 1.25rem;
  line-height: 1;
}

.star--filled {
  color: #f59e0b;
}

.star--empty {
  color: rgba(255, 255, 255, 0.25);
}
</style>