## 1. 开始界面滚动改造

- [x] 1.1 将 `.start-screen` 的 `overflow: hidden` 改为 `overflow-y: auto`，允许内容超高时纵向滚动
- [x] 1.2 为 `.start-card` 增加 `margin: auto`，内容未超高时保持垂直居中

## 2. 桌面端回归修复

- [x] 2.1 为 `.start-bg-decor` 增加 `overflow: hidden`，裁切溢出光球避免桌面端出现 60px 滚动条

## 3. 验证

- [x] 3.1 Playwright 桌面端（1440×900）验证 `scrollHeight == clientHeight`，无滚动条且按钮可见
- [x] 3.2 Playwright 移动横屏（844×390）验证两关卡 `scrollIntoView` 后"开始游戏"按钮可见且可点击进入游戏
- [x] 3.3 运行 `npm run build` 通过类型检查与构建
