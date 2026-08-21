<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'
import type { Process } from '@/data/types'

const props = defineProps<{
  /** 全量过程数据（由 GameView 传入，供干扰项生成） */
  processes: Process[]
}>()

const emit = defineEmits<{
  result: [isCorrect: boolean, chosenLabel: string]
}>()

const gameStore = useGameStore()

/** 单题视图：题型 + 题面 + 打乱后的选项 */
interface QuizView {
  type: 'A' | 'B'
  stem: string
  options: { label: string; isCorrect: boolean }[]
}

/** 当前卡的题（未作答） */
const live = ref<QuizView | null>(null)
/** 已作答冻结视图：引擎立即推进下一卡，此处短暂保留作答视觉反馈 */
const frozen = ref<{ view: QuizView; picked: string } | null>(null)
let unfreezeTimer: ReturnType<typeof setTimeout> | null = null

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * 干扰项生成：优先从同知识领域或同过程组的其他过程中抽 3 个（近邻混合优先），
 * 不足时从其余过程补齐；选项互不重复且恰好 1 个正确。
 */
function buildQuiz(cur: Process): QuizView {
  const type: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B'
  const others = props.processes.filter(p => p.id !== cur.id)
  const near = shuffle(
    others.filter(p => p.knowledgeAreaId === cur.knowledgeAreaId || p.processGroupId === cur.processGroupId),
  )
  const nearIds = new Set(near.map(p => p.id))
  const rest = shuffle(others.filter(p => !nearIds.has(p.id)))
  const distractors = [...near, ...rest].slice(0, 3)

  const options = shuffle([cur, ...distractors]).map(p => ({
    label: type === 'A' ? p.name : (p.role ?? ''),
    isCorrect: p.id === cur.id,
  }))

  return {
    type,
    stem: type === 'A' ? (cur.definition ?? '') : cur.name,
    options,
  }
}

// 当前卡变化时出新题（冻结期间暂不刷新，解冻后重建）
watch(
  () => gameStore.currentProcess,
  (p) => {
    if (frozen.value) return
    live.value = p ? buildQuiz(p) : null
  },
  { immediate: true },
)

function choose(opt: { label: string; isCorrect: boolean }) {
  if (frozen.value || !live.value) return
  frozen.value = { view: live.value, picked: opt.label }
  emit('result', opt.isCorrect, opt.label)
  // 冻结 900ms 展示正确项标示，随后切到当前（新）题
  if (unfreezeTimer) clearTimeout(unfreezeTimer)
  unfreezeTimer = setTimeout(() => {
    frozen.value = null
    live.value = gameStore.currentProcess ? buildQuiz(gameStore.currentProcess) : null
  }, 900)
}

onUnmounted(() => {
  if (unfreezeTimer) clearTimeout(unfreezeTimer)
})
</script>

<template>
  <!-- 冻结视图优先（展示判定反馈），否则渲染当前题 -->
  <div v-if="frozen || live" class="definition-quiz">
    <div class="quiz-card">
      <span class="spine-bar"></span>
      <div class="quiz-body">
        <p class="quiz-type">{{ (frozen?.view ?? live)!.type === 'A' ? '题型 A · 根据定义选过程' : '题型 B · 根据过程选主要作用' }}</p>
        <p class="quiz-stem">{{ (frozen?.view ?? live)!.stem }}</p>

        <div class="option-list">
          <button
            v-for="opt in (frozen?.view ?? live)!.options"
            :key="opt.label"
            class="quiz-option"
            :class="{
              'picked': frozen?.picked === opt.label,
              'correct': frozen && opt.isCorrect,
              'wrong': frozen && frozen.picked === opt.label && !opt.isCorrect,
            }"
            :disabled="!!frozen"
            @click="choose(opt)"
          >{{ opt.label }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.definition-quiz {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 16px;
  overflow-y: auto;
}

/* 书本卡外观题面（与 CardStage 同一视觉体系） */
.quiz-card {
  position: relative;
  display: flex;
  align-items: stretch;
  width: min(560px, 100%);
  max-height: 100%;
  background: var(--surface-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: quizIn 0.25s ease-out;
}

@keyframes quizIn {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}

.spine-bar {
  width: 10px;
  flex-shrink: 0;
  background: linear-gradient(180deg, var(--color-primary), var(--color-primary-strong));
}

.quiz-body {
  flex: 1;
  min-width: 0;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.quiz-type {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-faint);
  letter-spacing: 0.05em;
}

.quiz-stem {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.6;
}

/* 选项竖排按钮组，hover 中性高亮 */
.option-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.quiz-option {
  padding: 0.65rem 0.9rem;
  text-align: left;
  background: rgba(255, 255, 255, 0.05);
  border: 1.5px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.5;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.quiz-option:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.1);
}

/* 判定后标示：正确=绿描边、错选=红描边 */
.quiz-option.correct {
  border-color: var(--color-success);
  background: rgba(16, 185, 129, 0.15);
  color: #6ee7b7;
}

.quiz-option.wrong {
  border-color: var(--color-error);
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}

.quiz-option.picked {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.15);
}

.quiz-option:disabled {
  cursor: default;
}

@media (pointer: coarse) and (orientation: landscape) {
  .definition-quiz { padding: 8px; }
  .quiz-body { padding: 0.75rem 1rem; gap: 0.4rem; }
  .quiz-stem { font-size: 0.85rem; }
  .quiz-option { padding: 0.4rem 0.7rem; font-size: 0.78rem; }
}
</style>
