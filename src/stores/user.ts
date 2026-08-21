import { defineStore } from 'pinia'
import type { LevelProgress } from '@/data/types'

const STORAGE_KEY = 'pm-sort-game-user'

/** 时间衰减阈值：7 天（毫秒） */
const DECAY_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000

/** 掌握度条目（Leitner 三档盒，Section 7 实现升降档写入） */
interface MasteryEntry {
  /** 档位：0=生疏 1=巩固 2=掌握 */
  box: number
  /** 最近一次作答时间戳 */
  lastSeen: number
}

/** 用户偏好设置（向后兼容：旧数据无 settings 时以空对象初始化） */
interface UserSettings {
  /** 双模式上次选择 */
  difficultyMode?: 'challenge' | 'relaxed'
  /** 音效开关 */
  soundEnabled?: boolean
}

interface UserState {
  username: string
  progress: Record<string, LevelProgress>
  settings: UserSettings
  /** 掌握度档案：mastery[processId][dimension] = { box, lastSeen }，dimension ∈ position/definition/itto */
  mastery: Record<string, Record<string, MasteryEntry>>
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    username: '',
    progress: {},
    settings: {},
    mastery: {},
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

    /** 查询掌握度档位（缺失返回 0=生疏） */
    getMasteryBox:
      (state) =>
      (processId: string, dimension: string): number => {
        return state.mastery[processId]?.[dimension]?.box ?? 0
      },

    /** 是否存在作答记录（区分「生疏 0」与「从未练习」，热力图四色用） */
    hasMasteryRecord:
      (state) =>
      (processId: string, dimension: string): boolean => {
        return !!state.mastery[processId]?.[dimension]
      },
  },

  actions: {
    setUsername(name: string) {
      this.username = name
      this.saveToStorage()
    },

    /** 局部更新偏好设置并持久化 */
    setSettings(partial: Partial<UserSettings>) {
      this.settings = { ...this.settings, ...partial }
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

    /**
     * Leitner 作答写入：答对升一档（封顶 2），答错/超时归 0；
     * 同时更新 lastSeen 并持久化（护盾免罚的答错同样归 0，掌握度语义与免罚无关）
     */
    recordAnswer(processId: string, dimension: 'position' | 'definition' | 'itto', correct: boolean) {
      const dims = (this.mastery[processId] ??= {})
      const prev = dims[dimension]
      const box = correct ? Math.min(2, (prev?.box ?? 0) + 1) : 0
      dims[dimension] = { box, lastSeen: Date.now() }
      this.saveToStorage()
    },

    loadFromStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const data = JSON.parse(raw)
          this.username = data.username || ''
          this.progress = data.progress || {}
          // 旧数据无 settings/mastery 时以空对象初始化（D10 向后兼容）
          this.settings = data.settings ?? {}
          this.mastery = data.mastery ?? {}
        }
      } catch {
        // Invalid stored data or environment without localStorage, ignore
      }

      // 惰性衰减：超 7 天未练降一档（不低于 0），生疏档保持 0；有衰减则持久化
      const now = Date.now()
      let decayed = false
      for (const dims of Object.values(this.mastery)) {
        for (const entry of Object.values(dims)) {
          if (entry.box > 0 && now - entry.lastSeen > DECAY_THRESHOLD_MS) {
            entry.box -= 1
            entry.lastSeen = now
            decayed = true
          }
        }
      }
      if (decayed) {
        this.saveToStorage()
      }
    },

    saveToStorage() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            username: this.username,
            progress: this.progress,
            settings: this.settings,
            mastery: this.mastery,
          }),
        )
      } catch {
        // Storage full or unavailable, ignore
      }
    },
  },
})