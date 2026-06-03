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
    #[serde(default = "default_dormant_width")]
    pub dormant_width: f64,
    #[serde(default = "default_panel_width")]
    pub panel_width: f64,
    #[serde(default = "default_dblclick_threshold_ms")]
    pub dblclick_threshold_ms: u64,
    #[serde(default = "default_dormant_bar_bg_dark")]
    pub dormant_bar_bg_dark: String,
    #[serde(default = "default_dormant_bar_bg_light")]
    pub dormant_bar_bg_light: String,
    #[serde(default = "default_dormant_bar_text_color_dark")]
    pub dormant_bar_text_color_dark: String,
    #[serde(default = "default_dormant_bar_text_color_light")]
    pub dormant_bar_text_color_light: String,
    #[serde(default = "default_dormant_bar_hover_bg_dark")]
    pub dormant_bar_hover_bg_dark: String,
    #[serde(default = "default_dormant_bar_hover_bg_light")]
    pub dormant_bar_hover_bg_light: String,
    #[serde(default = "default_dormant_bar_label")]
    pub dormant_bar_label: String,
    #[serde(default = "default_dormant_bar_font_size")]
    pub dormant_bar_font_size: f64,
    #[serde(default = "default_double_click_pin_enabled")]
    pub double_click_pin_enabled: bool,
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
fn default_dormant_width() -> f64 {
    20.0
}
#[allow(dead_code)]
fn default_panel_width() -> f64 {
    480.0
}
#[allow(dead_code)]
fn default_dblclick_threshold_ms() -> u64 {
    300
}
#[allow(dead_code)]
fn default_dormant_bar_bg_dark() -> String {
    "#1C2333".to_string()
}
#[allow(dead_code)]
fn default_dormant_bar_bg_light() -> String {
    "#F6F8FA".to_string()
}
#[allow(dead_code)]
fn default_dormant_bar_text_color_dark() -> String {
    "#58A6FF".to_string()
}
#[allow(dead_code)]
fn default_dormant_bar_text_color_light() -> String {
    "#0969DA".to_string()
}
#[allow(dead_code)]
fn default_dormant_bar_hover_bg_dark() -> String {
    "#262D3D".to_string()
}
#[allow(dead_code)]
fn default_dormant_bar_hover_bg_light() -> String {
    "#EAEEF2".to_string()
}
#[allow(dead_code)]
fn default_dormant_bar_label() -> String {
    "DESKPAL".to_string()
}
#[allow(dead_code)]
fn default_dormant_bar_font_size() -> f64 {
    13.0
}
#[allow(dead_code)]
fn default_double_click_pin_enabled() -> bool {
    true
}

impl Default for DeskPalConfig {
    fn default() -> Self {
        Self {
            auto_hide_enabled: default_auto_hide_enabled(),
            auto_hide_delay_ms: default_auto_hide_delay_ms(),
            theme: default_theme(),
            dormant_width: default_dormant_width(),
            panel_width: default_panel_width(),
            dblclick_threshold_ms: default_dblclick_threshold_ms(),
            dormant_bar_bg_dark: default_dormant_bar_bg_dark(),
            dormant_bar_bg_light: default_dormant_bar_bg_light(),
            dormant_bar_text_color_dark: default_dormant_bar_text_color_dark(),
            dormant_bar_text_color_light: default_dormant_bar_text_color_light(),
            dormant_bar_hover_bg_dark: default_dormant_bar_hover_bg_dark(),
            dormant_bar_hover_bg_light: default_dormant_bar_hover_bg_light(),
            dormant_bar_label: default_dormant_bar_label(),
            dormant_bar_font_size: default_dormant_bar_font_size(),
            double_click_pin_enabled: default_double_click_pin_enabled(),
        }
    }
}
