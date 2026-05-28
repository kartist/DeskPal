mod window;
mod hotkey;
mod tray;
mod detect;
mod config;

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
) -> Result<(), String> {
    let mut l = loader.lock().map_err(|e| e.to_string())?;
    *l.config_mut() = config.clone();
    crate::config::loader::ConfigLoader::save(&config)
}

/// AutoHide: from frontend when cursor leaves dormant bar for 2s
#[tauri::command]
fn trigger_auto_hide(state: tauri::State<'_, Mutex<WindowManager>>) -> Result<(), String> {
    let mut wm = state.lock().map_err(|e| e.to_string())?;
    if *wm.state() != WindowState::Dormant {
        return Ok(()); // 非 Dormant 态忽略
    }
    wm.on_trigger(&Trigger::AutoHide).map_err(|e| e.to_string())
}

/// HoverActivate: from frontend when cursor enters hidden 1px bar
#[tauri::command]
fn trigger_hover_activate(state: tauri::State<'_, Mutex<WindowManager>>) -> Result<(), String> {
    let mut wm = state.lock().map_err(|e| e.to_string())?;
    if *wm.state() != WindowState::Dormant || wm.current_dormant_width() > 10.0 {
        return Ok(()); // 仅 Dormant 且宽度≤10px 时才激活
    }
    wm.on_trigger(&Trigger::HoverActivate).map_err(|e| e.to_string())
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

            // Initialize config loader and manage as state
            let config_loader = crate::config::loader::ConfigLoader::new();
            let _ = config_loader.ensure_exists();
            app.manage(std::sync::Mutex::new(config_loader));

            // Pass config to WindowManager for default widths
            let config_state = app.state::<std::sync::Mutex<crate::config::loader::ConfigLoader>>();
            let config = config_state.lock().map(|l| l.config().clone()).unwrap_or_default();

            let wm = WindowManager::new(window.clone(), &state_path, &config);
            app.manage(Mutex::new(wm));

            // 启动即显示收缩态
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

            // Resize → save height directly; Blur → delay 150ms, cancel if resize/focus
            // AutoHide → 2s after cursor leaves Dormant, cancel on cursor enter
            let sp = state_path.clone();
            let should_blur = Arc::new(AtomicBool::new(false));
            let handle = app.handle().clone();

            window.on_window_event(move |event| {
                match event {
                    WindowEvent::Resized(size) => {
                        // Save height + width — position is saved by WindowManager::save_position
                        let h = size.height.max(300).min(2000) as f64;
                        let w = size.width.max(100).min(2000) as f64;
                        let data = serde_json::json!({"panel_height": h, "panel_width": w});
                        let _ = std::fs::create_dir_all(sp.parent().unwrap());
                        let _ = std::fs::write(&sp, serde_json::to_string_pretty(&data).unwrap_or_default());
                        // Cancel any pending blur (this is a resize, not real blur)
                        should_blur.store(false, Ordering::SeqCst);
                    }
                    WindowEvent::Focused(true) => {
                        // Window refocused — cancel pending blur
                        should_blur.store(false, Ordering::SeqCst);
                    }
                    WindowEvent::Focused(false) => {
                        // Possible blur — delay 150ms, cancel if Resized/Focused(true) arrives
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
            get_config,
            set_config,
            trigger_auto_hide,
            trigger_hover_activate,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
