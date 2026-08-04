## Context

开始界面（`src/views/GameView.vue` 的 `.start-screen`）原为 `display: flex` 居中 + `height: 100vh` + `overflow: hidden`。桌面端视口高，开始卡片（约 465px）能完整居中显示。移动端手机强制横屏后视口高度约 390px，第二关开始卡片含"干扰项警告框"更高（约 571px），内容超出视口且被 `overflow: hidden` 裁切，无法滚动到"开始游戏"按钮。

## Goals / Non-Goals

**Goals:**
- 开始卡片内容超高时，开始界面可纵向滚动到"开始游戏"按钮。
- 内容未超高时，卡片保持垂直居中，视觉与桌面端一致。
- 桌面端不因滚动容器化而出现多余滚动条。

**Non-Goals:**
- 不重排横屏布局（如压缩卡片、调整字体）。
- 不改游戏逻辑、数据或组件结构。
- 不处理开始界面之外的其它屏幕溢出问题。

## Decisions

- **决策 1：`.start-screen` 改为 `overflow-y: auto`**
  - 备选：按横屏高度压缩卡片内容。选滚动因改动最小、通用（卡片高度随内容变化，压缩方案需维护多套尺寸），且符合「内容超高时允许滚动」这一最小修复。
  - 影响：flex 居中 + `align-items: center` 在内容超高时会因无法收缩而顶到顶部，需配合决策 2。
- **决策 2：`.start-card` 增加 `margin: auto`**
  - 原因：flex 容器改为可滚动后，`justify-content: center` 对超高内容无效（负溢出空间）；`margin: auto` 同时接管两个方向，超高时保留顶部空间、可滚动到底部，未超高时仍居中。
- **决策 3：`.start-bg-decor` 增加 `overflow: hidden`**
  - 原因：背景装饰光球（`.bg-orb--2` 的 `bottom: -60px`）原本就溢出容器，`.start-screen` 改可滚动后会被计为滚动内容，在桌面端产生 60px 的纵向滚动条。用 `overflow: hidden` 在装饰层内裁切，属于背景装饰的既有语义（`pointer-events: none`），不改变视觉效果。

## Risks / Trade-offs

- 滚动条样式在部分浏览器（如移动 Safari 隐藏式滚动条）可能不可见，但可通过实际滚动操作到达按钮 → 通过 Playwright 实测 `scrollIntoView` 后按钮可见（top≈295/bottom≈352 < 390）验证。
- `.start-screen` 滚动容器化可能影响背景 `position: relative` 与装饰层的定位 → 装饰层已绝对定位 `inset: 0` 于容器内，裁切在自身层内完成，不依赖容器滚动位置。
