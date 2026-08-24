# Mobile Landscape Specification

## Purpose

Defines the landscape-only experience on touch devices: a rotation gate that blocks portrait play, the side-by-side landscape layout with compact UI, and fall speed scaling to keep mobile difficulty consistent with desktop.
## Requirements
### Requirement: 竖屏旋转门
触摸设备（`pointer: coarse`）且视口为竖屏且宽度小于 768px 时，系统 MUST 显示全屏旋转遮罩，提示玩家旋转至横屏；游戏进行中时 MUST 自动暂停。遮罩不提供「仍然竖屏游玩」的入口。触摸设备横屏（含宽度 667~767px）时 MUST 不显示遮罩。

#### Scenario: 竖屏进入游戏
- **WHEN** 触摸设备竖屏（如 390×844）打开任意页面
- **THEN** 页面被全屏旋转遮罩覆盖，提示「请旋转设备至横屏」

#### Scenario: 横屏正常游玩
- **WHEN** 触摸设备横屏（如 844×390，含 667~767px 宽的小屏手机）
- **THEN** 不显示旋转遮罩，游戏正常进入并排布局

#### Scenario: 横屏游玩中旋转为竖屏
- **WHEN** 游戏进行中（playing 阶段）设备旋转为竖屏
- **THEN** 旋转遮罩立即显示，游戏进入 paused 状态，期间卡片不移动、不掉落

#### Scenario: 转回横屏后手动继续
- **WHEN** 遮罩显示期间设备转回横屏
- **THEN** 遮罩消失，游戏停留在暂停态，玩家点击「继续游戏」后恢复

#### Scenario: 桌面端不受影响
- **WHEN** 桌面浏览器（精确指针）任意窗口尺寸下打开游戏
- **THEN** 永不显示旋转遮罩

### Requirement: 触摸横屏紧凑化
触摸设备横屏时，HUD、燃烧绳、居中大卡、答案卡、矩阵格子 MUST 使用紧凑尺寸，保证在约 375px 高的视口内大卡与作答区同时可用。

#### Scenario: 横屏高度受限下的布局可用
- **WHEN** 触摸设备横屏（视口高度约 375px）打开任意关卡
- **THEN** HUD、燃烧绳与居中大卡合计使用紧凑高度
- **AND** 答案卡组或测验操作区在剩余空间内可滚动、可见且可正常作答

#### Scenario: 矩阵模式安全高度
- **WHEN** 触摸设备横屏游玩 matrix 模式关卡、矩阵网格内容超出可用高度
- **THEN** 矩阵网格在安全高度内可滚动浏览，不影响上方卡片区

#### Scenario: 燃烧绳不遮挡操作区
- **WHEN** 触摸设备横屏游玩定义或 ITTO 关卡
- **THEN** 燃烧绳不覆盖 HUD、题目选项或提交按钮
- **AND** 页面存在超高内容时可滚动到达全部操作控件

### Requirement: 刘海屏横屏适配
页面 viewport 配置 MUST 包含 `viewport-fit=cover`，保证横屏下刘海设备内容不被裁切。

#### Scenario: 刘海设备横屏显示完整
- **WHEN** 带刘海的触摸设备横屏打开游戏
- **THEN** 页面内容延伸至安全区，HUD 与遮罩不被刘海遮挡裁切

### Requirement: 触摸横屏开始界面可滚动
开始界面在触摸设备横屏下 MUST 允许内容超高时纵向滚动，保证"开始游戏"按钮始终可达；内容未超高时开始卡片 MUST 保持垂直居中；桌面端 MUST 不因该滚动能力出现多余滚动条。

#### Scenario: 横屏小屏手机第二关按钮可达
- **WHEN** 触摸设备横屏（视口高度约 390px）打开第二关开始界面（卡片含干扰项警告框，内容高度超出视口）
- **THEN** 开始界面可纵向滚动
- **AND** 玩家滚动后可见并点击"开始游戏"按钮进入游戏

#### Scenario: 内容未超高时卡片保持居中
- **WHEN** 开始卡片内容高度未超出视口高度（如第一关）
- **THEN** 开始卡片在视口内垂直居中显示，不因滚动容器而贴顶

#### Scenario: 桌面端无滚动条
- **WHEN** 桌面浏览器（视口高度 900px）打开开始界面
- **THEN** 开始界面纵向内容不超出视口，不显示滚动条
- **AND** 背景装饰光球溢出部分被裁切，不产生 60px 的纵向滚动空间

### Requirement: 触摸设备横屏布局
触摸设备横屏时，主区域 MUST 采用「HUD + 居中大卡 + 底部答案卡组」的纵向堆叠布局（矩阵关为 HUD + 大卡 + 矩阵网格），居中大卡区域 MUST 保留最大可用高度；SHALL NOT 出现侧边面板挤压卡片区宽度的布局。

#### Scenario: 横屏小屏手机布局可用
- **WHEN** 触摸设备横屏且宽度小于 768px（如 667×375）
- **THEN** HUD、大卡与底部答案卡组纵向堆叠，互不遮挡，答案卡自动换行分布可正常点选

#### Scenario: 大卡区域高度保障
- **WHEN** 触摸设备横屏打开任意列布局关卡
- **THEN** 居中大卡区域保留最大可用高度，不被作答区压缩为条带

