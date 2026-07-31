## Why

当前书架是游戏区底部的单层格子，正确放置的卡片只闪一下反馈就消失，书架不留任何痕迹，玩家缺少"书一本本放上书架"的成就感与进度反馈。同时书架占据游戏区底部空间，压缩下落区域。

## What Changes

- 书架改为游戏区**右侧独立面板**的多层书柜，columns 模式下游戏区底部清空，下方只有书桌。
- 正确放置的书**积累陈列**在书架上；同一列内相同过程合并为一本书，重复放置使**书脊变厚**并显示 **×N 徽标**。
- 书架层数按关卡题目数量（`targetCount`）**预先规划**：`layers = ceil(targetCount / 5)`，空层板淡显。
- 选中托盘卡片时，只高亮**可放入的列**并在最低空层显示幽灵预览书（替代当前"所有列都预览"行为）。
- 矩阵模式（stage 4）不做多层，格子在放置后显示**数量徽标**（过程短名 + ×N）。
- 本期不做移动端适配（<600px 书架可能溢出，后续处理）。

## Capabilities

### New Capabilities

- `book-shelf`: 右侧多层书柜的呈现与交互——书籍积累、同名合并 ×N 徽标、层数按题目数量规划、放置目标高亮与预览、空层板显示。

### Modified Capabilities

- `sort-gameplay`: 正确放置行为从"移除即消失"改为"上架积累"；书架布局从游戏区底部改为右侧独立空间；矩阵格子新增放置数量徽标。

## Impact

- `src/components/game/SortGrid.vue`：由单层格子重构为右侧多层书柜。
- `src/components/game/MatrixGrid.vue`：格子新增数量徽标。
- `src/stores/game.ts`：新增 `shelvedBooks` 状态与 `shelfLayers` getter，`startLevel`/`resetLevel`/`placeCard` 相应更新。
- `src/data/types.ts`：新增 `ShelvedBook` 类型与层容量常量。
- `src/views/GameView.vue`：布局重构为 `HUD → 主区(游戏区+右侧书架) → 书桌`。
- 不改数据 JSON、loader、Desk、FallingCard、Hand、HUD、router、user store；49 过程矩阵校验不受影响。
