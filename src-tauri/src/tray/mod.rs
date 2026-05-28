use crate::window::manager::WindowManager;
use crate::window::trigger::Trigger;
use std::sync::Mutex;
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

fn do_toggle(app: &AppHandle) {
    let state = app.state::<Mutex<WindowManager>>();
    if let Ok(mut wm) = state.lock() {
        let _ = wm.on_trigger(&Trigger::Toggle);
    };
}

pub fn create_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show = tauri::menu::MenuItem::with_id(app, "show", "显示/隐藏", true, None::<&str>)?;
    let quit = tauri::menu::MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = tauri::menu::Menu::with_items(app, &[&show, &quit])?;

    let mut tray_builder = TrayIconBuilder::new().icon_as_template(false).menu(&menu);

    // 使用应用图标作为托盘图标
    if let Some(icon) = app.default_window_icon().cloned() {
        tray_builder = tray_builder.icon(icon);
    }

    tray_builder
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                do_toggle(app);
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                do_toggle(app);
            }
        })
        .build(app)?;

    Ok(())
}
