# Level System Specification (Delta)

## ADDED Requirements

### Requirement: 玩法模式维度
系统 SHALL 为每个关卡定义玩法模式（`mode`）：`sort`（L1 定位归类，缺省）、`definition`（L2 定义挑战）、`itto`（L3 ITTO 测验），选关页 SHALL 以标签区分显示。

#### Scenario: 模式标签
- **WHEN** 玩家查看选关页
- **THEN** 定义关卡显示「定义」标签，ITTO 关卡显示「ITTO」标签，归类关卡显示「归类」标签

#### Scenario: 按模式渲染作答器
- **WHEN** 玩家进入不同 mode 的关卡
- **THEN** 游戏以对应模式的题面与作答方式运行，引擎行为一致

## MODIFIED Requirements

### Requirement: 关卡结构
系统 SHALL 提供分阶段难度递增的关卡序列：第 1-4 阶段为 L1 定位渐进（2 列 → 5 列 → 10 列 → 全矩阵），第 5 阶段为 L2 定义挑战，第 6 阶段为 L3 ITTO 补全；关卡总数由 levels.json 配置派生。

#### Scenario: 六个阶段
- **WHEN** 玩家查看选关界面
- **THEN** 显示 6 个阶段，各阶段名称与主题清晰可辨

#### Scenario: 阶段递进
- **WHEN** 玩家尚未完成前一阶段
- **THEN** 后续阶段被锁定且无法进入

#### Scenario: ITTO 全覆盖
- **WHEN** 玩家完成全部 Stage 6 关卡
- **THEN** 49 个过程均至少出现在一个 ITTO 关卡的题目中

### Requirement: 关卡配置
系统 SHALL 为每个关卡定义布局、卡池、模式、时间压力参数、生命与道具配置；SHALL NOT 包含下落速度类字段与手工目标数字段。

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

### Requirement: 总星数进度可视化
系统 SHALL 在选关页头部以进度条或进度环形式展示总星数进度，总星数上限 SHALL 由全部关卡星级动态求和得出，SHALL NOT 硬编码。

#### Scenario: 查看总星数
- **WHEN** 用户进入选关页
- **THEN** 头部显示总星数进度（如 8/24），配有可视化进度条
- **AND** 进度条有填充动画

#### Scenario: 关卡增减自适应
- **WHEN** levels.json 中关卡数量发生变化
- **THEN** 总星数上限随之变化，无需修改代码常量

## REMOVED Requirements

### Requirement: 关卡内难度递进
**Reason**: 递进机制基于下落速度与生成间隔，随下落玩法移除而失效。
**Migration**: 难度由每关静态配置（timePerCard、池子构成、道具数量）定义。
