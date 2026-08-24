## Why

ITTO 与定义关卡当前只显示一条 3px 倒计时进度条，玩家在阅读和多选过程中难以持续感知时间压力，也与归类玩法中更具游戏感的“燃烧绳”倒计时表现不一致。需要将燃烧绳抽为共享倒计时视觉，让所有挑战模式使用同一套清晰、可冻结、可告警的时间反馈。

## What Changes

- 新增共享燃烧绳倒计时组件，以统一引擎的 `timeLeft` 和 `timePerCard` 为唯一时间来源。
- 在归类、定义和 ITTO 挑战模式中使用相同的燃烧绳视觉；轻松模式不显示倒计时。
- 冰冻道具生效时暂停燃烧动画并显示冻结状态，剩余时间不超过 30% 时进入紧急告警状态。
- 保持 ITTO 答错复盘期间倒计时和燃烧动画同步暂停。
- 调整桌面、移动竖屏和触摸横屏布局，确保燃烧绳不遮挡 HUD、题面或提交按钮。

## Capabilities

### New Capabilities

- `burning-fuse-timer`: 定义共享燃烧绳倒计时的进度、冻结、紧急告警、模式可见性和响应式表现。

### Modified Capabilities

- `drill-engine`: 明确所有玩法的挑战模式共享同一倒计时视觉状态，且暂停、冰冻和 ITTO 复盘停留必须同步停止燃烧表现。
- `mobile-landscape`: 增加燃烧绳在移动竖屏和触摸横屏中不得遮挡题面、HUD 与操作区的要求。

## Impact

- 主要影响 `src/components/game/CardStage.vue`、`src/views/GameView.vue`，并新增共享倒计时组件及相关测试。
- 不改变 `gameStore` 的计时、超时、生命或冰冻规则，不改变关卡 `timePerCard` 配置。
- 不修改 `public/data/*.json`，因此不触碰 49 过程矩阵约束或教材数据。
- 不新增依赖，不改变路由或 `localStorage` 数据结构。

## Non-goals

- 不修改各关卡倒计时秒数、生命值或道具数量。
- 不改变答题判定、复习队列、掌握度或计分逻辑。
- 不新增音效、粒子系统或 Canvas/WebGL 动画。
- 不重新设计 HUD、ITTO 题面或定义题布局。
