use crate::window::manager::WindowManager;
use crate::window::trigger::Trigger;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

fn do_toggle(app: &AppHandle) {
    let state = app.state::<Mutex<WindowManager>>();
    if let Ok(mut wm) = state.lock() {
        let _ = wm.on_trigger(&Trigger::Toggle);
    };
}

pub fn register_hotkey(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyD);
    app.global_shortcut().register(shortcut)?;
    // Use global handler: fires when registered shortcut is pressed
    app.global_shortcut().on_shortcut(shortcut, move |app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            do_toggle(app);
        }
    })?;

    Ok(())
}
