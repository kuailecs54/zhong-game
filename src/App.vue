<script setup lang="ts">
</script>

<template>
  <div id="app-container">
    <RouterView v-slot="{ Component }">
      <Transition name="fade-slide" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </div>
</template>

<style scoped>
#app-container {
  min-height: 100vh;
}
</style>
