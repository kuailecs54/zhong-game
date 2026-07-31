# AGENTS.md

## 项目说明

帮助备考"系统集成项目管理工程师（中级）"的考生记忆 49 个项目管理过程及其在 5 大过程组 × 10 大知识领域矩阵位置的游戏化 Web 应用。玩法为"下落 + 归类"：卡片下落 → 点击捕获 → 点击放置到对应列/格 → 判分，含生命、连击、星级、冰冻道具。

- 技术栈：Vue 3 + TypeScript + Vite + Pinia + vue-router。纯前端，无后端，进度存 `localStorage`（key: `pm-sort-game-user`）。
- 数据全部来自 `public/data/*.json`，运行时通过 `fetch('/data/...')` 加载（不是 TS import）。
- 教材数据来源：`book/系统集成项目管理工程师教程_第3版_完整版.md`（1.9MB，仅提取公共数据，勿整段复制原文）。

## 常用命令

```bash
npm run dev      # 开发服务器，端口 5173
npm run build    # vue-tsc -b && vite build（即 typecheck + 构建）
npm run preview  # 预览构建产物
```

无 lint / test 脚本。`npm run build` 是唯一的静态校验方式。

## 架构要点

- 目录入口：`src/main.ts` → `App.vue`；路由在 `src/router/index.ts`（4 条：`/`、`/levels`、`/game/:levelId`、`/result/:levelId`）。
- 别名 `@` → `src`（vite.config.ts）。
- 状态：`src/stores/game.ts`（单局逻辑，gameLoop 由 `src/composables/useGameLoop.ts` 驱动）、`src/stores/user.ts`（用户名/进度）。
- **49 过程约束**：`src/data/loader.ts` 的 `validateProcessMatrix` 校验总过程数必须为 49，且每知识领域在 5 个过程组中的数量须匹配 `EXPECTED_MATRIX`。改动 `public/data/processes.json` 或 `levels.json` 后必须跑 `npm run build` 或手动确认矩阵，否则报错。
- 关卡数据经 `public/data/levels.json` 配置（列/矩阵模式、卡池来源、速度、星级阈值等），类型见 `src/data/types.ts`。

## 语言规范

- 代码内注释、UI 文案均用中文；代码类内容（标识符、命令、术语）用英文。
- openspec 文档类内容以中文为主，仅代码内容用英文（见 `openspec/config.yaml` 的 context）。

## superpowers 使用

- superpowers 技能已内置在本仓库 `.opencode/skills/`（brainstorming、systematic-debugging、test-driven-development、writing-plans 等），以及中文适配版（chinese-code-review、chinese-documentation、chinese-commit-conventions、chinese-git-workflow）。
- **在做出任何响应或操作之前，必须先检查并调用适用的技能**（见 `.opencode/skills/using-superpowers/SKILL.md`），包括提问前。
- 流程技能优先："让我们构建 X" → 先 brainstorming；"修复这个 bug" → 先 systematic-debugging。
- 中文项目自动路由：代码审查/写中文文档/写 commit 时用对应 chinese-* 技能。

## codegraph 使用

- codegraph 是本仓库的代码知识图谱，索引在 `.codegraph/`（已 gitignore，勿提交）。
- **优先用 `codegraph_explore` 工具代替 grep + Read 循环**：一次调用返回相关符号的完整源码（带行号）+ 调用路径 + 影响面（blast radius），适合回答"某个模块怎么工作"“改这里会影响什么”。
- 命令行补充：`codegraph node <符号>`（单个符号源码 + 调用/被调用关系）、`codegraph callers <符号>`（找调用者）、`codegraph query <关键词>`（搜符号）。
- 索引维护：代码变更后跑 `codegraph sync` 增量同步（全量重建用 `codegraph index`），`codegraph status` 查看状态。

## openspec 工作流

- 规格驱动开发，规范与归档在 `openspec/`（`specs/` 存放能力规格，`changes/` 存放变更）。需要 `openspec` CLI。
- 使用 `/opsx-propose` → `/opsx-apply` → `/opsx-archive` 命令完成 提案 → 实现 → 归档 全流程（命令定义在 `.opencode/commands/`）。

## 注意

- 本目录是 git 仓库（分支 `master`）。`.playwright-mcp/` 与根目录截图是浏览器测试/UI 记录，不是源码，勿改动，且已加入 `.gitignore`。
