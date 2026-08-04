# 修复移动端横屏下开始界面"开始游戏"按钮不可见 实施计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 修复手机端强制横屏下，第二关（及所有卡片内容超高的关卡）开始界面"开始游戏"按钮被裁切不可见的问题。

**架构：** `.start-screen` 保持 `height: 100vh` 不变（避免与父级 `.game-view` 的 `overflow: hidden` 冲突），仅将 `overflow: hidden` 改为 `overflow-y: auto` 启用内部滚动；`.start-card` 以 `margin: auto` 替代 flex 容器居中，保证内容超高时顶部可滚动、不裁切。

**技术栈：** Vue 3 + TypeScript + Vite，纯 CSS 修改，无逻辑改动、无新增依赖。

---

### Task 1：修改开始界面滚动与居中

**文件：**
- 修改：`src/views/GameView.vue`（`.start-screen` 的 `overflow` 属性，位于 ~745 行）
- 修改：`src/views/GameView.vue`（`.start-card` 增加 `margin: auto`，位于 ~779 行）

**背景（根因）：** 手机端强制横屏后视口高度短（如 844×390，高 390px）。开始卡片内容高度 465~571px（第 2 关 `distractorCount: 1` 含干扰项警告框更高），超出视口。`.start-screen` 固定 `height: 100vh` + `overflow: hidden` 导致按钮被裁且不可滚动。第一关（465px）按钮部分可见、第二关（571px）完全不可见，与截图一致。

- [ ] **步骤 1：`.start-screen` 允许纵向滚动**

将 `src/views/GameView.vue` 中 `.start-screen` 规则里的：

```css
  height: 100vh;
  padding: 1rem;
  background: var(--bg-gradient);
  position: relative;
  overflow: hidden;
```

改为：

```css
  height: 100vh;
  padding: 1rem;
  background: var(--bg-gradient);
  position: relative;
  overflow-y: auto;
```

- [ ] **步骤 2：`.start-card` 以 margin auto 居中**

在 `src/views/GameView.vue` 的 `.start-card` 规则中，将现有：

```css
.start-card {
  position: relative;
  z-index: 1;
```

改为：

```css
.start-card {
  position: relative;
  z-index: 1;
  margin: auto;
```

> 说明：`.start-screen` 为 `display: flex; align-items: center; justify-content: center`。内容不超高时 `margin: auto` 与居中效果一致；内容超高时自动边距归零，容器内可滚动到顶部，避免 flex 居中导致的顶部裁切不可达。

- [ ] **步骤 3：运行构建验证**

Run: `npm run build`

Expected: 通过（无 TypeScript / Vite 报错）。

---

### Task 2：移动端横屏回归验证

**文件：**
- 运行：`npm run build`
- 运行：Playwright（开发服务器 `npm run dev`，端口 5173）

- [ ] **步骤 1：复现路径确认修复生效**

Run: 浏览器仿真 844×390（横屏），依次访问：
1. `http://localhost:5173/game/sort-1-1`（第一关，无干扰项）
2. `http://localhost:5173/game/sort-1-2`（第二关，有干扰项警告框）

Expected: 两个关卡的 `.start-btn` 均存在；初始位于视口下方（`scrollHeight > clientHeight`），`scrollIntoView({ block: 'center' })` 后按钮 `top >= 0 && bottom <= window.innerHeight`，可点击进入游戏。

- [ ] **步骤 2：桌面端回归**

Run: 浏览器视口 1440×900 访问 `http://localhost:5173/game/sort-1-2`。

Expected: 内容不超高，无滚动条出现，按钮原样可见（桌面 `margin: auto` 居中效果与改造前一致）。
