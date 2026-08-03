# Proposal: 书架书脊并排改造

## Why

当前书架采用"每种去重书各占一层"（`SortGrid.vue` 的 `layerData` 按首次放置顺序分配层号），小关卡书种少时书站得矮、层板空置，视觉上不像真实书架。玩家反馈希望书本像真实书架一样**并排竖着排放**：同种书合并为 1 本书脊 + ×N 角标（书脊宽度固定，不随数量增厚），书种少时单层并排，单层放不下时自动加层（自下而上填充）。矩阵模式格内展示（当前"堆叠 3 本 + +N"）同步统一为"固定宽书脊 + ×N 角标"。

## What Changes

- 书架分层规则由"每书种一层"改为"**按容量填层**"：书种少时单层并排；超过每层容量自动加层（自下而上填充，无预规划空层板）。
- 每层容量 = 按单元宽度动态计算：书脊固定宽 20px（窄单元最小 14px），容量 = `floor(可用宽 / (书脊宽 + gap))`。
- 书脊宽度**固定**，重复放置不再增厚，同种书合并为 1 本书脊 + 红色 ×N 角标。
- 书脊书名**竖排单列不折行**（`writing-mode: vertical-rl` + 截断），超长省略/隐藏。
- 幽灵预览：已有同种书→贴其书脊后；新书→最低有空位层末尾。
- 矩阵模式（`MatrixGrid.vue`）格内改为**固定宽书脊 + ×N 角标**（替换当前迷你书脊堆叠 + `+N`）。

## Capabilities

### New Capabilities

- 无（本次不新增能力规格，均落在既有能力内）

### Modified Capabilities

- `book-shelf`: 分层规则改为按容量填层（单层优先、溢出自动加层、自下而上填充）；书脊宽度固定仅以角标计重复；书名竖排单列不折行；幽灵预览位置随新分层规则调整。
- `sort-gameplay`: 矩阵格计数徽标改为固定宽书脊 + ×N 角标展示。

## Impact

- 组件：`src/components/game/SortGrid.vue`（分层算法重写 + 书脊视觉 + 幽灵预览）、`src/components/game/MatrixGrid.vue`（格内书脊角标替换堆叠）。
- 新增：`src/utils/shelfLayout.ts`（分层纯函数，便于单元测试）、vitest devDependency 与 `npm test` 脚本。
- 状态：`src/stores/game.ts` 不变（`shelvedBooks` 平铺列表与放置顺序已满足新算法）。
- 类型：`src/data/types.ts` 不变。
- 无运行时外部依赖变化；验证：`npm test` + `npm run build`。
