# Mobile Landscape Specification (Delta)

## MODIFIED Requirements

### Requirement: 触摸设备横屏布局
触摸设备横屏时，主区域 MUST 采用「HUD + 居中大卡 + 底部答案卡组」的纵向堆叠布局（矩阵关为 HUD + 大卡 + 矩阵网格），居中大卡区域 MUST 保留最大可用高度；SHALL NOT 出现侧边面板挤压卡片区宽度的布局。

#### Scenario: 横屏小屏手机布局可用
- **WHEN** 触摸设备横屏且宽度小于 768px（如 667×375）
- **THEN** HUD、大卡与底部答案卡组纵向堆叠，互不遮挡，答案卡自动换行分布可正常点选

#### Scenario: 大卡区域高度保障
- **WHEN** 触摸设备横屏打开任意列布局关卡
- **THEN** 居中大卡区域保留最大可用高度，不被作答区压缩为条带

### Requirement: 触摸横屏紧凑化
触摸设备横屏时，HUD、居中大卡、答案卡、矩阵格子 MUST 使用紧凑尺寸，保证在约 375px 高的视口内大卡与作答区同时可用。

#### Scenario: 横屏高度受限下的布局可用
- **WHEN** 触摸设备横屏（视口高度约 375px）打开任意关卡
- **THEN** HUD 与居中大卡合计占高不超过约 100px，答案卡组在剩余空间内完整可见可点选，矩阵格子内容不重叠、可正常点选作答

#### Scenario: 矩阵模式安全高度
- **WHEN** 触摸设备横屏游玩 matrix 模式关卡、矩阵网格内容超出可用高度
- **THEN** 矩阵网格在安全高度内可滚动浏览，不影响上方卡片区

## REMOVED Requirements

### Requirement: 下落速度按游戏区高度缩放
**Reason**: 下落玩法整体移除，速度缩放失去作用对象。
**Migration**: 移动端难度由统一引擎的每卡倒计时承担，无需按区域高度缩放。

### Requirement: 书架侧面板宽度封顶
**Reason**: 列模式作答区重构为底部答案卡组，侧边书架面板不再存在，宽度封顶规则失去作用对象。
**Migration**: 见 mobile-landscape MODIFIED「触摸设备横屏布局」纵向堆叠布局。
