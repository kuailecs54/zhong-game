## 0. 测试基础设施

- [x] 0.1 引入 vitest（devDependency）+ `npm test` 脚本；新增 `src/utils/shelfLayout.ts` 分层纯函数与 `tests/shelfLayout.test.ts`（TDD：先写测试）

## 1. SortGrid 分层算法重写（按容量填层）

- [x] 1.1 重写 `layerData`：按每列放置顺序计算每层容量 `floor(可用宽 / (书脊宽 + gap))`，书种少时单层，超出自动加层（自下而上填充），移除"每书种一层"与 `colLayerCounts` 预规划
- [x] 1.2 书种在层内按 `process.id` 合并为固定宽书脊 + ×N 角标（宽度不随 count 增厚），书脊区 `justify-content: flex-start` 从左到右排

## 2. 书脊视觉与文本

- [x] 2.1 书脊固定宽 20px（窄单元 ≤ 一定宽度时缩至 min 14px），`writing-mode: vertical-rl` 竖排
- [x] 2.2 书名竖排单列不折行（`overflow: hidden` + `max-height` 截断），简化或保留层间透视规则

## 3. 幽灵预览适配新分层

- [x] 3.1 幽灵预览：已有同种书 → 贴其书脊后；新书 → 最低有空位层末尾；虚线描边 + 书名，不占真实层容量

## 4. MatrixGrid 格内书脊角标

- [x] 4.1 矩阵格内改为固定宽书脊 + ×N 角标（重复合并），书名竖排单列不折行截断，替换 `.mini-spine-stack` 堆叠

## 5. 验证

- [x] 5.1 `npm run build` 通过（vue-tsc 类型检查 + vite build）
- [x] 5.2 Playwright 回归：columns 模式分层/角标/幽灵预览、matrix 模式格内书脊角标
