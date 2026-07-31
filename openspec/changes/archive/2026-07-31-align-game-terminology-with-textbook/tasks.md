## 1. 数据文件术语对齐

- [x] 1.1 `public/data/knowledge-areas.json`：stakeholders 的 name 改为"项目干系人管理"、shortName 改为"干系人"
- [x] 1.2 `public/data/processes.json`：p046-p049 四个过程名相关方→干系人（识别干系人、规划干系人参与、管理干系人参与、监督干系人参与），p046 的 shortName 同步
- [x] 1.3 `public/data/processes.json`：p002 name/shortName 制定→制订（制订项目管理计划/制订计划）、p018 name/shortName 制定→制订（制订进度计划/制订进度）；p001、p022 保持"制定"不变
- [x] 1.4 `public/data/levels.json`：sort-3-2 关卡 description 中"相关方管理"→"干系人管理"

## 2. 注释与文档同步

- [x] 2.1 `src/data/loader.ts`：注释中的"识别相关方, 规划相关方参与…"改为干系人表述；"制定项目管理计划""制定进度计划"注释改"制订"
- [x] 2.2 `openspec/specs/pmbok-data/spec.md`：知识领域简称列表"相关方"→"干系人"

## 3. 验证

- [x] 3.1 运行 `npm run build`，确认 typecheck 与 `validateProcessMatrix`（49 过程矩阵）通过
- [x] 3.2 运行 `npm run dev` 抽查界面：知识领域列/矩阵模式显示"干系人"，过程卡片显示"制订项目管理计划""识别干系人"等
