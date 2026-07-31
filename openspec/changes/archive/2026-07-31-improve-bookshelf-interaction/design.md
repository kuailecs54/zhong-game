# Design: 书架展示与放置交互改进

## Context

游戏目前的书架交互与展示存在多处体验问题：放置依赖"点选书桌卡片 → 点击书架"两步；书架为单一整体、内部按格划分；书本横躺、书脊文本因 `rotate(180deg)` 反向；层按 `floor(firstIdx / 5)` 规划，小关卡的书全部堆在底层而预留空板闲置；下落卡片小且用 `click` 捕获，移动目标上按下-松开易错失；自定义手掌光标在书桌区域冻结。纯前端 Vue3 项目，无后端，唯一校验为 `npm run build`。

## Goals / Non-Goals

**Goals:**
- 放置交互改为"从书桌拖拽到书架/矩阵格子"上架，拖拽期间有跟随书本与可放置高亮。
- 每列渲染为独立书架单元，每种书（去重）占一层、自下而上，同种书合并 ×N；移除预留空板。
- 书脊直立撑满层高，书脊文本竖排且方向正常。
- 下落卡片书本化；捕获改 `pointerdown` 并扩展命中区域。
- 拖拽落空（面板外/反馈窗口期）给出可见提示；面板内偏移自动吸附最近单元。
- 移除手掌光标，恢复系统光标。

**Non-Goals:**
- 不改游戏规则（计分、生命、连击、冰冻、星级）与数据文件。
- 不重构矩阵模式的规则逻辑，仅支持拖拽放置。
- 不做后端、持久化或跨端改动。

## Decisions

### 1. 拖拽用 Pointer Events + document 级监听 + Teleport 幽灵
不用 HTML5 Drag & Drop（移动端支持差、样式不可控）。方案：书桌卡片 `pointerdown` 启动拖拽，`document` 级 `pointermove/pointerup` + `touchmove/touchend` 跟踪，Teleport 到 body 的 `.drag-ghost`（`position: fixed`、`pointer-events: none`）跟手。松手用 `document.elementFromPoint(x, y)` + `closest('[data-column-id]')` 命中书架单元/矩阵格子。
- 备选：HTML5 DnD——放弃，移动端与样式控制差。

### 2. 松手吸附与失败提示
`elementFromPoint` 未命中时：若松手点在书架面板（`.book-shelf-panel` 矩形）内，取最近 `.shelf-unit` 中心放置（消除单元间缝隙漏放）；面板外或 `placeCard` 返回 null（反馈窗口期）→ 书桌脉冲 + 提示"没放准，拖到对应的书架再松手"，1.2s 自动消失。
- 备选：严格命中 + 无提示——放弃，静默失败是用户报告的主因。

### 3. 分层改为"按去重书种分配"
`layerData` 按每列书本首次出现顺序给每种书分配独立层号（第 N 种书 → 层 N），同种书合并 ×N；列层数 = 列内书种数（至少 1），不再渲染预留空板。`shelfLayers` getter 与 `BOOKS_PER_SECTION_PER_LAYER` 常量成为孤儿后删除。
- 备选：维持 5 本/层规划层——放弃，小关卡上层永远空置，与用户预期不符。
- 权衡：书种多时层变矮（flex 自适应），极端场景层高过小。

### 4. 捕获改 pointerdown + 命中扩展
下落卡片捕获由 `click` 改 `pointerdown`（按下即捕获，不要求同一元素上松开），容器 `padding: 12px; margin: -12px` 扩展命中区。**处理器必须绑定在容器上**（曾因绑在卡片本体导致扩展区点击不触发）。书桌拖拽不受影响（各自独立 pointerdown）。

### 5. 书脊展示
书脊 `writing-mode: vertical-rl`、不旋转；`layer-spines` 的 `align-items: stretch` 让书脊撑满层高（宽 18px、高自适应），移除固定像素高度。

### 6. 移除手掌光标
删除 `Hand.vue` 及 mousemove/touchmove 追踪、`cursor: none`，恢复系统光标。

## Risks / Trade-offs

- **层数无上限 → 层高过小**：书种多时每层被 flex 压缩，文本过小。→ 缓解：目前关卡单列书种有限（2-8），flex 收缩保证不溢出；若后续出现长尾关卡可加"每层多书"回退策略。
- **拖拽与下落卡片共存**：拖拽幽灵可能遮挡视觉。→ `pointer-events: none`，命中检测不受影响。
- **吸附可能误判相邻列**：仅面板内吸附且按最近中心，正常操作下偏差小；用户也可选择不放回（无副作用）。
- **pointerdown 与点击语义并存**：防误触（`preventDefault`），书桌拖拽与捕获互不干扰（已回归验证）。

## Migration Plan

- 纯前端替换，无数据迁移。删除 `Hand.vue` 属破坏性改动（已随本变更执行）；回滚即恢复原交互（git 历史）。
- 验证：`npm run build` + Playwright 回归（拖拽/吸附/捕获/分层/书脊方向）。

## Open Questions

- 无（需求已在本轮游玩反馈中收敛）。
