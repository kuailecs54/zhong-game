# UI/UX 全量打磨实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 对 PMBOK 49 过程归类游戏进行全量 UI/UX 打磨，统一深色玻璃拟态 + 木质书桌风格，增强动效与交互手感，提升移动端体验，不改动游戏核心逻辑。

**架构：** 以 CSS 变量与全局动画为基底，逐个视图/组件替换视觉样式与动画类；通过 Vue props/emits 传递拖拽高亮、捕获动画等纯视觉状态；使用 `prefers-reduced-motion` 统一降级。

**技术栈：** Vue 3 + TypeScript + Vite + Pinia + vue-router，纯 CSS 动画，不引入第三方库。

---

### 任务 1：全局样式 `src/style.css`

**文件：**
- 修改：`src/style.css`

- [ ] **步骤 1：补充 CSS 变量与动画缓动**
  - 增加 `--ease-out-expo`、`--ease-spring`、`--ease-soft` 等缓动变量
  - 增加 z-index 层级变量（`--z-falling`、`--z-drag-ghost`、`--z-hud`、`--z-overlay` 等）
  - 增加字体层级变量（`--font-display`、`--font-body`、`--font-small`）
  - 增加更多光晕/阴影变量

- [ ] **步骤 2：添加 `prefers-reduced-motion` 全局支持**
  - 在媒体查询中把大部分动画时长设为 0.01ms 或禁用关键帧
  - 保留必要的状态变化（opacity 过渡可缩短）

- [ ] **步骤 3：优化滚动条与页面过渡**
  - 滚动条 thumb 增加 hover/active 细节
  - 保留并增强 `.fade-slide` 过渡类

---

### 任务 2：首页 `src/views/HomeView.vue`

**文件：**
- 修改：`src/views/HomeView.vue`

- [ ] **步骤 1：标题渐变发光与卡片入场**
  - 标题使用 `text-shadow` 多层发光 + 轻微 `filter: drop-shadow`
  - 卡片入场拆分为标题、副标题、表单项错峰 stagger（0.08s 延迟）

- [ ] **步骤 2：输入框聚焦态与按钮呼吸光晕**
  - 聚焦时 glow 更明显（多层 box-shadow）
  - 主按钮 hover 时增加 subtle pulse 动画

---

### 任务 3：选关页 `src/views/LevelSelectView.vue`

**文件：**
- 修改：`src/views/LevelSelectView.vue`
- 修改：`src/components/ui/StarRating.vue`

- [ ] **步骤 1：关卡卡片阶段色条与星级**
  - 卡片左上角按 stage 1-4 显示 4px 色条
  - StarRating 改用 SVG 渐变星形，空心/实色区分

- [ ] **步骤 2：头部总星数进度条**
  - 将 "总星数：x / 12" 改为可视化进度条 + 数字
  - 进度条带填充动画

- [ ] **步骤 3：锁定卡片 tooltip**
  - 锁定卡片 hover/focus 显示解锁条件（"通关上一关获得 1 星"）
  - 使用纯 CSS tooltip（`::after` + `::before`）

---

### 任务 4：游戏 HUD `src/components/game/GameHUD.vue`

**文件：**
- 修改：`src/components/game/GameHUD.vue`

- [ ] **步骤 1：重新设计信息架构**
  - 左侧：大号分数 + 小型进度条
  - 右侧：SVG 心形生命 + 连击 + 冰冻按钮 + 暂停按钮

- [ ] **步骤 2：分数滚动与生命动画**
  - 分数变化时使用 CSS `@property --score` + counter 或 keyframes 实现数字跳动
  - 失去生命时心形碎裂/缩小动画

- [ ] **步骤 3：连击热态与冰冻呼吸光**
  - comboMultiplier ≥ 4 时增加强发光
  - 冰冻按钮可用时（freezeCount > 0 且未冰冻）增加呼吸光环

---

### 任务 5：下落卡片与捕获 `FallingCard.vue` + `GameView.vue`

**文件：**
- 修改：`src/components/game/FallingCard.vue`
- 修改：`src/views/GameView.vue`

- [ ] **步骤 1：卡片 hover 光晕与冰冻效果**
  - hover 时显示外发光提示可点击
  - 冰冻状态加冰晶/霜冻覆盖层（CSS 伪元素 + 渐变）

- [ ] **步骤 2：捕获飞入书桌动画**
  - GameView 增加 `captureAnimations` Map，捕获时临时渲染飞行卡片
  - 飞行卡片向书桌方向 translateY + opacity 淡出

- [ ] **步骤 3：书桌接收脉冲**
  - Desk 组件已有 hint pulse，增强为更明显的扩散光环

---

### 任务 6：拖拽交互 `GameView.vue` + `Desk.vue` + `SortGrid.vue` + `MatrixGrid.vue`

**文件：**
- 修改：`src/views/GameView.vue`
- 修改：`src/components/game/Desk.vue`
- 修改：`src/components/game/SortGrid.vue`
- 修改：`src/components/game/MatrixGrid.vue`

- [ ] **步骤 1：起手效果**
  - drag-ghost 放大 1.08、加深阴影
  - 原位置 desk 卡片半透明

- [ ] **步骤 2：目标高亮**
  - GameView 在 onDragMove 中 hit-test，传递 `dragHighlightTarget` 给 SortGrid/MatrixGrid
  - 可放置目标 pulse + scale 1.04

- [ ] **步骤 3：正确/错误放置反馈**
  - 正确：书架/格子下沉反弹动画
  - 错误：目标摇晃 + desk hint pulse

- [ ] **步骤 4：浮动得分文字**
  - GameView 在 correct placement 时生成 `FloatingText` 元素，向上飘出并淡出

---

### 任务 7：书架与矩阵 `SortGrid.vue` + `MatrixGrid.vue`

**文件：**
- 修改：`src/components/game/SortGrid.vue`
- 修改：`src/components/game/MatrixGrid.vue`

- [ ] **步骤 1：SortGrid 质感优化**
  - 书脊高度随数量/层数微增
  - 书架顶部加 radial-gradient 柔和灯光
  - 放置正确时书架下沉反弹

- [ ] **步骤 2：MatrixGrid 迷你书脊**
  - 格子内用迷你水平/竖直书脊堆叠替代文字徽标
  - 保持点击放置功能

---

### 任务 8：冰冻效果 `GameView.vue` + `FallingCard.vue`

**文件：**
- 修改：`src/views/GameView.vue`
- 修改：`src/components/game/FallingCard.vue`

- [ ] **步骤 1：冰晶覆盖与游戏区 vignette**
  - FallingCard 冰冻状态加冰晶纹理伪元素
  - GameView 游戏区冰冻时加 inset box-shadow 淡蓝色 vignette

- [ ] **步骤 2：冰冻计时器呼吸光**
  - 增强 freeze-timer 呼吸光效

---

### 任务 9：结算页 `src/views/ResultView.vue`

**文件：**
- 修改：`src/views/ResultView.vue`

- [ ] **步骤 1：胜利星级与庆祝光效**
  - 星级逐个弹出，延迟 0.15s，弹性动画
  - 胜利页面背景加纯 CSS 浮动光斑/粒子

- [ ] **步骤 2：统计数据与按钮层级**
  - 统计行逐项 stagger 淡入
  - 按钮层级：下一关主按钮 > 重新挑战次按钮 > 返回选关弱按钮

---

### 任务 10：移动端适配

**文件：**
- 修改：`src/components/game/GameHUD.vue`
- 修改：`src/views/GameView.vue`
- 修改：`src/components/game/SortGrid.vue`
- 修改：`src/components/game/MatrixGrid.vue`

- [ ] **步骤 1：HUD 与书架小屏重排**
  - HUD 在 <640px 时压缩间距、隐藏部分标签
  - columns 模式书架在 <768px 改为底部抽屉/紧凑侧栏
  - 触控目标 ≥ 44px

---

### 任务 11：验证

**文件：**
- 运行：`npm run build`

- [ ] **步骤 1：构建与走查**
  - 运行 `npm run build` 确认 TypeScript 与构建通过
  - 走查首页、选关、columns 游戏、matrix 游戏、结算页
