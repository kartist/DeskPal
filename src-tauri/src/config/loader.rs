use std::fs;
use std::io::Write;
use std::path::PathBuf;

use crate::config::types::DeskPalConfig;

/// Loads and saves DeskPal configuration as JSON.
///
/// Config directory:
/// - Windows: `%APPDATA%/deskpal/`
/// - Other:   `$XDG_CONFIG_HOME/deskpal/` or `~/.config/deskpal/`
pub struct ConfigLoader {
    config_dir: PathBuf,
    config_path: PathBuf,
    config: DeskPalConfig,
}

impl ConfigLoader {
    /// Create a new ConfigLoader, resolving the config directory path
    /// and loading the existing config (or default if missing).
    pub fn new() -> Self {
        let config_dir = get_config_dir();
        let config_path = config_dir.join("config.json");
        // Load existing config from disk, fall back to default
        let config = if config_path.exists() {
            fs::read_to_string(&config_path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            DeskPalConfig::default()
        };
        Self {
            config_dir,
            config_path,
            config,
        }
    }

    /// Return an immutable reference to the in-memory config.
    pub fn config(&self) -> &DeskPalConfig {
        &self.config
    }

    /// Return a mutable reference to the in-memory config.
    pub fn config_mut(&mut self) -> &mut DeskPalConfig {
        &mut self.config
    }

    /// If the config file does not exist on disk, write the current
    /// in-memory config to disk (ensuring defaults are persisted).
    pub fn ensure_exists(&self) -> Result<(), String> {
        if !self.config_path.exists() {
            Self::save(&self.config)?;
        }
        Ok(())
    }

    /// Save configuration to disk with atomic write.
    ///
    /// Writes to a `.json.tmp` temporary file first, then renames it to
    /// `config.json` to prevent corruption on interrupted writes.
    pub fn save(config: &DeskPalConfig) -> Result<(), String> {
        let loader = Self::new();
        loader.ensure_config_dir()?;

        let json = serde_json::to_string_pretty(config).map_err(|e| {
            format!("Failed to serialize config: {}", e)
        })?;

        // Atomic write: write to .tmp then rename
        let tmp_path = loader.config_path.with_extension("json.tmp");
        {
            let mut file = fs::File::create(&tmp_path).map_err(|e| {
                format!("Failed to create temp file '{}': {}", tmp_path.display(), e)
            })?;
            file.write_all(json.as_bytes()).map_err(|e| {
                format!("Failed to write temp file '{}': {}", tmp_path.display(), e)
            })?;
            file.sync_all().map_err(|e| {
                format!("Failed to sync temp file '{}': {}", tmp_path.display(), e)
            })?;
        }
        fs::rename(&tmp_path, &loader.config_path).map_err(|e| {
            format!(
                "Failed to rename temp file '{}' to '{}': {}",
                tmp_path.display(),
                loader.config_path.display(),
                e
            )
        })?;

        Ok(())
    }

    fn ensure_config_dir(&self) -> Result<(), String> {
        fs::create_dir_all(&self.config_dir).map_err(|e| {
            format!("Failed to create config directory '{}': {}", self.config_dir.display(), e)
        })
    }
}

/// Resolve the platform-specific config directory for DeskPal.
fn get_config_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("APPDATA") {
            PathBuf::from(appdata).join("deskpal")
        } else {
            // Last-resort fallback
            PathBuf::from(r"C:\Users\Default\AppData\Roaming\deskpal")
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
            PathBuf::from(xdg).join("deskpal")
        } else if let Ok(home) = std::env::var("HOME") {
            PathBuf::from(home).join(".config").join("deskpal")
        } else {
            PathBuf::from(".config/deskpal")
        }
    }
}
