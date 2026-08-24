# itto-section-quiz Specification

## Purpose
TBD - created by archiving change rebalance-itto-section-quiz. Update Purpose after archive.
## Requirements
### Requirement: 同屏双分区 ITTO 题
系统 SHALL 为每个 ITTO 过程卡从输入、工具与技术、输出三个分区中选择两个不同分区同屏出题；每个过程在一轮关卡中仍只占一张引擎卡。

#### Scenario: 展示两个不同分区
- **WHEN** 系统为当前过程生成 ITTO 题
- **THEN** 题面仅展示输入、工具与技术、输出中的两个不同分区
- **AND** 不展示第三个未抽查分区的候选项

#### Scenario: 关卡题数不翻倍
- **WHEN** ITTO 关卡卡池包含 N 个过程
- **THEN** 普通出题队列包含 N 张过程卡
- **AND** 同屏两个分区不拆成两张独立过程卡

### Requirement: 分级抽取正确项
系统 SHALL 根据关卡 `ittoQuiz.correctPerSection` 从每个展示分区的真实 ITTO 中抽取正确项；带 `core` 标签的条目 SHALL 优先入选，不足时从该过程同分区的其他真实条目中补足。

#### Scenario: 优先抽取核心项
- **WHEN** 当前分区含有带 `core` 标签的真实 ITTO
- **THEN** 系统优先将核心项纳入本题正确项
- **AND** 正确项数量不超过关卡配置值

#### Scenario: 核心项不足时补足
- **WHEN** 当前分区的核心项少于关卡配置的正确项数量
- **THEN** 系统从该过程同分区的其他真实 ITTO 中抽取条目补足

#### Scenario: 真实项少于配置数量
- **WHEN** 当前分区的真实 ITTO 总数少于关卡配置的正确项数量
- **THEN** 系统使用该分区全部真实项作为正确项
- **AND** 不生成虚构的正确项

### Requirement: 每区近邻干扰项
系统 SHALL 为每个展示分区生成 `ittoQuiz.distractorsPerSection` 个互不重复的干扰项，优先从同知识领域其他过程的同类 ITTO 中选取，其次从同过程组其他过程选取，最后从全局同分区池补足。

#### Scenario: 优先使用同知识领域干扰项
- **WHEN** 同知识领域其他过程存在足够的同分区候选项
- **THEN** 干扰项从这些候选项中生成

#### Scenario: 分层补足干扰项
- **WHEN** 同知识领域候选项不足配置数量
- **THEN** 系统依次使用同过程组候选项和全局同分区候选项补足

#### Scenario: 排除当前过程真实项
- **WHEN** 系统生成当前过程某分区的干扰项
- **THEN** 当前过程该分区的全部真实 ITTO 均被排除
- **AND** 未被抽作本题正确项的真实 ITTO 不得作为干扰项

#### Scenario: 候选项去重
- **WHEN** 相同名称的 ITTO 存在于多个候选过程
- **THEN** 本题候选项中该名称至多出现一次

### Requirement: 明确选择数量与完整判定
系统 SHALL 在每个展示分区标明本题应选数量，并仅以本题抽取的正确项判定该分区；两个展示分区均完全正确时，当前过程卡才判为答对。

#### Scenario: 显示应选数量
- **WHEN** 玩家查看未提交的 ITTO 题
- **THEN** 每个分区标题或辅助文案显示该分区应选择的项数

#### Scenario: 两区全部正确
- **WHEN** 玩家在两个展示分区中选中的集合分别与本题正确项集合完全一致
- **THEN** 当前过程卡判定为答对

#### Scenario: 任一区多选或漏选
- **WHEN** 任一展示分区存在多选、错选或漏选
- **THEN** 当前过程卡判定为答错

#### Scenario: 未抽查真实项不参与判定
- **WHEN** 当前过程某个真实 ITTO 未被抽作本题正确项
- **THEN** 玩家无需选择该项
- **AND** 该项不影响本题判定

### Requirement: 复习题方案稳定
系统 SHALL 在一轮关卡中按过程缓存 ITTO 题目方案，包括展示分区、正确项、干扰项和候选项顺序；答错或超时后的复习重现 SHALL 使用完全相同的方案。

#### Scenario: 答错后原题重现
- **WHEN** ITTO 过程卡答错后从复习队列再次出现
- **THEN** 展示分区、正确项、干扰项和候选项顺序均与首次出现一致

#### Scenario: 超时后原题重现
- **WHEN** ITTO 过程卡超时后从复习队列再次出现
- **THEN** 使用超时前相同的题目方案

#### Scenario: 新一轮允许重新抽题
- **WHEN** 玩家重新开始关卡或重新进入关卡
- **THEN** 系统清空上一轮题目方案缓存
- **AND** 允许为各过程重新选择分区和候选项

### Requirement: 提交后完整复习
系统 SHALL 在 ITTO 题提交后继续使用完整教材 ITTO 展示知识卡；批改标记仅对应本题抽查项，不得暗示未抽查的真实条目为错误答案。

#### Scenario: 答错查看完整知识卡
- **WHEN** 玩家提交错误答案进入复盘停留
- **THEN** 知识卡展示当前过程完整的输入、工具与技术、输出
- **AND** 题目区仅对本题候选项显示正确、错选和遗漏状态

