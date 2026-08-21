import { onMounted, onUnmounted, type Ref } from 'vue'
import { useGameStore } from '@/stores/game'

/**
 * 游戏主循环 composable
 * TODO(T6): 重写下落玩法为点选即放——本 composable 依赖已移除的下落逻辑（updateGame/spawnWave/isFrozen），
 * 暂时保留空循环骨架，待 GameView 重写为点选即放后移除或替换。
 */
export function useGameLoop(_gameAreaRef: Ref<HTMLElement | null>) {
  const store = useGameStore()

  let animationId: number | null = null
  let isRunning = false

  function gameLoop() {
    if (!isRunning) return
    // TODO(T6): 重写下落玩法为点选即放——原 updateGame/spawnWave/isFrozen 已移除
    animationId = requestAnimationFrame(gameLoop)
  }

  function start() {
    if (isRunning) return
    isRunning = true
    animationId = requestAnimationFrame(gameLoop)
  }

  function stop() {
    isRunning = false
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }

  function togglePause() {
    if (!store.isPlaying && !store.isPaused) return
    store.setGamePhase(store.isPaused ? 'playing' : 'paused')
  }

  onMounted(() => {
    stop()
  })

  onUnmounted(() => {
    stop()
  })

  return {
    start,
    stop,
    togglePause,
  }
}
