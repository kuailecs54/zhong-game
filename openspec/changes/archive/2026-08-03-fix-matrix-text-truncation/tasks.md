## 1. 矩阵表格行头/列头完整显示

- [x] 1.1 加宽 `.matrix-grid` 首列：桌面 60px→96px、≤600px 44px→72px、≤400px 36px→64px
- [x] 1.2 移除 `.row-header-text` 的 `text-overflow: ellipsis`，保证知识领域全名（最长 7 字）完整显示
- [x] 1.3 验证 5 个列头（过程组名称）在任何宽度下完整可见，不被滚动容器边缘裁切

## 2. 格内书脊竖排文字完整显示

- [x] 2.1 行头与格子 `min-height` 加高：桌面 36/40px→90px、≤600px 28/34px→80px、≤400px 24/30px→72px
- [x] 2.2 书脊高度 88%→96%、`overflow: visible`，移除 `.cell-spine__text` 的 `overflow: hidden; max-height: 100%` 截断
- [x] 2.3 验证最长过程名（9 字"指导与管理项目工作"）在格子中竖排完整显示

## 3. 掉落卡片封面书名自然换行

- [x] 3.1 `FallingCard.vue` 封面标题 `word-break: break-all` → `overflow-wrap: break-word` + `white-space: normal`
- [x] 3.2 验证 8-9 字名称（"实施定量风险分析"等）按词/标点换行、完整显示

## 4. 构建与多视口验证

- [x] 4.1 `npm run build`（vue-tsc + vite build）无报错
- [x] 4.2 桌面 1280×800、手机竖屏 375×667、手机横屏 667×375 三个视口实测 sort-4-1：行头/列头/书脊无截断
- [x] 4.3 实测 sort-4-3（5×10 完整矩阵）：10 个行头（含"项目干系人管理"）+ 5 个列头全部完整
