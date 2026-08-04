## Why

移动端手机强制横屏（视口高度约 390px）下，开始界面卡片（第二关含干扰项警告框时更高）超出屏幕高度，而 `.start-screen` 使用 `height: 100vh` + `overflow: hidden`，导致"开始游戏"按钮被裁切且无法滚动到，完成第一关点击"下一关"进入第二关后无法开始游戏。

## What Changes

- `.start-screen` 由 `overflow: hidden` 改为 `overflow-y: auto`，允许开始界面在内容超高时纵向滚动。
- `.start-card` 增加 `margin: auto`，保证内容未超高时卡片仍垂直居中显示（不因外层改为 auto 滚动而贴顶）。
- `.start-bg-decor`（背景装饰层）增加 `overflow: hidden`，裁切溢出到屏幕外的装饰光球（`bg-orb--2` 的 `bottom: -60px`），避免桌面端因滚动容器化后出现无谓的滚动条。

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `mobile-landscape`: 触摸横屏开始界面可滚动——开始卡片内容超出视口高度（如第二关含干扰项警告框）时，开始界面 MUST 纵向滚动使"开始游戏"按钮可见；内容不超高时卡片保持垂直居中；桌面端 MUST 不出现滚动条。

## Impact

- `src/views/GameView.vue`：开始界面（`.start-screen`、`.start-card`、`.start-bg-decor`）三处 CSS 布局调整。
- 不改数据、不改 store 逻辑、不改组件 props 与游戏判定逻辑。
- 纯样式改动，仅影响开始界面的滚动与居中表现。
