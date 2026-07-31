<script setup lang="ts">
const emit = defineEmits<{ requestLandscape: [] }>()

// 支持全屏 + orientation.lock 的浏览器（Android Chrome/夸克等）才显示强制横屏按钮；
// iOS Safari 无 lock API 时不显示，仍靠旋转设备引导
const canForceLandscape =
  typeof document !== 'undefined' &&
  typeof document.documentElement.requestFullscreen === 'function' &&
  typeof (screen.orientation as { lock?: unknown }).lock === 'function'
</script>

<template>
  <div class="rotate-gate">
    <div class="rotate-icon"></div>
    <p class="rotate-title">请旋转设备至横屏</p>
    <p class="rotate-sub">本游戏专为横屏设计</p>
    <button v-if="canForceLandscape" class="rotate-btn" @click="emit('requestLandscape')">
      全屏横屏
    </button>
  </div>
</template>

<style scoped>
.rotate-gate {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background: rgba(10, 8, 30, 0.96);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #ffffff;
}

/* 旋转的手机图标：方块 + 伪元素箭头，整体横竖摆动 */
.rotate-icon {
  position: relative;
  width: 64px;
  height: 64px;
  border: 3px solid #67e8f9;
  border-radius: 10px;
  box-shadow: 0 0 12px rgba(103, 232, 249, 0.5);
  animation: rotate-wobble 1.6s ease-in-out infinite;
}

/* 向上箭头（border 三角） */
.rotate-icon::after {
  content: '';
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 12px solid #a78bfa;
}

@keyframes rotate-wobble {
  0% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(90deg);
  }
  100% {
    transform: rotate(0deg);
  }
}

.rotate-title {
  font-size: 1.4rem;
  font-weight: bold;
  margin: 0;
}

.rotate-sub {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

/* 强制横屏按钮（Android 浏览器显示，点击进入全屏并锁定横屏） */
.rotate-btn {
  margin-top: 10px;
  padding: 0.75rem 2.4rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-strong));
  color: #ffffff;
  border: none;
  border-radius: 999px;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
  transition: transform 0.15s var(--ease-soft);
}

.rotate-btn:active {
  transform: scale(0.96);
}
</style>
