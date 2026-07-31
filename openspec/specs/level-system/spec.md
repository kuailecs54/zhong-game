# Level System Specification

## Purpose

Defines the level structure, unlocking rules, per-level configuration, star persistence, and in-level difficulty progression for the game.

## Requirements

### Requirement: Level structure
The system SHALL provide 12 sort levels organized in 4 stages of increasing difficulty.

#### Scenario: Four stages of levels
- **WHEN** the player views the level selection screen
- **THEN** 4 stages are displayed
- **AND** each stage contains 3 levels

#### Scenario: Stage progression
- **WHEN** the player has not completed the previous stage
- **THEN** subsequent stages are locked and cannot be accessed

### Requirement: Level unlocking
The system SHALL unlock the next level when the current level is completed with at least 1 star.

#### Scenario: Complete level unlocks next
- **WHEN** the player completes a level with at least 1 star
- **THEN** the next level in the same stage becomes playable
- **AND** if it was the last level of a stage, the first level of the next stage becomes playable

#### Scenario: Initial state
- **WHEN** a new player first views level selection
- **THEN** only level 1-1 is unlocked
- **AND** all other levels are locked

### Requirement: Level configuration
Each level SHALL define its layout, card pool, difficulty parameters, and goals.

#### Scenario: Column-based layout
- **WHEN** a level uses column layout (stages 1-3)
- **THEN** the grid consists of multiple vertical columns
- **AND** each column represents a process group or knowledge area
- **AND** cards must be placed into the correct column

#### Scenario: Matrix layout
- **WHEN** a level uses matrix layout (stage 4)
- **THEN** the grid is a 2D matrix with rows as knowledge areas and columns as process groups
- **AND** cards must be placed into the correct cell (row + column intersection)

### Requirement: Star persistence
The system SHALL save the best star rating for each level.

#### Scenario: Stars saved on completion
- **WHEN** the player completes a level
- **THEN** the star rating is saved to localStorage if it's better than the previous best

#### Scenario: Stars displayed on level select
- **WHEN** the player views the level selection screen
- **THEN** each unlocked level shows its best star rating (0-3 stars)

### Requirement: Difficulty progression within levels
The system SHALL increase spawn rate and fall speed as the level progresses.

#### Scenario: Speed increases during level
- **WHEN** the player has correctly placed 2/3 of the target cards
- **THEN** the fall speed increases
- **AND** the spawn interval decreases

### Requirement: 选关卡片视觉增强
系统 SHALL 为选关页的关卡卡片提供更丰富的视觉层次，包括阶段色条、星级渐变、悬停动效。

#### Scenario: 查看关卡卡片
- **WHEN** 用户查看选关页
- **THEN** 每个关卡卡片左上角有对应阶段的主题色条
- **AND** 星级使用渐变填充的星形图标（非文字 ★）
- **AND** 卡片悬停时有上浮和发光效果

### Requirement: 总星数进度可视化
系统 SHALL 在选关页头部以进度条或进度环形式展示总星数进度。

#### Scenario: 查看总星数
- **WHEN** 用户进入选关页
- **THEN** 头部显示总星数进度（如 8/12），配有可视化进度条
- **AND** 进度条有填充动画

### Requirement: 锁定卡片提示
系统 SHALL 为锁定的关卡卡片提供解锁条件提示。

#### Scenario: 悬停锁定关卡
- **WHEN** 用户悬停在锁定的关卡卡片上
- **THEN** 显示解锁条件提示（如"完成前一关并获得至少 1 星解锁"）

### Requirement: 结算页胜利动效
系统 SHALL 在游戏胜利结算页提供星级逐个弹出的动画和庆祝视觉效果。

#### Scenario: 胜利结算
- **WHEN** 玩家通关进入结算页
- **THEN** 星级从左到右逐个弹出，带缩放旋转动画
- **AND** 页面有轻微的庆祝光效（彩点/光斑）
- **AND** 统计数据逐项淡入

### Requirement: 结算页按钮层级
系统 SHALL 优化结算页按钮的视觉层级，主操作（下一关）最突出，次要操作（重新挑战、返回）次之。

#### Scenario: 查看结算按钮
- **WHEN** 用户查看结算页
- **THEN** "下一关"按钮最大最突出（主按钮样式）
- **AND** "重新挑战"次之（次按钮样式）
- **AND** "返回选关"最不突出（文字按钮或弱按钮样式）
