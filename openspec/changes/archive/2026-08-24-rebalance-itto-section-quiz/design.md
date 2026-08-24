## Context

当前 `ITTOQuiz.vue` 在组件挂载时直接根据完整 ITTO 生成三个分区的候选项。每个分区以固定目标数 4 调用 `sampleExcept`，因此当真实正确项达到或超过 4 个时不会产生干扰项；提交时则要求三个分区与完整答案逐项相等。现有统一引擎仅以 `processId` 标识队列项，答错后组件随当前卡 `key` 重新挂载，会再次执行随机逻辑，无法保证复习时原题重现。

本变更需要跨越关卡配置、纯出题逻辑、页面会话状态和 ITTO 作答组件，但不需要改变通用引擎的队列身份。关键约束如下：

- 每个过程仍是一张引擎卡，HUD 进度、计分、掌握度和复习间隔都继续按过程计数。
- 同一过程卡展示两个 ITTO 分区，每区只抽查部分真实项。
- 复习题在同一轮内必须稳定，重新开始或重新进入关卡时才重新生成。
- `public/data/itto.json` 的教材内容和标签保持不变。
- Stage 6 仍覆盖既有 35 个补全过程，不扩大单局过程卡数量。

当前数据中 `core` 标签覆盖不均：49 个过程中，输入有 33 个过程没有核心项，工具与技术有 23 个过程没有核心项，输出分区全部至少有一个核心项。因此 `core` 只能作为抽样优先级，不能作为正确项的唯一来源。

## Goals / Non-Goals

**Goals:**

- 将 ITTO 训练从“20 秒完整背诵全部三分区”调整为“同屏两个分区的渐进辨析”。
- 保证每区始终尽量包含 3 个有效干扰项，并优先选择语义邻近的教材条目。
- 明确每区应选数量，使玩家知道本题是在抽查而不是要求完整列举。
- 使题目生成逻辑可独立单元测试，并保证同轮复习题稳定。
- 保持统一引擎、结果统计、掌握度和关卡覆盖语义不变。

**Non-Goals:**

- 不修改 `public/data/itto.json` 的内容、标签或教材口径。
- 不新增按 ITTO 子项持久化的掌握度；掌握度仍按过程的 `itto` 维度记录。
- 不把两个分区拆成两个引擎队列项。
- 不调整 Stage 6 的过程卡池拆分。
- 不修订提示道具在 ITTO 模式中的功能。

## Decisions

### 1. 关卡配置使用专用 `ittoQuiz` 配置块

在 `LevelConfig` 中增加可选配置：

```ts
interface ITTOQuizConfig {
  sectionsPerQuestion: number
  correctPerSection: number
  distractorsPerSection: number
}
```

只有 `mode: 'itto'` 的关卡配置该字段。本变更的数据口径固定为：

| 关卡 | `sectionsPerQuestion` | `correctPerSection` | `distractorsPerSection` | `timePerCard` |
|---|---:|---:|---:|---:|
| `itto-1-1` | 2 | 1 | 3 | 25 |
| `itto-2-1` | 2 | 1 | 3 | 25 |
| `itto-3-1` | 2 | 2 | 3 | 30 |
| `itto-6-1` | 2 | 3 | 3 | 35 |
| `itto-6-2` | 2 | 3 | 3 | 35 |

选择配置驱动而不是按关卡 ID 写条件，是为了让难度规则留在 `levels.json`，与现有时间、生命和道具配置保持同一归属。字段只表达当前需求，不增加额外的权重、随机种子或题型枚举。

### 2. 使用纯函数生成不可变题目方案

新增独立的 ITTO 出题模块，输入为当前过程、当前过程完整 ITTO、全部过程及其 ITTO、关卡 `ittoQuiz` 配置，输出不可变题目方案：

```ts
type ITTOCategory = 'inputs' | 'tools' | 'outputs'

interface ITTOSectionPlan {
  category: ITTOCategory
  correct: string[]
  options: string[]
}

interface ITTOQuestionPlan {
  processId: string
  sections: ITTOSectionPlan[]
}
```

生成流程：

```text
三个分区
   │ 随机取两个不同分区
   ▼
当前过程真实项
   │ core 优先，其他项补足
   ▼
本题正确项
   │ 排除当前过程该分区全部真实项
   ▼
同知识领域 → 同过程组 → 全局同分区
   │ 去重并补足
   ▼
正确项 + 3 干扰项 → 洗牌 → 分区方案
```

出题函数不依赖 Vue、Pinia 或浏览器 API，便于使用 Vitest覆盖抽样上限、核心项优先、干扰项分层、去重和排除规则。

未选择“继续在 `ITTOQuiz.vue` 的 computed 内随机生成”，因为组件重挂载会改变复习题，且生成逻辑难以隔离测试。未选择复用现有 `src/stores/itto.ts`，因为当前游戏流程已由 `gameStore` 驱动，该 store 属于旧的独立测验状态，重新接入会形成两个进度与计分真相源。

### 3. 页面会话层按过程缓存题目方案

`GameView.vue` 在 ITTO 数据和本关过程池加载完成后，为本轮过程池一次性生成 `Record<processId, ITTOQuestionPlan>`。`currentIttoQuestion` 根据 `gameStore.currentCardId` 读取缓存方案并传给 `ITTOQuiz`。

该边界形成以下数据流：

```text
levels.json ── ittoQuiz ─┐
processes + itto.json ───┼─▶ GameView 生成本轮 plans
                         │          │
gameStore.currentCardId ─┘          ▼
                              ITTOQuiz 展示/判定
                                      │
                                      ▼
                         gameStore.submitQuizResult
```

答错后的复习队列仍只保存 `processId`。由于页面缓存以相同 `processId` 返回相同方案，复习卡自然重现原题，无需改变通用 `ReviewItem`。重新进入页面会销毁缓存；暂停菜单“重新开始”在重置引擎前重新生成缓存，满足新一轮允许换题的要求。

未选择把题目方案写入 `gameStore`，因为随机题面只服务 ITTO UI，会扩大通用引擎状态并迫使定位、定义模式理解无关类型。若未来需要中途持久化恢复关卡，再考虑把方案提升为可序列化的引擎题目身份。

### 4. ITTOQuiz 只判定展示的两个分区

`ITTOQuiz.vue` 不再接收扁平的 `globalPool` 并自行随机，而是接收完整 ITTO 与已生成的题目方案。组件为两个分区维护选择集合，每个分区显示“请选择 N 项”。提交时比较该分区选择集合与方案中的 `correct` 集合；两个分区均正确才向引擎上报成功。

提交后的选项状态仅覆盖方案候选项：

- 选中且属于本题正确项：正确选中。
- 选中且属于干扰项：错选。
- 未选且属于本题正确项：遗漏答案。
- 未选干扰项：弱化。

右侧知识卡继续展示当前过程完整的三个 ITTO 分区。这样题目区表达“本次抽查”，知识卡表达“完整复习”，不会把未抽中的真实项误标为错误。

### 5. 通用引擎与掌握度语义保持按过程计数

`gameStore.queue`、`reviewQueue`、`currentCardId` 和 `totalCount` 不改变结构。ITTO 两个分区提交一次，正确时 `correctCount` 增加 1，错误时扣一次生命并将该过程加入一次复习队列。

`userStore.recordAnswer(processId, 'itto', correct)` 仍每次过程卡判定记录一次，不新增分区级持久化字段。因此 localStorage 格式无需迁移。需要补充测试证明 ITTO 题的两个分区不会让 HUD 总数或完成判定翻倍。

### 6. 数据文件与矩阵校验影响

本变更只修改 `public/data/levels.json` 中五个 ITTO 关卡的 `ittoQuiz` 和 `timePerCard`，不修改 `processes.json` 或 `itto.json`。`validateProcessMatrix` 的 49 过程数量及过程组 × 知识领域分布不受影响。

由于项目规则要求修改 `levels.json` 后执行静态校验，完成后跑 `npm run build` 验证；同时运行 `npm test` 验证纯出题逻辑和引擎计数行为。

## Risks / Trade-offs

- [随机选择两个分区不能保证单次或两次游玩覆盖全部 I/T/O] → 接受重复游玩中的概率覆盖；本变更不引入跨局轮换持久化，避免扩大用户数据模型。
- [后期每屏最多 12 个候选项，移动端仍可能较长] → 保持两个分区纵向排列并允许 ITTO 区域滚动，实施时用桌面与移动视口检查文字换行和提交按钮可达性。
- [同知识领域候选项可能包含大量跨过程通用名称，干扰性强但重复率高] → 按名称去重，并在同领域不足时逐层补足，不重复填充同名项。
- [少数全局数据池可能不足 3 个有效干扰项] → 使用全部可用唯一候选项，不伪造教材条目；测试覆盖池不足的降级行为。
- [核心标签覆盖不均导致不同过程抽样特征不同] → 核心项仅优先，不作为硬性前提；无核心项时从真实项均匀抽取。
- [完整知识卡与抽查题同时出现可能让用户误以为必须选全] → 未提交时明确显示每区应选数，提交后知识卡标题和题目批改保持视觉分区。

## Migration Plan

1. 增加 `ITTOQuizConfig` 与题目方案类型、纯出题函数及单元测试。
2. 更新五个 ITTO 关卡配置和时间参数。
3. 在 `GameView` 建立本轮题目方案缓存，并改为向 `ITTOQuiz` 传递方案。
4. 调整 `ITTOQuiz` 的双分区展示、选择数量提示、判定与复盘 UI。
5. 补充引擎计数回归测试，运行 `npm test` 与 `npm run build`，再用浏览器验证桌面和移动布局。

该变更不修改持久化数据结构，无用户数据迁移。回滚时恢复旧组件入参和五个关卡配置即可；既有 localStorage 进度仍可使用。

## Open Questions

当前设计决策已覆盖本变更范围，无阻塞性开放问题。未来可独立探索跨局 I/T/O 轮换、分区级掌握度及基于错题历史的自适应干扰项，但不纳入本变更。
