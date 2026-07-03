mod window;
mod hotkey;
mod tray;
mod detect;
mod config;
mod plugins;
mod flink;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{Emitter, Manager, WindowEvent};
use window::manager::{WindowManager, WindowState};
use window::trigger::Trigger;

#[tauri::command]
fn toggle_panel(state: tauri::State<'_, Mutex<WindowManager>>) -> Result<String, String> {
    let mut wm = state.lock().map_err(|e| e.to_string())?;
    wm.on_trigger(&Trigger::Toggle).map_err(|e| e.to_string())?;
    let new_state = match wm.state() {
        WindowState::Dormant if wm.current_dormant_width() <= 10.0 => "hidden",
        WindowState::Dormant => "dormant",
        WindowState::Expanded => "expanded",
    };
    Ok(new_state.to_string())
}

/// 窗口拖拽
#[tauri::command]
fn drag_window(app: tauri::AppHandle) -> Result<(), String> {
    eprintln!("[DeskPal] drag_window called");
    if let Some(window) = app.get_webview_window("main") {
        window.start_dragging().map_err(|e| {
            eprintln!("[DeskPal] start_dragging error: {:?}", e);
            format!("{:?}", e)
        })
    } else {
        eprintln!("[DeskPal] main window not found!");
        Err("main window not found".to_string())
    }
}

/// Return the default config (factory reset).
#[tauri::command]
fn reset_config() -> crate::config::types::DeskPalConfig {
    crate::config::types::DeskPalConfig::default()
}

/// Read the current config from the managed ConfigLoader.
#[tauri::command]
fn get_config(
    loader: tauri::State<'_, Mutex<crate::config::loader::ConfigLoader>>,
) -> Result<crate::config::types::DeskPalConfig, String> {
    loader
        .lock()
        .map_err(|e| e.to_string())
        .map(|l| l.config().clone())
}

/// Update the config in memory and persist to disk.
#[tauri::command]
fn set_config(
    loader: tauri::State<'_, Mutex<crate::config::loader::ConfigLoader>>,
    config: crate::config::types::DeskPalConfig,
    wm: tauri::State<'_, Mutex<WindowManager>>,
) -> Result<(), String> {
    let mut l = loader.lock().map_err(|e| e.to_string())?;
    *l.config_mut() = config.clone();
    crate::config::loader::ConfigLoader::save(&config)?;

    // Apply geometry changes immediately
    if let Ok(mut manager) = wm.lock() {
        let _ = manager.apply_config(&config);
    }

    Ok(())
}

/// 列出所有已发现的插件（扫描磁盘）
#[tauri::command]
fn list_plugins(
    scanner: tauri::State<'_, Mutex<crate::plugins::scanner::PluginScanner>>,
) -> Vec<crate::plugins::types::PluginScanResult> {
    scanner.lock().map(|s| s.scan()).unwrap_or_default()
}

/// 读取指定插件的入口 JS 代码
#[tauri::command]
fn get_plugin_code(
    scanner: tauri::State<'_, Mutex<crate::plugins::scanner::PluginScanner>>,
    plugin_id: String,
) -> Result<String, String> {
    scanner.lock().map_err(|e| e.to_string())?.read_code(&plugin_id)
}

/// 读取指定插件的 CSS 代码
#[tauri::command]
fn get_plugin_css(
    scanner: tauri::State<'_, Mutex<crate::plugins::scanner::PluginScanner>>,
    plugin_id: String,
) -> Result<String, String> {
    scanner.lock().map_err(|e| e.to_string())?.read_css(&plugin_id)
}

/// 打开插件根目录（用系统文件管理器）
#[tauri::command]
fn open_plugin_dir(
    scanner: tauri::State<'_, Mutex<crate::plugins::scanner::PluginScanner>>,
) -> Result<(), String> {
    let path = scanner.lock().map_err(|e| e.to_string())?.plugins_dir_path();
    opener::open(path).map_err(|e| format!("Failed to open plugin dir: {}", e))
}

/// AutoHide: from frontend when cursor leaves dormant bar for 2s
#[tauri::command]
fn trigger_auto_hide(state: tauri::State<'_, Mutex<WindowManager>>) -> Result<(), String> {
    let mut wm = state.lock().map_err(|e| e.to_string())?;
    if *wm.state() != WindowState::Dormant {
        return Ok(());
    }
    wm.on_trigger(&Trigger::AutoHide).map_err(|e| e.to_string())
}

/// HoverActivate: from frontend when cursor enters hidden 1px bar
#[tauri::command]
fn trigger_hover_activate(state: tauri::State<'_, Mutex<WindowManager>>) -> Result<(), String> {
    let mut wm = state.lock().map_err(|e| e.to_string())?;
    if *wm.state() != WindowState::Dormant || wm.current_dormant_width() > 10.0 {
        return Ok(());
    }
    wm.on_trigger(&Trigger::HoverActivate).map_err(|e| e.to_string())
}

/// 根据预设调整展开态宽度（"narrow"="窄", "wide"="宽"）。
/// 返回实际设置后的逻辑像素宽度。
#[tauri::command]
fn set_width_preset(
    preset: String,
    wm: tauri::State<'_, Mutex<WindowManager>>,
) -> Result<f64, String> {
    let mut manager = wm.lock().map_err(|e| e.to_string())?;
    if *manager.state() != WindowState::Expanded {
        return Err("panel is not expanded".into());
    }
    manager.resize_to_preset(&preset).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let window = app
                .get_webview_window("main")
                .expect("main window must exist");

            let state_dir = app.path().app_data_dir().expect("app data dir");
            let state_path = state_dir.join("state.json");

            let config_loader = crate::config::loader::ConfigLoader::new();
            let _ = config_loader.ensure_exists();
            app.manage(std::sync::Mutex::new(config_loader));

            let config_state = app.state::<std::sync::Mutex<crate::config::loader::ConfigLoader>>();
            let config = config_state.lock().map(|l| l.config().clone()).unwrap_or_default();

            let wm = WindowManager::new(window.clone(), &state_path, &config);
            app.manage(Mutex::new(wm));

            let plugin_scanner = crate::plugins::scanner::PluginScanner::new();
            app.manage(std::sync::Mutex::new(plugin_scanner));

            let state = app.state::<Mutex<WindowManager>>();
            if let Ok(mut wm) = state.lock() {
                let _ = wm.on_trigger(&Trigger::Init);
            }

            if let Err(e) = hotkey::register_hotkey(app.handle()) {
                eprintln!("Failed to register hotkey: {}", e);
            }
            if let Err(e) = tray::create_tray(app.handle()) {
                eprintln!("Failed to create tray: {}", e);
            }

            let sp = state_path.clone();
            let should_blur = Arc::new(AtomicBool::new(false));
            let handle = app.handle().clone();

            window.on_window_event(move |event| {
                match event {
                    WindowEvent::Resized(size) => {
                        let scale = handle
                            .get_webview_window("main")
                            .and_then(|w| w.scale_factor().ok())
                            .unwrap_or(1.0);
                        let h = ((size.height as f64) / scale).max(300.0).min(2000.0);
                        let w = ((size.width as f64) / scale).max(350.0).min(2000.0);
                        let mut data = std::fs::read_to_string(&sp)
                            .ok()
                            .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
                            .unwrap_or(serde_json::json!({}));
                        data["panel_height"] = serde_json::json!(h);
                        data["panel_width"] = serde_json::json!(w);
                        let _ = std::fs::create_dir_all(sp.parent().unwrap());
                        let _ = std::fs::write(&sp, serde_json::to_string_pretty(&data).unwrap_or_default());
                        should_blur.store(false, Ordering::SeqCst);

                        // 判定宽度预设并通知前端
                        let preset = {
                            if let Some(win) = handle.get_webview_window("main") {
                                if let Ok(Some(monitor)) = win.current_monitor() {
                                    let ms = monitor.size();
                                    let mw = ms.width as f64 / scale;
                                    let narrow = mw / 6.0;
                                    let wide = mw * 2.0 / 3.0;
                                    let tolerance = 50.0;
                                    if (w - narrow).abs() <= tolerance { "narrow" }
                                    else if (w - wide).abs() <= tolerance { "wide" }
                                    else { "custom" }
                                } else { "custom" }
                            } else { "custom" }
                        };
                        if let Some(win) = handle.get_webview_window("main") {
                            let _ = win.emit("panel-resized", serde_json::json!({
                                "width": w,
                                "preset": preset,
                            }));
                        }
                    }
                    WindowEvent::Focused(true) => {
                        should_blur.store(false, Ordering::SeqCst);
                    }
                    WindowEvent::Focused(false) => {
                        should_blur.store(true, Ordering::SeqCst);
                        let sb = should_blur.clone();
                        let h = handle.clone();
                        std::thread::spawn(move || {
                            std::thread::sleep(Duration::from_millis(150));
                            if sb.swap(false, Ordering::SeqCst) {
                                if let Some(state) = h.try_state::<Mutex<WindowManager>>() {
                                    if let Ok(wm) = state.lock() {
                                        if wm.state() == &WindowState::Expanded {
                                            let _ = wm
                                                .window()
                                                .emit("window-blur", serde_json::json!({}));
                                        }
                                    }
                                }
                            }
                        });
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            toggle_panel,
            drag_window,
            reset_config,
            get_config,
            set_config,
            trigger_auto_hide,
            trigger_hover_activate,
            set_width_preset,
            list_plugins,
            get_plugin_code,
            get_plugin_css,
            open_plugin_dir,
            flink::api::flink_check_url,
            flink::api::flink_list_jars,
            flink::api::flink_upload_jar,
            flink::api::flink_list_jobs,
            flink::api::flink_cancel_job,
            flink::api::flink_trigger_savepoint,
            flink::api::flink_get_savepoint_status,
            flink::api::flink_submit_job,
            flink::api::pick_jar_file,
            flink::api::read_plugin_config,
            flink::api::write_plugin_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}