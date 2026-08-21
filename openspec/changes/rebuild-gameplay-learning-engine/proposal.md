# 提案：重构玩法为学习优先的统一刷题引擎

## Why

游戏的最终目标是帮助考生巩固记忆「49 过程 × 5 过程组 × 10 知识领域」矩阵、各过程定义及 ITTO，但当前玩法偏离了这一目标：

1. **答案剧透使提取练习失效**：SortGrid 的 placeable 高亮与幽灵预览、MatrixGrid 的 drag-highlight/dim 直接暴露正确答案，玩家零知识也能 100% 答对，准确率与星级体系形同虚设。
2. **功能性缺陷**：sort-4-1/sort-4-2 的 `targetCount: 0` 导致过关判定恒真且 watch 永不触发，关卡无法结算；GameHUD 暂停按钮 emit 无监听，点击无效。
3. **学习内容覆盖不全**：49 个过程的「定义/主要作用」数据完全缺失；ITTO 关卡仅覆盖 14/49 个过程；缺乏记忆巩固机制（错题重现、掌握度追踪）。
4. **下落玩法遗留污染**：levels.json 每关 9 个死字段、useGameLoop 空壳、HUD combo/freeze 死样式，持续误导后续开发。

目标用户定位：**已学过教材的巩固型备考者**——游戏是记忆强化手段，不是教学工具。

## What Changes

- **P0 修复**：去除所有答案剧透高亮；修复矩阵关卡 targetCount 死锁（过关判定改为「队列清空」，由池子派生）；接通暂停按钮并新增暂停遮罩层。
- **统一刷题引擎**：玩法从「多卡平铺点选」重构为**单卡逐张**——居中大卡 + 整关统一倒计时 + 连击倍率 + 道具（提示🔍/冰冻❄️/护盾🛡️）+ 错题重现（间隔 ≥3 张直到答对）+ 双模式（挑战默认/轻松可选）。三种题型共用同一引擎，差异收敛为「题面渲染器/作答器/判定器」三个插槽。
- **三层学习内容**：
  - L1 定位（改造现有归类模式）：49 过程在矩阵中的位置；
  - L2 定义挑战（新增 Stage 5）：定义↔过程名 4 选 1（题型 A 定义→过程名 / B 过程名→主要作用），贴合考试真题形态；
  - L3 ITTO（增强现有测验 + 新增关卡）：补齐至 49 个过程全覆盖。
- **数据工程**：processes.json 为 49 个过程补充 `definition`/`role`/`mnemonic`（对照课本逐条校准，loader 加非空断言）；levels.json 删除 9 个下落时代死字段，换为 `timePerCard`/`lives`/`hintCount`/`freezeCount`/`shieldCount`。
- **书架呈现层重构**：保留「点列/格 → classify 判定」交互骨架与分层算法；清除剧透样式与 ×N 合并死逻辑；列头升级为一级点击目标；Leitner 掌握度映射书脊样式（金=掌握/木=巩固/虚线=生疏）。
- **掌握度档案**：Leitner 三档盒（生疏→巩固→掌握）+ 7 天未练衰减降档，localStorage 持久化；5×10 热力图（按三层切换视角）；薄弱特训 / 只练错题自由通道（绕过解锁链）。
- **保留关卡解锁体系**：Stage 5/6 自动接入现有解锁链；`TOTAL_STARS` 由硬编码 12 改为动态计算。

## Capabilities

### New Capabilities

- `drill-engine`: 统一刷题引擎核心循环——出题队列、整关统一倒计时、连击计分、道具系统、错题重现、双模式、队列清空过关判定，供 L1/L2/L3 三种题型共用。
- `definition-quiz`: L2 定义挑战模式——定义↔过程名 4 选 1 作答器（题型 A/B）、答错展示正确归属强化定位记忆。
- `mastery-tracking`: Leitner 三档掌握度模型——按过程×三层维度记录、7 天衰减、5×10 热力图仪表盘、薄弱特训与只练错题自由通道。

### Modified Capabilities

- `sort-gameplay`: 核心循环从「下落卡片+捕获+放置」变更为「单卡逐张点选即放」；新增无剧透约束（任何 UI 不得指示正确答案）；生命/连击/道具语义移交 drill-engine。
- `book-shelf`: 移除放置预览与可放置高亮需求；移除同名合并计数需求；新增书脊可读性、掌握度书脊样式、飞书动画需求。
- `level-system`: 新增 Stage 5（定义挑战）与 Stage 6（ITTO 补全）；星级评定条件变更（★★★ 与漏接挂钩）；移除手配 targetCount 与下落速度类配置字段。
- `pmbok-data`: processes.json 新增 definition/role/mnemonic 字段及完整性校验；levels.json 配置字段结构变更。
- `user-profiles`: 用户资料新增 mastery 掌握度档案（三维 Leitner 盒 + lastSeen）持久化。
- `mobile-landscape`: 移除「下落速度缩放」需求（下落玩法取消），保留旋转门与横屏布局要求。

## Impact

- **代码**：`src/stores/game.ts`（重写）、`src/stores/user.ts`（扩展）、`src/stores/itto.ts`（外壳适配）、`src/views/GameView.vue`（模板重构）、`src/components/game/`（SortGrid/MatrixGrid/GameHUD 改造，新增 CardStage/DefinitionQuiz/暂停遮罩/反馈浮层）、`src/data/types.ts` 与 `src/data/loader.ts`（类型与校验）、`src/composables/useGameLoop.ts`（删除）、`src/utils/shelfLayout.ts`（保留，删合并入口）。
- **数据**：`public/data/processes.json`（49×3 新字段）、`public/data/levels.json`（全量字段迁移 + 新增 Stage 5/6 关卡）。
- **测试**：`game.sort.test.ts`、`loader.test.ts`、`itto.test.ts` 随类型变更同步更新；`shelfLayout` 单测保留。
- **不受影响**：路由结构、用户名流程、localStorage key（`pm-sort-game-user` 向后兼容扩展）、课本源文件。
