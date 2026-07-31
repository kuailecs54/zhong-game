# Proposal: 书架展示与放置交互改进

## Why

书架与放置交互在真实游玩中反馈不佳：书架上的书未立起、书脊文本反向、不同书种堆在同一层；下落书本难以点击命中；拖拽放置时松手位置稍有偏差即静默失败。需要按实际游玩体验改进书架展示与放置交互。

## What Changes

- 书架渲染为每列一个独立书架单元，顶部标注过程组/知识领域名称与色点。
- 书脊直立显示，书脊文本竖排且方向正常（从上到下阅读）。
- 每列按去重书种分配层级（每种书占一层，自下而上），同种书合并显示 ×N 角标；不再渲染预留空板。
- 放置交互由"点选书桌卡片 + 点击书架"改为"从书桌拖拽到书架/矩阵格子松手上架"，拖拽期间显示跟随书本与可放置高亮。
- 拖拽松手落在书架面板内但偏离单元时，自动吸附到最近书架单元；面板外或反馈窗口期内放置失败时，书桌显示提示。
- 下落卡片书本化视觉（书脊 + 封面 + 书口），捕获从 `click` 改为 `pointerdown` 并扩展命中区域。
- 移除自定义手掌光标，恢复系统光标。

## Capabilities

### New Capabilities

- 无（本次不新增能力规格，均落在既有能力内）

### Modified Capabilities

- `book-shelf`: 分层规则改为按去重书种分配层；书脊直立与竖版文本；放置交互改为拖拽上架并支持吸附与失败提示；移除预留空板渲染。
- `sort-gameplay`: 下落卡片捕获交互改为按下即捕获（pointerdown），命中区域扩展。

## Impact

- 组件：`src/components/game/SortGrid.vue`（分层/书脊/交互）、`Desk.vue`（拖拽入口与提示）、`FallingCard.vue`（书本化与捕获）、`MatrixGrid.vue`（拖拽放置高亮）、`GameView.vue`（拖拽系统/捕获绑定/命中吸附）。
- 状态：`src/stores/game.ts`（`placeCard` 签名改为按托盘索引；移除选中态与 `shelfLayers`）。
- 类型：`src/data/types.ts`（移除孤儿常量 `BOOKS_PER_SECTION_PER_LAYER`）。
- 删除：`src/components/game/Hand.vue`。
- 无外部依赖变化，纯前端。
