# PMBOK Data Specification

## Purpose

定义游戏运行时加载的项目管理知识数据（过程组、知识领域、过程和 ITTO）。

## Requirements
### Requirement: 过程组数据
系统 SHALL 定义 5 个项目管理过程组，包含中文名称和颜色。

#### Scenario: 全部 5 个过程组可用
- **WHEN** 游戏加载
- **THEN** 全部 5 个过程组的数据可用：启动过程组、规划过程组、执行过程组、监控过程组、收尾过程组
### Requirement: 知识领域数据
系统 SHALL 定义 10 个项目管理知识领域，包含中文名称。

#### Scenario: 全部 10 个知识领域可用
- **WHEN** 游戏加载
- **THEN** 全部 10 个知识领域的数据可用：整合、范围、进度、成本、质量、资源、沟通、风险、采购、干系人
### Requirement: 过程数据
系统 SHALL 定义 49 个项目管理过程，每个过程映射到一个过程组和一个知识领域，并携带定义、主要作用与记忆口诀学习字段。

#### Scenario: 全部 49 个过程可用
- **WHEN** 游戏加载
- **THEN** 第 4 版教材的全部 49 个过程可用
- **AND** 每个过程有唯一的 ID、中文全名、过程组关联、知识领域关联和难度评级（1-5）
- **AND** 数据模型不包含简称字段；所有游戏界面显示过程全名

#### Scenario: 矩阵位置正确
- **WHEN** 过程被放置到网格中其正确的矩阵格子
- **THEN** 其过程组列与知识领域行交叉处的格子即为正确位置

#### Scenario: 过程名称使用教材术语
- **WHEN** 游戏加载
- **THEN** 所有过程名称遵循第 4 版教材术语，不引入教材中不存在的用词
- **AND** 干系人知识领域的过程命名为识别干系人、规划干系人参与、管理干系人参与、监督干系人参与
- **AND** 计划类过程命名为制定项目管理计划和制定进度计划（使用制定）
- **AND** 风险应对过程命名为实施风险应对（教材矩阵清单规范名，全书 24 处；散句中「实施风险应对措施」仅 3 处）
- **AND** 过程制定项目章程和制定预算按教材保留制定
### Requirement: ITTO 数据
系统 SHALL 为每个过程存储 Inputs、Tools & Techniques 和 Outputs（ITTO），作为未来游戏模式的基础。

#### Scenario: ITTO 数据结构
- **WHEN** ITTO 数据加载
- **THEN** 每个过程拥有 inputs、toolsAndTechniques 和 outputs 数组
- **AND** 每个条目有名称和可选标签（如过程专有条目标记为 "core"，常见条目标记为 "common"）
### Requirement: 数据加载
系统 SHALL 在运行时从 JSON 文件加载游戏数据。

#### Scenario: 初始数据加载
- **WHEN** 游戏启动
- **THEN** 过程组、知识领域、过程和关卡配置被加载
- **AND** ITTO 数据仅在需要使用它的游戏模式需要时加载

#### Scenario: 数据完整性
- **WHEN** 数据加载
- **THEN** 每个过程都引用有效的过程组 ID 和有效的知识领域 ID
### Requirement: 过程定义与口诀数据
系统 SHALL 为全部 49 个过程提供 `definition`（课本定义精简句）、`role`（主要作用）与 `mnemonic`（不超过 20 字的记忆口诀）三个学习字段，内容 SHALL 以教材原文为依据校准。

#### Scenario: 学习字段可用
- **WHEN** 游戏加载过程数据
- **THEN** 每个过程包含非空的 definition、role 与 mnemonic 字段
- **AND** definition/role 表述与教材中「X是……的过程」「本过程的主要作用是……」句式一致

#### Scenario: 口诀长度约束
- **WHEN** 游戏加载过程数据
- **THEN** 每条 mnemonic 长度不超过 20 个字符
### Requirement: 学习字段完整性校验
系统 SHALL 在数据加载时断言学习字段完整性：任一过程缺失 definition、role 或 mnemonic 时构建或加载报错，SHALL NOT 以空值静默进入游戏。

#### Scenario: 缺失字段报错
- **WHEN** processes.json 中某过程缺少任一学习字段
- **THEN** 数据加载阶段抛出明确错误并指出缺失的过程 ID 与字段名
