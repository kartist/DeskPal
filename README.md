# DeskPal

<div align="center">

![Tauri](https://img.shields.io/badge/Tauri-2.x-FFC131?logo=tauri)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Rust](https://img.shields.io/badge/Rust-1.85+-DEA584?logo=rust)
![License](https://img.shields.io/badge/License-MIT-green)

**一个跨平台的桌面效率工具箱** — 将常用开发工具整合到轻量级浮动面板中。

</div>

 
## ✨ 功能

- **11 种开发工具** — 时间戳、JSON、文本处理、变量命名、文本比对、UUID、随机字符、URL 编解码、正则测试、JWT 解析、设置

## 插件化工具架构

所有工具组件采用**热插拔插件架构**，每个工具独立目录、独立组件、零耦合。

```
src/tools/
├── index.ts                 # 组件注册表（React.lazy 懒加载）
├── timestamp/               # 时间戳工具
│   ├── index.tsx            # 主组件
│   ├── utils.ts             # 核心逻辑
│   └── timestamp.css        # 私有样式
├── json/                    # JSON 工具
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

#### Windows 额外依赖（实测步骤）

除 Node/pnpm/Rust 外，Windows 上编译 Rust 后端还需要 MSVC 生成工具与 WebView2：

```powershell
# 1) pnpm（Node >= 18 已有；若 npm 被执行策略拦截就改用 npm.cmd）
npm install -g pnpm@10

# 2) Rust：用户级安装，无需管理员
#    下载 rustup-init.exe 后运行：
#    rustup-init.exe -y --default-toolchain stable --profile default
#    装完确认 rustc -V / cargo -V 有输出

# 3) MSVC 生成工具 + Windows SDK（会弹 UAC，需要提权）
winget install --id Microsoft.VisualStudio.2022.BuildTools --source winget `
  --accept-package-agreements --accept-source-agreements `
  --override '--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --add Microsoft.VisualStudio.Component.Windows11SDK.26100'

# 4) 验证（应依次成功）
pnpm install --frozen-lockfile
pnpm build
cd src-tauri; cargo check --all-targets
```

实测最容易卡住的三个坑：

| 现象 | 原因 | 处理 |
|---|---|---|
| `pnpm` 报“因为在此系统上禁止运行脚本” | PowerShell 执行策略默认 Restricted，拦截 `pnpm.ps1` | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`，或一律用 `pnpm.cmd` |
| `rustc` 报 `missing manifest in toolchain` | rustup 安装被中断（进程卡在收尾） | `rustup toolchain install stable --force` |
| `cargo` 拉依赖只有几 KB/s | 官方稀疏索引的海量小请求延迟高（不是带宽问题） | 在 `~/.cargo/config.toml` 配置镜像源 |

完整排错流程（镜像源配置、WebView2/SDK 检查、回滚方法）见 [`.dsh/skills/tauri-windows-setup/SKILL.md`](.dsh/skills/tauri-windows-setup/SKILL.md)，另附只读体检脚本，一条命令给出全部组件状态：

```powershell
powershell -ExecutionPolicy Bypass -File .\.dsh\skills\tauri-windows-setup\scripts\check-deskpal-env.ps1
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
│       ├── window/     # 窗口状态机（收缩/展开/隐藏）
│       ├── config/     # 配置管理
│       └── tray/       # 系统托盘
└── .github/workflows/  # CI 配置
```

## 项目演示

<div align="center">

 <image src="./docs/20260715-231801.jpg" style="width: 500px" align="center">
 <image src="./docs/20260715-231745.jpg" style="width: 500px" align="center">
 <image src="./docs/20260715-231805.jpg" style="width: 500px" align="center">
 <image src="./docs/20260715-231809.gif" style="width: 500px" align="center">
</div> 
   
## 💡 致谢

部分功能实现借鉴自 [ctool](https://github.com/baiy/ctool) (MIT License)，感谢原作者 baiy。

## 许可

MIT
