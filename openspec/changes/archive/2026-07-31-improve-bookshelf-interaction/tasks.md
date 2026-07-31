# Tasks: 书架展示与放置交互改进

> 实现已完成（本变更随实现一起提出归档），以下任务均已完成。

- [x] 移除手掌光标：删除 `src/components/game/Hand.vue` 与 GameView 中的 mousemove/touchmove 追踪、`cursor: none`，恢复系统光标。
- [x] 书架重构：`SortGrid.vue` 渲染为每列独立书架单元（`.shelf-unit`），顶部过程组/知识领域名称 + 色点，单元带 `data-column-id` 供拖拽命中。
- [x] 书脊立起：书脊撑满层高（`align-items: stretch`、移除固定像素高度），书脊文本竖排且移除 `rotate(180deg)`（从上到下阅读），幽灵预览同步。
- [x] 分层规则：`layerData` 改为按列内去重书种分配层（每书一层、自下而上、同种合并 ×N）；列层数 = 书种数，移除预留空板。
- [x] 拖拽上架：书桌卡片 `pointerdown` 启动，`document` 级 pointer/touch 监听，Teleport 拖拽幽灵，松手 `elementFromPoint` + `closest('[data-column-id]')` 命中书架单元/矩阵格子（矩阵格子带 `data-column-id`/`data-row-id`）。
- [x] 吸附与失败提示：面板内未命中时吸附最近书架单元；面板外或反馈窗口期放置失败时书桌脉冲 + 提示文案，1.2s 自动消失。
- [x] 下落卡片书本化：`FallingCard.vue` 改为书脊 + 渐变封面 + 书口视觉；捕获由 `click` 改 `pointerdown`（处理器绑定在 `.falling-card-container`），容器 `padding: 12px; margin: -12px` 扩展命中区。
- [x] store 适配：`placeCard(trayIndex, columnId, rowId?)` 按托盘索引放置；移除 `selectedTrayIndex`/`selectTrayCard`/`trayHint`；删除孤儿 `shelfLayers` getter 与 `BOOKS_PER_SECTION_PER_LAYER` 常量。
- [x] 验证：`npm run build`（vue-tsc + vite）通过；Playwright 回归覆盖拖拽上架、缝隙吸附、失败提示、边缘点击捕获、分层渲染、书脊文本方向。
