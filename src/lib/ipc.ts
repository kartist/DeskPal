import { invoke } from "@tauri-apps/api/core";
import type { DeskPalConfig, PluginScanResult } from "../types";

export const togglePanel = () => invoke<string>("toggle_panel");
export const getConfig = () => invoke<DeskPalConfig>("get_config");
export const setConfig = (config: DeskPalConfig) => invoke<void>("set_config", { config });
export const resetConfig = () => invoke<DeskPalConfig>("reset_config");
export const triggerAutoHide = () => invoke<void>("trigger_auto_hide");
export const triggerHoverActivate = () => invoke<void>("trigger_hover_activate");

// --- 外部插件 ---
export const listPlugins = () => invoke<PluginScanResult[]>("list_plugins");
export const getPluginCode = (pluginId: string) => invoke<string>("get_plugin_code", { pluginId });
export const getPluginCss = (pluginId: string) => invoke<string>("get_plugin_css", { pluginId });
export const openPluginDir = () => invoke<void>("open_plugin_dir");
