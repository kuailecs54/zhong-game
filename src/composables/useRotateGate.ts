import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * 部分浏览器/TS lib 的 ScreenOrientation 类型未声明 lock 方法，
 * 这里补充最小类型（运行时用可选链兜底，不支持时静默失败）。
 */
interface ScreenOrientationWithLock {
  lock?: (orientation: 'landscape') => Promise<void>
}

/**
 * 旋转门（横屏专享）逻辑：
 * 仅在触屏设备、竖屏且窗口较窄时显示旋转提示遮罩。
 */
export function useRotateGate() {
  const isTouch = ref(false)
  const isPortrait = ref(false)
  const isNarrow = ref(false)

  function update() {
    isTouch.value = window.matchMedia('(pointer: coarse)').matches
    isPortrait.value = window.innerHeight > window.innerWidth
    isNarrow.value = window.innerWidth < 768
  }

  const showGate = computed(() => isTouch.value && isPortrait.value && isNarrow.value)

  const portraitMq = window.matchMedia('(orientation: portrait)')

  onMounted(() => {
    update()
    // 多重监听兼容不同内核：orientationchange/resize 在部分浏览器（如夸克）可能不触发，
    // matchMedia change 事件是最可靠的方式
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    portraitMq.addEventListener('change', update)
  })
  onUnmounted(() => {
    window.removeEventListener('resize', update)
    window.removeEventListener('orientationchange', update)
    portraitMq.removeEventListener('change', update)
  })

  /**
   * 强制横屏（Android 生效）：进入全屏后锁定横屏。
   * 不依赖系统自动旋转，也无需浏览器自带的旋转按钮（夸克等没有）。
   * iOS Safari 不支持 orientation.lock，调用会静默失败，保持遮罩引导。
   * 需在用户手势（按钮点击）中调用。
   */
  async function requestLandscape() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.()
      }
      const orientation = screen.orientation as ScreenOrientationWithLock | undefined
      await orientation?.lock?.('landscape')
      // 部分浏览器锁屏后不触发 resize/orientationchange，主动刷新一次检测
      setTimeout(update, 800)
    } catch {
      // iOS 或无全屏权限：静默失败，旋转遮罩继续引导
    }
  }

  return { showGate, requestLandscape }
}
