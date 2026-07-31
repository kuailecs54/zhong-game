# Mobile Landscape Only 设计文档

## Context

当前游戏桌面布局为「下落区 + 右侧书架」并排（`.main-area { flex-direction: row }`），移动端仅有一个宽度断点 `@media (max-width: 768px)`（`GameView.vue:1028`）把主区域改为 `column-reverse` 并压缩书架为 28vh / 矩阵为 30vh 的滚动条带。该断点存在两个问题：

1. 竖屏手机（375~430px 宽）被迫压缩书架，可玩性差；
2. 横屏小屏手机（667~767px 宽）宽度仍小于 768，误命中压缩布局。

关卡速度以 `px/s` 配置（`levels.json` 的 `initialFallSpeed`），按桌面高度（约 940px）调教。横屏手机下落区仅约 275px，同样的 `px/s` 使卡片穿越时间从约 22s 骤降至约 6s，难度放大 3 倍。

目标决策（已与产品确认）：手机只做横屏；竖屏用全屏遮罩挡住（不提供逃生入口）；不申请全屏、不调用 `screen.orientation.lock`（iOS Safari 不支持，跨平台一致性优先）；下落速度按区域高度缩放。

## Goals / Non-Goals

**Goals:**
- 触摸设备横屏体验与桌面一致：并排布局 + 紧凑化 + 难度一致。
- 竖屏触摸设备被旋转门挡住，游戏暂停不丢生命。
- 桌面端行为完全不变。
- 实现轻量：无新依赖，不动 `public/data/*.json`。

**Non-Goals:**
- 不支持 iOS/Android 强制锁屏（`screen.orientation.lock`、全屏 API）。
- 不提供竖屏压缩布局的继续游玩入口（竖屏退化为不可玩态）。
- 不为竖屏重新设计专用布局。
- 不调整各关卡的 `initialFallSpeed` 数值（缩放走运行时）。

## Decisions

### 1. 旋转门判定条件：触摸 + 竖屏 + 宽度 < 768

`useRotateGate` composable 通过 `window.matchMedia('(pointer: coarse)')` 判定触摸设备，`innerHeight > innerWidth` 判定竖屏，`innerWidth < 768` 排除平板竖屏（平板竖屏宽度 ≥ 768，用桌面并排布局即可，无需遮挡）。

- 备选：仅按 `(orientation: portrait)` 判定 —— 会把平板竖屏、桌面窄窗口也挡住，误伤过多。
- 备选：`navigator.maxTouchPoints > 0` 判触摸 —— 触摸屏笔记本会误判，`pointer: coarse` 更贴近「真实触屏设备」。

监听 `resize` + `orientationchange` 更新状态（无需 matchMedia change listener，两者已覆盖）。

### 2. 遮罩仅引导，不锁屏

`RotateGate.vue` 全屏 fixed overlay（z-index 9999，`pointer-events` 默认拦截），纯 CSS 旋转动画图标 + 「请旋转设备至横屏」文案。Android Chrome 本可 `orientation.lock('landscape')`，但需全屏 + 用户手势且 iOS 无效，引入平台分支收益低，放弃。

### 3. 门开时自动暂停，转回后手动继续

`App.vue` 挂载遮罩并用 `watch(showGate)` 监听：门开且 `isPlaying && !isPaused` 时调 `gameStore.setGamePhase('paused')`。转回横屏不自动恢复，复用现有 pause-overlay 的「继续游戏」按钮 —— 行为可预测，避免旋转瞬间误操作。

- 备选：转回横屏自动恢复 —— 体验更顺滑，但旋转后玩家可能还没准备好，且与现有暂停交互不一致。

### 4. 布局断点改为「触摸 + 竖屏」，横屏手机天然落桌面布局

`GameView.vue:1028` 的压缩断点改为：

```css
@media (max-width: 768px) and (pointer: coarse) and (orientation: portrait) { ... }
```

横屏手机（无论宽度）不再命中压缩规则，直接使用桌面并排布局（默认 `flex-direction: row`）。压缩布局保留但仅作竖屏兜底（实际被旋转门挡住，很少触发）。

### 5. 触摸横屏紧凑化

新增媒体查询统一挂载在触摸横屏：

```css
@media (max-width: 820px) and (pointer: coarse) and (orientation: landscape) { ... }
```

- 书架面板：`max-width: 45vw !important`（`!important` 压制 `GameView.vue:72-75` 计算出的内联宽度，防止 667px 宽手机书架占 78% 宽度）。
- 矩阵网格：`max-height: 58vh; overflow-y: auto`（网格内容超高时可滚）。
- HUD / 书桌 / 格子：缩小 padding、字号，保证 375px 高视口下主游戏区 ≥ 250px。

### 6. 下落速度按高度缩放，只缩不增

`game.ts` 的 `updateGame` 移动循环内：

```ts
const SPEED_BASELINE_HEIGHT = 700 // 模块级常量，可调
const heightScale = Math.min(1, gameAreaHeight / SPEED_BASELINE_HEIGHT)
card.y += card.speed * heightScale * deltaTime
```

桌面（约 940px）`min(1, 1.34) = 1` → 速度不变；横屏手机（约 275px）→ 系数约 0.39，穿越时间约 17s，与桌面同量级。缩放放在移动循环而非 `createCard`，可随区域高度实时自适应（浏览器 UI 高度变化时也安全）。

- 备选：按固定手机高度常量缩放 —— 无法适配不同设备高度差异。
- 备选：同时缩放生成间隔（`spawnInterval`）—— 生成是时间驱动，本就与高度无关，无需处理。

## Risks / Trade-offs

- [iOS 用户坚持竖屏被挡住无法游玩] → 遮罩设计为明确引导（图标 + 文案），旋转即解锁；这是「手机只做横屏」产品定位的预期代价。
- [速度缩放改变现有手机端手感（变慢、变容易）] → 这是修复而非回退：当前手机端是无意中比桌面难 3 倍。`SPEED_BASELINE_HEIGHT` 保留为常量便于验收时调整。
- [旋转瞬间游戏区域高度突变，底部卡片被误判掉地扣命] → 旋转门在 `orientationchange`/`resize` 同步暂停，暂停先于下一帧 `updateGame`，卡片不再移动；横竖屏切换仅在门开（暂停）期间发生，不产生生命丢失。
- [横屏矩阵模式下落区偏短（网格占高后）] → 速度缩放使穿越时间与高度无关，反应窗口恒等于桌面；矩阵网格配 58vh 上限 + 滚动兜底。
- [`!important` 压制内联宽度样式] → 仅限触摸横屏媒体查询内，桌面与其他设备不受影响；后续若把宽度计算改为响应式可移除 `!important`。

## Migration Plan

- 无需数据迁移；`public/data/*.json` 不变。
- 部署：随下次构建发布，无分阶段要求。
- 回滚：撤销本次变更即可，桌面端与数据无任何残留影响。

## Open Questions

- `SPEED_BASELINE_HEIGHT = 700` 为初始值，需在设备模拟中实际游玩各关卡确认手感，验收时可能微调。
- 书架 45vw 封顶与格子紧凑尺寸的具体数值，需在 667px 与 844px 两种宽度模拟下目测微调。
