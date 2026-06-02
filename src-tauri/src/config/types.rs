use serde::{Deserialize, Serialize};

/// DeskPal global configuration structure.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DeskPalConfig {
    #[serde(default = "default_auto_hide_enabled")]
    pub auto_hide_enabled: bool,
    #[serde(default = "default_auto_hide_delay_ms")]
    pub auto_hide_delay_ms: u64,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_dock_position")]
    pub dock_position: String,
    #[serde(default = "default_dormant_width")]
    pub dormant_width: f64,
    #[serde(default = "default_panel_width")]
    pub panel_width: f64,
    #[serde(default = "default_panel_height_min")]
    pub panel_height_min: f64,
    #[serde(default = "default_panel_height_max")]
    pub panel_height_max: f64,
    #[serde(default = "default_smart_recommend")]
    pub smart_recommend: bool,
    #[serde(default = "default_live_timestamp")]
    pub live_timestamp: bool,
    #[serde(default = "default_hotkey")]
    pub hotkey: String,
    #[serde(default = "default_dblclick_threshold_ms")]
    pub dblclick_threshold_ms: u64,
}

// ---- Default values ----
// Functions are referenced by `#[serde(default = "...")]`; suppress dead_code lint.
#[allow(dead_code)]
fn default_auto_hide_enabled() -> bool {
    true
}
#[allow(dead_code)]
fn default_auto_hide_delay_ms() -> u64 {
    2000
}
#[allow(dead_code)]
fn default_theme() -> String {
    "dark".to_string()
}
#[allow(dead_code)]
fn default_dock_position() -> String {
    "right".to_string()
}
#[allow(dead_code)]
fn default_dormant_width() -> f64 {
    20.0
}
#[allow(dead_code)]
fn default_panel_width() -> f64 {
    480.0
}
#[allow(dead_code)]
fn default_panel_height_min() -> f64 {
    300.0
}
#[allow(dead_code)]
fn default_panel_height_max() -> f64 {
    2000.0
}
#[allow(dead_code)]
fn default_smart_recommend() -> bool {
    true
}
#[allow(dead_code)]
fn default_live_timestamp() -> bool {
    true
}
#[allow(dead_code)]
fn default_hotkey() -> String {
    "Ctrl+Shift+D".to_string()
}
#[allow(dead_code)]
fn default_dblclick_threshold_ms() -> u64 {
    300
}

impl Default for DeskPalConfig {
    fn default() -> Self {
        Self {
            auto_hide_enabled: default_auto_hide_enabled(),
            auto_hide_delay_ms: default_auto_hide_delay_ms(),
            theme: default_theme(),
            dock_position: default_dock_position(),
            dormant_width: default_dormant_width(),
            panel_width: default_panel_width(),
            panel_height_min: default_panel_height_min(),
            panel_height_max: default_panel_height_max(),
            smart_recommend: default_smart_recommend(),
            live_timestamp: default_live_timestamp(),
            hotkey: default_hotkey(),
            dblclick_threshold_ms: default_dblclick_threshold_ms(),
        }
    }
}
