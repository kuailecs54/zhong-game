<script setup lang="ts">
const emit = defineEmits<{
  resume: []
  restart: []
  quit: []
}>()
</script>

<template>
  <div class="pause-overlay">
    <div class="pause-card">
      <h2 class="pause-title">游戏暂停</h2>
      <div class="pause-actions">
        <button class="pause-btn pause-btn--primary" @click="emit('resume')">继续游戏</button>
        <button class="pause-btn" @click="emit('restart')">重新开始</button>
        <button class="pause-btn pause-btn--quit" @click="emit('quit')">退出关卡</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pause-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 12, 41, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.pause-card {
  background: var(--surface-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 2.5rem 2rem;
  width: min(360px, calc(100vw - 2rem));
  text-align: center;
}

.pause-title {
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--text-primary);
  margin-bottom: 1.75rem;
}

.pause-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pause-btn {
  padding: 0.85rem 1.5rem;
  background: var(--surface-glass-strong);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s var(--ease-spring), background 0.2s ease, box-shadow 0.2s ease;
}

.pause-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  transform: translateY(-2px);
}

.pause-btn--primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-strong));
  color: #fff;
  border-color: transparent;
  box-shadow: var(--glow-primary);
}

.pause-btn--primary:hover {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-strong));
  box-shadow: 0 8px 30px rgba(99, 102, 241, 0.5);
}

.pause-btn--quit {
  color: var(--text-muted);
}
</style>
