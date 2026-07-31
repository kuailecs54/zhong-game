# Sort Gameplay Specification

## Purpose

Defines the core sort-game loop: falling cards, capture, placement into target grids, lives, combo, power-ups, scoring, and level completion.
## Requirements
### Requirement: Card falling mechanics
The system SHALL display process name cards that fall from the top of the game area at a speed defined by the current level.

#### Scenario: Cards spawn at top and fall downward
- **WHEN** a sort level is active
- **THEN** cards spawn at random horizontal positions at the top of the game area
- **AND** each card falls downward at a constant speed

#### Scenario: Card reaches bottom
- **WHEN** a card falls past the bottom of the game area without being captured
- **THEN** the player loses one life
- **AND** the card is removed from play

### Requirement: Card placement in grid
The system SHALL allow the player to place a captured card into a target grid cell.

#### Scenario: Place correct card
- **WHEN** the player clicks a card in the capture tray and then clicks a grid cell that matches the card's process group (and knowledge area for matrix levels)
- **THEN** the card is removed from the tray
- **AND** score is awarded
- **AND** a success animation plays
- **AND** the placed card is added to the bookshelf (columns layout) or to the matrix cell count badge (matrix layout)

#### Scenario: Place wrong card
- **WHEN** the player clicks a card in the capture tray and then clicks an incorrect grid cell
- **THEN** the card returns to the capture tray
- **AND** points are deducted
- **AND** the combo counter resets to 0
- **AND** a failure animation plays

### Requirement: Lives system
The system SHALL track the player's remaining lives and end the level when lives reach zero.

#### Scenario: Start with 3 lives
- **WHEN** a level begins
- **THEN** the player has 3 lives

#### Scenario: Lose all lives
- **WHEN** the player's last life is lost
- **THEN** the level ends in failure
- **AND** a failure screen is shown with option to retry

### Requirement: Combo system
The system SHALL track consecutive correct placements and award score multipliers.

#### Scenario: Combo increases on correct placement
- **WHEN** the player correctly places a card
- **THEN** the combo counter increments by 1
- **AND** the score multiplier increases (capped at x5)

#### Scenario: Combo resets on wrong placement
- **WHEN** the player places a card incorrectly
- **THEN** the combo counter resets to 0
- **AND** the score multiplier resets to x1

### Requirement: Power-ups
The system SHALL provide power-ups that the player can use during a level.

#### Scenario: Freeze power-up
- **WHEN** the player activates the freeze power-up
- **THEN** all falling cards pause for 3 seconds
- **AND** the power-up is consumed

#### Scenario: Power-up availability
- **WHEN** a level starts
- **THEN** the player has 1 freeze power-up available

### Requirement: Scoring
The system SHALL calculate scores based on correct placements and combo multipliers.

#### Scenario: Base score with combo
- **WHEN** a card is correctly placed
- **THEN** the score increases by 100 × current combo multiplier (minimum x1, maximum x5)

#### Scenario: Penalty for wrong placement
- **WHEN** a card is placed incorrectly
- **THEN** 50 points are deducted from the score
- **AND** the score cannot go below 0

### Requirement: Level completion
The system SHALL track the number of correctly placed cards and complete the level when the target is reached.

#### Scenario: Reach target correct count
- **WHEN** the player correctly places the target number of cards
- **THEN** the level ends successfully
- **AND** a results screen shows the final score, accuracy, and star rating

#### Scenario: Star rating based on performance
- **WHEN** a level is completed successfully
- **THEN** 1 star is awarded for completing the level
- **AND** 2 stars are awarded if accuracy >= 80%
- **AND** 3 stars are awarded if accuracy is 100% and at least 2 lives remain

### Requirement: Matrix cell placement badges
The system SHALL display a count badge on matrix cells that have received correctly placed cards.

#### Scenario: Badge shows placed count
- **WHEN** a card is correctly placed into a matrix cell
- **THEN** the cell shows the process short name and a count badge (e.g., ×3 when placed 3 times)

#### Scenario: Badge updates on repeat placement
- **WHEN** the same process is placed into the same matrix cell again
- **THEN** the badge count increases by one

### Requirement: Card capture by press
The system SHALL allow the player to capture a falling card by pressing on it, with an extended hit area.

#### Scenario: Press captures card
- **WHEN** the player presses (pointerdown) on a falling card or within its extended hit area
- **THEN** the card is removed from the falling area
- **AND** the card appears in the capture tray (待放置区)

#### Scenario: Capture tray capacity
- **WHEN** the capture tray already contains 3 cards and the player presses another falling card
- **THEN** the press has no effect (card continues falling)
- **AND** a visual indicator shows the tray is full

### Requirement: Falling cards rendered as books
The system SHALL render falling cards with a book-like appearance.

#### Scenario: Falling card looks like a book
- **WHEN** a card falls in the game area
- **THEN** it displays a dark spine on the left, a gradient cover with the process name, and a page-edge detail on the right

#### Scenario: Compact books on the desk
- **WHEN** a captured card is shown in the desk tray or the drag ghost
- **THEN** it keeps the book-like appearance in a smaller compact size

### Requirement: 下落卡片捕获反馈
系统 SHALL 在玩家点击捕获下落卡片时，提供卡片"吸入书桌"的位移动画和视觉反馈。

#### Scenario: 捕获下落卡片
- **WHEN** 玩家点击下落中的卡片
- **THEN** 卡片向书桌方向飞出并淡出
- **AND** 书桌位置出现轻微的接收脉冲效果

### Requirement: 拖拽起手反馈
系统 SHALL 在玩家从书桌拿起卡片开始拖拽时，提供卡片上浮、放大、阴影加深的视觉反馈，模拟"拿起"的物理感。

#### Scenario: 从书桌拿起卡片
- **WHEN** 玩家在书桌卡片上按下并开始拖拽
- **THEN** 拖拽中的卡片尺寸放大 105%-110%
- **AND** 卡片阴影加深，模拟悬浮效果
- **AND** 原位置卡片淡出或变透明

### Requirement: 拖拽目标磁吸高亮
系统 SHALL 在拖拽卡片悬停在可放置目标（书架单元/矩阵格子）上方时，提供目标高亮脉冲和微放大效果，提示玩家可以放置。

#### Scenario: 悬停可放置目标
- **WHEN** 玩家拖拽卡片悬停在正确的书架列/矩阵格子上方
- **THEN** 目标区域出现高亮边框和发光效果
- **AND** 目标区域轻微放大（scale 1.03-1.05）

#### Scenario: 悬停不可放置目标
- **WHEN** 玩家拖拽卡片悬停在错误的目标上方
- **THEN** 目标区域无特殊高亮
- **AND** 其他区域透明度降低以突出可放置目标

### Requirement: 放置成功反馈
系统 SHALL 在卡片正确放置到书架/矩阵格子时，提供弹入动画和书架/格子的微下沉反弹效果。

#### Scenario: 正确放置卡片
- **WHEN** 玩家将卡片正确放入书架列/矩阵格子
- **THEN** 卡片有弹入效果（scale 从大到正常，带回弹）
- **AND** 书架/格子有轻微下沉反弹的物理反馈

### Requirement: 放置失败回弹
系统 SHALL 在卡片放置失败时，提供弧线回弹到书桌的动画效果。

#### Scenario: 放置失败回弹
- **WHEN** 玩家将卡片拖拽到非目标区域并松手
- **THEN** 卡片以弧线轨迹飞回书桌原位
- **AND** 书桌区域出现提示脉冲

### Requirement: HUD 进度条可视化
系统 SHALL 在游戏 HUD 中以进度条形式展示关卡完成进度，替代纯数字显示。

#### Scenario: 查看游戏进度
- **WHEN** 游戏进行中
- **THEN** HUD 显示一条进度条，填充比例为 正确数/目标数
- **AND** 进度条上或旁边显示数字进度（如 8/20）

### Requirement: 分数数字滚动动画
系统 SHALL 在分数变化时，提供数字滚动递增的动画效果，而非跳变。

#### Scenario: 得分增加
- **WHEN** 玩家正确放置卡片得分
- **THEN** HUD 中的分数数字从旧值滚动递增到新值
- **AND** 数字短暂放大后恢复（pop 效果）

### Requirement: 连击光效反馈
系统 SHALL 在连击达到一定阈值时，在 HUD 和游戏区域提供更强的视觉反馈。

#### Scenario: 高连击状态
- **WHEN** 连击数达到 5 连及以上
- **THEN** 连击显示发光/脉冲效果
- **AND** 游戏区边缘出现微弱的能量光效

### Requirement: 浮动得分文字
系统 SHALL 在正确放置卡片时，在放置位置上方弹出浮动的 +分数文字。

#### Scenario: 放置得分弹出
- **WHEN** 玩家正确放置一张卡片
- **THEN** 在书架/矩阵格子上方弹出 "+XX" 浮动文字
- **AND** 文字向上飘动并淡出

### Requirement: 冰冻冰晶效果
系统 SHALL 在冰冻道具激活时，提供冰晶覆盖的视觉效果，而非仅半透明。

#### Scenario: 冰冻激活
- **WHEN** 玩家使用冰冻道具
- **THEN** 下落卡片表面出现冰晶/霜冻覆盖效果
- **AND** 游戏区边缘出现淡蓝色霜冻 vignette
- **AND** 顶部冰冻计时器有呼吸光效

### Requirement: 页面过渡动画
系统 SHALL 在页面切换时提供平滑的过渡动画。

#### Scenario: 页面切换
- **WHEN** 用户在首页、选关页、游戏页、结算页之间导航
- **THEN** 页面有平滑的淡入滑出过渡效果
- **AND** 不同方向的导航有不同的过渡方向感

### Requirement: 减少动效模式支持
系统 SHALL 尊重操作系统的"减少动态效果"（prefers-reduced-motion）设置。

#### Scenario: 减少动效模式
- **WHEN** 用户操作系统开启了减少动效
- **THEN** 所有非必要的动画、过渡、粒子效果均被禁用或简化为淡入淡出

