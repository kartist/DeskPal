# 窗口定位修复计划

## Bug 1: DPI 单位混用导致窗口偏移

`reposition_to_edge()` 中 `monitor.size()` / `monitor.position()` 返回物理像素，
但 `LogicalPosition::new()` 期望逻辑像素。两者混算导致高 DPI 下窗口位置偏右。

**修复：** 使用 `scale_factor()` 将物理坐标转为逻辑坐标后再计算。

## Bug 2: Resized 事件覆盖 state.json

`WindowEvent::Resized` 处理写入 `{panel_height, panel_width}` 但不含位置信息。
Dormant 态 (20px) 时 Resized → panel_width 被 floor 到 100 → 下次启动读取错误的值。

**修复：** Resized 处理改为读-改-写模式，仅更新 panel_height，保留已有的 panel_width 和位置信息。

---

## 任务分解

### Task 1: DPI 感知定位 — `manager.rs`

修改 `reposition_to_edge()`：将 monitor 的物理坐标通过 `scale_factor()` 转为逻辑坐标后再计算。

```rust
fn reposition_to_edge(&self) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(monitor) = self.window.current_monitor()? {
        let scale = monitor.scale_factor();
        let m = monitor.size();
        let p = monitor.position();

        // 物理 → 逻辑坐标
        let mw = m.width as f64 / scale;
        let mh = m.height as f64 / scale;
        let px = p.x as f64 / scale;
        let py = p.y as f64 / scale;

        let w = match self.state {
            WindowState::Dormant => self.current_dormant_width,
            WindowState::Expanded => self.panel_width,
        };
        let h = self.get_panel_height();
        let y = py + (mh * self.vertical_pos) - (h / 2.0);
        let y = y.max(py).min(py + mh - h);

        let x = match self.state {
            WindowState::Dormant => px + mw - w,
            WindowState::Expanded => {
                let cx = px + (mw * self.horizontal_pos) - (w / 2.0);
                cx.max(px).min(px + mw - w)
            }
        };

        let _ = self.window.set_position(LogicalPosition::new(x, y));
    }
    Ok(())
}
```

### Task 2: Resized 处理改为读-改-写 — `lib.rs`

修改 `WindowEvent::Resized` 处理：读现有 state.json，只更新 panel_height，保留其他字段。

```rust
WindowEvent::Resized(size) => {
    let h = size.height.max(300).min(2000) as f64;
    let mut data = std::fs::read_to_string(&sp)
        .ok()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .unwrap_or(serde_json::json!({}));
    data["panel_height"] = serde_json::json!(h);
    let _ = std::fs::create_dir_all(sp.parent().unwrap());
    let _ = std::fs::write(&sp, serde_json::to_string_pretty(&data).unwrap_or_default());
    should_blur.store(false, Ordering::SeqCst);
}
```

---

## 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src-tauri/src/window/manager.rs` | 修改 | `reposition_to_edge()` DPI 感知修正 |
| `src-tauri/src/lib.rs` | 修改 | Resized 处理读-改-写，只更新 panel_height |

## 验证

1. `cargo check` 编译通过
2. 启动 `pnpm tauri dev`，展开窗口 → 右侧不应超出屏幕
3. 拖拽窗口调整大小 → 重启 → 记住尺寸和位置
