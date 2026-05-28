# 架构原则

## Rust ↔ TypeScript 边界

| 层 | 管什么 | 不管什么 |
|----|--------|----------|
| **Rust** | 窗口容器：尺寸、位置、可见性、全置顶、焦点、热键注册、托盘、state.json 持久化 | UI 内容、布局、动画、颜色主题 |
| **TypeScript/CSS** | UI 内容：React 组件、CSS 布局、滚动、主题 | 窗口尺寸、窗口位置、窗口状态切换 |
| **IPC (`invoke`)** | 仅用户主动触发的状态切换 | 窗口尺寸检测、高度持久化 |

## 状态机架构（trigger.rs + manager.rs）

所有窗口状态变化必须通过 `WindowManager::on_trigger(&Trigger)` 统一入口：

```
触发源 (Trigger)
  ├── Toggle  ← IPC / 热键 / 托盘 / 失焦收缩
  ├── Init    ← 启动时显示收缩态
  └── DragEnd ← 拖拽结束（预留）

on_trigger 执行三阶段：
  ① pre_exit    → 离开当前状态前（如 SavePosition）
  ② transition  → 切换状态（Dormant ⇄ Expanded）
  ③ post_enter  → 进入新状态后（Resize, SetFocusable, SetResizable, EmitStateChange）
```

- ✅ 所有窗口状态变化必须走 `on_trigger()`
- ✅ 新增触发源：加 Trigger 变体 → 加 match 分支 → 加 execute() 处理 → 加 Action
- ❌ 禁止直接在 lib.rs/tray/hotkey 中调用 `activate()`/`toggle()`

## Action 原子操作

```rust
pub enum Action {
    ResizeToDormant,      // set_size(36, h)
    ResizeToExpanded,     // set_size(panel_width, h) + reposition
    RepositionToEdge,     // 靠右对齐
    SetFocusable(bool),   // 设置可聚焦
    SetResizable(bool),   // 设置可调整大小（收缩态 false，展开态 true）
    AcquireFocus,         // 获取焦点
    ShowWindow,           // 显示窗口
    SavePosition,         // 持久化到 state.json
    EmitStateChange,      // 发出 window-state-changed 事件
}
```

- ✅ 新增 Action 只需加枚举变体 + `execute()` 中的 match 分支
- ✅ Action 是原子的、可组合的

## 窗口尺寸策略

| 状态 | width | resizable | focusable |
|------|-------|-----------|-----------|
| Dormant | `config.dormant_width` (默认36px) | `false` | `false` |
| Hidden | 1px（自动隐藏用，预留） | `false` | `false` |
| Expanded | `config.panel_width` (默认480px) | `true` | `true` |

- ✅ `resizable: false` 在收缩态保证 `start_dragging()` 工作（Windows 不抢占鼠标消息）
- ✅ `resizable: true` 在展开态保证用户可拖拽边缘调整面板尺寸
- ❌ 收缩态不要设置 `resizable: true`（会导致拖拽失效）

## 窗口拖拽

- ✅ 使用 Rust `start_dragging()` 通过 `WM_SYSCOMMAND SC_MOVE | HTCAPTION`
- ✅ 命令参数用 `AppHandle` + `get_webview_window("main")`，不用 `WebviewWindow` 直接注入
- ❌ 不要用 JS 端 mousemove + setPosition 模拟拖拽（WebView 鼠标移出后收不到事件）
- ❌ 透明窗口下不要依赖 `data-tauri-drag-region`（Tauri 2.x 不可靠）

## 持久化

### state.json
```json
{
  "panel_height": 636,
  "panel_width": 480,
  "vertical_pos": 0.5,
  "horizontal_pos": 0.9
}
```
- 由 `save_position()` 写入（收缩前调用）
- 由 `on_window_event(Resized)` 写入（拖拽边缘时）
- 读: `WindowManager::load_state()` → new()

### config.json
```json
{
  "auto_hide_enabled": true,
  "auto_hide_delay_ms": 2000,
  ...
}
```
- 由 `ConfigLoader::save()` 写入（用户保存设置时）
- 由 `ConfigLoader::load_or_default()` 读取
- 详见 `01-config-system.md`

## 窗口生命周期

```
启动 → Init → Dormant(36px)
                │
                ├── 点击收缩条 → Toggle → Expanded(480px)
                │                              │
                │                              ├── 关闭/失焦 → Toggle → Dormant
                │                              │
                │                              └── 拖拽标题栏 → start_dragging()
                │
                └── 2s 无交互 → AutoHide → Hidden(1px) [预留]
                                               │
                                               ├── 鼠标悬停 → HoverActivate → Dormant
                                               └── 热键/托盘 → Toggle → Expanded
```
