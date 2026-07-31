## Why

游戏内项目管理的专有名词存在与教材不一致的情况：知识领域"项目干系人管理"被写成了"项目相关方管理"，过程名"识别干系人"被写成了"识别相关方"，且"制订项目管理计划""制订进度计划"被写成了"制定"。本变更将所有名词统一对齐《系统集成项目管理工程师教程·第3版》官方表述，帮助考生记忆与教材一致的术语，避免考试时因术语偏差失分。

## What Changes

- 修改 `public/data/knowledge-areas.json`：知识领域名"项目相关方管理"→"项目干系人管理"，简称"相关方"→"干系人"
- 修改 `public/data/processes.json`：
  - "识别相关方"→"识别干系人"（含简称）
  - "规划相关方参与"→"规划干系人参与"
  - "管理相关方参与"→"管理干系人参与"
  - "监督相关方参与"→"监督干系人参与"
  - "制定项目管理计划"→"制订项目管理计划"（含简称）
  - "制定进度计划"→"制订进度计划"（含简称）
  - 保留"制定项目章程""制定预算"（教材即用"制定"）
- 修改 `public/data/levels.json`：关卡描述"相关方管理"→"干系人管理"
- 修改 `src/data/loader.ts`：同步注释中的过程名表述
- 修改 `openspec/specs/pmbok-data/spec.md`：知识领域场景中的简称列表同步更新

## Capabilities

### New Capabilities
（无）

### Modified Capabilities
- `pmbok-data`: 知识领域简称列表与部分过程名从"相关方/制定"对齐为教材的"干系人/制订"

## Impact

- 纯数据与注释、文档改动，无逻辑变更、无 API 变更、无新增依赖
- 涉及文件：`public/data/knowledge-areas.json`、`public/data/processes.json`、`public/data/levels.json`、`src/data/loader.ts`（仅注释）、`openspec/specs/pmbok-data/spec.md`
- 49 过程矩阵数量与位置不受影响，但按仓库约定需跑 `npm run build` 验证矩阵校验通过
