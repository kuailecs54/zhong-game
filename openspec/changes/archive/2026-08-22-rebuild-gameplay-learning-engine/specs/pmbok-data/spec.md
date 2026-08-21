# PMBOK Data Specification (Delta)

## ADDED Requirements

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

## MODIFIED Requirements

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
