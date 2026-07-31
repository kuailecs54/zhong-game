import { defineStore } from 'pinia'
import type { LevelProgress } from '@/data/types'

const STORAGE_KEY = 'pm-sort-game-user'

interface UserState {
  username: string
  progress: Record<string, LevelProgress>
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    username: '',
    progress: {},
  }),

  getters: {
    isNewUser: (state): boolean => !state.username,

    getLevelStars:
      (state) =>
      (levelId: string): number => {
        return state.progress[levelId]?.stars ?? 0
      },

    getLevelBestScore:
      (state) =>
      (levelId: string): number => {
        return state.progress[levelId]?.bestScore ?? 0
      },

    isLevelUnlocked:
      (state) =>
      (
        levelId: string,
        levels: { id: string; stage: number; number: number }[],
      ): boolean => {
        if (levelId === 'sort-1-1') return true

        const sorted = [...levels].sort((a, b) => {
          if (a.stage !== b.stage) return a.stage - b.stage
          return a.number - b.number
        })

        const currentIndex = sorted.findIndex((l) => l.id === levelId)
        if (currentIndex <= 0) return false

        const prevLevel = sorted[currentIndex - 1]
        return (state.progress[prevLevel.id]?.stars ?? 0) >= 1
      },

    totalStars: (state): number => {
      return Object.values(state.progress).reduce((sum, p) => sum + p.stars, 0)
    },
  },

  actions: {
    setUsername(name: string) {
      this.username = name
      this.saveToStorage()
    },

    saveProgress(levelId: string, stars: number, score: number) {
      const existing = this.progress[levelId]
      if (
        !existing ||
        stars > existing.stars ||
        (stars === existing.stars && score > existing.bestScore)
      ) {
        this.progress[levelId] = {
          stars: Math.max(stars, existing?.stars ?? 0),
          bestScore: Math.max(score, existing?.bestScore ?? 0),
        }
        this.saveToStorage()
      }
    },

    loadFromStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const data = JSON.parse(raw)
          this.username = data.username || ''
          this.progress = data.progress || {}
        }
      } catch {
        // Invalid stored data, ignore
      }
    },

    saveToStorage() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            username: this.username,
            progress: this.progress,
          }),
        )
      } catch {
        // Storage full or unavailable, ignore
      }
    },
  },
})