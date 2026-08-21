# 任务

## 1. P0 紧急修复

- [x] 1.1 SortGrid 去剧透：删除 ghostPreview/isPlaceable/.placeable/header-placeable/ghost-spine 相关模板与样式，所有列统一可点样式与中性 hover
- [x] 1.2 MatrixGrid 去剧透：删除 isCellPlaceable/drag-highlight/drag-dim，所有格子统一样式
- [x] 1.3 levels.json 修正 sort-4-1/sort-4-2 的 targetCount 为卡池实际大小（临时修复，Phase 3 改队列派生后移除字段）
- [x] 1.4 GameView 接通 @pause → gameStore.setGamePhase('paused')，新增暂停遮罩层组件（继续/重新开始/退出关卡）
- [x] 1.5 验证：npm run build 通过；浏览器确认无高亮剧透、暂停可用、矩阵关可正常结算

## 2. 统一引擎（types + store）

- [x] 2.1 types.ts 重构：LevelConfig 删除 initialFallSpeed/initialSpawnInterval/minSpawnInterval/speedIncreaseRate/speedIncreaseEvery/distractorCount/trayCapacity/targetCount/speedCurve/distractorGrowth/livesByTarget 及 StarThresholds.threeStarMinLives；新增 timePerCard?/lives?/hintCount?/freezeCount?/shieldCount? 与 mode: 'sort'|'itto'|'definition'；Process 新增 definition?/role?/mnemonic?
- [x] 2.2 game store 重写：新增 queue/reviewQueue/currentCardId/combo/maxCombo/timeLeft/livesLeft/items{hint,freeze,shield}/missedCount/difficultyMode 状态；实现 drawNext（复习卡间隔≥3优先）/answer/tick/timeout/useHint/useFreeze/useShield 动作；过关判定改队列清空；计分 score += 10 × min(5, 1+floor(combo/3))
- [x] 2.3 错题重现链路：答错/超时 → reviewQueue + wrongHistory；复习卡答对才移除；护盾激活时免罚不断连击但仍入队
- [x] 2.4 双模式逻辑：challenge（倒计时+生命）/ relaxed（均无，三星条件改零错误）；开始界面模式选择并持久化上次选择到 user store settings
- [x] 2.5 同步更新 game.sort.test.ts / loader.test.ts 受影响用例并保持通过

## 3. 单卡 UI 与反馈层

- [x] 3.1 新建 CardStage.vue：居中大卡（书本外观）+ 倒计时环/条；GameView 用其替换 card-tray 平铺区
- [x] 3.2 GameHUD 扩展：生命❤️显示、连击×N（复用现有 combo CSS）、三道具按钮组（数量角标+耗尽禁用态）、计时条；itto 模式 HUD 语义修正
- [x] 3.3 反馈浮层：答对=口诀闪现 + 卡片飞向书架/格子动画；答错=纠错浮层（正确归属+口诀+定义摘要）停留 3 秒
- [x] 3.4 暂停遮罩接入引擎暂停态（倒计时停止）
- [x] 3.5 levels.json 全量迁移新字段（每关配置 timePerCard/lives/hintCount/freezeCount/shieldCount），删除全部死字段
- [x] 3.6 验证：npm run build + 全流程试玩（挑战/轻松、错题重现、三种道具、超时漏接、生命耗尽失败结算、结算数据含 maxCombo/missedCount）

## 4. 数据工程（49×3 学习字段）

- [x] 4.1 编写提取脚本：从 book md 按「X是……的过程」「本过程的主要作用是……」句式粗提 49 条候选句输出到临时清单
- [x] 4.2 出 5 条样例（definition/role/mnemonic）交用户审阅定口径 ← 用户检查点
- [x] 4.3 批量完成 49 条人工校对写入 processes.json（名称类严格课本全名，mnemonic ≤20 字）
- [x] 4.4 loader 新增 assertLearningFields 断言（缺字段报错并指出过程 ID 与字段名）
- [x] 4.5 验证：npm run build 通过；抽查 10 条对照课本原文

## 5. 书架呈现层重构

- [x] 5.1 SortGrid：删除 ×N 合并死逻辑（含 shelfLayout 对应入口）；列头升级为一级点击目标（字号/热区提升）
- [x] 5.2 书脊可读性：hover/tap tooltip 显示完整过程名；SortGrid 与 MatrixGrid 视觉语言统一
- [x] 5.3 MatrixGrid：列头 grid-template-columns 去硬编码 repeat(5,1fr) 改动态生成
- [x] 5.4 掌握度书脊样式：金脊(box=2)/木脊(box=1)/虚线(box=0)，仅作用于已上架书
- [x] 5.5 飞书动画打磨：答对卡片从 CardStage 飞向目标位置落位（reduced-motion 时降级淡入）
- [x] 5.6 验证：build + 2列/5列/10列/矩阵四种布局目测检查 + 移动端横屏回归

## 6. L2 定义挑战 + L3 ITTO 补齐

- [x] 6.1 新建 DefinitionQuiz.vue 作答器：题型 A（定义→过程名）/题型 B（过程名→主要作用）4 选 1；干扰项优先同领域/同组抽取且互不重复
- [x] 6.2 GameView 三插槽接线：mode='definition' 渲染 DefinitionQuiz，判定走统一引擎 answer 流程；纠错浮层附矩阵归属信息
- [x] 6.3 levels.json 新增 Stage 5 定义挑战关卡（按知识领域分 2 关 + 混合 1 关）
- [x] 6.4 levels.json 新增 Stage 6 ITTO 关卡，覆盖剩余 35 个过程（按知识领域分组）
- [x] 6.5 ITTOQuiz 套入统一引擎外壳（倒计时/连击/道具/错题重现/结算复用）
- [x] 6.6 LevelSelectView：TOTAL_STARS 改为按关卡星级动态求和；新增「定义」模式标签与阶段名
- [x] 6.7 验证：build + L2/L3 各完整通关一局 + 解锁链贯通验证

## 7. 掌握度档案 + 学习仪表盘

- [x] 7.1 user store 扩展 mastery[processId][dimension]={box,lastSeen}；Leitner 升降档动作；加载时惰性 7 天衰减；旧数据兼容初始化
- [x] 7.2 引擎每次判定后调用 user store 写入对应维度（L1→position / L2→definition / L3→itto）
- [x] 7.3 LevelSelectView 新增 5×10 热力图组件：四色渲染 + position/definition/itto 三视角切换
- [x] 7.4 薄弱特训入口：以 box<2 过程为池动态生成 L1 关卡，绕过解锁链，作答照常计入掌握度
- [x] 7.5 结算页增强：错题本展示正确归属+口诀；「只练错题」按钮（错题池重开一局）
- [x] 7.6 验证：build + 刷新页面掌握度保留 + 旧版 localStorage 数据兼容加载

## 8. 打磨清理

- [x] 8.1 删除 useGameLoop.ts 空壳及全部引用；清理 types.ts 死类型（FallingCard/ShelvedBook 按实际引用决定去留）
- [x] 8.2 键盘快捷键：数字键选列、Enter 提交（L2/L3）、Esc 暂停；焦点样式补全
- [x] 8.3 Web Audio 合成音效（答对/答错/连击升调）+ settings 音效开关
- [x] 8.4 移动端横屏适配回归（旋转门/并排布局/紧凑化规格逐条核对）
- [x] 8.5 最终验证：npm run build 通过 + 全功能回归试玩（三层模式 × 双模式 × 特训通道）
