# 变更提案：过程全名显示

## Why

游戏中 49 个项目管理过程此前在多个界面以 2-4 字缩写（如"排列顺序""规划进度"）显示，与教材全名（如"排列活动顺序""规划进度管理"）不一致，不利于考生记忆准确术语。需要让游戏所有界面一律显示过程全名。

## What Changes

- 下落卡片封面、书桌托盘卡片、书架书脊、拖拽幽灵预览、矩阵格子迷你书脊：一律显示过程**全名**（`name`），不再使用缩写（`shortName`）
- 矩阵模式迷你书脊由"14px 宽竖排小字"改为"水平小字换行"，以容纳最长 9 字全名；格子最小高度 36px → 40px
- 书架书脊竖排文字字号 11px → 9px，去掉 nowrap/ellipsis 限制，允许全名完整流动
- 下落卡片封面缩小字号、增加 `max-width` 限制并允许换行，防止全名导致卡片贴边溢出
- **BREAKING**：从 `public/data/processes.json` 与 `Process` 类型中删除 `shortName` 字段，数据模型不再包含短名概念

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `pmbok-data`：过程数据需求从"每个过程含短名"改为"每个过程仅含中文全名"，删除短名字段
- `sort-gameplay`：矩阵格子放置徽标场景由"显示过程短名"改为"显示过程全名"；卡片/书脊/格子各处过程名显示均以全名为准

## Impact

- `public/data/processes.json`：49 条过程数据删除 `shortName` 字段
- `src/data/types.ts`：`Process` 接口删除 `shortName`
- `src/components/game/FallingCard.vue`、`src/components/game/SortGrid.vue`、`src/components/game/MatrixGrid.vue`：显示改用 `process.name` 并适配布局
- 运行方式不变（数据仍通过 `fetch('/data/...json')` 加载），`validateProcessMatrix` 校验不受影响
