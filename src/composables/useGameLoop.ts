import { onMounted, onUnmounted, type Ref } from 'vue'
import { useGameStore } from '@/stores/game'

/**
 * 游戏主循环 composable
 * 使用 requestAnimationFrame 驱动游戏循环
 */
export function useGameLoop(gameAreaRef: Ref<HTMLElement | null>) {
  const store = useGameStore()

  let animationId: number | null = null
  let lastTimestamp = 0
  let spawnTimer = 0
  let isRunning = false

  /**
   * 获取游戏区域高度
   */
  function getGameAreaHeight(): number {
    return gameAreaRef.value?.clientHeight ?? 600
  }

  /**
   * 获取游戏区域宽度
   */
  function getGameAreaWidth(): number {
    return gameAreaRef.value?.clientWidth ?? 800
  }

  /**
   * 主循环
   */
  function gameLoop(timestamp: number) {
    if (!isRunning) return

    // 计算 deltaTime（秒）
    const deltaTime = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 0.016
    lastTimestamp = timestamp

    // 限制最大 deltaTime，防止卡顿时跳帧
    const clampedDelta = Math.min(deltaTime, 0.1)

    // 更新游戏状态
    store.updateGame(clampedDelta, getGameAreaHeight())

    // 处理生成计时器（仅在游戏运行且未暂停时）
    if (store.isPlaying && !store.isPaused && !store.isFrozen) {
      spawnTimer -= clampedDelta * 1000
      if (spawnTimer <= 0 && store.isPlaying) {
        store.spawnWave(getGameAreaWidth(), getGameAreaHeight())
        spawnTimer = store.currentSpawnInterval
      }
    }

    animationId = requestAnimationFrame(gameLoop)
  }

  /**
   * 开始游戏循环
   */
  function start() {
    if (isRunning) return
    isRunning = true
    lastTimestamp = 0
    spawnTimer = 1000 // 首次生成等待1秒
    animationId = requestAnimationFrame(gameLoop)
  }

  /**
   * 停止游戏循环
   */
  function stop() {
    isRunning = false
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }

  /**
   * 暂停/继续
   * 暂停时 cancelAnimationFrame 避免空转 rAF，恢复时重启动并重置 lastTimestamp 避免跳帧
   */
  function togglePause() {
    // 仅在游戏运行或已暂停时允许切换；暂停时 isPlaying 为 false，不能据此拦截
    if (!store.isPlaying && !store.isPaused) return
    const isPausing = !store.isPaused
    store.setGamePhase(isPausing ? 'paused' : 'playing')
    if (isPausing) {
      // 暂停：取消 rAF，避免后台空转
      if (animationId !== null) {
        cancelAnimationFrame(animationId)
        animationId = null
      }
      // 重置 lastTimestamp，避免恢复时 deltaTime 过大导致跳帧
      lastTimestamp = 0
    } else {
      // 恢复：重启动 rAF
      lastTimestamp = 0
      if (animationId === null) {
        // 保持 isRunning 为 true 的语义（循环应处于运行态）
        isRunning = true
        animationId = requestAnimationFrame(gameLoop)
      }
    }
  }

  // visibilitychange 暂停/恢复 rAF，省电且避免切后台后 deltaTime 过大
  function onVisibilityChange() {
    if (typeof document === 'undefined') return
    if (document.hidden) {
      if (isRunning && animationId !== null) {
        cancelAnimationFrame(animationId)
        animationId = null
      }
      // 避免切回时跳帧
      lastTimestamp = 0
    } else {
      if (isRunning && animationId === null && store.isPlaying && !store.isPaused) {
        lastTimestamp = 0
        animationId = requestAnimationFrame(gameLoop)
      }
    }
  }

  onMounted(() => {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
  })

  onUnmounted(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
    stop()
  })

  return {
    start,
    stop,
    togglePause,
  }
}