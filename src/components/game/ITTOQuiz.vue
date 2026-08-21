<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { Process, ITTO } from '@/data/types'
import { CheckOne, CloseOne, ArrowCircleDown, Download, Tool, Upload } from '@icon-park/vue-next'

const props = defineProps<{
  /** 当前题：过程 + 对应 ITTO 数据（由 GameView 从引擎当前卡派生） */
  question: { process: Process; itto: ITTO } | null
  /** 全局名称聚合（干扰项来源，与既有出题口径一致） */
  globalPool?: { inputs: string[]; tools: string[]; outputs: string[] }
  /** 过程组中文名映射（答错解析展示用） */
  pgNames?: Record<string, string>
  /** 知识领域中文名映射（答错解析展示用） */
  kaNames?: Record<string, string>
}>()

const emit = defineEmits<{
  result: [isCorrect: boolean, chosenLabel: string]
  /** 答错复盘停留态变化：true=开始停留（父层暂停倒计时），false=停留结束即将上报 */
  hold: [holding: boolean]
}>()

type Category = 'inputs' | 'tools' | 'outputs'

const categories: { key: Category; label: string; icon: unknown; cls: string }[] = [
  { key: 'inputs', label: '输入 (I)', icon: Download, cls: 'cat-input' },
  { key: 'tools', label: '工具与技术 (T)', icon: Tool, cls: 'cat-tool' },
  { key: 'outputs', label: '输出 (O)', icon: Upload, cls: 'cat-output' },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 从全局池抽干扰项（排除正确项），与旧 itto store 出题逻辑同构 */
function sampleExcept(pool: string[], correct: string[], n: number): string[] {
  const candidates = shuffle(pool.filter(x => !correct.includes(x)))
  return candidates.slice(0, Math.max(0, n - correct.length))
}

// 每次挂载（新卡）生成一次选项
const q = computed(() => {
  if (!props.question) return null
  const { itto } = props.question
  const gp = props.globalPool ?? { inputs: [], tools: [], outputs: [] }
  const correctInputs = itto.inputs.map(i => i.name)
  const correctTools = itto.toolsAndTechniques.map(t => t.name)
  const correctOutputs = itto.outputs.map(o => o.name)
  return {
    processName: props.question.process.name,
    ittoRaw: itto,
    correct: { inputs: correctInputs, tools: correctTools, outputs: correctOutputs } as Record<Category, string[]>,
    options: {
      inputs: shuffle([...correctInputs, ...sampleExcept(gp.inputs, correctInputs, 4)]),
      tools: shuffle([...correctTools, ...sampleExcept(gp.tools, correctTools, 4)]),
      outputs: shuffle([...correctOutputs, ...sampleExcept(gp.outputs, correctOutputs, 4)]),
    } as Record<Category, string[]>,
  }
})

// 本地多选状态（提交后冻结，引擎推进下一卡时组件随 key 重挂载自动重置）
const selections = ref<Record<Category, string[]>>({ inputs: [], tools: [], outputs: [] })
const submitted = ref(false)
const lastResult = ref<Record<Category, boolean> | null>(null)

// ===== 答错复盘停留：批改标记与知识卡片保持可见，直到点击「下一题」或自动倒计时结束 =====
const HOLD_SECONDS = 10
const holding = ref(false)
const holdCountdown = ref(0)
let holdTimer: ReturnType<typeof setInterval> | null = null

function startHold() {
  holding.value = true
  holdCountdown.value = HOLD_SECONDS
  emit('hold', true)
  holdTimer = setInterval(() => {
    holdCountdown.value--
    if (holdCountdown.value <= 0) finishHold()
  }, 1000)
}

/** 结束停留并上报引擎（推进下一题） */
function finishHold() {
  if (!holding.value) return
  if (holdTimer) {
    clearInterval(holdTimer)
    holdTimer = null
  }
  holding.value = false
  emit('hold', false)
  emit('result', false, `I:${selections.value.inputs.length}/T:${selections.value.tools.length}/O:${selections.value.outputs.length}`)
}

function toggleSelection(category: Category, name: string) {
  if (submitted.value) return
  const arr = selections.value[category]
  const i = arr.indexOf(name)
  if (i === -1) arr.push(name)
  else arr.splice(i, 1)
}

/** 提交判定：答对立即上报；答错进入复盘停留（解析保持可见），停留结束后才上报 */
function submit() {
  if (!q.value || submitted.value) return
  const res: Record<Category, boolean> = {
    inputs: selections.value.inputs.slice().sort().join() === q.value.correct.inputs.slice().sort().join(),
    tools: selections.value.tools.slice().sort().join() === q.value.correct.tools.slice().sort().join(),
    outputs: selections.value.outputs.slice().sort().join() === q.value.correct.outputs.slice().sort().join(),
  }
  lastResult.value = res
  submitted.value = true
  const isCorrect = res.inputs && res.tools && res.outputs
  if (isCorrect) {
    emit('result', true, '')
  } else {
    startHold()
  }
}

// 键盘快捷键：Enter 提交当前选择 / 复盘停留时 Enter 等效「下一题」（已提交非停留或输入框聚焦时忽略）
function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter') return
  const t = e.target as HTMLElement | null
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
  if (holding.value) {
    finishHold()
    return
  }
  if (!submitted.value) submit()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (holdTimer) clearInterval(holdTimer)
})

/** 归属中文名（过程组 × 知识领域），答错解析用 */
const attributionText = computed(() => {
  if (!props.question) return ''
  const p = props.question.process
  const pg = props.pgNames?.[p.processGroupId] ?? p.processGroupId
  const ka = props.kaNames?.[p.knowledgeAreaId] ?? p.knowledgeAreaId
  return `${pg} × ${ka}`
})

function optStatus(category: Category, name: string): 'correct' | 'missing' | 'wrong' | 'dimmed' | null {
  if (!submitted.value || !lastResult.value) return null
  const correct = q.value!.correct[category].includes(name)
  const picked = selections.value[category].includes(name)
  if (correct && picked) return 'correct'
  if (correct && !picked) return 'missing'
  if (!correct && picked) return 'wrong'
  return 'dimmed'
}
</script>

<template>
  <div v-if="q" class="itto-layout">
    <!-- 左侧：答题区 -->
    <div class="itto-quiz">
      <h2 class="process-name">{{ q.processName }}</h2>
      <p class="hint">勾选属于该过程的输入 / 工具与技术 / 输出</p>

      <div v-for="cat in categories" :key="cat.key" class="itto-section">
        <h3 :class="cat.cls"><component :is="cat.icon" :size="14" fill="currentColor" theme="filled" />{{ cat.label }}</h3>
        <div class="option-grid">
          <button
            v-for="opt in q.options[cat.key]"
            :key="opt"
            class="option"
            :class="{
              selected: selections[cat.key].includes(opt) && !submitted,
              correct: optStatus(cat.key, opt) === 'correct',
              wrong: optStatus(cat.key, opt) === 'wrong',
              missing: optStatus(cat.key, opt) === 'missing',
              dimmed: optStatus(cat.key, opt) === 'dimmed',
            }"
            :disabled="submitted"
            @click="toggleSelection(cat.key, opt)"
          >
            <span class="opt-text">{{ opt }}</span>
            <span v-if="optStatus(cat.key, opt) && optStatus(cat.key, opt) !== 'dimmed'" class="opt-badge" :class="'badge-' + optStatus(cat.key, opt)">
              <CheckOne v-if="optStatus(cat.key, opt) === 'correct'" :size="18" fill="currentColor" />
              <CloseOne v-else-if="optStatus(cat.key, opt) === 'wrong'" :size="18" fill="currentColor" />
              <ArrowCircleDown v-else-if="optStatus(cat.key, opt) === 'missing'" :size="18" fill="currentColor" />
            </span>
          </button>
        </div>
      </div>

      <!-- 提交后：分区判定小结 -->
      <div v-if="submitted && lastResult" class="section-summary">
        <span v-for="cat in categories" :key="cat.key" class="sum-chip" :class="lastResult[cat.key] ? 'sum-ok' : 'sum-bad'">
          {{ cat.label }} {{ lastResult[cat.key] ? '✓' : '✗' }}
        </span>
      </div>

      <!-- 提交后：颜色图例 -->
      <div v-if="submitted" class="legend">
        <span class="legend-item legend-correct"><CheckOne :size="14" fill="currentColor" /> 正确选中</span>
        <span class="legend-item legend-wrong"><CloseOne :size="14" fill="currentColor" /> 错选</span>
        <span class="legend-item legend-missing"><ArrowCircleDown :size="14" fill="currentColor" /> 遗漏答案</span>
      </div>

      <div class="actions">
        <button v-if="!submitted" class="submit-btn" @click="submit">提交</button>
        <!-- 答错复盘停留：批改与知识卡片保持，手动或自动进入下一题 -->
        <button v-else-if="holding" class="submit-btn next-btn" @click="finishHold">
          下一题（{{ holdCountdown }}s 后自动）
        </button>
        <span v-else class="done">已提交，即将进入下一题</span>
      </div>
    </div>

    <!-- 右侧：知识卡片（提交后显示） -->
    <transition name="slide-in">
      <aside v-if="submitted && q.ittoRaw" class="knowledge-card">
        <h3 class="kc-title">{{ q.processName }} · ITTO 知识点</h3>

        <!-- 答错解析：矩阵归属 + 口诀 + 定义 -->
        <div class="kc-meta">
          <p class="kc-attribution">归属：{{ attributionText }}</p>
          <p v-if="props.question?.process.mnemonic" class="kc-mnemonic">口诀：{{ props.question.process.mnemonic }}</p>
          <p v-if="props.question?.process.definition" class="kc-def">{{ props.question.process.definition }}</p>
        </div>

        <div class="kc-section">
          <h4 class="kc-section-title kc-input"><Download :size="13" fill="currentColor" theme="filled" />输入 (Inputs)</h4>
          <ul class="kc-list">
            <li v-for="item in q.ittoRaw.inputs" :key="item.name" class="kc-item">
              <span class="kc-name">{{ item.name }}</span>
              <span v-if="item.tags?.length" class="kc-tags">
                <span v-for="tag in item.tags" :key="tag" class="kc-tag" :class="tag === 'core' ? 'tag-core' : 'tag-common'">{{ tag }}</span>
              </span>
              <p v-if="item.description" class="kc-desc">{{ item.description }}</p>
            </li>
          </ul>
        </div>

        <div class="kc-section">
          <h4 class="kc-section-title kc-tool"><Tool :size="13" fill="currentColor" theme="filled" />工具与技术 (Tools & Techniques)</h4>
          <ul class="kc-list">
            <li v-for="item in q.ittoRaw.toolsAndTechniques" :key="item.name" class="kc-item">
              <span class="kc-name">{{ item.name }}</span>
              <span v-if="item.tags?.length" class="kc-tags">
                <span v-for="tag in item.tags" :key="tag" class="kc-tag" :class="tag === 'core' ? 'tag-core' : 'tag-common'">{{ tag }}</span>
              </span>
              <p v-if="item.description" class="kc-desc">{{ item.description }}</p>
            </li>
          </ul>
        </div>

        <div class="kc-section">
          <h4 class="kc-section-title kc-output"><Upload :size="13" fill="currentColor" theme="filled" />输出 (Outputs)</h4>
          <ul class="kc-list">
            <li v-for="item in q.ittoRaw.outputs" :key="item.name" class="kc-item">
              <span class="kc-name">{{ item.name }}</span>
              <span v-if="item.tags?.length" class="kc-tags">
                <span v-for="tag in item.tags" :key="tag" class="kc-tag" :class="tag === 'core' ? 'tag-core' : 'tag-common'">{{ tag }}</span>
              </span>
              <p v-if="item.description" class="kc-desc">{{ item.description }}</p>
            </li>
          </ul>
        </div>
      </aside>
    </transition>
  </div>
</template>

<style scoped>
/* ===== 整体布局 ===== */
.itto-layout {
  display: flex;
  gap: 20px;
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
  align-items: flex-start;
}

.itto-quiz { flex: 1; min-width: 0; }

.process-name {
  font-size: 22px; font-weight: 800; margin-bottom: 6px;
  color: var(--text-primary, #f1f5f9);
}
.hint { color: var(--text-muted, #94a3b8); margin-bottom: 20px; font-size: 14px; }
.itto-section { margin-bottom: 18px; }
.itto-section h3 {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--text-muted, #94a3b8); margin-bottom: 10px;
}
/* 分区语义色：图标+标题同色，与知识卡片分区一致（选择器带上下文以压过基础 h3 色） */
.itto-section h3.cat-input { color: #38bdf8; }
.itto-section h3.cat-tool { color: #a78bfa; }
.itto-section h3.cat-output { color: #34d399; }
.option-grid { display: flex; flex-wrap: wrap; gap: 8px; }

.option {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 10px 14px; border: 2px solid var(--border-subtle, rgba(255,255,255,0.12));
  border-radius: 8px; background: var(--surface-glass-strong, rgba(255,255,255,0.12));
  color: var(--text-primary, #f1f5f9);
  cursor: pointer; font-size: 14px; transition: all 0.2s; text-align: left;
  min-width: 0; flex: 1 1 auto; max-width: 100%;
}
.option:hover:not(:disabled) { border-color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.1); }
.option.selected { border-color: var(--color-accent, #22d3ee); background: rgba(34,211,238,0.15); }

.option.correct { border-color: var(--color-success, #10b981); background: rgba(16,185,129,0.15); color: #6ee7b7; box-shadow: 0 0 0 2px rgba(16,185,129,0.2); }
.option.wrong { border-color: var(--color-error, #ef4444); background: rgba(239,68,68,0.15); color: #fca5a5; box-shadow: 0 0 0 2px rgba(239,68,68,0.25); animation: shakeWrong 0.45s ease; }
.option.missing { border-color: var(--color-warning, #f59e0b); background: rgba(245,158,11,0.12); color: #fcd34d; border-style: dashed; box-shadow: 0 0 0 2px rgba(245,158,11,0.2); }
.option.dimmed { opacity: 0.25; }
.option:disabled { cursor: default; }

@keyframes shakeWrong {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
}

.opt-text { flex: 1; min-width: 0; }
.opt-badge { flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.badge-correct { color: #34d399; }
.badge-wrong { color: #f87171; }
.badge-missing { color: #fbbf24; }

/* ===== 颜色图例 ===== */
.legend {
  display: flex; flex-wrap: wrap; gap: 14px; margin: 14px 0;
  padding: 10px 14px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border-subtle, rgba(255,255,255,0.12));
  border-radius: 8px;
}
.legend-item {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600;
}
.legend-correct { color: #34d399; }
.legend-wrong { color: #f87171; }
.legend-missing { color: #fbbf24; }

.actions { margin-top: 16px; text-align: center; }

/* ===== 分区判定小结 ===== */
.section-summary {
  display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 0;
}
.sum-chip {
  font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px;
}
.sum-ok { background: rgba(16,185,129,0.15); color: #34d399; }
.sum-bad { background: rgba(239,68,68,0.15); color: #f87171; }

.next-btn { animation: nextPulse 1.6s ease-in-out infinite; }
@keyframes nextPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.35); }
  50% { box-shadow: 0 0 16px 4px rgba(99,102,241,0.35); }
}

.submit-btn {
  padding: 10px 28px; border: none; border-radius: 8px;
  background: linear-gradient(135deg, var(--color-primary, #6366f1), var(--color-primary-strong, #4f46e5));
  color: #fff; cursor: pointer; font-size: 15px; font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}
.submit-btn:hover { transform: translateY(-1px); box-shadow: var(--glow-primary); }
.done { color: var(--text-muted, #94a3b8); font-size: 14px; }

/* ===== 右侧知识卡片 ===== */
.knowledge-card {
  flex: 0 0 300px;
  background: var(--surface-glass, rgba(255,255,255,0.07));
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-subtle, rgba(255,255,255,0.12));
  border-radius: 12px;
  padding: 18px;
  max-height: 70vh;
  overflow-y: auto;
}

.kc-title {
  font-size: 15px; font-weight: 800;
  color: var(--text-primary, #f1f5f9);
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-subtle, rgba(255,255,255,0.12));
}

/* ===== 答错解析：归属/口诀/定义 ===== */
.kc-meta {
  margin-bottom: 14px;
  padding: 10px 12px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 8px;
}
.kc-attribution {
  font-size: 13px; font-weight: 700; color: #fca5a5; margin-bottom: 6px;
}
.kc-mnemonic {
  font-size: 13px; font-weight: 700; color: var(--color-star, #fbbf24); margin-bottom: 4px;
}
.kc-def {
  font-size: 12px; color: var(--text-muted, #94a3b8); line-height: 1.5; margin: 0;
}

.kc-section { margin-bottom: 14px; }
.kc-section:last-child { margin-bottom: 0; }

.kc-section-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
  margin-bottom: 8px; padding-left: 4px;
}
.kc-input { color: #38bdf8; }
.kc-tool { color: #a78bfa; }
.kc-output { color: #34d399; }

.kc-list { list-style: none; padding: 0; margin: 0; }
.kc-item {
  display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 6px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.kc-item:last-child { border-bottom: none; }
.kc-name {
  font-size: 13px; color: var(--text-secondary, #cbd5e1); line-height: 1.4; flex: 1;
}
.kc-desc {
  width: 100%;
  font-size: 12px; color: var(--text-muted, #94a3b8); line-height: 1.5;
  margin: 2px 0 0 0; padding-left: 8px;
  border-left: 2px solid rgba(255,255,255,0.08);
}

.kc-tags { display: flex; gap: 3px; flex-shrink: 0; align-items: center; }
.kc-tag {
  font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.tag-core { background: rgba(251,191,36,0.15); color: #fbbf24; }
.tag-common { background: rgba(148,163,184,0.12); color: #94a3b8; }

/* ===== 进入动画 ===== */
.slide-in-enter-active { transition: all 0.35s var(--ease-out-expo); }
.slide-in-leave-active { transition: all 0.2s ease; }
.slide-in-enter-from { opacity: 0; transform: translateX(20px); }
.slide-in-leave-to { opacity: 0; transform: translateX(10px); }

/* ===== 响应式 ===== */
@media (max-width: 700px) {
  .itto-layout { flex-direction: column; padding: 14px; }
  .knowledge-card { flex: none; width: 100%; max-height: none; }
}
</style>
