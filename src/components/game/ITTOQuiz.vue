<script setup lang="ts">
import { computed } from 'vue'
import { useIttoStore } from '@/stores/itto'
import type { ITTOCategory } from '@/stores/itto'
import { CheckOne, CloseOne, ArrowCircleDown } from '@icon-park/vue-next'

const store = useIttoStore()

const categories: { key: ITTOCategory; label: string }[] = [
  { key: 'inputs', label: '输入 (I)' },
  { key: 'tools', label: '工具与技术 (T)' },
  { key: 'outputs', label: '输出 (O)' },
]

const q = computed(() => store.currentQuestion)

function optionList(key: ITTOCategory): string[] {
  const k = `options${key[0].toUpperCase()}${key.slice(1)}` as 'optionsInputs'
  return (q.value as any)?.[k] ?? []
}
function correctList(key: ITTOCategory): string[] {
  const k = `correct${key[0].toUpperCase()}${key.slice(1)}` as 'correctInputs'
  return (q.value as any)?.[k] ?? []
}
function isSelected(key: ITTOCategory, name: string): boolean {
  return store.selections[key].includes(name)
}
function optClass(key: ITTOCategory, name: string): string {
  if (!store.submitted) return isSelected(key, name) ? 'selected' : ''
  const correct = correctList(key).includes(name)
  const picked = isSelected(key, name)
  if (correct && picked) return 'correct'
  if (correct && !picked) return 'missing'
  if (!correct && picked) return 'wrong'
  return 'dimmed'
}
function optStatus(key: ITTOCategory, name: string): 'correct' | 'missing' | 'wrong' | 'dimmed' | null {
  if (!store.submitted) return null
  const correct = correctList(key).includes(name)
  const picked = isSelected(key, name)
  if (correct && picked) return 'correct'
  if (correct && !picked) return 'missing'
  if (!correct && picked) return 'wrong'
  return 'dimmed'
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
          v-for="opt in optionList(cat.key)"
          :key="opt"
          class="option"
          :class="optClass(cat.key, opt)"
          :disabled="store.submitted"
          @click="store.toggleSelection(cat.key, opt)"
        >
          <span class="opt-text">{{ opt }}</span>
          <span v-if="optStatus(cat.key, opt) && optStatus(cat.key, opt) !== 'dimmed'" class="opt-badge" :class="'badge-' + optStatus(cat.key, opt)">
            <CheckOne v-if="optStatus(cat.key, opt) === 'correct'" :size="20" fill="currentColor" />
            <CloseOne v-else-if="optStatus(cat.key, opt) === 'wrong'" :size="20" fill="currentColor" />
            <ArrowCircleDown v-else-if="optStatus(cat.key, opt) === 'missing'" :size="20" fill="currentColor" />
          </span>
        </button>
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
.itto-quiz { padding: 20px; max-width: 640px; margin: 0 auto; }
.process-name {
  font-size: 22px; font-weight: 800; margin-bottom: 6px;
  color: var(--text-primary, #f1f5f9);
}
.hint {
  color: var(--text-muted, #94a3b8);
  margin-bottom: 20px; font-size: 14px;
}
.itto-section { margin-bottom: 18px; }
.itto-section h3 {
  font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--text-muted, #94a3b8); margin-bottom: 10px;
}
.option-grid { display: flex; flex-wrap: wrap; gap: 8px; }

.option {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 10px 14px; border: 2px solid var(--border-subtle, rgba(255,255,255,0.12));
  border-radius: 8px; background: var(--surface-glass-strong, rgba(255,255,255,0.12));
  color: var(--text-primary, #f1f5f9);
  cursor: pointer; font-size: 14px; transition: all 0.2s; text-align: left;
  min-width: 0; flex: 1 1 auto; max-width: 100%;
}
.option:hover:not(:disabled) {
  border-color: var(--color-accent, #22d3ee);
  background: rgba(34,211,238,0.1);
}
.option.selected {
  border-color: var(--color-accent, #22d3ee);
  background: rgba(34,211,238,0.15);
}

.option.correct {
  border-color: var(--color-success, #10b981);
  background: rgba(16,185,129,0.15);
  color: #6ee7b7;
  box-shadow: 0 0 0 2px rgba(16,185,129,0.2);
}
.option.wrong {
  border-color: var(--color-error, #ef4444);
  background: rgba(239,68,68,0.15);
  color: #fca5a5;
  box-shadow: 0 0 0 2px rgba(239,68,68,0.25);
  animation: shakeWrong 0.45s ease;
}
.option.missing {
  border-color: var(--color-warning, #f59e0b);
  background: rgba(245,158,11,0.12);
  color: #fcd34d;
  border-style: dashed;
  box-shadow: 0 0 0 2px rgba(245,158,11,0.2);
}
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

/* ===== IconPark 图标徽章 ===== */
.opt-badge {
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.badge-correct { color: #34d399; }
.badge-wrong { color: #f87171; }
.badge-missing { color: #fbbf24; }

.actions { margin-top: 20px; text-align: center; }
.submit-btn, .next-btn {
  padding: 10px 28px; border: none; border-radius: 8px;
  background: linear-gradient(135deg, var(--color-primary, #6366f1), var(--color-primary-strong, #4f46e5));
  color: #fff; cursor: pointer; font-size: 15px; font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}
.submit-btn:hover, .next-btn:hover { transform: translateY(-1px); box-shadow: var(--glow-primary, 0 4px 20px rgba(99,102,241,0.35)); }
.done { color: var(--text-muted, #94a3b8); font-size: 14px; }

@media (max-width: 480px) {
  .itto-quiz { padding: 12px; }
  .option { font-size: 13px; padding: 8px 10px; }
  .process-name { font-size: 18px; }
}
</style>
