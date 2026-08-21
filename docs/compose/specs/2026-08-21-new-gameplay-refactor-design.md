# [S1] 背景与目标

当前实现是"下落 + 归类"玩法：卡片从顶部下落，玩家需抢在落地前点击捕获、再拖入对应过程组/矩阵格。用户反馈太难玩、学习压力集中在手速而非记忆。本重构保留"通过游戏化游玩巩固 5 大过程组、49 个过程、关键 ITTO"的核心目标，但重写为无时间压力、以记忆与归类为主的学习玩法。

- 目标：让玩家在**无计时、无生命惩罚**的前提下，反复练习"过程 → 过程组/矩阵位置"的归类，以及"过程 → 其输入/工具技术/输出（ITTO）"的记忆。
- 本次范围（MVP 两模式）：重写**归类模式**（去除下落/计时/生命），新增**ITTO 测验模式**（从网格中选出某过程的 I/T/O）。
- 复用现有数据（`public/data/processes.json`、`levels.json`、`itto.json`）与现有进度系统（`stores/user.ts`、关卡选择、结算、星级）。

## [S2] 两类关卡模型

在现有关卡配置上扩展一个 `mode` 字段，区分两种玩法，列表页与路由据此分流：

- `mode: 'sort'` —— 归类模式（重写现有下落玩法）
- `mode: 'itto'` —— ITTO 测验模式（新增）

未声明 `mode` 的现有关卡按 `sort` 处理，向后兼容。

## [S3] 归类模式（sort）

无下落、无计时、无生命、无计分连击。流程：

1. 顶部展示本关待归类的过程卡牌（从 `getProcessesForLevel` 得到的关卡池抽取，数量 = `targetCount`，可含干扰项概念由关卡池决定）。
2. 下方展示目标区：列模式为 N 个过程组/知识领域列；矩阵模式为"过程组(列) × 知识领域(行)"网格。
3. 交互：桌面拖动 / 手机点击选中卡 → 点目标列或拖到网格格 → 立即判分反馈（正确绿、错误红），并展示该过程的正确归属。
4. 全部正确放置即过关（无需达分数）。可逐张重玩、可"显示答案"提示。
5. 复用现有 `placeCard` 的判定逻辑（列模式只判过程组或知识领域；矩阵模式同时判两者），但去掉 `fallingCards`/`lives`/`combo`/`freeze` 等下落相关状态。

## [S4] ITTO 测验模式（itto）

1. 从本关过程池抽取一个过程，展示其全名。
2. 给出三个网格/选项区：**输入(I)**、**工具与技术(T)**、**输出(O)**。
3. 从 `itto.json[processId]` 取出该过程的真实 I/T/O 作为正确项；从其他过程的 I/T/O 中抽若干作为干扰项混入选项（多选）。
4. 玩家在每个区勾选自认为属于该过程的条目，点"提交"判分：每区独立判定，答错区展示正确答案。
5. 可"下一题"轮换过程（题库为本关过程池），完成后按正确率评星。

数据接入：`loadITTO()` 已在 `src/data/loader.ts` 提供，按 `processId`（如 `p001`）索引。

## [S5] 状态层重构（stores/game.ts）

现有 `game.ts`（652 行）混合了下落、计分、判定、反馈。重构为：

- **保留**：关卡配置装载（`startLevel` 的列/行信息构建、卡片池分桶）、归类判定逻辑（`placeCard` 的判定部分）、`feedbackState` 反馈锁。
- **移除**：`fallingCards`、`currentSpeed`、`currentSpawnInterval`、`updateGame` 下落移动、`lives`/`loseLife`/`freeze`/`activateFreeze`、`spawnWave`/`createCard`/`pickNonOverlappingX`、连击与计分装饰。
- **新增**：`mode` 字段；`placeCard` 的无下落调用路径；ITTO 模式所需的问题生成与判分 store（建议拆到 `stores/sort.ts` 与 `stores/itto.ts` 两个聚焦 store，或一个 `game.ts` + `itto.ts`）。

最小侵入原则：归类模式复用 `placeCard` 判定签名（`placeCard(trayIndex, columnId, rowId?)`），但调用方在点击/拖放时主动调用，而非在下落循环里调用。

## [S6] 视图与组件

- `GameView.vue`：依据 `level.mode` 路由到两种玩法呈现。sort 模式去掉下落区、游戏循环（`useGameLoop`）、冰冻/生命/计时 HUD；itto 模式渲染 ITTO 测验面板。
- 归类呈现复用 `SortGrid.vue` / `MatrixGrid.vue`（仅作展示与点击/拖放目标，去掉下落卡渲染）。新增 `ITTOQuiz.vue` 组件承载 ITTO 测验 UI。
- `GameHUD.vue`：sort 模式仅保留进度（已归 X/Y）、提示按钮；去掉生命/连击/冰冻/计时。
- `ResultView.vue`：保留星级结算，适配无计分的归类模式（以正确率/完成度评星）。
- `LevelSelectView.vue`：在关卡卡片上标注 `mode`（归类 / ITTO）。

## [S7] 数据与配置

- `LevelConfig`（`src/data/types.ts`）新增 `mode?: 'sort' | 'itto'`，缺省 `sort`。
- `loader.ts`：新增 `getProcessesForLevel` 已存在，可直接复用；ITTO 模式需要"按关卡池取过程列表"同样走 `getProcessesForLevel`。`loadITTO` 已存在。
- 关卡数据 `levels.json`：现有关卡保持 `mode` 缺省；新增若干 `mode: 'itto'` 关卡（覆盖各过程组，复用现有关卡池概念）。**不改** `processes.json` / `itto.json`（49 过程约束与矩阵校验保持不变）。

## [S8] 测试与验证

- 现有 `npm run build`（vue-tsc -b && vite build）仍是唯一静态校验，改动后必须跑通。
- 新增/复用 Vitest：归类判定（列/矩阵正误）、ITTO 选项生成（正确项必含、干扰项抽取、无重复）、无下落状态下 `placeCard` 行为。
- 本次为玩法重写，目标是：构建通过 + 两种模式可手动在浏览器跑通（归类点击/拖放、ITTO 勾选提交）。

## [S9] 全局约束（继承自项目）

- 49 过程约束：`validateProcessMatrix` 要求总数 49、每知识领域分布匹配 `EXPECTED_MATRIX`；改动 `processes.json`/`levels.json` 后必须 `npm run build` 验证。本次**不改动** `processes.json`，`levels.json` 仅新增 itto 关卡（池引用已有过程 id），矩阵不被破坏。
- 语言：代码注释/UI 文案中文；标识符/命令/术语英文。过程一律用课本全名。
- 数据经 `fetch('/data/...')` 加载，非 TS import；ITTO 仅在 itto 模式按需 `loadITTO()`。
- 别名 `@` → `src`。
