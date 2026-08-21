# Mastery Tracking Specification (Delta)

## ADDED Requirements

### Requirement: 三维掌握度记录
系统 SHALL 为每个过程按三个学习维度（定位 position、定义 definition、ITTO itto）分别记录 Leitner 盒档位（0=生疏，1=巩固，2=掌握）与最近练习时间戳。

#### Scenario: 初始无记录
- **WHEN** 玩家从未练习过某过程的某维度
- **THEN** 该维度档位为 0（生疏）且无 lastSeen

#### Scenario: 作答写入对应维度
- **WHEN** 玩家在 L1/L2/L3 任一模式中对某过程作答
- **THEN** 该次作答结果仅写入对应维度的档位与 lastSeen

### Requirement: Leitner 升降档规则
系统 SHALL 按以下规则更新档位：答对升一档（封顶 2），答错或超时归 0。

#### Scenario: 答对升档
- **WHEN** 玩家在某维度答对该过程
- **THEN** 该维度档位加 1（最高到 2）

#### Scenario: 答错归零
- **WHEN** 玩家在某维度答错或超时该过程
- **THEN** 该维度档位归 0

### Requirement: 时间衰减
系统 SHALL 在应用加载时惰性执行衰减：某维度 lastSeen 距今超过 7 天时档位降一档（不低于 0），并更新 lastSeen。

#### Scenario: 超7天未练降档
- **WHEN** 某过程某维度档位为 1 或 2 且 lastSeen 距今超过 7 天
- **THEN** 加载时该维度档位减 1

#### Scenario: 生疏档不衰减
- **WHEN** 某维度档位已为 0
- **THEN** 无论多久未练档位保持 0

### Requirement: 掌握度持久化
系统 SHALL 将掌握度档案并入现有用户资料 localStorage 存储（key `pm-sort-game-user`），跨会话保留且向后兼容旧数据结构。

#### Scenario: 掌握度跨会话保留
- **WHEN** 玩家练习后刷新页面或次日返回
- **THEN** 全部过程的档位与 lastSeen 保持不变（衰减规则除外）

#### Scenario: 旧数据兼容
- **WHEN** localStorage 中存在无 mastery 字段的旧版用户资料
- **THEN** 系统正常加载并以空掌握度档案初始化，不丢失原有进度

### Requirement: 热力图仪表盘
系统 SHALL 在选关页提供 5 过程组 × 10 知识领域的矩阵热力图，以颜色区分每个格子的掌握状态（绿=掌握/黄=巩固/红=生疏/灰=未练习），并支持按三个维度切换视角。

#### Scenario: 查看热力图
- **WHEN** 玩家进入选关页
- **THEN** 显示 5×10 热力图，每格颜色反映对应过程当前维度的档位

#### Scenario: 切换维度视角
- **WHEN** 玩家切换热力图的维度（定位/定义/ITTO）
- **THEN** 颜色按所选维度的档位重新渲染

### Requirement: 薄弱特训自由通道
系统 SHALL 提供「薄弱特训」入口：从档位低于 2 的过程中动态生成一局练习关卡，不经过解锁链校验。

#### Scenario: 进入薄弱特训
- **WHEN** 玩家点击薄弱特训入口
- **THEN** 系统以全部档位 <2 的过程为卡池生成一局 L1 练习
- **AND** 无需任何前置关卡星级

#### Scenario: 特训作答计入掌握度
- **WHEN** 玩家在薄弱特训中作答
- **THEN** 结果照常写入掌握度档案

### Requirement: 只练错题通道
系统 SHALL 在结算页提供「只练错题」按钮：以本局错题历史为卡池立即重开一局同模式练习。

#### Scenario: 从结算进入只练错题
- **WHEN** 玩家在一局有错题的结算页点击「只练错题」
- **THEN** 以本局错题过程为卡池生成新的一局并直接开始
