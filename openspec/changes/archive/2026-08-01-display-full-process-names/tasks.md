# 任务：过程全名显示

## 1. 数据与类型清理

- [x] 1.1 从 `public/data/processes.json` 全部 49 条过程数据中删除 `shortName` 字段
- [x] 1.2 从 `src/data/types.ts` 的 `Process` 接口删除 `shortName`

## 2. 组件显示改用全名

- [x] 2.1 `FallingCard.vue`：封面标题由 `process.shortName` 改为 `process.name`
- [x] 2.2 `SortGrid.vue`：书架书脊与拖拽幽灵预览由 `shortName` 改为 `name`
- [x] 2.3 `MatrixGrid.vue`：矩阵格子迷你书脊由 `shortName` 改为 `name`

## 3. 布局适配

- [x] 3.1 下落卡片封面：缩小字号、增加 max-width、允许换行，防止全名卡片贴边溢出
- [x] 3.2 书架书脊：竖排文字字号 11px→9px，去掉 nowrap/ellipsis 让全名完整流动
- [x] 3.3 矩阵格子：迷你书脊改为水平小字换行，格子最小高度 36px→40px

## 4. 验证

- [x] 4.1 `npm run build` 通过（vue-tsc 类型检查 + Vite 构建 + 49 过程矩阵校验）
- [x] 4.2 实际游玩验证：下落卡片、托盘、书架书脊、矩阵格子均显示完整全名
