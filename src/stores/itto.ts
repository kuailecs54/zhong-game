import { defineStore } from 'pinia'
import type { ITTO } from '@/data/types'

export type ITTOCategory = 'inputs' | 'tools' | 'outputs'

interface QuizQuestion {
  processId: string
  processName: string
  correctInputs: string[]
  correctTools: string[]
  correctOutputs: string[]
  optionsInputs: string[]
  optionsTools: string[]
  optionsOutputs: string[]
  /** 原始 ITTO 数据，含 tags，供知识卡片展示 */
  ittoRaw: ITTO
}

export interface QuizResult {
  inputs: boolean
  tools: boolean
  outputs: boolean
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function sampleExcept(pool: string[], correct: string[], n: number): string[] {
  const candidates = shuffle(pool.filter(x => !correct.includes(x)))
  return candidates.slice(0, Math.max(0, n - correct.length))
}

export const useIttoStore = defineStore('itto', {
  state: () => ({
    questions: [] as QuizQuestion[],
    index: 0,
    selections: { inputs: [] as string[], tools: [] as string[], outputs: [] as string[] },
    submitted: false,
    lastResult: null as QuizResult | null,
    score: 0,
  }),

  getters: {
    currentQuestion: (s): QuizQuestion | null => s.questions[s.index] ?? null,
    total: (s): number => s.questions.length,
    isLast: (s): boolean => s.index >= s.questions.length - 1,
    accuracy: (s): number => (s.questions.length > 0 ? s.score / s.questions.length : 0),
  },

  actions: {
    startQuiz(
      pool: { process: { id: string; name: string }; itto: ITTO }[],
      globalPool?: { inputs: string[]; tools: string[]; outputs: string[] },
    ) {
      const gp = globalPool ?? { inputs: [], tools: [], outputs: [] }
      const optsPerCat = 4

      this.questions = pool.map(({ process, itto }) => {
        const correctInputs = itto.inputs.map(i => i.name)
        const correctTools = itto.toolsAndTechniques.map(t => t.name)
        const correctOutputs = itto.outputs.map(o => o.name)

        return {
          processId: process.id,
          processName: process.name,
          correctInputs,
          correctTools,
          correctOutputs,
          optionsInputs: shuffle([...correctInputs, ...sampleExcept(gp.inputs, correctInputs, optsPerCat)]),
          optionsTools: shuffle([...correctTools, ...sampleExcept(gp.tools, correctTools, optsPerCat)]),
          optionsOutputs: shuffle([...correctOutputs, ...sampleExcept(gp.outputs, correctOutputs, optsPerCat)]),
          ittoRaw: itto,
        }
      })

      this.index = 0
      this.score = 0
      this.resetCurrent()
    },

    resetCurrent() {
      this.selections = { inputs: [], tools: [], outputs: [] }
      this.submitted = false
      this.lastResult = null
    },

    toggleSelection(category: ITTOCategory, name: string) {
      if (this.submitted) return
      const arr = this.selections[category]
      const i = arr.indexOf(name)
      if (i === -1) arr.push(name)
      else arr.splice(i, 1)
    },

    submit(): QuizResult {
      const q = this.currentQuestion
      if (!q) return { inputs: false, tools: false, outputs: false }

      const res: QuizResult = {
        inputs: this.selections.inputs.slice().sort().join() === q.correctInputs.slice().sort().join(),
        tools: this.selections.tools.slice().sort().join() === q.correctTools.slice().sort().join(),
        outputs: this.selections.outputs.slice().sort().join() === q.correctOutputs.slice().sort().join(),
      }

      this.lastResult = res
      this.submitted = true
      if (res.inputs && res.tools && res.outputs) this.score++
      return res
    },

    nextQuestion() {
      if (!this.isLast) {
        this.index++
        this.resetCurrent()
      }
    },
  },
})
