# User Profiles Specification

## Purpose

定义首次访问时的用户名输入，以及存储在 localStorage 中的持久化用户资料（用户名和进度）。

## Requirements

### Requirement: 首次访问的用户名输入
系统 SHALL 要求用户在首次访问时、访问任何游戏内容之前输入用户名。

#### Scenario: 首次访问显示用户名输入
- **WHEN** 用户首次打开游戏（localStorage 中未存储用户名）
- **THEN** 显示用户名输入界面

#### Scenario: 用户名不能为空
- **WHEN** 用户在用户名为空或仅含空白字符时点击确认
- **THEN** 系统显示错误提示且不继续

#### Scenario: 提交有效用户名
- **WHEN** 用户输入有效用户名（1-20 个字符）并点击确认
- **THEN** 用户名保存到 localStorage
- **AND** 用户被引导到选关界面

### Requirement: 持久化用户资料
系统 SHALL 将用户资料（用户名和进度）持久化存储在 localStorage 中，以便页面刷新后仍然保留。

#### Scenario: 回访用户跳过用户名输入
- **WHEN** 有已保存用户名的用户返回游戏
- **THEN** 游戏直接进入选关界面
- **AND** UI 中显示用户名

#### Scenario: 进度跨会话保留
- **WHEN** 用户完成一个关卡后重新加载页面
- **THEN** 之前获得的星级和已解锁关卡仍然可用

### Requirement: 首页视觉增强
系统 SHALL 为首页登录卡片提供更精致的入场动画和视觉层次。

#### Scenario: 进入首页
- **WHEN** 用户打开游戏
- **THEN** 标题有渐变发光效果
- **AND** 卡片有入场动画（从下方滑入 + 淡入）
- **AND** 输入框聚焦时有更明显的聚焦态
- **AND** 按钮有呼吸光晕效果
