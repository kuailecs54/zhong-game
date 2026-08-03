# 设计：过程全名显示

## Context

游戏数据 `public/data/processes.json` 中每个过程同时存在 `name`（全名，如"排列活动顺序"，最长 9 个汉字）与 `shortName`（缩写，如"排列顺序"）。此前下落卡片封面、书桌托盘、书架书脊、矩阵格子等 UI 均渲染 `shortName`，用户看到的名称与教材不一致。

## Goals / Non-Goals

**Goals:**
- 所有过程显示面一律渲染 `process.name` 全名
- 全名（最长 9 字）在各布局约束下完整可见、不被截断或溢出
- 从数据模型与类型中彻底移除 `shortName`，杜绝短名回流

**Non-Goals:**
- 不改变过程组/知识领域表头的显示（其列头已用 `name`）
- 不调整游戏玩法、评分、星级等逻辑
- 不做全名搜索/发音等额外功能

## Decisions

- **显示一律改用 `process.name`**：`FallingCard.vue`、`SortGrid.vue`（书脊 + 幽灵预览）、`MatrixGrid.vue` 的模板引用从 `shortName` 改为 `name`。删除 `shortName` 字段（数据 + 类型）使 TS 编译器强制约束后续不再出现短名。
- **矩阵迷你书脊重设计为水平小字换行**：14px 宽竖排小字在 36px 格高内物理放不下 9 字全名，故改为水平彩色条 + `word-break: break-all` 小字换行，格子最小高度 36px → 40px。保留堆叠偏移与配色反馈，仅更换文字方向。
- **书架书脊竖排文字适配**：字号 11px → 9px，移除 `white-space: nowrap` 与 `text-overflow: ellipsis`，让竖排文字自然流动；极端层高不足时仍可能截断（取舍：以 9px 字号换取大多数场景完整显示，而非加宽书脊破坏"窄脊"设计语言）。
- **下落卡片封面限宽防溢出**：封面 `min-width` 微增、增加 `max-width: 110px`、字号降至 0.72rem、`word-break: break-all`，防止全名卡片在百分比定位的下落区贴边溢出；compact（托盘）模式相应缩小。

## Risks / Trade-offs

- 矩阵格与书架书脊在极端空间下全名可能显示不全 → 已通过更小字号 + 换行缓解；评估后功能可读性优先，接受极端场景轻微省略
- 全名卡片更宽，下落区同屏卡片视觉占位增大 → 通过 max-width 限制宽度控制
- 删除 `shortName` 属破坏性数据模型变更 → 运行期为本地 JSON 数据，无外部消费方；`validateProcessMatrix` 仅校验 `name` 与矩阵分布，不受影响
