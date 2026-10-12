---
name: tauri-windows-setup
description: DeskPal（Tauri 2 + pnpm + Rust）在 Windows 上的开发环境搭建与修复流程：检查/安装 Node、pnpm、rustup、MSVC 生成工具、Windows SDK、WebView2，并处理 PowerShell 执行策略拦截 pnpm.ps1、rustup 安装中断、crates.io 下载被限速、SSH 无密钥等实测坑。当需要首次搭建或修复 Windows 构建环境、pnpm/npm 报“禁止运行脚本”、cargo 拉依赖极慢或卡住、链接器缺失时使用。
---

# DeskPal Windows 环境搭建（实测流程）

## 何时使用

- 在 Windows 上首次搭建 DeskPal 的开发/构建环境
- `pnpm tauri dev` / `cargo build` 报错：找不到链接器、找不到 `cargo`、下载依赖极慢
- `pnpm` / `npm` 在 PowerShell 里报“因为在此系统上禁止运行脚本”
- 需要判断环境是否完整（CI 之外的本地复现）

## 0. 先体检，再动手

```powershell
# 已有体检脚本（位于本技能目录）
powershell -ExecutionPolicy Bypass -File .\.dsh\skills\tauri-windows-setup\scripts\check-deskpal-env.ps1
```

> 该脚本刻意保持 **纯 ASCII**：Windows PowerShell 5.1 会把无 BOM 的 `.ps1` 按 ANSI 解码，脚本里写中文会变成乱码并直接语法报错。要改脚本就继续用英文，中文说明写在本文件里。同理，给脚本传参时不要把参数命名为 `$Args`（自动变量，`-File` 下会静默绑定为空）。

关键判据（DeskPal 要求：Node ≥ 18、pnpm ≥ 10、Rust stable）：

| 组件 | 检查命令 | 合格输出示例（实测环境） |
|---|---|---|
| Node | `node -v` | `v24.21.0` |
| pnpm | `pnpm -v` | `10.34.7` |
| Rust | `rustc -V` / `cargo -V` | `1.99.0`，默认 `stable-x86_64-pc-windows-msvc` |
| MSVC | `vswhere -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath` | `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools` |
| SDK | `Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\Lib'` | `10.0.26100.0` |
| WebView2 | 注册表 `HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}` 的 `pv` | `154.0.4258.62` |

`vswhere.exe` 固定位于 `${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe`，不存在即表示没装任何 VS/MSVC。

## 1. 安装 pnpm（用户级，无需管理员）

```powershell
npm install -g pnpm@10        # 若 npm 被策略拦截，用 npm.cmd
```

- `npm` 的全局 prefix 可用 `npm config get prefix` 确认（默认是 `%APPDATA%\npm`，即 `C:\Users\<用户名>\AppData\Roaming\npm`）。
- 装完会生成 `pnpm`、`pnpm.cmd`、`pnpm.ps1` 三个壳；**执行策略受限时只有 `.cmd` 能用**。
- 不要用 `pnpm install` 去装全局 pnpm；也注意别在项目目录里跑 `npm install`，那会生成多余的 `package-lock.json`（本项目只用 pnpm-lock.yaml）。

## 2. 安装 Rust（用户级，无需管理员）

```powershell
$dst = Join-Path $env:TEMP 'rustup-init.exe'
Invoke-WebRequest -Uri 'https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe' -OutFile $dst
& $dst -y --default-toolchain stable --profile default
```

安装到 `%USERPROFILE%\.rustup` + `%USERPROFILE%\.cargo`。若用了 `--no-modify-path`，记得把 `%USERPROFILE%\.cargo\bin` 追加进**用户级** PATH：

```powershell
$bin = "$env:USERPROFILE\.cargo\bin"
$cur = [Environment]::GetEnvironmentVariable('Path','User')
if ($cur -notlike "*$bin*") { [Environment]::SetEnvironmentVariable('Path', ($cur.TrimEnd(';') + ';' + $bin), 'User') }
```

**坑：rustup-init 可能卡在收尾（文件不再增长、CPU 不再涨、没有子进程）。** 直接结束它并让 rustup 修复：

```powershell
Stop-Process -Name rustup-init -Force -ErrorAction SilentlyContinue
& "$env:USERPROFILE\.cargo\bin\rustup.exe" toolchain install stable --force --profile default
& "$env:USERPROFILE\.cargo\bin\rustup.exe" component list --installed   # 期望 6 项：cargo/clippy/rust-docs/rust-std/rustc/rustfmt
```

“missing manifest in toolchain” 就是中断后的典型症状，`--force` 重装即可，无需删除 `~/.rustup`。

## 3. 安装 MSVC 生成工具 + Windows SDK（需要 UAC 提权）

Tauri 在 Windows 上编译 Rust 后端必须有 MSVC 工具链；VS 生成工具安装必须提权（普通账号会弹 UAC）。

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools --source winget `
  --accept-package-agreements --accept-source-agreements `
  --override '--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --add Microsoft.VisualStudio.Component.Windows11SDK.26100'
```

装完用第 0 节的 vswhere / SDK 路径复查。WebView2 在 Windows 11 上通常已预装，缺失时从 Microsoft 官网装 Evergreen Runtime。

## 4. crates.io 拉依赖被限速（本项目实测最耗时的一步）

症状：`cargo check` 长时间无 `target/` 产出，`~/.cargo/registry` 增长约 0.4–2.8 MB/min；而单独测 `https://static.crates.io/crates/<c>/<c>-<v>.crate` 能有 1.7 MB/s——瓶颈是**稀疏索引的海量小请求延迟**，不是带宽。

处理：把 crates.io 换成国内镜像（`~/.cargo/config.toml`，实测 rsproxy 单包 1.98 MB/s，90 秒内拉完 659 MB）：

```toml
[source.crates-io]
replace-with = 'rsproxy-sparse'

[source.rsproxy-sparse]
registry = "sparse+https://rsproxy.cn/index/"

[net]
git-fetch-with-cli = true
```

还原官方源：删掉 `[source.crates-io]` 与 `[source.rsproxy-sparse]` 两节即可。换源前已下载的缓存会保留复用。

## 5. PowerShell 执行策略

默认（全 Undefined → Restricted）会拒绝 `npm.ps1` / `pnpm.ps1`，表现为“无法加载文件……因为在此系统上禁止运行脚本”。

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```

- 只影响当前用户、无需管理员；不动 MachinePolicy。
- 不想改策略时，一律用 `pnpm.cmd` / `npm.cmd` 调用。
- 同理，`.ps1` 脚本若仍被拦，用 `powershell -ExecutionPolicy Bypass -File <脚本>` 运行。

## 6. 克隆仓库

`git@github.com:kartist/DeskPal.git` 需要本机 SSH 私钥；`~/.ssh` 只有 `known_hosts` 时会 `Permission denied (publickey)`。仓库是公开的，直接用 HTTPS 即可（或先 `ssh-keygen` 并把公钥加到 GitHub）：

```powershell
git clone https://github.com/kartist/DeskPal.git deskpal
```

## 7. 验证清单（缺一步都不算装好）

```powershell
cd ~/deskpal
pnpm install --frozen-lockfile     # 期望：19 dependencies + 8 devDependencies，Done
pnpm build                         # tsc && vite build，产出 dist/
cd src-tauri
cargo check --all-targets          # 期望：Finished `dev` profile，退出码 0
& pnpm.cmd exec tauri --version    # 期望：tauri-cli 2.x
```

链接器单独验证（10 秒内可判死活，避免在 Tauri 全量编译上浪费时间）：

```powershell
'fn main(){println!("link-ok");}' | Set-Content $env:TEMP\linktest.rs
rustc $env:TEMP\linktest.rs -o $env:TEMP\linktest.exe; & $env:TEMP\linktest.exe   # 期望输出 link-ok
```

## 8. 收尾注意事项

- `dist/`、`src-tauri/target/` 已被 `.gitignore` 覆盖，构建不会污染工作区。
- 但 `cargo` / `tauri-build` 会把已跟踪文件（实测：`src-tauri/gen/schemas/*.json`、`src-tauri/Cargo.toml`）的换行改写成 LF。若 `git status` 显示它们已修改、同时警告 `LF will be replaced by CRLF`，先用 `git diff <文件>` 确认**内容差异为空**（纯行尾抖动），再 `git restore -- <文件>` 还原，不要顺手提交。
- 按本项目 CLAUDE.md 的最强规则：任何代码/文档改动都要用中文规范提交（`<类型>: <概要>`，如 `docs: ...`、`chore: ...`）。提交前先确认 `git config user.name/user.email` 已配置。

## 9. 回滚已做的环境改动

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy Undefined     # 恢复执行策略
# 删除 ~/.cargo/config.toml 恢复 crates.io 官方源
# 从“用户级 PATH”里删掉 %USERPROFILE%\.cargo\bin
# rustup self uninstall 可整体卸载 Rust（MSVC 生成工具走“应用和功能”卸载）
```
