import { invoke } from "@tauri-apps/api/core";
import type { DeskPalConfig } from "../types";

export const togglePanel = () => invoke<string>("toggle_panel");
export const getConfig = () => invoke<DeskPalConfig>("get_config");
export const setConfig = (config: DeskPalConfig) => invoke<void>("set_config", { config });
export const resetConfig = () => invoke<DeskPalConfig>("reset_config");
export const triggerAutoHide = () => invoke<void>("trigger_auto_hide");
export const triggerHoverActivate = () => invoke<void>("trigger_hover_activate");
