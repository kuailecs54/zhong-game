<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'

const props = defineProps<{
  /** 全量过程组中文名（quiz 模式无列配置时查归属，由 GameView 下传） */
  pgNames?: Record<string, string>
  /** 全量知识领域中文名 */
  kaNames?: Record<string, string>
}>()

const gameStore = useGameStore()

/** 答对口诀闪现（金色大字，≤1s 自动淡出） */
const mnemonicFlash = ref<string | null>(null)
let flashTimer: ReturnType<typeof setTimeout> | null = null

/** 纠错浮层内容 */
interface Correction {
  title: string
  columnName: string
  rowName?: string
  mnemonic: string
  definitionSummary: string
}
const correction = ref<Correction | null>(null)
let correctionTimer: ReturnType<typeof setTimeout> | null = null

/** 由 processId 构建纠错信息（正确归属 + 口诀 + 定义摘要） */
function buildCorrection(processId: string, missed: boolean): Correction | null {
  const proc = gameStore.processPool.find(p => p.id === processId)
  if (!proc) return null
  // 归属中文名：优先书架列/行配置，quiz 模式回退全量数据映射
  const groupName = gameStore.columnInfos.find(c => c.id === proc.processGroupId)?.name
    ?? props.pgNames?.[proc.processGroupId] ?? proc.processGroupId
  const areaName = gameStore.rowInfos.find(r => r.id === proc.knowledgeAreaId)?.name
    ?? props.kaNames?.[proc.knowledgeAreaId] ?? proc.knowledgeAreaId

  let columnName: string
  let rowName: string | undefined
  if (gameStore.mode === 'sort' && gameStore.layoutType !== 'matrix') {
    // 列布局：只显示单维归属（过程组或知识领域）
    columnName = gameStore.columnType === 'processGroup' ? groupName : areaName
    rowName = undefined
  } else {
    // 矩阵与 quiz 模式：显示 过程组 × 知识领域
    columnName = groupName
    rowName = areaName
  }

  // 定义摘要：截取到第一个句号
  const def = proc.definition ?? ''
  const dotIdx = def.indexOf('。')
  const definitionSummary = dotIdx >= 0 ? def.slice(0, dotIdx + 1) : def
  return {
    title: missed ? '⏱ 时间到' : '❌ 再想想',
    columnName,
    rowName,
    mnemonic: proc.mnemonic ?? '',
    definitionSummary,
  }
}

watch(
  () => gameStore.feedbackState,
  (fs) => {
    if (flashTimer) { clearTimeout(flashTimer); flashTimer = null }

    if (fs && fs.type === 'correct') {
      correction.value = null
      const proc = gameStore.processPool.find(p => p.id === fs.processId)
      if (proc?.mnemonic) {
        mnemonicFlash.value = proc.mnemonic
        flashTimer = setTimeout(() => { mnemonicFlash.value = null }, 900)
      }
    } else if (fs && fs.type === 'wrong') {
      // 超时漏接时引擎将 feedbackState 指向正确位置且 wrongHistory 最新条目 missed=true
      const missed = gameStore.wrongHistory[gameStore.wrongHistory.length - 1]?.missed ?? false
      const c = buildCorrection(fs.processId, missed)
      if (c) {
        correction.value = c
        // 纠错浮层独立停留 3 秒（引擎 600ms 清除 feedbackState 不影响本浮层）
        if (correctionTimer) clearTimeout(correctionTimer)
        correctionTimer = setTimeout(() => { correction.value = null }, 3000)
      }
    } else {
      mnemonicFlash.value = null
      // feedbackState 被引擎清除时纠错浮层保持显示，由自身 3s 定时器关闭
    }
  },
)

onUnmounted(() => {
  if (flashTimer) clearTimeout(flashTimer)
  if (correctionTimer) clearTimeout(correctionTimer)
})
</script>

<template>
  <!-- 答对：口诀闪现 -->
  <div v-if="mnemonicFlash" class="mnemonic-flash">
    <span class="mnemonic-text">{{ mnemonicFlash }}</span>
  </div>

  <!-- 答错/超时：纠错浮层 -->
  <div v-if="correction" class="correction-overlay">
    <div class="correction-card">
      <h3 class="correction-title">{{ correction.title }}</h3>
      <p class="correction-row">
        <span class="row-label">正确归属</span>
        <span class="row-value">{{ correction.columnName }}<template v-if="correction.rowName"> / {{ correction.rowName }}</template></span>
      </p>
      <p v-if="correction.mnemonic" class="correction-row">
        <span class="row-label">口诀</span>
        <span class="row-value mnemonic">{{ correction.mnemonic }}</span>
      </p>
      <p v-if="correction.definitionSummary" class="correction-row">
        <span class="row-label">定义</span>
        <span class="row-value definition">{{ correction.definitionSummary }}</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
/* ===== 口诀闪现 ===== */
.mnemonic-flash {
  position: fixed;
  top: 14vh;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: calc(var(--z-modal) - 10);
}

.mnemonic-text {
  font-size: 1.6rem;
  font-weight: 900;
  color: var(--color-star);
  text-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
  animation: flashPop 0.9s var(--ease-out-expo) forwards;
}

@keyframes flashPop {
  0% { opacity: 0; transform: translateY(10px) scale(0.85); }
  25% { opacity: 1; transform: translateY(0) scale(1); }
  75% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-8px); }
}

/* ===== 纠错浮层 ===== */
.correction-overlay {
  position: fixed;
  top: 72px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: calc(var(--z-modal) - 10);
}

/* 深色玻璃卡片，同 PauseOverlay 风格 */
.correction-card {
  background: rgba(15, 12, 41, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 1rem 1.5rem;
  width: min(400px, calc(100vw - 2rem));
  animation: cardIn 0.25s var(--ease-out-expo);
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.correction-title {
  font-size: 1rem;
  font-weight: 900;
  color: #fca5a5;
  margin-bottom: 0.6rem;
}

.correction-row {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.25rem 0;
  margin: 0;
}

.row-label {
  flex-shrink: 0;
  min-width: 56px;
  font-size: 0.75rem;
  color: var(--text-faint);
  line-height: 1.5;
}

.row-value {
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 600;
  line-height: 1.5;
}

.row-value.mnemonic {
  color: var(--color-star);
}

.row-value.definition {
  font-weight: 400;
  color: var(--text-secondary);
  font-size: 0.78rem;
}

/* 减少动态偏好：动画降级为淡入 */
@media (prefers-reduced-motion: reduce) {
  .mnemonic-text { animation: none; opacity: 1; }
  .correction-card { animation: none; }
}

/* 触摸横屏紧凑化 */
@media (pointer: coarse) and (orientation: landscape) {
  .correction-overlay { top: 52px; }
  .correction-card { padding: 0.6rem 1rem; }
  .correction-title { font-size: 0.85rem; margin-bottom: 0.3rem; }
  .row-value.definition { display: none; }
}
</style>
