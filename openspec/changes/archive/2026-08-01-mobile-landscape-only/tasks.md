# Mobile Landscape Only 实现任务

## 1. 旋转门（全局）

- [x] 1.1 新建 `src/composables/useRotateGate.ts`：导出 `showGate: ComputedRef<boolean>`，判定条件为 `matchMedia('(pointer: coarse)')` 命中 && `innerHeight > innerWidth` && `innerWidth < 768`；监听 `resize` + `orientationchange` 更新，`onUnmounted` 移除监听
- [x] 1.2 新建 `src/components/RotateGate.vue`：全屏 fixed 遮罩（z-index 9999），纯 CSS 旋转手机图标 + 文案「请旋转设备至横屏」/「本游戏专为横屏设计」
- [x] 1.3 修改 `src/App.vue`：挂载 `RotateGate v-if="showGate"`；`watch(showGate)` 在门开且 `isPlaying && !isPaused` 时调用 `gameStore.setGamePhase('paused')`
- [x] 1.4 验证：`npm run build` 通过；Playwright 模拟 390×844（触摸）遮罩显示、844×390 遮罩隐藏、桌面 1280×800 永不显示

## 2. 布局断点修复与触摸横屏紧凑化（GameView）

- [x] 2.1 修改 `src/views/GameView.vue:1028`：压缩断点从 `@media (max-width: 768px)` 改为 `@media (max-width: 768px) and (pointer: coarse) and (orientation: portrait)`（内容不变，作竖屏兜底）
- [x] 2.2 在 `GameView.vue` 新增 `@media (max-width: 820px) and (pointer: coarse) and (orientation: landscape)`：`.book-shelf-panel { max-width: 45vw !important; min-width: 130px; }`、`.sort-grid-container { max-height: 58vh; overflow-y: auto; }`
- [x] 2.3 验证：`npm run build` 通过；Playwright 模拟 667×375 与 844×390 横屏确认并排布局、书架约 45vw、下落区宽度充足；矩阵关网格 58vh 内可滚动

## 3. HUD / 书桌横屏紧凑

- [x] 3.1 修改 `src/components/game/GameHUD.vue`：新增 `@media (pointer: coarse) and (orientation: landscape)`，缩小 `.hud-bar` padding（对齐现有类名）
- [x] 3.2 修改 `src/components/game/Desk.vue`：同媒体查询，压缩托盘 `min-height`/padding（对齐现有类名）
- [x] 3.3 验证：`npm run build` 通过；模拟 844×390 下 HUD+书桌合计 ≤ 约 100px、主游戏区高度 ≥ 约 250px

## 4. 书架 / 矩阵格子紧凑

- [x] 4.1 修改 `src/components/game/SortGrid.vue`：新增 `@media (pointer: coarse) and (orientation: landscape)`，缩小 `.shelf-unit` padding 与书名字号
- [x] 4.2 修改 `src/components/game/MatrixGrid.vue`：同媒体查询，缩小格子 padding/字号
- [x] 4.3 验证：`npm run build` 通过；模拟 844×390 横屏矩阵关（5 列 × 5 行）格子不重叠、可正常拖放判分

## 5. 下落速度按高度缩放

- [x] 5.1 修改 `src/stores/game.ts`：模块级常量 `const SPEED_BASELINE_HEIGHT = 700`；`updateGame` 移动循环内 `const heightScale = Math.min(1, gameAreaHeight / SPEED_BASELINE_HEIGHT)`，`card.y += card.speed * heightScale * deltaTime`
- [x] 5.2 验证：`npm run build` 通过；桌面高度 ≥ 700px 时速度不变；模拟 844×390 游玩实际关卡确认穿越时间约 15~25s（与桌面同量级）

## 6. viewport 与全量回归

- [x] 6.1 修改 `index.html`：viewport 增加 `viewport-fit=cover`
- [x] 6.2 全量回归：`npm run build` 通过；Playwright 设备模拟矩阵验证——竖屏遮罩+暂停、横屏完整游玩一关（捕获→拖拽→判分）、游玩中旋转竖屏无生命丢失、转回横屏手动继续、矩阵关横屏可玩、桌面行为不变
