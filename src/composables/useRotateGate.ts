import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * 部分浏览器/TS lib 的 ScreenOrientation 类型未声明 lock 方法，
 * 这里补充最小类型（运行时用可选链兜底，不支持时静默失败）。
 */
interface ScreenOrientationWithLock {
  lock?: (orientation: 'landscape') => Promise<void>
  unlock?: () => void
}

// ---------- 全屏前缀兼容（Safari/旧 WebKit 需 webkit 前缀） ----------
function getFullscreenElement(): Element | null {
  const doc = document as unknown as Record<string, unknown>
  return (document.fullscreenElement as Element | null) ?? (doc['webkitFullscreenElement'] as Element | null) ?? null
}

function requestFullscreenWithPrefix(el: HTMLElement): Promise<void> {
  const anyEl = el as unknown as Record<string, (() => Promise<void>) | undefined>
  if (el.requestFullscreen) return el.requestFullscreen()
  if (anyEl['webkitRequestFullscreen']) return anyEl['webkitRequestFullscreen']!.call(el)
  // iOS 对非视频元素通常不支持全屏，此处兼容旧 WebKit 前缀兜底
  if (anyEl['webkitEnterFullscreen']) return (anyEl['webkitEnterFullscreen'] as unknown as () => Promise<void>).call(el)
  const anyDoc = document.documentElement as unknown as Record<string, (() => Promise<void>) | undefined>
  // 兜底：部分旧实现挂在 documentElement 的 ms 前缀
  if (anyDoc['msRequestFullscreen']) return anyDoc['msRequestFullscreen']!.call(el)
  return Promise.reject(new Error('Fullscreen API not supported'))
}

// ---------- matchMedia 监听兼容：Safari < 14 仅支持 addListener/removeListener ----------
function addMQListener(mq: MediaQueryList, handler: () => void): void {
  const anyMq = mq as unknown as Record<string, unknown>
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', handler)
  } else if (typeof anyMq['addListener'] === 'function') {
    ;(anyMq['addListener'] as (cb: () => void) => void).call(mq, handler)
  }
}

function removeMQListener(mq: MediaQueryList, handler: () => void): void {
  const anyMq = mq as unknown as Record<string, unknown>
  if (typeof mq.removeEventListener === 'function') {
    mq.removeEventListener('change', handler)
  } else if (typeof anyMq['removeListener'] === 'function') {
    ;(anyMq['removeListener'] as (cb: () => void) => void).call(mq, handler)
  }
}

/**
 * 旋转门（横屏专享）逻辑：
 * 仅在触屏设备、竖屏且窗口较窄时显示旋转提示遮罩。
 */
export function useRotateGate() {
  const isTouch = ref(false)
  const isPortrait = ref(false)
  const isNarrow = ref(false)

  // 横竖屏媒体查询句柄，移入 onMounted 内初始化以兼容 SSR/jsdom
  let portraitMq: MediaQueryList | null = null

  function update() {
    // SSR/jsdom 兼容：无 window 时跳过
    if (typeof window === 'undefined') return
    isTouch.value = window.matchMedia('(pointer: coarse)').matches
    isPortrait.value = window.innerHeight > window.innerWidth
    isNarrow.value = window.innerWidth < 768
  }

  const showGate = computed(() => isTouch.value && isPortrait.value && isNarrow.value)

  // fullscreenchange 回退：退出全屏时主动 unlock + 刷新检测，避免横屏锁残留
  function onFullscreenChange() {
    if (!getFullscreenElement()) {
      try {
        const orientation = screen.orientation as ScreenOrientationWithLock | undefined
        orientation?.unlock?.()
      } catch {
        // 忽略 unlock 异常（部分浏览器不支持）
      }
    }
    setTimeout(update, 200)
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    // 初始化媒体查询（移入 onMounted，避免 SSR/jsdom 顶层执行时 window 不存在）
    portraitMq = window.matchMedia('(orientation: portrait)')

    update()
    // 多重监听兼容不同内核：orientationchange/resize 在部分浏览器（如夸克）可能不触发，
    // matchMedia change 事件是最可靠的方式
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    addMQListener(portraitMq, update)
    // 全屏状态监听，兼顾前缀
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('webkitfullscreenchange' as unknown as 'fullscreenchange', onFullscreenChange as unknown as EventListener)
  })

  onUnmounted(() => {
    if (typeof window === 'undefined') return
    window.removeEventListener('resize', update)
    window.removeEventListener('orientationchange', update)
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    document.removeEventListener('webkitfullscreenchange' as unknown as 'fullscreenchange', onFullscreenChange as unknown as EventListener)
    // 判空后再移除，避免 mounted 未执行或初始化失败时抛错
    if (portraitMq) {
      removeMQListener(portraitMq, update)
      portraitMq = null
    }
  })

  /**
   * 强制横屏（Android 生效）：进入全屏后锁定横屏。
   * 不依赖系统自动旋转，也无需浏览器自带的旋转按钮（夸克等没有）。
   * iOS Safari 不支持 orientation.lock，调用会静默失败，保持遮罩引导。
   * 需在用户手势（按钮点击）中调用。
   */
  async function requestLandscape() {
    try {
      if (!getFullscreenElement()) {
        await requestFullscreenWithPrefix(document.documentElement)
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
