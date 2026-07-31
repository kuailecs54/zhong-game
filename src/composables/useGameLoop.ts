import { onUnmounted, type Ref } from 'vue'
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
        store.spawnWave()
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
   */
  function togglePause() {
    if (!store.isPlaying) return
    const isPausing = !store.isPaused
    store.setGamePhase(isPausing ? 'paused' : 'playing')
    if (isPausing) {
      // 暂停时重置 lastTimestamp，避免恢复时跳帧
      lastTimestamp = 0
    }
  }

  onUnmounted(() => {
    stop()
  })

  return {
    start,
    stop,
    togglePause,
  }
}