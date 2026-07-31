## Why

手机竖屏下游戏被迫把书架压缩成 28vh 的滚动条带（columns 模式）或 30vh 网格（matrix 模式），卡片与书架互相挤压，可玩性差；且横屏小屏手机（宽度 667~767px）会误命中宽度断点，明明横着拿却按竖屏压缩布局渲染。游戏的几何本质是「下落区 + 水平书架」，天生适合横屏。本次将手机定位为横屏专享，用旋转门挡住竖屏，横屏时使用与桌面一致的并排布局，保证手机端体验与桌面一致。

## What Changes

- 新增全局旋转门：触摸设备 + 竖屏（且宽度 < 768px）时，全屏遮罩提示旋转，并暂停进行中的游戏；转回横屏后遮罩消失，游戏停留在暂停态，由玩家手动继续。
- 不申请全屏、不调用 `screen.orientation.lock`（iOS Safari 不支持），仅靠遮罩引导；不提供「仍然竖屏游玩」逃生入口。
- 修复布局断点：GameView 的移动端压缩布局从纯宽度判断改为「触摸 + 竖屏」判断，横屏手机（含 667~767px 宽）自动使用桌面并排布局。
- 触摸横屏紧凑化：HUD、书桌托盘压扁，书架面板宽度封顶（约 45vw），SortGrid/MatrixGrid 格子缩小，矩阵网格保留安全高度与滚动兜底。
- 下落速度按游戏区高度缩放（`min(1, height/700)`，只缩不增）：手机横屏下落区仅约 275px，若不缩放难度约为桌面的 3 倍；缩放后穿越时间与桌面同量级，桌面端行为不变。
- `viewport` 增加 `viewport-fit=cover`，适配横屏刘海设备。

## Capabilities

### New Capabilities
- `mobile-landscape`: 触摸设备横屏专享体验——旋转门遮罩、横屏并排布局、紧凑化适配、下落速度按高度缩放，保证手机与桌面难度一致。

### Modified Capabilities
<!-- 现有 spec 均未覆盖移动端/响应式行为，无需求变更。 -->

## Impact

- 组件：`App.vue`（挂载全局遮罩）、`GameView.vue`（断点修复 + 横屏紧凑规则）、`GameHUD.vue`、`Desk.vue`、`SortGrid.vue`、`MatrixGrid.vue`（横屏紧凑样式）。
- 逻辑：`src/stores/game.ts`（下落速度缩放）、新增 `src/composables/useRotateGate.ts`、新增 `src/components/RotateGate.vue`。
- 配置：`index.html` viewport meta。
- 数据：`public/data/*.json` 不改；`levels.json` 中的 `initialFallSpeed` 语义不变（运行时按区域高度缩放）。
- 验证：无测试框架，`npm run build`（vue-tsc 类型检查）为唯一静态校验；行为验证用浏览器设备模拟（竖屏门、横屏游玩、旋转中暂停、矩阵关、桌面回归）。
