# 书架书脊并排改造实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将书架从"每种书各占一层"改为"书本并排竖着排放"：同种书合并为固定宽书脊 + ×N 角标（宽度不随数量增厚），书种少时单层并排，单层放不下自动加层（自下而上填充）；矩阵模式格内同步改为固定宽书脊 + ×N 角标。

**架构：** 不改数据模型（`shelvedBooks` 平铺列表保留放置顺序）。新增 `src/utils/shelfLayout.ts` 分层纯函数（可单测），`SortGrid.vue` 的分层算法（`layerData` 按容量填层）改调纯函数，`GameView.vue` 新增单元宽 prop，`MatrixGrid.vue` 格内书脊替换堆叠。

**技术栈：** Vue 3 + TypeScript + Vite + Pinia + vue-router，纯 CSS，无运行时第三方库；测试 = vitest（devDependency，新增 `npm test` 脚本）；构建校验 = `npm run build` + Playwright 浏览器回归。

**前置规格：** `openspec/changes/bookshelf-side-by-side-books/`（proposal/design/specs/tasks），设计基线 `docs/superpowers/specs/2026-08-03-bookshelf-side-by-side-design.md`

---

### 任务 0：vitest 基础设施 + 分层纯函数（TDD）

**文件：**
- 修改：`package.json`（新增 `npm test` 脚本 + vitest devDependency）、`vite.config.ts`（vitest 配置或由 vite.config 继承）
- 创建：`src/utils/shelfLayout.ts`、`src/utils/shelfLayout.test.ts`

- [ ] **步骤 1：安装 vitest**

运行：`npm i -D vitest`
预期：`package.json` 出现 `vitest` devDependency，`node_modules` 更新。

- [ ] **步骤 2：添加 test 脚本**

在 `package.json` 的 `scripts` 中新增：

```json
"test": "vitest run"
```

- [ ] **步骤 3：编写失败的测试（RED）**

创建 `src/utils/shelfLayout.test.ts`（与源码同目录，vitest 默认匹配 `*.test.ts`）：

```ts
import { describe, it, expect } from 'vitest'
import { spineWidthFor, layerCapacityFor, buildShelfLayers } from './shelfLayout'
import type { Process } from '@/data/types'

/** 构造最小 Process 对象（仅分层算法用到 id） */
function p(id: string): Process {
  return { id, name: id, processGroupId: 'g', knowledgeAreaId: 'ka' } as Process
}

describe('spineWidthFor', () => {
  it('常规单元（≥60px）返回 20px', () => {
    expect(spineWidthFor(110)).toBe(20)
    expect(spineWidthFor(94)).toBe(20)
  })
  it('窄单元（<60px）收缩到 14px', () => {
    expect(spineWidthFor(43)).toBe(14)
  })
})

describe('layerCapacityFor', () => {
  it('110px 单元每层 4 本', () => {
    expect(layerCapacityFor(110)).toBe(4)
  })
  it('94px 单元每层 3 本', () => {
    expect(layerCapacityFor(94)).toBe(3)
  })
  it('43px 单元每层 1 本', () => {
    expect(layerCapacityFor(43)).toBe(1)
  })
})

describe('buildShelfLayers', () => {
  it('书种少时单层并排，同种合并为 ×N 角标', () => {
    const books = [p('a'), p('b'), p('a')]
    const layers = buildShelfLayers(books, 4)
    expect(layers.length).toBe(1)
    expect(layers[0].spines.map(s => s.process.id)).toEqual(['a', 'b'])
    expect(layers[0].spines.find(s => s.process.id === 'a')!.count).toBe(2)
  })
  it('超过容量自动加层（自下而上）', () => {
    const books = [p('a'), p('b'), p('c'), p('d'), p('e'), p('f')]
    const layers = buildShelfLayers(books, 4)
    expect(layers.length).toBe(2)
    expect(layers[0].spines.length).toBe(4)
    expect(layers[1].spines.length).toBe(2)
  })
  it('同种合并不占新位置（不因重复增加层）', () => {
    const books = [p('a'), p('a'), p('a'), p('a'), p('a')]
    const layers = buildShelfLayers(books, 4)
    expect(layers.length).toBe(1)
    expect(layers[0].spines[0].count).toBe(5)
  })
})
```

- [ ] **步骤 4：运行测试确认失败（RED 验证）**

运行：`npm test`
预期：FAIL——`shelfLayout` 模块不存在，报 "Cannot find module" / 导入失败。

- [ ] **步骤 5：实现最少代码（GREEN）**

创建 `src/utils/shelfLayout.ts`：

```ts
import type { Process } from '@/data/types'

/** 书脊固定宽度与最小宽度（窄单元收缩下限） */
export const SPINE_WIDTH = 20
export const SPINE_WIDTH_MIN = 14
/** 书脊间 gap 与单元内水平 padding 合计（与 .layer-spines/.shelf-body CSS 一致） */
const SPINE_GAP = 2
const UNIT_H_PADDING = 12
/** 单元宽阈值：低于此值书脊收缩到最小宽 */
const NARROW_UNIT_THRESHOLD = 60

export interface MergedSpine {
  process: Process
  count: number
}

export interface ShelfLayer {
  layer: number
  spines: MergedSpine[]
}

/** 按单元宽计算书脊实际宽度 */
export function spineWidthFor(unitWidth: number): number {
  if (unitWidth <= 0) return SPINE_WIDTH
  return unitWidth < NARROW_UNIT_THRESHOLD ? SPINE_WIDTH_MIN : SPINE_WIDTH
}

/** 每层容量 = 可容纳书脊数 */
export function layerCapacityFor(unitWidth: number): number {
  if (unitWidth <= 0) return 4
  return Math.max(1, Math.floor((unitWidth - UNIT_H_PADDING) / (spineWidthFor(unitWidth) + SPINE_GAP)))
}

/**
 * 按容量填层：书种少时单层并排；超过每层容量自动加层（自下而上填充）。
 * 层号 0 = 最底层；同种书在层内合并为 1 本书脊 + ×N 角标（固定宽，不增厚）。
 */
export function buildShelfLayers(books: Process[], capacity: number): ShelfLayer[] {
  const layers: ShelfLayer[] = []
  for (const book of books) {
    const existing = layers.find(l => l.spines.some(s => s.process.id === book.id))
    if (existing) {
      existing.spines.find(s => s.process.id === book.id)!.count++
      continue
    }
    let target = layers.find(l => l.spines.length < capacity)
    if (!target) {
      target = { layer: layers.length, spines: [] }
      layers.push(target)
    }
    target.spines.push({ process: book, count: 1 })
  }
  return layers
}
```

- [ ] **步骤 6：运行测试确认通过（GREEN 验证）**

运行：`npm test`
预期：6 个测试全部 PASS。

- [ ] **步骤 7：Commit**

```bash
git add package.json package-lock.json vite.config.ts src/utils/shelfLayout.ts src/utils/shelfLayout.test.ts 2>/dev/null
git commit -m "test: 引入 vitest + 分层纯函数（按容量填层）单测"
```

> 注：若 `vite.config.ts` 需 vitest 专属配置（如 alias），按需补充；vitest 默认读取 vite.config 的 `resolve.alias`，`@` 别名可直接用。

---

### 任务 1：GameView 传递单元宽给 SortGrid

**文件：**
- 修改：`src/views/GameView.vue:72-75`（`shelfPanelWidth` 旁新增计算）、`src/views/GameView.vue`（SortGrid 调用处传 prop）

- [ ] **步骤 1：新增 `shelfUnitWidth` 计算属性**

在 `src/views/GameView.vue` 的 `shelfPanelWidth` computed（第 72-75 行）旁新增：

```ts
// 每个书架单元的估算宽度（与面板宽度公式同源）
// 注：shelfPanelWidth 返回 "520px" 字符串，需 parseFloat 后参与算术
const shelfUnitWidth = computed(() => {
  const n = gameStore.columnInfos.length
  if (n === 0) return 0
  return Math.round((parseFloat(shelfPanelWidth.value) - 16 - (n - 1) * 8) / n)
})
```

- [ ] **步骤 2：SortGrid 调用处传入 prop**

找到 `GameView.vue` 模板中 `<SortGrid ...>`，新增 `:unit-width="shelfUnitWidth"`。改动前先阅读该模板段确认现有 props 列表（`columns`、`columnType`、`shelvedBooks`、`dragCard`、`feedback`、`highlightTarget`）。

- [ ] **步骤 3：验证编译**

运行：`npm run build`
预期：通过（vue-tsc 报 SortGrid 缺少 `unitWidth` prop 定义属预期，进入任务 2 后消除；若此处报错因类型未声明，可接受继续）

---

### 任务 2：SortGrid 分层算法重写（按容量填层，复用纯函数）

**文件：**
- 修改：`src/components/game/SortGrid.vue`（script 段 1-140，重点 `layerData` 36-79、`colLayerCounts` 82-89、`MergedSpine` 136-139、`getSpinesAtLayer` 125-129）

- [ ] **步骤 1：声明新 prop 并从 utils 导入纯函数**

在 `SortGrid.vue` 的 `defineProps` 中新增：

```ts
/** 书架单元估算宽度（px），由 GameView 传入 */
unitWidth: { type: Number, required: true }
```

在 `<script setup>` 顶部（`import` 之后）导入纯函数，并删除本文件内旧常量（`SPINE_WIDTH`/`SPINE_WIDTH_MIN`/`SPINE_GAP`/`UNIT_H_PADDING` 若已定义）：

```ts
import { buildShelfLayers, spineWidthFor, layerCapacityFor } from '@/utils/shelfLayout'
import type { ShelfLayer } from '@/utils/shelfLayout'
```

- [ ] **步骤 2：重写 `layerData` 为按容量填层（调用纯函数）**

替换现有 `layerData` computed（第 36-79 行）全部内容：

```ts
/**
 * 按容量填层：书种少时单层并排；超过每层容量自动加层（自下而上填充）。
 * 层号 0 = 最底层；同种书在层内合并为 1 本书脊 + ×N 角标（固定宽，不增厚）。
 * 算法由 @/utils/shelfLayout 的 buildShelfLayers 提供（已单测覆盖）。
 */
const layerData = computed(() => {
  const result = new Map<string, ShelfLayer[]>()
  const capacity = layerCapacityFor(props.unitWidth)

  for (const col of props.columns) {
    const books = booksByColumn.value.get(col.id) ?? []
    result.set(col.id, buildShelfLayers(books.map(b => b.process), capacity))
  }
  return result
})
```

- [ ] **步骤 3：删除本地 `MergedSpine` 接口，改用导入类型**

现有 `interface MergedSpine`（第 136-139 行）删除，改从 `@/utils/shelfLayout` 导入（`ShelfLayer` 已导入；若代码仍引用 `MergedSpine` 类型名，改为 `ShelfLayer['spines'][number]` 或直接导入 `MergedSpine`）。

- [ ] **步骤 4：验证编译与单测**

运行：`npm test` 与 `npm run build`
预期：两者通过（分层逻辑已由纯函数单测覆盖，组件仅剩胶水代码）。

- [ ] **步骤 5：Commit**

```bash
git add src/components/game/SortGrid.vue
git commit -m "refactor(sort-grid): layerData 改调 buildShelfLayers 纯函数"
```

- [ ] **步骤 6：替换 `colLayerCounts` 为取层数**

替换现有 `colLayerCounts` computed（第 82-89 行）：

```ts
/** 每列的层数（= 已用层数，至少 1，无预规划空层板） */
const colLayerCounts = computed(() => {
  const map = new Map<string, number>()
  for (const col of props.columns) {
    const layers = layerData.value.get(col.id)
    map.set(col.id, Math.max(1, layers?.length ?? 0))
  }
  return map
})
```

- [ ] **步骤 7：验证编译与基础渲染**

运行：`npm test` 与 `npm run build`
预期：通过。随后 `npm run dev` 打开任意 columns 关卡（如 sort-1-1），确认书架能渲染且无崩溃；层数与书脊数尚需任务 3 后核对。

- [ ] **步骤 8：Commit**

```bash
git add src/views/GameView.vue src/components/game/SortGrid.vue
git commit -m "feat(sort-grid): 书架按容量填层（单层优先，溢出自动加层）"
```

---

### 任务 3：书脊视觉（固定宽 + 竖排单列不折行）

**文件：**
- 修改：`src/components/game/SortGrid.vue`（style 段 204-493，重点 `.book-spine` 354-369、`.spine-text` 378-388、`.layer-spines` 343-351）

- [ ] **步骤 1：书脊宽度固定并随单元宽收缩**

将 `.book-spine`（第 354-369 行）的固定 `width: 18px` 改为动态宽度。在 `<script setup>` 的 style 无法直接读 JS 值，改为在模板 `:style` 上注入：

在模板书脊 div（第 180-184 行）加上动态宽度：

```vue
<div
  v-for="(spine, si) in getSpinesAtLayer(col.id, (colLayerCounts.get(col.id) ?? 1) - layerIdx)!"
  :key="si"
  class="book-spine"
  :style="{ width: spineWidthFor(unitWidth) + 'px' }"
>
```

同时删除 `.book-spine` 规则中的 `width: 18px;`（保留其余样式）。

- [ ] **步骤 2：书名竖排单列不折行**

`.spine-text`（第 378-388 行）保持 `writing-mode: vertical-rl`，显式强化单列不折行：

```css
.spine-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 9px;
  font-weight: 600;
  color: #f5e6c8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
  line-height: 1.1;
  max-height: 100%;
  padding: 2px 0;
}
```

（`writing-mode: vertical-rl` 下 `white-space: nowrap` 确保不折行成两列，`overflow: hidden` 截断超长书名。）

- [ ] **步骤 3：书脊区从左到右排列**

`.layer-spines`（第 343-351 行）将 `justify-content: center` 改为 `flex-start`：

```css
.layer-spines {
  flex: 1;
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
  gap: 2px;
  padding: 2px 4px;
  min-height: 0;
}
```

- [ ] **步骤 4：适配窄单元与响应式**

`.book-spine` 的 `flex-shrink: 0` 保留（书脊固定宽，不压缩）。响应式（第 461-486 行）的 `.book-spine { width: 15px }` 与动态宽度冲突，删除该覆盖（动态宽度已处理窄单元）。幽灵书脊 `.ghost-spine`（第 405-417 行）的 `width: 18px` 同样改为模板注入 `spineWidthFor(unitWidth)`。

- [ ] **步骤 5：验证视觉效果**

运行：`npm run build` 通过。`npm run dev` 验证：
- 书脊竖排单列、书名不换行
- 书种少时单层并排；多时自动加层（可临时在 store 里多放几本或在 sort-2-3 实测）
- 5 列关（94px 单元）书脊 ~20px；10 列关（43px 单元）书脊 ~14px

- [ ] **步骤 6：Commit**

```bash
git add src/components/game/SortGrid.vue
git commit -m "feat(sort-grid): 书脊固定宽 + 竖排单列不折行 + 左对齐排列"
```

---

### 任务 4：幽灵预览适配新分层

**文件：**
- 修改：`src/components/game/SortGrid.vue`（script 段 `ghostPreview` 92-113、`hasGhost` 132-134）

- [ ] **步骤 1：重写 `ghostPreview`**

替换现有 `ghostPreview` computed（第 92-113 行）：

```ts
/**
 * 幽灵预览：已有同种书 → 其所在层；新书 → 最低有空位层末尾
 */
const ghostPreview = computed(() => {
  if (!props.dragCard) return null
  const map = new Map<string, number>()
  const capacity = layerCapacityFor(props.unitWidth)

  for (const col of props.columns) {
    if (!isPlaceable(col.id)) continue
    const layers = layerData.value.get(col.id) ?? []

    // 已有同种书 → 其所在层
    const existingIdx = layers.findIndex(l =>
      l.spines.some(s => s.process.id === props.dragCard!.id)
    )
    if (existingIdx >= 0) {
      map.set(col.id, existingIdx)
      continue
    }
    // 新书 → 最低有空位层；无空位 → 开新层
    const targetIdx = layers.findIndex(l => l.spines.length < capacity)
    map.set(col.id, targetIdx >= 0 ? targetIdx : layers.length)
  }
  return map
})
```

- [ ] **步骤 2：确认模板幽灵位置**

`hasGhost`（第 132-134 行）逻辑无需改（按层号判断）。模板中 `.layer-spines` 内幽灵在书脊循环之后渲染（第 187-193 行），天然出现在"已有书后/层末尾"——与设计一致。若需确认视觉：拖拽书桌卡片悬停可放置列，幽灵应出现在已有书紧邻后方（同种）或最低空层末尾（新书）。

- [ ] **步骤 3：验证 + Commit**

运行：`npm run build` 通过。浏览器拖拽验证幽灵位置正确。

```bash
git add src/components/game/SortGrid.vue
git commit -m "feat(sort-grid): 幽灵预览按容量分层定位"
```

---

### 任务 5：MatrixGrid 格内书脊角标

**文件：**
- 修改：`src/components/game/MatrixGrid.vue`（template 94-110 `.mini-spine-stack` 块、style 242-290）

- [ ] **步骤 1：格内改为固定宽书脊 + ×N 角标**

替换 template 中 `.mini-spine-stack` 块（第 94-110 行）：

```vue
<!-- 格内固定宽书脊 + 角标 -->
<div v-if="cellHasBooks(col.id, row.id)" class="cell-spine">
  <span class="cell-spine__text">{{ getCellBooks(col.id, row.id)[0].name }}</span>
  <span v-if="getCellBooks(col.id, row.id).length > 1" class="cell-spine__count">
    ×{{ getCellBooks(col.id, row.id).length }}
  </span>
</div>
```

（矩阵每格 = 过程组 × 知识领域唯一交叉，格内只有 1 个过程，故取 `[0]` 即可；重复次数 = 格内书数。）

- [ ] **步骤 2：新增格内书脊样式**

删除 `.mini-spine-stack`/`.mini-spine`/`.mini-spine__text`/`.mini-spine__more` 样式（第 242-290 行），新增：

```css
/* 格内固定宽书脊 + 角标 */
.cell-spine {
  position: relative;
  width: 14px;
  height: 88%;
  background: linear-gradient(180deg, #7c4a24, #a9743f);
  border-radius: 2px;
  box-shadow:
    1px 0 2px rgba(0, 0, 0, 0.35),
    inset 1px 0 0 rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.cell-spine__text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  max-height: 100%;
  padding: 2px 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

.cell-spine__count {
  position: absolute;
  top: -3px;
  right: -3px;
  background: #ef4444;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  padding: 0 3px;
  border-radius: 6px;
  line-height: 1.2;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}
```

- [ ] **步骤 3：同步响应式与精简孤儿逻辑**

- 响应式段（第 367-370、399-402、407 行）引用 `.mini-spine__text` 的规则改为 `.cell-spine__text`。
- `MatrixGrid.vue` script 中 `getCellBooks`/`cellHasBooks`（第 33-39 行）保留；若 `slice(0, 3)` 相关逻辑已随模板删除则无需清理 script。

- [ ] **步骤 4：验证 + Commit**

运行：`npm run build` 通过。`npm run dev` 打开矩阵关卡（sort-4-1），重复放置同过程 → 格内 1 本书脊 + ×N 角标递增。

```bash
git add src/components/game/MatrixGrid.vue
git commit -m "feat(matrix-grid): 格内固定宽书脊 + ×N 角标替换堆叠"
```

---

### 任务 6：全量验证与回归

**文件：**
- 无（只验证）

- [ ] **步骤 1：`npm run build`**

运行：`npm run build`
预期：vue-tsc 类型检查 + vite build 全部通过。

- [ ] **步骤 2：columns 模式回归**

`npm run dev` 打开：
- sort-1-1（2 列，每列 5 本）：书种少 → 单层并排，同种合并 ×N 角标
- sort-2-3（5 列，每列 6 本）：书种多 → 自动加层，自下而上填充
- 拖拽放置：幽灵预览位置正确（同种贴书脊后 / 新书最低空层末尾）
- 正确放置 → 书弹入 + 角标更新；错误放置 → 提示回弹（交互不变）

- [ ] **步骤 3：matrix 模式回归**

打开 sort-4-1（矩阵关卡）：重复放置同过程 → 格内 1 本书脊 + ×N 角标递增；书名竖排单列不折行。

- [ ] **步骤 4：窄单元检查**

打开 sort-3-3（10 列 columns 关）：书脊 ~14px、每层 1~2 本，自动加层后无溢出、无横向滚动条。

- [ ] **步骤 5：`npm test` 全量单测**

运行：`npm test`
预期：`src/utils/shelfLayout.test.ts` 全部通过（含已覆盖的分层/容量/合并逻辑）。

- [ ] **步骤 6：最终 Commit**

```bash
git add -A
git commit -m "docs: 书架书脊并排改造（openspec + 设计 + 实施计划）" 2>/dev/null || echo "无新增改动可提交"
```

---

## 自检记录

- **规格覆盖度**：openspec specs 的 4 项需求（同种合并角标/容量分层/书脊竖排单列/幽灵预览适配）+ sort-gameplay 矩阵格角标 → 对应任务 2/3/4/5，全部覆盖；vitest 单测（任务 0）覆盖纯函数 `spineWidthFor`/`layerCapacityFor`/`buildShelfLayers`。
- **占位符扫描**：无 TODO/待定，每步含具体代码与验证命令。
- **类型一致性**：`spineWidthFor`/`layerCapacityFor`/`buildShelfLayers`/`MergedSpine`/`ShelfLayer` 在任务 0 定义并单测，任务 2/3/4 从 `@/utils/shelfLayout` 导入，签名一致；`unitWidth` prop 在任务 1 传入、任务 2 声明、任务 3 用于模板注入，命名统一。
- **风险提示**：任务 1 步骤 3 预期 SortGrid 会短暂报 prop 缺失（build 可能因未声明 prop 报类型错误，属预期，任务 2 完成后消除）；vitest 首次运行需确认 `vite.config.ts` 的 alias 解析（`@` → `src`）对测试文件生效。
