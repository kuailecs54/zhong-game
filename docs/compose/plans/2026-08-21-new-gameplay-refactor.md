# 新玩法重构（归类 + ITTO 两模式）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重写游戏玩法为无时间压力的学习型玩法——"归类模式"（点选即放，去掉下落/计时/生命）与新增"ITTO 测验模式"（选出某过程的输入/工具技术/输出），复用现有 49 过程数据与进度系统。

**Architecture:** 复用 `stores/game.ts` 作为归类 store（剥离下落相关状态与逻辑，保留列/行信息构建与判定），新增 `stores/itto.ts` 承载 ITTO 测验状态；`GameView.vue` 按 `level.mode` 分流两类玩法；新增 `ITTOQuiz.vue` 组件。关卡配置扩展 `mode` 字段，`levels.json` 新增 itto 关卡。

**Tech Stack:** Vue 3 `<script setup>` + TypeScript + Pinia + Vite + Vitest。纯前端，数据经 `fetch('/data/...')`。

## Global Constraints

- 49 过程约束：改动 `levels.json` 仅新增 itto 关卡且池引用已有过程 id，**不改动** `processes.json`/`itto.json`；改后必须 `npm run build` 验证矩阵与类型。
- 语言：代码注释/UI 文案中文；标识符/命令/术语英文；过程一律用课本全名。
- 数据经 `fetch('/data/...')` 加载，非 TS import；ITTO 仅在 itto 模式按需 `loadITTO()`。
- 别名 `@` → `src`（`vite.config.ts`）。
- `npm run build`（vue-tsc -b && vite build）是唯一的静态校验，每次改动后必须跑通。

---

## Task 1: 类型扩展 —— LevelConfig 增加 `mode`

**Covers:** [S2], [S7]

**Files:**
- Modify: `src/data/types.ts:43-90`（`LevelConfig` 接口）

**Interfaces:**
- 产出：类型字段 `mode?: 'sort' | 'itto'`，供 loader、stores、视图读取。

- [ ] **Step 1: 在 LevelConfig 增加 mode 字段**

在 `LevelConfig` 接口中（`starThresholds` 之后、`speedCurve?` 之前）新增：

```ts
  /** 玩法模式：sort=归类模式，itto=ITTO 测验模式，缺省 sort */
  mode?: 'sort' | 'itto'
```

- [ ] **Step 2: 确认现有关卡缺省即为 sort**

`levels.json` 现有关卡无 `mode` 字段，TypeScript 可选属性已兼容；无需改数据文件。

- [ ] **Step 3: 类型检查**

Run: `npm run build`
Expected: 通过（仅加可选字段，不影响现有编译）。

- [ ] **Step 4: 提交**

```bash
git add src/data/types.ts
git commit -m "feat(types): LevelConfig 增加可选 mode 字段区分玩法"
```

---

## Task 2: Loader 增强 —— ITTO 按关卡池取数

**Covers:** [S4], [S7]

**Files:**
- Modify: `src/data/loader.ts`
- Test: `src/data/loader.test.ts`

**Interfaces:**
- 复用已有：`getProcessesForLevel(level, processes)`、`loadITTO()`。
- 产出：`getITTOForLevel(level, processes, itto)` —— 返回本关过程池对应的 `{ process, itto }[]`，供 itto 模式出题库。

- [ ] **Step 1: 写失败测试**

`src/data/loader.test.ts` 末尾追加：

```ts
import type { ITTO } from './types'

describe('getITTOForLevel', () => {
  const processes = [
    { id: 'p001', name: '制定项目章程', processGroupId: 'initiating', knowledgeAreaId: 'integration', difficulty: 2 },
    { id: 'p002', name: '制定项目管理计划', processGroupId: 'planning', knowledgeAreaId: 'integration', difficulty: 3 },
  ]
  const itto: Record<string, ITTO> = {
    p001: { inputs: [{ name: '协议' }], toolsAndTechniques: [{ name: '专家判断' }], outputs: [{ name: '项目章程' }] },
    p002: { inputs: [{ name: '项目章程' }], toolsAndTechniques: [{ name: '专家判断' }], outputs: [{ name: '项目管理计划' }] },
  }
  const level = { id: 'itto-1', mode: 'itto' as const, cardPool: { source: 'specific' as const, processIds: ['p001'] } }

  test('仅返回关卡池内过程对应的 ITTO', () => {
    const result = getITTOForLevel(level as any, processes as any, itto)
    expect(result).toHaveLength(1)
    expect(result[0].process.id).toBe('p001')
    expect(result[0].itto.outputs[0].name).toBe('项目章程')
  })
})
```

- [ ] **Step 2: 实现 getITTOForLevel**

在 `loader.ts` 的 `getProcessesForLevel` 之后新增：

```ts
/**
 * 返回本关过程池每个过程对应的 ITTO 数据，供 ITTO 测验模式出题库。
 * 仅保留在 itto 数据中存在对应条目的过程（缺失则跳过，避免空题）。
 */
export function getITTOForLevel(
  level: LevelConfig,
  processes: Process[],
  itto: Record<string, ITTO>,
): { process: Process; itto: ITTO }[] {
  const pool = getProcessesForLevel(level, processes)
  return pool
    .filter((p) => itto[p.id])
    .map((p) => ({ process: p, itto: itto[p.id] }))
}
```

并在文件顶部 import 补充 `ITTO`：

```ts
import type { LevelConfig, ProcessGroup, KnowledgeArea, Process, ITTO } from './types'
```

- [ ] **Step 3: 跑测试验证失败→通过**

Run: `npm run test`
Expected: 新测试先因函数未定义报错；实现后 PASS。

- [ ] **Step 4: 提交**

```bash
git add src/data/loader.ts src/data/loader.test.ts
git commit -m "feat(loader): 新增 getITTOForLevel 按关卡池取 ITTO"
```

---

## Task 3: 归类 store —— 剥离下落、保留判定

**Covers:** [S3], [S5]

**Files:**
- Modify: `src/stores/game.ts`（大幅瘦身，保留归类判定）
- Test: `src/stores/game.sort.test.ts`（新建）

**Interfaces:**
- 复用：`startLevel` 的列/行信息构建、卡片池分桶逻辑。
- 移除：`fallingCards`、`currentSpeed`、`currentSpawnInterval`、`updateGame`、`spawnWave`、`createCard`、`pickNonOverlappingX`、`lives`/`loseLife`/`freeze`/`activateFreeze`、`captureCard`、`captureTray`、`combo` 计分装饰、`score` 缩放。
- 产出：`classify(processId, columnId, rowId?): 'correct' | 'wrong'`，以及 `mode` getter、`placedCount`/`totalCount` getter、`showAnswer` 提示状态。

- [ ] **Step 1: 写失败测试（归类判定）**

新建 `src/stores/game.sort.test.ts`：

```ts
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from './game'
import type { LevelConfig, Process, ProcessGroup, KnowledgeArea } from '@/data/types'

function makeLevel(over: Partial<LevelConfig> = {}): LevelConfig {
  return {
    id: 'sort-1-1', name: '初识过程组', stage: 1, number: 1,
    description: '', layoutType: 'columns', columns: ['initiating', 'closing'],
    cardPool: { source: 'processGroups', processGroupIds: ['initiating', 'closing'] },
    targetCount: 2, lives: 3, freezeCount: 1, trayCapacity: 6,
    initialFallSpeed: 40, initialSpawnInterval: 4000, minSpawnInterval: 2000,
    speedIncreaseRate: 0.08, speedIncreaseEvery: 5, starThresholds: { oneStar: 2, twoStarAccuracy: 0.8, threeStarAccuracy: 1, threeStarMinLives: 2 },
    ...over,
  }
}
const processes: Process[] = [
  { id: 'p001', name: '制定项目章程', processGroupId: 'initiating', knowledgeAreaId: 'integration', difficulty: 2 },
  { id: 'p007', name: '结束项目或阶段', processGroupId: 'closing', knowledgeAreaId: 'integration', difficulty: 2 },
]
const pgs: ProcessGroup[] = [
  { id: 'initiating', name: '启动过程组', shortName: '启动', color: '#e74c3c' },
  { id: 'closing', name: '收尾过程组', shortName: '收尾', color: '#9b59b6' },
]
const kas: KnowledgeArea[] = [{ id: 'integration', name: '整合', shortName: '整合' }]

beforeEach(() => setActivePinia(createPinia()))

test('classify 列模式判正确/错误', () => {
  const s = useGameStore()
  s.startLevel(makeLevel(), processes, pgs, kas, processes)
  s.setGamePhase('playing')
  expect(s.classify('p001', 'initiating')).toBe('correct')
  expect(s.classify('p007', 'initiating')).toBe('wrong')
  expect(s.correctCount).toBe(1)
  expect(s.wrongCount).toBe(1)
})

test('classify 矩阵模式同时判过程组与知识领域', () => {
  const s = useGameStore()
  s.startLevel(makeLevel({ layoutType: 'matrix', columns: ['initiating'], rows: ['integration'] }), processes, pgs, kas, processes)
  s.setGamePhase('playing')
  expect(s.classify('p001', 'initiating', 'integration')).toBe('correct')
  expect(s.classify('p001', 'initiating', 'scope')).toBe('wrong')
})
```

- [ ] **Step 2: 改造 GameState 接口与 state**

将 `GameState` 中的下落相关字段删除，仅保留：

```ts
interface GameState {
  level: LevelConfig | null
  columnInfos: ColumnInfo[]
  columnType: ColumnType
  layoutType: LayoutType
  rowInfos: RowInfo[]
  processPool: Process[]
  processPoolByColumn: Record<string, Process[]>
  placedProcessIds: string[]   // 已正确放置的过程 id（去重，过关判定用）
  selectedProcessId: string | null  // 当前选中待放置的卡
  score: number
  correctCount: number
  wrongCount: number
  wrongHistory: WrongRecord[]
  feedbackState: FeedbackState | null
  feedbackTimer: ReturnType<typeof setTimeout> | null
  gamePhase: GamePhase
}
```

`state` 工厂同步精简，去掉 `fallingCards`、`currentSpeed`、`lives`、`freeze*`、`combo`、`captureTray`、`shelvedBooks`、`distractorPool`、`distractorCount`、`missedCount`、`processSeen`、`wrongFlashQueue`、`lastEvictedProcess`、`gameTime`、`currentSpawnInterval`、`isFrozen`、`freezeRemaining`、`freezeCount`。

- [ ] **Step 3: 改造 getters**

保留并新增：

```ts
getters: {
  targetCount: (s): number => s.level?.targetCount ?? 0,
  mode: (s): 'sort' | 'itto' => s.level?.mode ?? 'sort',
  isLevelComplete: (s): boolean => s.placedProcessIds.length >= (s.level?.targetCount ?? 0),
  correctAccuracy: (s): number => {
    const total = s.correctCount + s.wrongCount
    return total > 0 ? s.correctCount / total : 0
  },
  isPlaying: (s): boolean => s.gamePhase === 'playing',
  isPaused: (s): boolean => s.gamePhase === 'paused',
  selectedProcess: (s): Process | null =>
    s.selectedProcessId ? (s.processPool.find(p => p.id === s.selectedProcessId) ?? null) : null,
},
```

删除 `maxLives`/`trayCapacity`/`isGameOver`/`comboMultiplier`/`feedbackActive` 等下落相关 getter。

- [ ] **Step 4: 改造 actions —— 保留 startLevel 核心，删除下落逻辑**

`startLevel` 保留列/行信息构建与 `processPoolByColumn` 分桶，去掉 `distractorPool`、`fallingCards`、`shelvedBooks`、`captureTray`、速度/计时/冰冻初始化。新增 `placedProcessIds: []`、`selectedProcessId: null`。

删除 actions：`spawnWave`、`createCard`、`pickNonOverlappingX`、`captureCard`、`updateGame`、`loseLife`、`resetLevel`（保留但精简为重置归类进度）、`activateFreeze`。

新增 `selectCard(processId)` 与 `classify`：

```ts
selectCard(processId: string) {
  this.selectedProcessId = processId
},

classify(columnId: string, rowId?: string): 'correct' | 'wrong' {
  if (!this.isPlaying || !this.selectedProcessId) return null as any
  const card = this.processPool.find(p => p.id === this.selectedProcessId)!
  let isCorrect: boolean
  if (this.layoutType === 'matrix' && rowId) {
    isCorrect = card.processGroupId === columnId && card.knowledgeAreaId === rowId
  } else {
    isCorrect = this.columnType === 'processGroup'
      ? card.processGroupId === columnId
      : card.knowledgeAreaId === columnId
  }
  this.feedbackState = { type: isCorrect ? 'correct' : 'wrong', columnId, rowId, processId: card.id }
  if (this.feedbackTimer) { clearTimeout(this.feedbackTimer); this.feedbackTimer = null }
  if (isCorrect) {
    this.correctCount++
    if (!this.placedProcessIds.includes(card.id)) this.placedProcessIds.push(card.id)
    this.feedbackTimer = setTimeout(() => this.clearFeedback(), 500)
  } else {
    this.wrongCount++
    this.wrongHistory.push({
      processId: card.id, processName: card.name,
      chosenColumnId: columnId,
      correctColumnId: this.columnType === 'processGroup' ? card.processGroupId : card.knowledgeAreaId,
      correctRowId: this.layoutType === 'matrix' ? card.knowledgeAreaId : undefined,
      chosenRowId: rowId,
    })
    this.feedbackTimer = setTimeout(() => this.clearFeedback(), 600)
  }
  return isCorrect ? 'correct' : 'wrong'
},

clearFeedback() {
  if (!this.feedbackState) return
  if (this.feedbackTimer) { clearTimeout(this.feedbackTimer); this.feedbackTimer = null }
  this.feedbackState = null
  this.selectedProcessId = null
},
```

`FeedbackState` 接口去掉 `trayIndex`（store 内 `types.ts` 同步去掉或保留可选）。`WrongRecord` 仍可用。

- [ ] **Step 5: 跑测试失败→通过**

Run: `npm run test`
Expected: Task 1 的归类判定测试 PASS；若 `npm run build` 报未用导入，清理 imports。

- [ ] **Step 6: 构建校验**

Run: `npm run build`
Expected: 通过（清理多余 import 后）。

- [ ] **Step 7: 提交**

```bash
git add src/stores/game.ts src/stores/game.sort.test.ts
git commit -m "refactor(store): game.ts 剥离下落逻辑，改造为无计时归类判定"
```

---

## Task 4: ITTO store —— 题目生成与判分

**Covers:** [S4]

**Files:**
- Create: `src/stores/itto.ts`
- Test: `src/stores/itto.test.ts`

**Interfaces:**
- 消费：`getITTOForLevel(level, processes, itto)`（Task 2）、`loadITTO()`。
- 产出：`startQuiz(pool)`、`currentQuestion`、`toggleSelection(category, name)`、`submit()`、`nextQuestion()`、`score`/`total`/`accuracy`。

- [ ] **Step 1: 写失败测试**

```ts
import { setActivePinia, createPinia } from 'pinia'
import { useIttoStore } from './itto'
import type { ITTO } from '@/data/types'

const pool = [
  { process: { id: 'p001', name: '制定项目章程', processGroupId: 'initiating', knowledgeAreaId: 'integration', difficulty: 2 },
    itto: { inputs: [{ name: '协议' }], toolsAndTechniques: [{ name: '专家判断' }], outputs: [{ name: '项目章程' }] } as ITTO },
]

beforeEach(() => setActivePinia(createPinia()))

test('题目正确项必含真实 ITTO，且生成干扰项', () => {
  const s = useIttoStore()
  s.startQuiz(pool)
  const q = s.currentQuestion
  expect(q).toBeTruthy()
  expect(q!.correctInputs).toContain('协议')
  expect(q!.optionsInputs.length).toBeGreaterThanOrEqual(q!.correctInputs.length)
})

test('提交后按各区判定计分', () => {
  const s = useIttoStore()
  s.startQuiz(pool)
  s.toggleSelection('inputs', '协议')
  s.toggleSelection('tools', '专家判断')
  s.toggleSelection('outputs', '项目章程')
  const r = s.submit()
  expect(r.inputs).toBe(true)
  expect(r.tools).toBe(true)
  expect(r.outputs).toBe(true)
  expect(s.score).toBe(1)
})
```

- [ ] **Step 2: 实现 itto.ts**

```ts
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
}
interface QuizResult { inputs: boolean; tools: boolean; outputs: boolean }

const ALL_INPUTS_POOL: string[] = []
const ALL_TOOLS_POOL: string[] = []
const ALL_OUTPUTS_POOL: string[] = []

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
    globalInputsPool: [] as string[],
    globalToolsPool: [] as string[],
    globalOutputsPool: [] as string[],
  }),
  getters: {
    currentQuestion: (s): QuizQuestion | null => s.questions[s.index] ?? null,
    total: (s): number => s.questions.length,
    isLast: (s): boolean => s.index >= s.questions.length - 1,
    accuracy: (s): number => (s.total > 0 ? s.score / s.total : 0),
  },
  actions: {
    /** pool: 来自 getITTOForLevel 的结果；globalPool 为全部 ITTO 名称，用于抽干扰项 */
    startQuiz(pool: { process: { id: string; name: string }; itto: ITTO }[], globalPool?: { inputs: string[]; tools: string[]; outputs: string[] }) {
      this.globalInputsPool = globalPool?.inputs ?? []
      this.globalToolsPool = globalPool?.tools ?? []
      this.globalOutputsPool = globalPool?.outputs ?? []
      this.questions = pool.map(({ process, itto }) => {
        const correctInputs = itto.inputs.map(i => i.name)
        const correctTools = itto.toolsAndTechniques.map(t => t.name)
        const correctOutputs = itto.outputs.map(o => o.name)
        const n = 4
        return {
          processId: process.id,
          processName: process.name,
          correctInputs, correctTools, correctOutputs,
          optionsInputs: shuffle([...correctInputs, ...sampleExcept(this.globalInputsPool, correctInputs, n)]),
          optionsTools: shuffle([...correctTools, ...sampleExcept(this.globalToolsPool, correctTools, n)]),
          optionsOutputs: shuffle([...correctOutputs, ...sampleExcept(this.globalOutputsPool, correctOutputs, n)]),
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
        inputs: this.selections.inputs.sort().join() === q.correctInputs.slice().sort().join(),
        tools: this.selections.tools.sort().join() === q.correctTools.slice().sort().join(),
        outputs: this.selections.outputs.sort().join() === q.correctOutputs.slice().sort().join(),
      }
      this.lastResult = res
      this.submitted = true
      if (res.inputs && res.tools && res.outputs) this.score++
      return res
    },
    nextQuestion() {
      if (!this.isLast) { this.index++; this.resetCurrent() }
    },
  },
})
```

注意：干扰项池需在 `startQuiz` 调用方（GameView）传入全部 ITTO 名称聚合。测试中使用空 globalPool，正确项自身即选项，仍可通过。

- [ ] **Step 3: 跑测试失败→通过**

Run: `npm run test`
Expected: PASS。

- [ ] **Step 4: 提交**

```bash
git add src/stores/itto.ts src/stores/itto.test.ts
git commit -m "feat(store): 新增 itto 测验 store——题目生成与判分"
```

---

## Task 5: ITTOQuiz.vue 组件

**Covers:** [S4], [S6]

**Files:**
- Create: `src/components/game/ITTOQuiz.vue`

**Interfaces:**
- 消费：`useIttoStore`（currentQuestion、selections、toggleSelection、submit、nextQuestion、lastResult、isLast）。
- 产出：渲染当前过程名 + 三区多选网格 + 提交/下一题按钮；提交后展示各区正误与正确答案。

- [ ] **Step 1: 编写组件**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useIttoStore } from '@/stores/itto'
import type { ITTOCategory } from '@/stores/itto'

const store = useIttoStore()

const categories: { key: ITTOCategory; label: string }[] = [
  { key: 'inputs', label: '输入 (I)' },
  { key: 'tools', label: '工具与技术 (T)' },
  { key: 'outputs', label: '输出 (O)' },
]

const q = computed(() => store.currentQuestion)

function isCorrect(category: ITTOCategory, name: string): boolean | null {
  if (!store.submitted || !q.value) return null
  const correct = q.value[`correct${category[0].toUpperCase()}${category.slice(1)}` as 'correctInputs']
  return correct.includes(name) && store.selections[category].includes(name)
}
function isMissing(category: ITTOCategory, name: string): boolean {
  if (!store.submitted || !q.value) return false
  const correct = q.value[`correct${category[0].toUpperCase()}${category.slice(1)}` as 'correctInputs']
  return correct.includes(name) && !store.selections[category].includes(name)
}
</script>

<template>
  <div v-if="q" class="itto-quiz">
    <h2 class="process-name">{{ q.processName }}</h2>
    <p class="hint">勾选属于该过程的输入 / 工具与技术 / 输出</p>

    <div v-for="cat in categories" :key="cat.key" class="itto-section">
      <h3>{{ cat.label }}</h3>
      <div class="option-grid">
        <button
          v-for="opt in (q as any)[`options${cat.key[0].toUpperCase()}${cat.key.slice(1)}` as 'optionsInputs']"
          :key="opt"
          class="option"
          :class="{
            selected: store.selections[cat.key].includes(opt),
            correct: isCorrect(cat.key, opt) === true,
            wrong: isCorrect(cat.key, opt) === false && store.selections[cat.key].includes(opt),
            missing: isMissing(cat.key, opt),
          }"
          :disabled="store.submitted"
          @click="store.toggleSelection(cat.key, opt)"
        >{{ opt }}</button>
      </div>
    </div>

    <div class="actions">
      <button v-if="!store.submitted" class="submit-btn" @click="store.submit()">提交</button>
      <button v-else-if="!store.isLast" class="next-btn" @click="store.nextQuestion()">下一题</button>
      <span v-else class="done">测验完成</span>
    </div>
  </div>
</template>

<style scoped>
.itto-quiz { padding: 16px; }
.process-name { font-size: 22px; margin-bottom: 4px; }
.hint { color: #888; margin-bottom: 16px; }
.itto-section { margin-bottom: 16px; }
.option-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.option { padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer; }
.option.selected { border-color: #3498db; background: #eaf4ff; }
.option.correct { border-color: #2ecc71; background: #e9f9ef; }
.option.wrong { border-color: #e74c3c; background: #fdecea; }
.option.missing { border-color: #f39c12; background: #fff7e6; }
.actions { margin-top: 12px; }
.submit-btn, .next-btn { padding: 10px 20px; border: none; border-radius: 6px; background: #3498db; color: #fff; cursor: pointer; }
</style>
```

- [ ] **Step 2: 简单渲染校验（构建）**

在 Task 7 的 GameView 接入前，先确保组件可被 vue-tsc 解析。
Run: `npm run build`
Expected: 通过（组件独立编译）。

- [ ] **Step 3: 提交**

```bash
git add src/components/game/ITTOQuiz.vue
git commit -m "feat(component): 新增 ITTOQuiz 多选测验组件"
```

---

## Task 6: GameView.vue 按 mode 分流

**Covers:** [S3], [S4], [S6]

**Files:**
- Modify: `src/views/GameView.vue`（移除下落循环，按 mode 分支）

**Interfaces:**
- 消费：`useGameStore`（sort 模式：`selectCard`/`classify`/`placedProcessIds`/`columnInfos`/`rowInfos`/`feedbackState`）、`useIttoStore`（itto 模式：`startQuiz`）、`loadITTO`、`getITTOForLevel`。
- 产出：sort 模式点击/拖放判定触发 `gameStore.classify`；itto 模式挂载 `<ITTOQuiz />`。

- [ ] **Step 1: 移除下落相关代码**

删除：`useGameLoop` 引入与 `startLoop/stopLoop/togglePause` 调用、`fallingCards` 渲染、所有 `onFallingPointerDown`、`captureAnimations`、`handleFreeze`、`handlePause`、两个 `watch(isLevelComplete/isGameOver)` 中对 lives 的依赖（`isGameOver` 已不存在，移除该 watch）。

- [ ] **Step 2: initGame 按 mode 装载**

在 `initGame` 中：

```ts
const level = getLevelById(levelId, levels)
if (!level) { loadError.value = `关卡 ${levelId} 不存在`; isLoading.value = false; return }
const mode = level.mode ?? 'sort'
if (mode === 'sort') {
  const processPool = getProcessesForLevel(level, processes)
  if (processPool.length === 0) { loadError.value = '关卡卡片池为空'; isLoading.value = false; return }
  gameStore.startLevel(level, processPool, processGroups, knowledgeAreas, processes)
  gameStore.setGamePhase('playing')
  isLoading.value = false
} else {
  const ittoData = await loadITTO()
  const pool = getITTOForLevel(level, processes, ittoData)
  if (pool.length === 0) { loadError.value = '关卡 ITTO 池为空'; isLoading.value = false; return }
  // 聚合全局 ITTO 名称供干扰项抽取
  const allInputs: string[] = [], allTools: string[] = [], allOutputs: string[] = []
  for (const k of Object.keys(ittoData)) {
    ittoData[k].inputs.forEach(i => allInputs.push(i.name))
    ittoData[k].toolsAndTechniques.forEach(t => allTools.push(t.name))
    ittoData[k].outputs.forEach(o => allOutputs.push(o.name))
  }
  ittoStore.startQuiz(pool, { inputs: allInputs, tools: allTools, outputs: allOutputs })
  isLoading.value = false
}
```

- [ ] **Step 3: sort 模式模板与交互**

保留顶部署卡区（从 `gameStore.processPool` 渲染过程卡，点击调用 `gameStore.selectCard(p.id)`；已放置的置灰）、下方 `<SortGrid>`/`<MatrixGrid>`（作为点击/拖放目标，点击目标列/格调用 `gameStore.classify(colId, rowId?)`）。

`GameView.vue` 模板结构（替换旧下落区）：

```vue
<template>
  <div class="game-view">
    <GameHUD />
    <div v-if="loadError" class="error">{{ loadError }}</div>
    <div v-else-if="gameMode === 'sort'" class="sort-mode">
      <div class="card-tray">
        <button
          v-for="p in gameStore.processPool"
          :key="p.id"
          class="process-card"
          :class="{ selected: gameStore.selectedProcessId === p.id, placed: gameStore.placedProcessIds.includes(p.id) }"
          :disabled="gameStore.placedProcessIds.includes(p.id)"
          @click="gameStore.selectCard(p.id)"
        >{{ p.name }}</button>
      </div>
      <SortGrid
        v-if="gameStore.layoutType === 'columns'"
        :column-infos="gameStore.columnInfos"
        :feedback="columnFeedback"
        @select-column="(colId) => gameStore.classify(colId)"
      />
      <MatrixGrid
        v-else
        :column-infos="gameStore.columnInfos"
        :row-infos="gameStore.rowInfos"
        :feedback="matrixFeedback"
        @select-cell="(colId, rowId) => gameStore.classify(colId, rowId)"
      />
    </div>
    <ITTOQuiz v-else />
  </div>
</template>
```

`gameMode` 计算属性：`const gameMode = computed(() => gameStore.level?.mode ?? 'sort')`。

`columnFeedback`/`matrixFeedback` 仍由 `gameStore.feedbackState` 派生（保留 Task 3 中字段）。

- [ ] **Step 4: 过关/结算分流**

sort 模式：保留 `watch(() => gameStore.isLevelComplete, ...)` 触发结算（去掉 `isPlaying` 条件即可，因为无下落 isPlaying 恒 true）。

itto 模式：在 ITTOQuiz 完成后，由 `ResultView` 读取 `ittoStore.accuracy` 评星（见 Task 8）。GameView 不自动跳转；ITTOQuiz 完成态展示"查看结果"按钮，点击 `navigateToResult(true)`。

- [ ] **Step 5: 构建校验**

Run: `npm run build`
Expected: 通过（需同步调整 `SortGrid`/`MatrixGrid`/`GameHUD` 见 Task 7，否则先 stub 事件名）。

- [ ] **Step 6: 提交**

```bash
git add src/views/GameView.vue
git commit -m "refactor(view): GameView 按 mode 分流归类/ITTO 玩法"
```

---

## Task 7: 网格与 HUD 组件适配（去掉下落渲染）

**Covers:** [S3], [S6]

**Files:**
- Modify: `src/components/game/SortGrid.vue`、`src/components/game/MatrixGrid.vue`、`src/components/game/GameHUD.vue`

**Interfaces:**
- 产出：SortGrid/MatrixGrid 暴露 `@select-column` / `@select-cell` 事件（点击目标即 emit，不再监听下落卡）；GameHUD 仅显示进度（已归 X/Y）与提示按钮，去掉生命/连击/冰冻/计时。

- [ ] **Step 1: SortGrid 暴露 select-column 事件**

移除 `fallingCards` 渲染相关模板与 props；列容器加 `@click="$emit('select-column', col.id)"`。props 仅保留 `columnInfos`、`feedback`。

- [ ] **Step 2: MatrixGrid 暴露 select-cell 事件**

移除下落卡渲染；单元格加 `@click="$emit('select-cell', col.id, row.id)"`。props 保留 `columnInfos`、`rowInfos`、`feedback`。

- [ ] **Step 3: GameHUD 精简**

仅渲染：关卡名、`{{ gameStore.placedProcessIds.length }} / {{ gameStore.targetCount }}` 进度、"显示答案"按钮（调 `gameStore.showAnswer()` 占位，可选）。删除生命/连击/冰冻/计时/暂停 UI。

- [ ] **Step 4: 构建校验**

Run: `npm run build`
Expected: 通过。

- [ ] **Step 5: 提交**

```bash
git add src/components/game/SortGrid.vue src/components/game/MatrixGrid.vue src/components/game/GameHUD.vue
git commit -m "refactor(component): 网格与 HUD 去掉下落渲染，改为点击目标"
```

---

## Task 8: 结算适配（ResultView）

**Covers:** [S6], [S8]

**Files:**
- Modify: `src/views/ResultView.vue`

**Interfaces:**
- 消费：`gameStore`（sort：accuracy/placedCount）、`ittoStore`（itto：accuracy）。
- 产出：按 `level.mode` 选择评星口径；sort 用 `correctAccuracy`，itto 用 `ittoStore.accuracy`。

- [ ] **Step 1: ResultView 读 mode 与对应进度**

在结算逻辑中：

```ts
const mode = level?.mode ?? 'sort'
const accuracy = mode === 'itto' ? ittoStore.accuracy : gameStore.correctAccuracy
const stars = accuracy >= 1 ? 3 : accuracy >= 0.8 ? 2 : accuracy > 0 ? 1 : 0
userStore.saveProgress(level.id, stars, Math.round(accuracy * 100))
```

替换原 `calculateStars`（依赖 lives/combo）为新口径。保留下一关导航。

- [ ] **Step 2: 构建校验**

Run: `npm run build`
Expected: 通过。

- [ ] **Step 3: 提交**

```bash
git add src/views/ResultView.vue
git commit -m "refactor(view): ResultView 按 mode 适配评星口径"
```

---

## Task 9: 关卡选择页标注 mode

**Covers:** [S6], [S7]

**Files:**
- Modify: `src/views/LevelSelectView.vue`

**Interfaces:**
- 产出：关卡卡片上显示 `mode === 'itto' ? 'ITTO 测验' : '归类'` 标签。

- [ ] **Step 1: 渲染 mode 标签**

在关卡卡片模板中，`level.mode === 'itto'` 时显示 `ITTO` 角标，否则 `归类`。

- [ ] **Step 2: 构建校验**

Run: `npm run build`
Expected: 通过。

- [ ] **Step 3: 提交**

```bash
git add src/views/LevelSelectView.vue
git commit -m "feat(view): 关卡选择页标注玩法模式"
```

---

## Task 10: 新增 ITTO 关卡数据

**Covers:** [S4], [S7]

**Files:**
- Modify: `public/data/levels.json`

**Interfaces:**
- 产出入：新增 3~4 个 `mode: 'itto'` 关卡，池引用已有过程 id（用 `cardPool.source: 'specific'` + `processIds`），`targetCount` 为题库过程数，`starThresholds` 适配正确率口径（oneStar 改为正确率阈值语义，但 store 用 accuracy 评星，故关卡阈值仅作展示，可保留结构）。

- [ ] **Step 1: 追加 itto 关卡**

在 `levels.json` 数组追加（示例一个，复制改 id/name/processIds 即可）：

```json
{
  "id": "itto-1-1",
  "name": "启动与收尾 ITTO",
  "stage": 1,
  "number": 1,
  "mode": "itto",
  "description": "区分启动与收尾过程组的输入/工具/输出",
  "layoutType": "columns",
  "columns": ["initiating", "closing"],
  "cardPool": { "source": "specific", "processIds": ["p001", "p007", "p046"] },
  "targetCount": 3,
  "initialFallSpeed": 40,
  "initialSpawnInterval": 4000,
  "minSpawnInterval": 2000,
  "speedIncreaseRate": 0.08,
  "speedIncreaseEvery": 5,
  "lives": 3,
  "freezeCount": 1,
  "trayCapacity": 6,
  "starThresholds": { "oneStar": 1, "twoStarAccuracy": 0.8, "threeStarAccuracy": 1, "threeStarMinLives": 2 }
}
```

至少再加 `itto-2-1`（规划过程组若干）、`itto-3-1`（执行+监控若干），共 3 关，覆盖多过程组。

- [ ] **Step 2: 构建校验（矩阵不被破坏）**

Run: `npm run build`
Expected: 通过（`processes.json` 未改，49 约束仍成立）。

- [ ] **Step 3: 提交**

```bash
git add public/data/levels.json
git commit -m "feat(data): 新增 ITTO 测验关卡"
```

---

## Task 11: 全量验证

**Covers:** [S8]

**Files:**
- 全仓

- [ ] **Step 1: 跑测试**

Run: `npm run test`
Expected: 全部 PASS（loader、game.sort、itto 测试）。

- [ ] **Step 2: 跑构建**

Run: `npm run build`
Expected: 通过。

- [ ] **Step 3: 手动冒烟（浏览器）**

Run: `npm run dev`，访问 `/levels`，分别进入一个 `sort` 关卡与一个 `itto` 关卡：
- sort：点击卡 → 点目标列/格 → 见正确/错误反馈；全部放置后结算。
- itto：勾选 I/T/O → 提交 → 见正误与答案 → 下一题 → 完成后结算。

- [ ] **Step 4: 提交收尾（若有微调）**

```bash
git add -A
git commit -m "chore: 全量验证通过，新玩法 MVP 完成"
```
