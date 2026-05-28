# Phase 2: 自动隐藏功能

## 目标
Dormant(36px) 2s 无交互 → Hidden(1px)。鼠标移到 1px 边缘或热键/托盘触发恢复。

## 状态流转

```
                   AutoHide (2s 无交互)
Dormant(36px)  ──────────────────────────→  Hidden(1px)
     ↑                                          │
     │ HoverActivate (CursorEntered)             │ Toggle (热键/托盘)
     │                                          ▼
     └───────────────────────────  Expanded(480px)
```

## 任务分解

### Task 1: trigger.rs — 加 Hidden 状态 + 2 个 Trigger + 1 个 Action
- WindowState 加 `Hidden` 变体
- Action 加 `ResizeToHidden`
- Trigger 加 `AutoHide`, `HoverActivate`
- match 分支:
  - (AutoHide, Dormant) → transition_to: Hidden, post: [ResizeToHidden]
  - (HoverActivate, Hidden) → transition_to: Dormant, post: [ResizeToDormant, SetResizable(false), RepositionToEdge, EmitStateChange]
  - (Toggle, Hidden) → transition_to: Expanded, post: [ResizeToExpanded, SetResizable(true), SetFocusable(true), AcquireFocus, EmitStateChange]
  - (Toggle, Dormant) — 不变
  - (Toggle, Expanded) — 不变

### Task 2: manager.rs — 加 ResizeToHidden 执行
- execute() 加 `Action::ResizeToHidden` → set_size(1.0, panel_height) + reposition_to_edge

### Task 3: lib.rs — 加 2s 定时器 + CursorEntered 检测
- WindowEvent::CursorEntered → 取消 AutoHide 定时器 / 触发 HoverActivate
- WindowEvent::CursorLeft → 启动 2s 定时器
- 定时器用 AtomicBool + thread::spawn（与 blur 检测相同模式）
- AutoHide 触发: 通过 try_state 获取 WindowManager 锁，调用 on_trigger(AutoHide)
- HoverActivate 触发: 同上，调用 on_trigger(HoverActivate)
