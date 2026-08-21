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
.itto-quiz { padding: 16px; max-width: 640px; margin: 0 auto; }
.process-name { font-size: 22px; font-weight: 800; margin-bottom: 4px; color: #1e293b; }
.hint { color: #888; margin-bottom: 16px; font-size: 14px; }
.itto-section { margin-bottom: 16px; }
.itto-section h3 { font-size: 14px; font-weight: 700; color: #475569; margin-bottom: 8px; }
.option-grid { display: flex; flex-wrap: wrap; gap: 8px; }

.option {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 10px 14px; border: 2px solid #d1d5db; border-radius: 8px; background: #fff;
  cursor: pointer; font-size: 14px; transition: all 0.2s; text-align: left;
  min-width: 0; flex: 1 1 auto; max-width: 100%;
}
.option:hover:not(:disabled) { border-color: #3498db; background: #f0f9ff; }
.option.selected { border-color: #3498db; background: #eaf4ff; }

.option.correct {
  border-color: #22c55e; background: #dcfce7; color: #15803d;
  box-shadow: 0 0 0 2px rgba(34,197,94,0.2);
}
.option.wrong {
  border-color: #ef4444; background: #fef2f2; color: #b91c1c;
  box-shadow: 0 0 0 2px rgba(239,68,68,0.25);
  animation: shakeWrong 0.45s ease;
}
.option.missing {
  border-color: #f59e0b; background: #fffbeb; color: #92400e;
  border-style: dashed;
  box-shadow: 0 0 0 2px rgba(245,158,11,0.2);
}
.option.dimmed { opacity: 0.3; }
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
.badge-correct { color: #16a34a; }
.badge-wrong { color: #dc2626; }
.badge-missing { color: #d97706; }

.actions { margin-top: 16px; text-align: center; }
.submit-btn, .next-btn {
  padding: 10px 24px; border: none; border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff; cursor: pointer; font-size: 15px; font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}
.submit-btn:hover, .next-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59,130,246,0.4); }
.done { color: #888; font-size: 14px; }

@media (max-width: 480px) {
  .itto-quiz { padding: 12px; }
  .option { font-size: 13px; padding: 8px 10px; }
  .process-name { font-size: 18px; }
}
</style>
