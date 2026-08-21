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
  return ''
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
.hint { color: #888; margin-bottom: 16px; font-size: 14px; }
.itto-section { margin-bottom: 16px; }
.option-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.option { padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer; font-size: 14px; transition: all 0.15s; }
.option:hover:not(:disabled) { border-color: #3498db; }
.option.selected { border-color: #3498db; background: #eaf4ff; }
.option.correct { border-color: #2ecc71; background: #e9f9ef; }
.option.wrong { border-color: #e74c3c; background: #fdecea; }
.option.missing { border-color: #f39c12; background: #fff7e6; }
.option:disabled { cursor: default; opacity: 0.9; }
.actions { margin-top: 12px; }
.submit-btn, .next-btn { padding: 10px 20px; border: none; border-radius: 6px; background: #3498db; color: #fff; cursor: pointer; font-size: 14px; }
.submit-btn:hover, .next-btn:hover { background: #2980b9; }
.done { color: #888; font-size: 14px; }
</style>
