## Context

现状：`SortGrid.vue` 是游戏区底部（`GameView.vue` 的 `.sort-grid-container` 内 absolute 定位）的单层横向格子，每列一个槽位；正确放置的卡片在 `placeCard()` 中从托盘移除后即消失，书架上不保留任何痕迹。选中托盘卡片时所有列都显示同一张预览书（`SortGrid.vue:33`）。`MatrixGrid.vue` 是 stage 4 的 5×3/5×5/5×10 格子矩阵，同样不积累。

数据流：`gameStore.placeCard(columnId, rowId?)` 判定正确后 `correctCount++`，通过 `setTimeout → clearFeedback()` 从托盘移除卡片。`spawnWave` 从卡池随机抽正解（`game.ts:253`），同一过程可能重复出现，因此"执行项目章程 ×5"是真实场景。

## Goals / Non-Goals

**Goals:**
- 正确放置的书在右侧多层书柜上积累陈列，同名书合并为增厚书脊 + ×N 徽标。
- 层数由 `targetCount` 预先规划（公式 A：`layers = ceil(targetCount / 5)`），空层板淡显。
- 书架移到游戏区右侧独立面板，columns 模式游戏区底部清空，下方只有书桌。
- 矩阵模式格子显示放置数量徽标。
- 选中卡片时仅高亮可放入的列并显示幽灵预览。

**Non-Goals:**
- 移动端（<600px）适配——本期书架面板固定右侧，窄屏可能溢出。
- 关卡设计层面"每过程必须精确放置 N 次"的任务配额玩法。
- 错误放置不上架（保持现有"退回托盘"行为）。
- 不改动数据 JSON、49 过程矩阵校验、Desk/FallingCard/Hand/HUD/router/user store。

## Decisions

### 1. 数据模型：`shelvedBooks` 列表

`types.ts` 新增：

```ts
export interface ShelvedBook {
  id: string       // 复用 generateCardId 生成
  process: Process
  columnId: string // 过程组或知识领域 ID（columns 模式）/ 过程组 ID（matrix 模式）
  rowId?: string   // 仅 matrix 模式
}
```

- 选择**平铺列表**而非 `Record<columnId, Process[]>`：matrix 模式需要同时按 `(columnId, rowId)` 分组，平铺列表可统一复用；插入顺序即放置顺序，天然支持"按放置序号填层"。
- `startLevel`/`resetLevel` 置空；`placeCard` 正确分支 `push`。

**替代方案**：`Record<cellKey, {process, count}[]>` 预聚合——在放置时立即归并。否决理由：与矩阵分组逻辑重复，且丢失放置顺序，层填充需要额外还原。

### 2. 层数规划：公式 A + 常量 N=5

- 常量 `BOOKS_PER_SECTION_PER_LAYER = 5`（模块级导出，`stores/game.ts`）。
- getter `shelfLayers = Math.ceil(targetCount / 5)`：各关 2~6 层。
- 选 A（按列最坏情况）而非 B（总量均摊）：B 在多列关卡仅 1~2 层，失去"多层书架"意义；A 保证任意分布都放得下，代价是多列关卡空层较多，以"空层板淡显"缓解视觉浪费。

### 3. 书柜布局与渲染（SortGrid.vue 重构）

- 结构：横向 section（每列一个）→ 每 section 内 `layers` 块层板，自底向上编号；放置序号 `idx` 所在层 = `floor(idx / 5)`。
- 层内按 `processId` 分组合并：同一层内相同过程显示为 1 本书，书脊宽度 `≈16 + (count-1)*4 px` 随数量增厚（上限约 32px），count > 1 时角标 `×N`。
- 面板宽度 `≈46px/section`（2 列 ~120px … 10 列 ~520px），高度铺满右侧；列数多时面板自然变宽，不做滚动。
- 选中托盘卡片时：仅 `card.processGroupId === col.id`（过程组模式）或 `card.knowledgeAreaId === col.id`（知识领域模式）的列高亮为可放置，在最低空层末尾追加虚线幽灵预览书；其余列保持常态（替代旧"所有列预览"）。
- 保留现有 correct/wrong keyframe 动画，作用域改为 section 级。
- 点击 section 仍 `emit('place', col.id)`，由 store 判定正确性。

### 4. 布局重构（GameView.vue）

```
.game-view (flex column, 100vh)
├─ GameHUD
├─ .main-area (flex row, flex:1, min-height:0)
│  ├─ .game-area (flex:1, relative)   ← columns 模式底部清空；matrix 保留底部 MatrixGrid
│  └─ BookShelf 面板（仅 columns 模式，右侧固定）
└─ Desk（全宽，不变）
```

- 书架面板移出 `.game-area`（其 `cursor: none` 不影响面板点击）。
- matrix 模式：不渲染右侧面板，`MatrixGrid` 留在 `.game-area` 底部 absolute 容器，新增 `shelvedBooks` prop。

### 5. 矩阵徽标（MatrixGrid.vue）

- 新增 prop `shelvedBooks`；每格 count = `shelvedBooks.filter(b => b.columnId === col.id && b.rowId === row.id).length`。
- count > 0 显示徽标：过程 shortName，count > 1 时加 `×N`。每个矩阵格唯一对应一个过程，因此格内始终是同一过程的计数。

## Risks / Trade-offs

- [多列关卡（如 sort-3-3：10 列 30 本 → 规划 6 层）空层板多] → 空层板淡显（深色木质），呈现"按题目数量预规划的书柜"而非视觉噪音。
- [窄屏书架面板溢出（10 列 ~520px）] → 本期接受，标注 Non-Goal，后续再做响应式。
- [同列书脊增厚 + 数量多时 section 横向空间不足] → 书脊宽度设上限、字号缩小，必要时书脊内部文字省略号。
- [幽灵预览与已有书重叠] → 预览只追加在最低空层末尾，且为虚线描边样式，与实体书区分。
- [`generateCardId` 与 `nextCardId` 复用] → 上架书 id 与下落卡片 id 共用计数序列，互不冲突（同源递增）。
- [Safari/低端机多层 DOM 增加] → 每层最多 5 槽 × 列数，DOM 规模小（≤ 60 槽），无需虚拟滚动。

## Migration Plan

- 纯前端单仓改动，无后端/数据迁移；`npm run build` 通过即视为安全。
- 回滚：还原 `GameView.vue`、`SortGrid.vue`、`MatrixGrid.vue`、`game.ts`、`types.ts` 五个文件的 git 变更即可。

## Open Questions

- 无阻塞项。层容量 N=5 与"空层板淡显"为已确认决策，后续如觉视觉冗余可单开小改动调整。
