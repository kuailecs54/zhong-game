## 1. 数据文件术语对齐（第四版）

- [x] 1.1 `public/data/processes.json`：p002 name/shortName 制订→制定（制定项目管理计划/制定计划）、p018 name/shortName 制订→制定（制定进度计划/制定进度）
- [x] 1.2 `public/data/processes.json`：p041 name "实施风险应对"→"实施风险应对措施"（简称"实施应对"不变）
- [x] 1.3 结构保持不变：整合管理 7（含"管理项目知识"）、进度管理 6、资源管理 6，共 49 个过程

## 2. 注释与文档同步

- [x] 2.1 `src/data/loader.ts`：EXPECTED_MATRIX 注释中"制订项目管理计划""制订进度计划"改为"制定"
- [x] 2.2 `openspec/specs/pmbok-data/spec.md`：术语断言改为第四版——"3rd edition"→"4th edition"、"制订"→"制定"，并新增"实施风险应对措施"断言

## 3. 验证

- [x] 3.1 运行 `npm run build`，确认 typecheck 与 `validateProcessMatrix`（49 过程矩阵）通过
