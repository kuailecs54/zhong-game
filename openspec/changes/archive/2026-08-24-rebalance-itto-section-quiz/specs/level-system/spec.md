## MODIFIED Requirements

### Requirement: 关卡配置
系统 SHALL 为每个关卡定义布局、卡池、模式、时间压力参数、生命与道具配置；ITTO 关卡 SHALL 可通过 `ittoQuiz` 定义每题分区数、每区正确项数和每区干扰项数；配置 SHALL NOT 包含下落速度类字段与手工目标数字段。

#### Scenario: 列布局
- **WHEN** 关卡使用列布局（第 1-3 阶段）
- **THEN** 网格由多个垂直列组成
- **AND** 每列代表一个过程组或知识领域
- **AND** 卡片必须放置到正确的列

#### Scenario: 矩阵布局
- **WHEN** 关卡使用矩阵布局（第 4 阶段）
- **THEN** 网格为二维矩阵，行为知识领域、列为过程组
- **AND** 卡片必须放置到正确的格子（行与列交叉处）

#### Scenario: 新配置字段
- **WHEN** 关卡加载
- **THEN** 可用 `timePerCard`（每卡秒数）、`lives`（生命）、`hintCount`/`freezeCount`/`shieldCount`（道具数量）定义难度
- **AND** 配置中不存在 `initialFallSpeed`、`initialSpawnInterval`、`minSpawnInterval`、`speedIncreaseRate`、`speedIncreaseEvery`、`distractorCount`、`trayCapacity`、`targetCount`

#### Scenario: ITTO 题型配置
- **WHEN** `mode` 为 `itto` 的关卡加载
- **THEN** `ittoQuiz.sectionsPerQuestion` 为 2
- **AND** `ittoQuiz.correctPerSection` 定义每个展示分区抽取的正确项上限
- **AND** `ittoQuiz.distractorsPerSection` 为 3

#### Scenario: 非 ITTO 关卡无需题型配置
- **WHEN** `mode` 不是 `itto`
- **THEN** 关卡无需定义 `ittoQuiz`

## ADDED Requirements

### Requirement: ITTO 关卡难度递进
系统 SHALL 通过每区正确项数量和 `timePerCard` 为 ITTO 关卡提供渐进难度，同时保持每区 3 个干扰项和每题 2 个分区不变。

#### Scenario: 前期 ITTO 关卡
- **WHEN** 玩家进入 `itto-1-1` 或 `itto-2-1`
- **THEN** 每个展示分区抽取 1 个正确项和 3 个干扰项
- **AND** 每张过程卡的挑战模式时间为 25 秒

#### Scenario: 中期 ITTO 关卡
- **WHEN** 玩家进入 `itto-3-1`
- **THEN** 每个展示分区抽取最多 2 个正确项和 3 个干扰项
- **AND** 每张过程卡的挑战模式时间为 30 秒

#### Scenario: 后期 ITTO 关卡
- **WHEN** 玩家进入 `itto-6-1` 或 `itto-6-2`
- **THEN** 每个展示分区抽取最多 3 个正确项和 3 个干扰项
- **AND** 每张过程卡的挑战模式时间为 35 秒
