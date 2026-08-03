## Why

矩阵模式（stage 4 关卡）下，矩阵表格的行头（10 大知识领域名称）、格内书脊竖排文字（过程全名）、掉落卡片书名均显示不全：行头被截成"项目整…"，书脊竖排文字只显示 2-3 字，长书名被硬拆成两行。用户要求矩阵游戏后所有名称完整可见（课本全名，禁止缩写）。

## What Changes

- 矩阵表格行头：加宽首列（桌面 60→96px、移动 44→72px、小屏 36→64px），移除 `text-overflow: ellipsis` 截断，10 大知识领域全名（最长 7 字"项目干系人管理"）在任何视口下完整显示。
- 矩阵格子书脊：行头与格子 `min-height` 加高至桌面 90px（移动 80/72px），移除书脊文字 `overflow/max-height` 截断，竖排过程全名（最长 9 字"指导与管理项目工作"）完整显示。
- 掉落卡片封面书名：`word-break: break-all` 改为 `overflow-wrap: break-word` + `white-space: normal`，长书名按词/标点自然换行，不再硬拆。
- 列头（过程组名称）：保证任何宽度下 5 个过程组名称完整可见。

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `sort-gameplay`: 矩阵模式显示完整名称——格内书脊与矩阵网格头部不再截断，过程/过程组/知识领域全名完整显示（原"Matrix cell placement badges"场景中"truncated if it exceeds the cell height"行为变更）。

## Impact

- `src/components/game/MatrixGrid.vue`：网格首列宽度、行头/格子最小高度、行头与书脊文字的溢出处理（CSS 布局调整）。
- `src/components/game/FallingCard.vue`：封面标题换行策略（`word-break` → `overflow-wrap`）。
- 不改数据（`public/data/*.json`）、不改 store 逻辑、不改组件 props 结构与游戏判定逻辑。
- 仅影响展示层；列模式（SortGrid）未改动。
