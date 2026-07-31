<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const username = ref('')
const error = ref('')

function validate(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return '请输入用户名'
  if (trimmed.length > 20) return '用户名不能超过20个字符'
  return null
}

function handleSubmit() {
  error.value = ''
  const validationError = validate(username.value)
  if (validationError) {
    error.value = validationError
    return
  }
  userStore.setUsername(username.value.trim())
  router.push('/levels')
}
</script>

<template>
  <div class="home-view">
    <div class="home-card">
      <h1 class="home-title">项目管理归类游戏</h1>
      <p class="home-subtitle">通过分类游戏，掌握 PMBOK 过程组与知识领域</p>
      <form class="home-form" @submit.prevent="handleSubmit">
        <label for="username" class="form-label">请输入用户名</label>
        <input
          id="username"
          v-model="username"
          type="text"
          class="form-input"
          placeholder="你的名字"
          maxlength="20"
          autocomplete="off"
        />
        <p v-if="error" class="form-error">{{ error }}</p>
        <button type="submit" class="form-btn">开始游戏</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
  background: var(--bg-gradient);
}

.home-card {
  background: var(--surface-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 2.5rem 2rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
  animation: homeCardIn 0.5s ease;
}

@keyframes homeCardIn {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.home-title {
  font-size: 1.9rem;
  font-weight: 800;
  background: linear-gradient(135deg, #a5b4fc 0%, #22d3ee 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.5rem;
  letter-spacing: 0.02em;
}

.home-subtitle {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.65);
  margin-bottom: 2rem;
  line-height: 1.4;
}

.home-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  text-align: left;
}

.form-input {
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.45);
}

.form-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
}

.form-error {
  font-size: 0.85rem;
  color: var(--color-error);
  text-align: left;
}

.form-btn {
  margin-top: 0.5rem;
  padding: 0.8rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-strong));
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: var(--glow-primary);
}

.form-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(99, 102, 241, 0.45);
}

.form-btn:active {
  transform: translateY(0);
}
</style>