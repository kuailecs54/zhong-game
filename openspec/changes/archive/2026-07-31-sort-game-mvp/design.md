## Context

从零构建一个纯前端 Web 游戏，帮助考生记忆系统集成项目管理工程师（中级）第三版教材中的 49 个项目管理过程及其在 5×10 矩阵中的位置。当前项目为空仓库，仅有教材 Markdown 文件位于 `book/` 目录。MVP 聚焦归类下落玩法，射击模式和 ITTO 匹配作为后续扩展。

## Goals / Non-Goals

**Goals:**
- 实现一个可玩的归类下落游戏 MVP，包含 12 个关卡
- 用户名输入 + 本地进度保存
- 从教材提取 49 个过程及其 ITTO 数据，结构化为 JSON
- 适配桌面端和移动端浏览器
- 流畅的 60fps 动画体验

**Non-Goals:**
- 后端服务（全部数据本地存储）
- 射击模式（后续版本）
- 用户账号系统 / 排行榜 / 多设备同步
- ITTO 匹配玩法（数据预留，玩法后做）
- 音效和背景音乐（后续加）
- 国际化（仅中文）

## Decisions

### 1. 技术栈：Vue 3 + Vite + TypeScript

**选择理由：**
- 归类玩法以 UI 为主，DOM + CSS 动画完全够用，不需要 Canvas
- Vue 3 组合式 API 适合游戏状态管理
- Vite 开发体验好，构建快
- TypeScript 保证数据层类型安全，49 个过程的数据结构复杂，类型很有价值

**替代方案：**
- 纯原生 JS：轻量但组件化差，后期维护成本高
- React：同样可行，但 Vue 模板语法更直观适合这种 UI 为主的游戏
- Canvas 引擎（如 Pixi.js）：射击模式可能需要，但归类玩法用 DOM 更简单

### 2. 游戏数据存储：public/data/ JSON 文件

**选择理由：**
- 静态 JSON 文件，浏览器直接加载，无需构建时打包
- 数据与代码分离，方便后期扩充 ITTO 内容
- 后续可以做按需加载（简单关卡不加载 ITTO）

**数据文件结构：**
```
public/data/
  process-groups.json     // 5个过程组
  knowledge-areas.json    // 10个知识领域
  processes.json          // 49个过程元数据
  itto.json               // ITTO 数据（较大，延迟加载）
  levels.json             // 关卡配置
```

### 3. 状态管理：Pinia

**选择理由：**
- 游戏状态（当前关卡、分数、连击、生命值、捕获卡片等）跨组件共享
- Pinia 是 Vue 3 官方推荐，轻量好用
- 相比 Vuex 更简洁，TS 支持更好

### 4. 动画实现：CSS Transitions + requestAnimationFrame

**选择理由：**
- 卡片下落用 CSS transform + transition（性能好，GPU 加速）
- 复杂的下落位置计算用 requestAnimationFrame 驱动
- 正确/错误反馈用 CSS 动画类切换

### 5. 进度存储：localStorage

**选择理由：**
- 无后端，最简单的持久化方案
- 存储内容：用户名、各关卡星数、最高分
- 数据量小（几十个关卡 × 几颗星），完全够用

**存储结构：**
```json
{
  "username": "玩家名",
  "progress": {
    "sort-1-1": { "stars": 3, "bestScore": 2500 },
    "sort-1-2": { "stars": 2, "bestScore": 1800 }
  }
}
```

### 6. 页面路由：Vue Router

**选择理由：**
- 页面结构清晰：首页（用户名）→ 关卡选择 → 游戏 → 结算
- 每个页面是独立组件，便于维护
- 浏览器前进后退可用

### 7. 组件架构

```
src/
  assets/          静态资源
  components/
    game/          游戏相关组件（Card, Grid, CaptureTray, HUD, PowerUps）
    ui/            通用 UI（Button, StarRating, Modal）
  composables/     可复用逻辑（useGameLoop, useLevel, useScore）
  stores/          Pinia stores（user, game, level）
  data/            数据加载和类型定义
  views/           页面级组件（HomeView, LevelSelectView, GameView, ResultView）
  router/          路由配置
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| DOM 元素过多（矩阵关 50 格 + 多张下落卡片）导致卡顿 | CSS transform/opacity 动画走 GPU；控制同屏卡片上限；必要时降级为 Canvas |
| 移动端屏幕太小，10 列布局放不下 | 矩阵模式支持双指缩放/横向滚动；紧凑字号；横竖屏自适应 |
| 数据提取可能有错（49 个过程的矩阵定位） | 人工校对前几个过程，其余按教材目录推断；单元测试验证矩阵完整性（49个，每个格子数量正确） |
| 游戏难度曲线不合理 | MVP 先按估计值做，后续根据实际体验调整参数 |
| 本地存储丢失进度 | 提示用户这是本地存档；后续可加导出/导入功能 |

## Open Questions

- UI 视觉风格走什么路线（科技感 / 卡通 / 简约）？MVP 先做功能可用的简约风格，后续再打磨
- 是否需要横竖屏适配？先做竖屏优化（移动端优先），横屏自动适配
- 点击捕获 + 点击放置的操作在移动端是否顺手？需要实机验证，不行再改
