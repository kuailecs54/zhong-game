# User Profiles Specification (Delta)

## MODIFIED Requirements

### Requirement: 持久化用户资料
系统 SHALL 将用户资料（用户名、关卡进度、掌握度档案）持久化存储在 localStorage 中，以便页面刷新后仍然保留；存储结构 SHALL 向后兼容旧版数据。

#### Scenario: 回访用户跳过用户名输入
- **WHEN** 有已保存用户名的用户返回游戏
- **THEN** 游戏直接进入选关界面
- **AND** UI 中显示用户名

#### Scenario: 进度跨会话保留
- **WHEN** 用户完成一个关卡后重新加载页面
- **THEN** 之前获得的星级和已解锁关卡仍然可用

#### Scenario: 掌握度跨会话保留
- **WHEN** 用户完成练习后重新加载页面或次日返回
- **THEN** 全部过程的掌握度档位与最近练习时间保持可用（时间衰减规则除外）

#### Scenario: 旧版数据兼容
- **WHEN** localStorage 中存在不含掌握度档案的旧版用户资料
- **THEN** 系统正常加载原有字段并以空掌握度档案初始化，不丢失任何已有进度
