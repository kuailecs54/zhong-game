## Context

当前统一引擎已由 `gameStore.timeLeft`、`level.timePerCard`、`difficultyMode`、`freezeTicksLeft` 和 `gamePhase` 完整管理计时状态。`CardStage.vue` 同时承担归类大卡、飞卡动画和 3px 进度条；定义与 ITTO 模式通过 `barOnly` 复用这条进度条。现有实现逻辑统一但视觉反馈较弱，尤其 ITTO 多选题需要持续阅读时，玩家不容易感知剩余时间。

本变更只增强计时视觉，不改变 `gameStore.tick()`、超时、生命、复习队列或冰冻规则。`userStore`、`localStorage` 和 `public/data/*.json` 均不受影响，`validateProcessMatrix` 的 49 过程约束无变化。

## Goals / Non-Goals

**Goals:**

- 提供可在三种玩法中复用的燃烧绳倒计时组件。
- 以现有引擎状态派生绳长、秒数、冻结和紧急状态。
- 保证暂停、冰冻和 ITTO 答错复盘时视觉与真实计时同步停止。
- 在桌面和触摸横屏中保持 HUD、题面和操作区互不遮挡。
- 尊重 `prefers-reduced-motion`，关闭非必要火焰和告警动画。

**Non-Goals:**

- 不修改 `gameStore` 的计时算法、tick 粒度或超时判定。
- 不修改关卡时间、生命和道具配置。
- 不添加声音、Canvas、WebGL 或第三方动画依赖。
- 不重新设计题面、HUD 或开始界面。

## Decisions

### 1. 新增纯展示组件 `BurningFuseTimer.vue`

组件直接读取 `gameStore`，派生剩余比例、显示秒数、紧急状态和冻结状态。这样三种玩法共享同一状态源，调用方无需重复传入多个易失配的 props。

未选择在 `ITTOQuiz.vue` 内单独实现，因为会让 ITTO 出现独立视觉逻辑，定义和归类仍不一致。未选择把燃烧动画状态写入 store，因为它只属于展示层，不应扩大引擎状态。

### 2. 使用 CSS 绘制绳索、灰烬和火焰

绳索容器固定宽度，未燃烧段宽度由剩余比例控制；火焰定位在未燃烧段末端，灰烬段占剩余空间。最后 30% 使用紧急色，冻结时以冰晶标记替代火焰并停止动画。

CSS 实现不引入位图或依赖，能随容器响应式缩放，也便于通过 DOM 尺寸和 class 状态进行浏览器验证。`prefers-reduced-motion` 下保留比例变化但移除抖动、闪烁和火焰跳动。

### 3. `CardStage` 继续作为三种玩法的统一计时外壳

将 `CardStage.vue` 原有 `.timebar` 替换为 `BurningFuseTimer`。归类模式仍在大卡上方显示；定义和 ITTO 继续通过 `barOnly` 获得只含倒计时的外壳，因此 `GameView` 的模式结构无需改变。

### 4. 视觉暂停由现有状态自然驱动

暂停和 ITTO 复盘期间 `GameView` 不调用有效 tick，冰冻期间 `gameStore.tick()` 只递减 `freezeTicksLeft`，因此绳长不会变化。组件额外依据 `isPaused` 和 `freezeTicksLeft > 0` 停止 CSS 动画，确保视觉状态与数值状态一致。

### 5. 响应式尺寸由组件自身控制

桌面使用受限最大宽度，触摸横屏降低绳索高度和垂直间距；组件不使用绝对定位覆盖题面。ITTO 的滚动区域继续负责超高内容，燃烧绳作为顶部普通流内容保持可见且不阻挡提交按钮。

## Risks / Trade-offs

- [燃烧动画分散注意力] → 火焰动画保持小幅度，并在减少动态偏好下完全关闭。
- [横屏高度有限] → 使用紧凑尺寸和普通文档流，不增加固定覆盖层。
- [冻结视觉与时间状态不同步] → 只读取 `freezeTicksLeft` 和现有计时值，不维护本地计时状态。
- [燃烧边界在 0% 或 100% 溢出] → 对派生比例限制在 0 到 100，并对端点隐藏或约束火焰位置。

## Migration Plan

1. 添加共享组件及派生状态测试。
2. 在 `CardStage` 中替换旧进度条并保留现有外壳接口。
3. 运行 `npm test` 与 `npm run build`。
4. 使用 Playwright 验证三种玩法、冻结、紧急状态和桌面/移动横屏布局。

无需数据迁移。回滚时恢复 `CardStage` 的旧进度条即可；store、路由和持久化格式不变。

## Open Questions

当前范围没有阻塞性开放问题。
