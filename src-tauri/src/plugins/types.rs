use serde::{Deserialize, Serialize};

/// 插件清单 — 对应磁盘上的 manifest.json
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PluginManifest {
    /// 唯一标识，e.g. "my-plugin"
    pub id: String,
    /// 显示名称
    pub name: String,
    /// 语义化版本
    pub version: String,
    /// 图标标识（Lucide 图标名或通用 fallback）
    #[serde(default = "default_plugin_icon")]
    pub icon: String,
    /// 搜索关键词
    #[serde(default)]
    pub keywords: Vec<String>,
    /// 入口文件名，默认 "index.js"
    #[serde(default = "default_plugin_main")]
    pub main: String,
}

fn default_plugin_icon() -> String {
    "box".to_string()
}

fn default_plugin_main() -> String {
    "index.js".to_string()
}

/// 插件扫描结果
#[derive(Serialize, Clone, Debug)]
pub struct PluginScanResult {
    pub manifest: PluginManifest,
    /// 扫描状态
    pub status: String, // "ok" | "invalid_manifest" | "missing_main"
    pub error: Option<String>,
}
