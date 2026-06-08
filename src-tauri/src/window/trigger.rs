use super::manager::WindowState;

#[derive(Debug, Clone)]
pub enum Action {
    ResizeToExpanded,
    /// 设置 Dormant 态当前宽度（1px 隐藏 / 36px 正常）
    SetDormantWidth(f64),
    /// 设置展开态最小窗口尺寸约束（宽, 高），0=不限制
    SetSizeConstraints(f64, f64),
    RepositionToEdge,
    SetFocusable(bool),
    SetResizable(bool),
    AcquireFocus,
    ShowWindow,
    SavePosition,
    EmitStateChange,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Trigger {
    Toggle,
    Init,
    /// 自动隐藏：Dormant 宽度 36px → 1px
    AutoHide,
    /// 鼠标进入隐藏区：Dormant 宽度 1px → 36px
    HoverActivate,
}

#[derive(Debug, Clone)]
pub struct TriggerActions {
    pub pre_exit: Vec<Action>,
    pub transition_to: Option<WindowState>,
    pub post_enter: Vec<Action>,
}

impl Trigger {
    pub fn actions(&self, current: WindowState, _current_dormant_width: f64, dormant_width: f64) -> TriggerActions {
        use Action::*;
        use Trigger::*;
        use WindowState::*;

        match (self, current) {
            // ── Toggle ──
            (Toggle, Dormant) => TriggerActions {
                pre_exit: vec![],
                transition_to: Some(Expanded),
                post_enter: vec![
                    SetSizeConstraints(350.0, 550.0),
                    ResizeToExpanded, SetResizable(true),
                    SetFocusable(true), AcquireFocus, EmitStateChange,
                ],
            },
            (Toggle, Expanded) => TriggerActions {
                pre_exit: vec![SavePosition],
                transition_to: Some(Dormant),
                post_enter: vec![
                    SetSizeConstraints(0.0, 0.0),
                    SetDormantWidth(dormant_width), SetResizable(false),
                    RepositionToEdge, SetFocusable(false), EmitStateChange,
                ],
            },

            // ── Init ──
            (Init, _) => TriggerActions {
                pre_exit: vec![],
                transition_to: None,
                post_enter: vec![
                    SetDormantWidth(dormant_width), SetResizable(false),
                    RepositionToEdge, ShowWindow, SetFocusable(false),
                ],
            },


            // ── AutoHide: 36px → 1px（不切换状态）──
            (AutoHide, Dormant) => TriggerActions {
                pre_exit: vec![],
                transition_to: None,
                post_enter: vec![SetDormantWidth(10.0), EmitStateChange],
            },
            (AutoHide, _) => TriggerActions {
                pre_exit: vec![], transition_to: None, post_enter: vec![],
            },

            // ── HoverActivate: 1px → 36px（不切换状态）──
            (HoverActivate, Dormant) => TriggerActions {
                pre_exit: vec![],
                transition_to: None,
                post_enter: vec![
                    SetDormantWidth(dormant_width), SetResizable(false),
                    RepositionToEdge, EmitStateChange,
                ],
            },
            (HoverActivate, _) => TriggerActions {
                pre_exit: vec![], transition_to: None, post_enter: vec![],
            },
        }
    }
}
