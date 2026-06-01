# DeskPal

<div align="center">

![Tauri](https://img.shields.io/badge/Tauri-2.x-FFC131?logo=tauri)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Rust](https://img.shields.io/badge/Rust-1.85+-DEA584?logo=rust)
![License](https://img.shields.io/badge/License-MIT-green)

**一个跨平台的桌面效率工具箱** — 将常用开发工具整合到轻量级浮动面板中。

</div>

## ✨ 功能

- **时间戳工具** — Unix 秒/毫秒/纳秒 ↔ 日期，自动类型识别，实时刷新
- **更多工具开发中** — JSON 格式化、JWT 解析、Base64、颜色转换等

## 插件化工具架构

所有工具组件采用**热插拔插件架构**，每个工具独立目录、独立组件、零耦合。

```
src/tools/
├── index.ts                 # 组件注册表（React.lazy 懒加载）
├── timestamp/               # 时间戳工具
│   ├── index.tsx            # 主组件
│   ├── utils.ts             # 核心逻辑
│   └── timestamp.css        # 私有样式
├── json/                    # （待实现）
│   └── index.tsx
└── ...
```

新增工具只需：
1. 在 `src/tools/` 下新建 `<tool-id>/` 目录
2. 实现 `index.tsx`（默认导出 React 组件）
3. 在 `src/tools/index.ts` 加一行注册

移除工具只需删除对应目录和注册行，互不影响。

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发模式
pnpm tauri dev

# 构建生产版本
pnpm tauri build
```

## 构建说明

### 前置要求

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 10
- [Rust](https://www.rust-lang.org/) stable toolchain

#### Linux 额外依赖

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev
```

### 构建

```bash
pnpm install
pnpm build          # 构建前端
pnpm tauri build    # 构建桌面应用
```

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | React 19 |
| 构建工具 | Vite 7 |
| 语言（前端） | TypeScript 5.8 |
| 桌面框架 | Tauri 2 |
| 后端语言 | Rust (edition 2021) |
| 包管理 | pnpm |
| 状态管理 | Zustand |
| 图标 | Lucide React |

## 项目结构

```text
deskpal/
├── src/                # 前端 React 源码
│   ├── components/     # UI 组件（TitleBar, ToolGrid, ToolPanel, StatusBar）
│   ├── tools/          # 工具插件（每个工具独立目录）
│   │   ├── index.ts    # 组件注册表
│   │   └── timestamp/  # 时间戳工具
│   ├── store/          # Zustand 状态管理
│   ├── lib/            # 工具注册、IPC 通信
│   ├── styles/         # 全局样式
│   └── App.tsx         # 应用入口
├── src-tauri/          # Rust 后端
│   └── src/
│       ├── command/    # 命令执行
│       ├── config/     # 配置管理
│       ├── detect/     # 内容检测引擎
│       └── stats/      # 使用统计学习
└── .github/workflows/  # CI 配置
```

## 💡 致谢

部分功能实现借鉴自 [ctool](https://github.com/baiy/ctool) (MIT License)，感谢原作者 baiy。

## 许可

MIT
