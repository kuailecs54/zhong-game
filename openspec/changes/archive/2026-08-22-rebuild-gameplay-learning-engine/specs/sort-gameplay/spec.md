# Sort Gameplay Specification (Delta)

## ADDED Requirements

### Requirement: 无剧透约束
系统 SHALL 保证作答界面不泄露正确答案：所有可作答的列/格在任何时刻使用一致的视觉样式，SHALL NOT 出现仅标记正确位置的高亮、幽灵预览或对其余位置的弱化变暗；悬停反馈 SHALL 为与正确性无关的中性样式。

#### Scenario: 选中卡片无目标提示
- **WHEN** 玩家选中当前卡（L1 定位题进行中）
- **THEN** 所有列/格外观一致，无任何列/格被高亮为「可放置」
- **AND** 不出现虚线幽灵书脊预览

#### Scenario: 悬停中性反馈
- **WHEN** 玩家悬停任意列/格
- **THEN** 仅出现与正确性无关的统一 hover 样式

## MODIFIED Requirements

### Requirement: 卡片格子放置
系统 SHALL 允许玩家对当前单卡直接点击目标列/格完成作答（矩阵关卡需同时匹配行与列）。

#### Scenario: 正确放置卡片
- **WHEN** 玩家点击与当前卡过程组匹配的答案卡（矩阵关卡还需匹配知识领域）
- **THEN** 判定为正确并计分
- **AND** 播放成功动画，卡片飞向对应答案卡（列布局）或矩阵格子（矩阵布局）

#### Scenario: 错误放置卡片
- **WHEN** 玩家点击错误的列/格
- **THEN** 判定为错误：连击清零、播放失败动画
- **AND** 显示纠错浮层（正确归属 + 口诀），该卡进入复习队列

### Requirement: 关卡完成
系统 SHALL 在出题队列与复习队列全部清空时完成关卡。

#### Scenario: 清空队列成功结算
- **WHEN** 玩家将本关卡池中全部过程（含错题重现）答对完毕
- **THEN** 关卡成功结束，结算界面显示最终得分、准确率、最高连击和星级

#### Scenario: 基于表现的星级评定
- **WHEN** 关卡成功完成
- **THEN** 完成关卡获得 1 星
- **AND** 准确率达到关卡配置的两星阈值时获得 2 星
- **AND** 准确率达到三星阈值且零漏接时获得 3 星

### Requirement: 矩阵格子放置计数徽章
系统 SHALL 在收到正确放置卡片的矩阵格子上显示固定宽度的书脊和过程全名；每过程每关仅放置一次，SHALL NOT 显示重复计数徽章。

#### Scenario: 格子显示书脊
- **WHEN** 一张卡片被正确放置到矩阵格子
- **THEN** 该格子显示一根固定宽度的书脊，带过程全名

#### Scenario: 书脊文字保持单列不换行
- **WHEN** 矩阵格子书脊显示其过程名称
- **THEN** 名称在单一不换行列中垂直渲染
- **AND** 格子高度容纳最长的过程全名（最多 9 个字符，如"指导与管理项目工作"），使名称完整显示不被截断

## REMOVED Requirements

### Requirement: 卡片下落机制
**Reason**: 玩法重构为单卡逐张点选即放，下落机制整体取消。
**Migration**: 出题方式由 drill-engine 能力的「单卡逐张出题」承接。

### Requirement: 按压捕获卡片
**Reason**: 无下落卡片即无需捕获；单卡模式下当前卡自动呈现。
**Migration**: 由 drill-engine 的单卡呈现替代。

### Requirement: 下落卡片渲染为书本
**Reason**: 下落载体取消。
**Migration**: 书本外观迁移至 CardStage 居中大卡的视觉设计。

### Requirement: 下落卡片捕获反馈
**Reason**: 捕获交互取消。
**Migration**: 答对反馈由「卡片飞向书架」动画承担。

### Requirement: 拖拽起手反馈
**Reason**: 拖拽交互随多卡托盘玩法移除，改为点击作答。
**Migration**: 无拖拽状态，无需起手反馈。

### Requirement: 拖拽目标磁吸高亮
**Reason**: 该高亮按正确性区分目标，违反无剧透约束；且拖拽已取消。
**Migration**: 悬停统一中性高亮（见无剧透约束）；按需提示由 drill-engine 提示道具承担。

### Requirement: 放置失败回弹
**Reason**: 答错不再回弹托盘，改为纠错浮层 + 复习队列。
**Migration**: 见修改后的「卡片格子放置」错误场景。

### Requirement: 冰冻冰晶效果
**Reason**: 冰冻道具语义变更（暂停倒计时而非暂停下落卡片）。
**Migration**: 新语义见 drill-engine 道具系统；冰晶视觉可在实现时沿用。

### Requirement: 生命系统
**Reason**: 移交至统一引擎能力，语义更新（超时也扣命、轻松模式无生命）。
**Migration**: 见 drill-engine「生命系统」。

### Requirement: 连击系统
**Reason**: 移交至统一引擎能力，倍率公式更新。
**Migration**: 见 drill-engine「连击计分」。

### Requirement: 道具系统
**Reason**: 移交至统一引擎能力，道具种类扩展为提示/冰冻/护盾。
**Migration**: 见 drill-engine「道具系统」。

### Requirement: 计分机制
**Reason**: 计分公式更新并移交统一引擎。
**Migration**: 见 drill-engine「连击计分」（10 × 倍率，答错不扣分只清连击）。
