use std::path::PathBuf;
use tauri::{Emitter, LogicalPosition, LogicalSize, LogicalUnit, WebviewWindow, WindowSizeConstraints};

use crate::config::types::DeskPalConfig;
use super::trigger::{self, Action};

/// 窗口状态：Dormant(收缩态) 和 Expanded(展开态)
/// Dormant 态通过 current_dormant_width 动态变化宽度：
/// - 1px  = 隐藏态（前端渲染 hidden-bar）
/// - 36px = 默认收缩条（前端渲染 dormant-bar）
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WindowState {
    Dormant,
    Expanded,
}

pub struct WindowManager {
    window: WebviewWindow,
    state: WindowState,
    panel_width: f64,
    dormant_width: f64,
    /// Dormant 态的当前宽度（动态变化：1px 隐藏 / 36px 正常）
    current_dormant_width: f64,
    panel_height: f64,
    vertical_pos: f64,
    horizontal_pos: f64,
    state_path: PathBuf,
}

impl WindowManager {
    pub fn new(window: WebviewWindow, state_path: &PathBuf, config: &DeskPalConfig) -> Self {
        let (h, v, hz, w) = Self::load_state(state_path);
        let dw = config.dormant_width;
        eprintln!(
            "[DeskPal] WindowManager::new(): panel={}x{} v={:.4} h={:.4} dw={:.0}",
            w, h, v, hz, dw
        );
        Self {
            window,
            state: WindowState::Dormant,
            panel_width: if w > 0.0 { w } else { config.panel_width },
            dormant_width: dw,
            current_dormant_width: dw,
            panel_height: h,
            vertical_pos: v,
            horizontal_pos: hz,
            state_path: state_path.clone(),
        }
    }

    pub fn state(&self) -> &WindowState { &self.state }
    pub fn window(&self) -> &WebviewWindow { &self.window }
    pub fn current_dormant_width(&self) -> f64 { self.current_dormant_width }

    pub fn on_trigger(
        &mut self,
        trigger: &trigger::Trigger,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let current = *self.state();
        let cdw = self.current_dormant_width;
        eprintln!("[DeskPal] on_trigger({:?}) state={:?} dw={:.0}", trigger, current, cdw);
        let actions = trigger.actions(current, cdw);

        for action in &actions.pre_exit {
            self.execute(action)?;
        }
        if let Some(new_state) = &actions.transition_to {
            self.state = *new_state;
        }
        for action in &actions.post_enter {
            self.execute(action)?;
        }
        Ok(())
    }

    fn execute(&mut self, action: &Action) -> Result<(), Box<dyn std::error::Error>> {
        match action {
            Action::ResizeToExpanded => self.resize_to_expanded(),
            Action::ResizeToDormant => self.resize_to_dormant(),
            Action::SetDormantWidth(w) => {
                self.current_dormant_width = *w;
                self.resize_to_dormant()
            }
            Action::SetSizeConstraints(min_w, min_h) => {
                if *min_w > 0.0 && *min_h > 0.0 {
                    self.window.set_size_constraints(WindowSizeConstraints {
                        min_width: Some(LogicalUnit::new(*min_w).into()),
                        min_height: Some(LogicalUnit::new(*min_h).into()),
                        max_width: None,
                        max_height: None,
                    })?;
                } else {
                    self.window.set_size_constraints(WindowSizeConstraints {
                        min_width: None,
                        min_height: None,
                        max_width: None,
                        max_height: None,
                    })?;
                }
                Ok(())

            }
            Action::RepositionToEdge => self.reposition_to_edge(),
            Action::SetFocusable(v) => {
                self.window.set_focusable(*v)?; Ok(())
            }
            Action::SetResizable(v) => {
                self.window.set_resizable(*v)?; Ok(())
            }
            Action::AcquireFocus => {
                self.window.set_focus()?; Ok(())
            }
            Action::ShowWindow => {
                self.window.show()?; Ok(())
            }
            Action::SavePosition => {
                self.save_position(); Ok(())
            }
            Action::EmitStateChange => {
                let s = match self.state {
                    WindowState::Dormant if self.current_dormant_width <= 10.0 => "hidden",
                    WindowState::Dormant => "dormant",
                    WindowState::Expanded => "expanded",
                };
                eprintln!("[DeskPal] EmitStateChange dw={:.0} -> \"{}\"", self.current_dormant_width, s);
                self.window.emit("window-state-changed", serde_json::json!({"state": s}))?;
                Ok(())
            }
        }
    }

    // ── 几何方法 ──

    fn get_panel_height(&self) -> f64 {
        if self.panel_height > 0.0 { self.panel_height } else { 600.0 }
    }

    fn reposition_to_edge(&self) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(monitor) = self.window.current_monitor()? {
            let m = monitor.size();
            let p = monitor.position();
            let w = match self.state {
                WindowState::Dormant => self.current_dormant_width,
                WindowState::Expanded => self.panel_width,
            };
            let h = self.get_panel_height();
            let y = p.y as f64 + (m.height as f64 * self.vertical_pos) - (h / 2.0);
            let y = y.max(p.y as f64).min((p.y + m.height as i32 - h as i32) as f64);
            let x = match self.state {
                WindowState::Dormant => (p.x + m.width as i32 - w as i32) as f64,
                WindowState::Expanded => {
                    let cx = p.x as f64 + (m.width as f64 * self.horizontal_pos) - (w / 2.0);
                    cx.max(p.x as f64).min((p.x + m.width as i32 - w as i32) as f64)
                }
            };
            let _ = self.window.set_position(LogicalPosition::new(x, y));
        }
        Ok(())
    }
    fn resize_to_expanded(&self) -> Result<(), Box<dyn std::error::Error>> {
        let w = self.panel_width.max(350.0);
        let h = self.get_panel_height().max(550.0);
        self.window
            .set_size(LogicalSize::new(w, h))?;
        self.reposition_to_edge()
    }

    fn resize_to_dormant(&self) -> Result<(), Box<dyn std::error::Error>> {
        let h = self.get_panel_height();
        self.window.set_size(LogicalSize::new(self.current_dormant_width, h))?;
        self.reposition_to_edge()
    }

    // ── 持久化 ──

    fn save_position(&mut self) {
        if let Ok(Some(monitor)) = self.window.current_monitor() {
            if let (Ok(pos), Ok(size)) = (self.window.outer_position(), self.window.outer_size()) {
                let sw = monitor.size().width as f64;
                let sh = monitor.size().height as f64;
                let aw = size.width.max(1) as f64;
                let ah = size.height.max(1) as f64;
                if sw > 0.0 && sh > 0.0 {
                    let vz = ((pos.y as f64 + ah / 2.0) / sh).clamp(0.0, 1.0);
                    let hz = ((pos.x as f64 + aw / 2.0) / sw).clamp(0.0, 1.0);
                    self.vertical_pos = vz;
                    self.horizontal_pos = hz;
                    self.panel_width = aw;
                    self.panel_height = ah;
                    let data = serde_json::json!({
                        "panel_height": ah, "panel_width": aw,
                        "vertical_pos": vz, "horizontal_pos": hz,
                    });
                    let _ = std::fs::create_dir_all(self.state_path.parent().unwrap());
                    let _ = std::fs::write(&self.state_path, serde_json::to_string_pretty(&data).unwrap_or_default());
                }
            }
        }
    }

    fn load_state(path: &PathBuf) -> (f64, f64, f64, f64) {
        let s = std::fs::read_to_string(path).ok();
        let v = s.and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok());
        let h = v.as_ref().and_then(|v| v.get("panel_height")?.as_f64()).unwrap_or(0.0);
        let w = v.as_ref().and_then(|v| v.get("panel_width")?.as_f64()).unwrap_or(0.0);
        let p = v.as_ref().and_then(|v| v.get("vertical_pos")?.as_f64()).unwrap_or(0.5);
        let hz = v.as_ref().and_then(|v| v.get("horizontal_pos")?.as_f64()).unwrap_or(0.9);
        (h, p, hz, w)
    }
}
