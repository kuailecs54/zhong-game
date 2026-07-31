## 1. 数据层

- [x] 1.1 `src/data/types.ts` 新增 `ShelvedBook { id; process; columnId; rowId? }` 接口，新增常量 `BOOKS_PER_SECTION_PER_LAYER = 5` 并导出
- [x] 1.2 `src/stores/game.ts` 新增 state `shelvedBooks: ShelvedBook[]`，`startLevel`/`resetLevel` 重置为空数组
- [x] 1.3 `src/stores/game.ts` 新增 getter `shelfLayers = Math.ceil(targetCount / BOOKS_PER_SECTION_PER_LAYER)`
- [x] 1.4 `placeCard` 正确分支：`shelvedBooks.push({ id: generateCardId(), process: card, columnId, rowId })`；错误分支不记录

## 2. 多层书柜组件（重构 SortGrid.vue）

- [x] 2.1 扩展 props：新增 `shelvedBooks: ShelvedBook[]` 与 `layers: number`
- [x] 2.2 实现按列分组、按放置序号填层（`layer = floor(idx / 5)`，自底向上）、层内按 `processId` 合并计数的计算逻辑
- [x] 2.3 书脊渲染：宽度随 count 增厚（约 `16 + (count-1)*4` px 封顶）、count > 1 显示 ×N 角标、文字超宽省略
- [x] 2.4 层板渲染：横向 section（每列一个，宽约 46px）+ 竖向多层板；空层板淡显
- [x] 2.5 放置交互：点击 section 仍 `emit('place', col.id)`；选中托盘卡片时仅高亮可放入列（匹配 processGroupId/knowledgeAreaId），最低空层末尾显示虚线幽灵预览书
- [x] 2.6 保留 correct/wrong 反馈动画（keyframes 复用，作用域改为 section 级）

## 3. 矩阵徽标（MatrixGrid.vue）

- [x] 3.1 新增 prop `shelvedBooks: ShelvedBook[]`，每格 count = 按 `(columnId, rowId)` 过滤的数量
- [x] 3.2 count > 0 时渲染徽标：过程 shortName，count > 1 时加 `×N`，样式与格子区分

## 4. 布局重构（GameView.vue）

- [x] 4.1 `.game-view` 结构改为：GameHUD → `.main-area`（flex row, `flex:1`, `min-height:0`）→ Desk
- [x] 4.2 `.main-area` 内 `.game-area`（flex:1）＋ 右侧书架面板（仅 `layoutType === 'columns'`），移除 `.game-area` 底部 `.sort-grid-container` 中的 SortGrid
- [x] 4.3 matrix 模式：MatrixGrid 保留在 `.game-area` 底部 absolute 容器，新增 `:shelvedBooks="gameStore.shelvedBooks"` 传递
- [x] 4.4 columns 模式接入新 SortGrid：传 `:columns` `:shelvedBooks` `:layers` `:selectedCard` `:feedback` 与 `@place`

## 5. 验证

- [x] 5.1 `npm run build` 通过（vue-tsc typecheck + vite build）
- [x] 5.2 `npm run dev` 手工抽查：sort-1-1（2列10本/2层/同名合并）、sort-2-3（5列30本/6层）、sort-3-3（10列面板宽度）、sort-4-1（矩阵徽标、同格重复 ×N）
- [x] 5.3 验证细节：错误放置不上架、选中高亮仅限可放入列、幽灵预览不覆盖已有书、`startLevel`/`resetLevel` 书架清空
