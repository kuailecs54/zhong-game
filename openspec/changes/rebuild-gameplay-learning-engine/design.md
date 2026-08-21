# 设计：统一刷题引擎

## Context

当前实现为「多卡平铺点选即放」：card-tray 平铺全部过程按钮，点选后点击书架列/矩阵格判定。存在三类问题：

1. **剧透**：`SortGrid.isPlaceable/ghostPreview/.placeable` 与 `MatrixGrid.isCellPlaceable/drag-highlight/drag-dim` 按正确性区分目标样式，提取练习退化为视觉辨认。
2. **缺陷**：sort-4-1/sort-4-2 `targetCount: 0` 使 `isLevelComplete` 恒真且 watch 值不变永不触发；GameHUD emit 的 `pause` 无监听。
3. **遗留**：levels.json 每关 9 个下落玩法字段无逻辑引用；useGameLoop 为空壳 TODO。

学习目标为三层：L1 矩阵定位（5 过程组 × 10 知识领域 → 49 过程）、L2 过程定义与主要作用（数据缺失）、L3 ITTO（itto.json 已全 49 条，关卡仅覆盖 14 过程）。目标用户为已学过教材的巩固型备考者。

技术栈约束：Vue 3 + TS + Pinia，纯前端，进度存 localStorage（key `pm-sort-game-user`），数据经 fetch 加载 JSON，`validateProcessMatrix` 校验 49 过程矩阵。

## Goals / Non-Goals

**Goals:**

- 三种题型共用一个游戏引擎（出题→作答→判定→反馈→重现→结算），差异收敛为三个插槽
- 彻底消除答案剧透，恢复提取练习的学习价值
- 错题重现 + Leitner 掌握度档案形成记忆巩固闭环
- 数据层补齐 49×(definition/role/mnemonic)，ITTO 关卡覆盖 49 全部过程
- 书架从「放置游乐场」转型为「作答靶区 + 收集/掌握度可视化」

**Non-Goals:**

- 不做后端/账号体系（保持 localStorage）
- 不实现完整 SM-2/FSRS 算法（Leitner 三档 + 粗粒度衰减足够备考场景）
- 不改动 ITTO 多选题机制本身（仅换引擎外壳）
- 不新增第 4 种题型插槽（留扩展点不实现）
- 不改路由结构与用户名流程

## Decisions

### D1: 统一引擎 + 三插槽，而非三种模式各自实现

```
┌──────────────────────────────────────────────────────────┐
│ 游戏引擎（game store 重写）                                 │
│ queue/reviewQueue → drawNext → tick倒计时 → 作答 → 判定    │
│ → 反馈浮层 → (错→reviewQueue) / (对→placed) → 队列清空通关   │
│ 连击·道具·生命·双模式·Leitner写入                            │
└───────────────┬──────────────┬──────────────┬─────────────┘
          题面渲染器       作答器           判定器
          L1 CardStage+书架  点列/格         classify(col,row)
          L2 题面卡        DefinitionQuiz   choice===answer
          L3 题面卡        ITTOQuiz(现有)    selections 匹配
```

理由：倒计时/连击/道具/错题重现/掌握度写入逻辑完全同构，写一次三层受益；后续加题型只插插槽。备选「三模式独立组件」被否——成本 ×3 且行为漂移。

### D2: 过关判定 = 队列清空，删除手配 targetCount

`isLevelComplete := queue.length === 0 && reviewQueue.length === 0 && !currentCardId`。完成数由 `getProcessesForLevel` 池子派生。根治 sort-4-x 死锁这类配置错误（0 或错数都不再可能）。备选「修正 levels.json 数字」被否——同类 bug 仍会复发。

### D3: 整关统一每卡倒计时（非按卡片状态限时）

巩固型用户绝大多数卡是见过的，统一时限已够；按「新卡宽限/熟卡收紧」需额外状态机，收益低。轻松模式整体关闭倒计时承担焦虑分流。复习重现卡沿用同一时限（其答错会再次入队，天然重复练习）。

### D4: Leitner 三档盒 + 7 天惰性衰减，而非连对计数或 SM-2

- `mastery[processId][dimension] = { box: 0|1|2, lastSeen: ts }`，dimension ∈ position/definition/itto
- 答对 `box=min(2,box+1)`；答错/超时 `box=0`；加载时惰性扫描，`now-lastSeen>7d` 则 `box=max(0,box-1)`
- 三档语义直接支撑薄弱特训抽卡（box<2）与热力图四色渲染
- 备选「连对 2 次=掌握布尔」无法区分刚会/很熟；SM-2 参数复杂且备考周期短收益低

### D5: 计分公式 score += 10 × min(5, 1+floor(combo/3))

保留连击激励但简化数值（旧公式 100×倍率、错扣 50 已随下落玩法失义）。星级：★通关 / ★★准确率≥twoStarAccuracy / ★★★准确率≥threeStarAccuracy 且零漏接（挑战）或零错误（轻松）。`threeStarMinLives` 字段删除。

### D6: 无剧透的实现边界

删除所有按正确性区分的样式分支；hover 为统一中性高亮。提示道具是唯一合法的「高亮正确位置」途径（消耗性、每关限量）。掌握度书脊样式仅作用于已上架的书（未答题不在架上），不构成泄露。

### D7: 书架重构保骨架换皮

保留：点击列/格 → `emit place` → `classify` 判定链路；`buildShelfLayers` 分层算法（有单测）。删除：`ghostPreview/isPlaceable/.placeable/ghost-spine`、`isCellPlaceable/drag-highlight/drag-dim`、×N 合并逻辑（新队列每过程唯一，永不触发）。重设计：列头字号提升为一级目标；书脊 hover tooltip 补全名；SortGrid 与 MatrixGrid 统一视觉语言；MatrixGrid 列头 `repeat(5,1fr)` 改动态生成。飞书动画用 CSS transition + FLIP 或绝对定位过渡实现。

### D8: 计时驱动用 setInterval 而非复活 useGameLoop rAF

倒计时只需 100ms 粒度，`setInterval` + `onUnmounted` 清理即可；rAF 空壳 `useGameLoop.ts` 直接删除。暂停/冰冻 = 停止 tick 累积。

### D9: 数据工程采用「脚本粗提 + 人工校对 + loader 断言」

课本 md 中句式规整（`rg 'X是.*的过程'`），脚本粗提候选句，人工逐条校对压缩为 ≤2 句 definition、1 句 role、≤20 字 mnemonic。先交 5 条样例定口径再批量。loader 增加 `assertLearningFields` 断言，缺字段构建期报错。mnemonic 为自编记忆线索，不照抄课本原文（AGENTS.md 数据校准约束：名称类必须课本全名，口诀属辅助记忆允许提炼）。

### D10: localStorage 向后兼容

`pm-sort-game-user` 结构扩展：`{ username, progress, mastery?, settings? }`。旧数据无 mastery/settings 时以空对象初始化；settings 存双模式上次选择与音效开关。

## Risks / Trade-offs

- [49×3 字段人工校对量大、易夹带私货] → 先出 5 条样例给用户审阅定口径；definition/role 必须能在课本中找到依据句；loader 断言兜底完整性
- [类型变更波及 game.sort.test.ts / loader.test.ts / itto.test.ts] → Phase 1 同步更新测试；shelfLayout 单测不动
- [单卡模式节奏偏慢，老玩家觉得不如平铺爽] → 倒计时+连击提供速度激励；薄弱特训/只练错题提供短平快入口
- [热力图与书架两套可视化维护成本] → 共用同一 mastery store getter，仅渲染层不同
- [Stage 5/6 加入后解锁链变长，老玩家重复刷 Stage 1-4 才能到新内容] → 解锁判定按「上一关≥1★」，熟练玩家可快速通关前置关；薄弱特训不受解锁限制可作为新内容的旁路入口（若仍过严，后续可加「跳级测试」，本期不做）

## Migration Plan

1. Phase 0 小修独立提交，主干随时可用
2. Phase 1 引擎重写与 levels.json 字段迁移同一提交序列完成（types 与数据强耦合，避免中间态不可构建）；每步跑 `npm run build`
3. Phase 2a 数据、2b 书架、2c 新模式相互独立，可并行推进
4. 回滚策略：各 Phase 独立 commit，出问题 revert 对应区间；localStorage 新增字段均为可选，回滚后旧代码忽略之

## Open Questions

- 音效具体音色方案（Web Audio 合成参数）在 Phase 4 实现时试验确定
- 飞书动画在低端移动设备上的帧率表现，Phase 2b 实测后决定是否降级为淡入
