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
    <!-- 背景装饰光斑 -->
    <div class="home-bg-decor">
      <div class="bg-orb bg-orb--1"></div>
      <div class="bg-orb bg-orb--2"></div>
      <div class="bg-orb bg-orb--3"></div>
    </div>

    <div class="home-card">
      <!-- 玻璃质感高光 -->
      <div class="card-highlight"></div>
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
        <button type="submit" class="form-btn">
          <span class="btn-text">开始游戏</span>
          <span class="btn-shimmer"></span>
        </button>
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
  position: relative;
  overflow: hidden;
}

/* 背景装饰光斑 */
.home-bg-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
}

.bg-orb--1 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.3), transparent 70%);
  top: -80px;
  right: -60px;
  animation: orbFloat 8s ease-in-out infinite;
}

.bg-orb--2 {
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(34, 211, 238, 0.2), transparent 70%);
  bottom: -50px;
  left: -40px;
  animation: orbFloat 10s ease-in-out infinite reverse;
}

.bg-orb--3 {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(244, 114, 182, 0.15), transparent 70%);
  top: 40%;
  left: 50%;
  transform: translateX(-50%);
  animation: orbFloat 12s ease-in-out infinite;
}

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(15px, -10px) scale(1.05); }
  66% { transform: translate(-10px, 8px) scale(0.95); }
}

.home-card {
  position: relative;
  z-index: 1;
  background: var(--surface-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow:
    var(--shadow-lg),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  padding: 2.5rem 2rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
  animation: homeCardIn 0.6s var(--ease-out-expo) both;
  overflow: hidden;
}

/* 玻璃高光层 */
.card-highlight {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  pointer-events: none;
}

@keyframes homeCardIn {
  from {
    opacity: 0;
    transform: translateY(28px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.home-title {
  position: relative;
  font-size: 2rem;
  font-weight: 900;
  background: linear-gradient(135deg, #c7d2fe 0%, #22d3ee 40%, #a78bfa 80%, #f0abfc 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.5rem;
  letter-spacing: 0.03em;
  filter: drop-shadow(0 0 20px rgba(99, 102, 241, 0.4)) drop-shadow(0 0 8px rgba(34, 211, 238, 0.3));
  animation: titleGlow 3s ease-in-out infinite, itemIn 0.6s var(--ease-out-expo) 0.05s both;
}

@keyframes titleGlow {
  0%, 100% {
    filter: drop-shadow(0 0 20px rgba(99, 102, 241, 0.4)) drop-shadow(0 0 8px rgba(34, 211, 238, 0.3));
  }
  50% {
    filter: drop-shadow(0 0 30px rgba(99, 102, 241, 0.55)) drop-shadow(0 0 12px rgba(34, 211, 238, 0.45));
  }
}

.home-subtitle {
  position: relative;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.65);
  margin-bottom: 2rem;
  line-height: 1.5;
  animation: itemIn 0.55s var(--ease-out-expo) 0.15s both;
}

.home-form {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  animation: itemIn 0.55s var(--ease-out-expo) 0.25s both;
}

@keyframes itemIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.25s var(--ease-soft), box-shadow 0.25s var(--ease-soft), background 0.25s var(--ease-soft);
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.form-input:focus {
  border-color: var(--color-primary);
  background: rgba(255, 255, 255, 0.1);
  box-shadow:
    0 0 0 3px rgba(99, 102, 241, 0.2),
    0 0 20px rgba(99, 102, 241, 0.15);
}

.form-error {
  font-size: 0.85rem;
  color: var(--color-error);
  text-align: left;
  animation: shake 0.4s var(--ease-soft);
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}

.form-btn {
  position: relative;
  margin-top: 0.5rem;
  padding: 0.85rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-strong));
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.25s var(--ease-soft), box-shadow 0.25s var(--ease-soft);
  box-shadow: var(--glow-primary);
  overflow: hidden;
}

.btn-text {
  position: relative;
  z-index: 1;
}

/* 按钮微光扫过效果 */
.btn-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s ease;
}

.form-btn:hover .btn-shimmer {
  left: 100%;
}

.form-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(99, 102, 241, 0.5);
}

.form-btn:active {
  transform: translateY(0) scale(0.98);
}
</style>