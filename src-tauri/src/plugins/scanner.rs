use std::fs;
use std::path::PathBuf;

use super::types::{PluginManifest, PluginScanResult};

/// 插件扫描与代码读取器。
///
/// 插件根目录：
/// - Windows: `%APPDATA%/deskpal/plugins/`
/// - Other:   `$XDG_CONFIG_HOME/deskpal/plugins/` or `~/.config/deskpal/plugins/`
pub struct PluginScanner {
    plugins_dir: PathBuf,
}

impl PluginScanner {
    pub fn new() -> Self {
        let plugins_dir = get_plugins_dir();
        Self { plugins_dir }
    }

    /// 扫描插件目录，返回所有发现的插件及其状态。
    pub fn scan(&self) -> Vec<PluginScanResult> {
        let mut results = Vec::new();

        let entries = match fs::read_dir(&self.plugins_dir) {
            Ok(entries) => entries,
            Err(_) => {
                // 目录不存在或无法读取 → 返回空列表（不是错误）
                return results;
            }
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            let manifest_path = path.join("manifest.json");
            let manifest: PluginManifest = match fs::read_to_string(&manifest_path) {
                Ok(content) => {
                    // 去除 UTF-8 BOM（PowerShell Out-File -Encoding utf8 会写入）
                    let clean = content.trim_start_matches('\u{FEFF}');
                    match serde_json::from_str(clean) {
                        Ok(m) => m,
                        Err(e) => {
                            results.push(PluginScanResult {
                                manifest: PluginManifest {
                                    id: path
                                        .file_name()
                                        .map(|n| n.to_string_lossy().to_string())
                                        .unwrap_or_default(),
                                    name: "Unknown".to_string(),
                                    version: "0.0.0".to_string(),
                                    icon: "box".to_string(),
                                    keywords: vec![],
                                    main: "index.js".to_string(),
                                },
                                status: "invalid_manifest".to_string(),
                                error: Some(format!("JSON parse error: {}", e)),
                            });
                            continue;
                        }
                    }
                },
                Err(e) => {
                    results.push(PluginScanResult {
                        manifest: PluginManifest {
                            id: path
                                .file_name()
                                .map(|n| n.to_string_lossy().to_string())
                                .unwrap_or_default(),
                            name: "Unknown".to_string(),
                            version: "0.0.0".to_string(),
                            icon: "box".to_string(),
                            keywords: vec![],
                            main: "index.js".to_string(),
                        },
                        status: "invalid_manifest".to_string(),
                        error: Some(format!("Cannot read manifest.json: {}", e)),
                    });
                    continue;
                }
            };

            // Check required fields
            if manifest.id.trim().is_empty() {
                results.push(PluginScanResult {
                    manifest: manifest.clone(),
                    status: "invalid_manifest".to_string(),
                    error: Some("manifest.json missing required field: id".to_string()),
                });
                continue;
            }

            // Check main file exists
            let main_path = path.join(&manifest.main);
            if !main_path.exists() {
                results.push(PluginScanResult {
                    manifest: manifest.clone(),
                    status: "missing_main".to_string(),
                    error: Some(format!(
                        "Entry file '{}' not found in plugin directory",
                        manifest.main
                    )),
                });
                continue;
            }

            results.push(PluginScanResult {
                manifest,
                status: "ok".to_string(),
                error: None,
            });
        }

        results
    }

    /// 读取插件的入口 JS 代码
    pub fn read_code(&self, plugin_id: &str) -> Result<String, String> {
        // 安全校验：plugin_id 不能包含路径穿越字符
        if plugin_id.contains('/') || plugin_id.contains('\\') || plugin_id.contains("..") {
            return Err("Invalid plugin id".to_string());
        }

        let plugin_dir = self.plugins_dir.join(plugin_id);
        if !plugin_dir.exists() || !plugin_dir.is_dir() {
            return Err(format!("Plugin '{}' not found", plugin_id));
        }

        // 先读 manifest 确定 main 文件名
        let manifest: PluginManifest = fs::read_to_string(plugin_dir.join("manifest.json"))
            .ok()
            .map(|s| s.trim_start_matches('\u{FEFF}').to_string())
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(PluginManifest {
                id: plugin_id.to_string(),
                name: plugin_id.to_string(),
                version: "0.0.0".to_string(),
                icon: "box".to_string(),
                keywords: vec![],
                main: "index.js".to_string(),
            });

        let main_path = plugin_dir.join(&manifest.main);
        fs::read_to_string(&main_path)
            .map_err(|e| format!("Failed to read '{}': {}", main_path.display(), e))
    }

    /// 读取插件的 CSS 代码（如果存在）
    pub fn read_css(&self, plugin_id: &str) -> Result<String, String> {
        if plugin_id.contains('/') || plugin_id.contains('\\') || plugin_id.contains("..") {
            return Err("Invalid plugin id".to_string());
        }

        let css_path = self.plugins_dir.join(plugin_id).join("style.css");
        if !css_path.exists() {
            return Ok(String::new()); // 不存在 CSS 不是错误
        }

        fs::read_to_string(&css_path)
            .map_err(|e| format!("Failed to read '{}': {}", css_path.display(), e))
    }

    /// 返回插件根目录路径
    pub fn plugins_dir_path(&self) -> String {
        self.plugins_dir.to_string_lossy().to_string()
    }
}

/// 解析平台特定的插件目录
fn get_plugins_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("APPDATA") {
            PathBuf::from(appdata).join("deskpal").join("plugins")
        } else {
            PathBuf::from(r"C:\Users\Default\AppData\Roaming\deskpal\plugins")
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
            PathBuf::from(xdg).join("deskpal").join("plugins")
        } else if let Ok(home) = std::env::var("HOME") {
            PathBuf::from(home).join(".config").join("deskpal").join("plugins")
        } else {
            PathBuf::from(".config/deskpal/plugins")
        }
    }
}
