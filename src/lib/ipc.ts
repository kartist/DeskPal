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

// --- Flink REST API ---
export const flinkCheckUrl = (flinkUrl: string) => invoke<void>("flink_check_url", { flinkUrl });
export const flinkListJars = (flinkUrl: string) => invoke<Array<{id: string; name: string; uploaded: number | null}>>("flink_list_jars", { flinkUrl });
export const flinkUploadJar = (flinkUrl: string, filePath: string) => invoke<string>("flink_upload_jar", { flinkUrl, filePath });
export const flinkListJobs = (flinkUrl: string) => invoke<Array<{id: string; name: string; state: string; start_time: number | null; end_time: number | null}>>("flink_list_jobs", { flinkUrl });
export const flinkCancelJob = (flinkUrl: string, jobId: string) => invoke<void>("flink_cancel_job", { flinkUrl, jobId });
export const flinkTriggerSavepoint = (flinkUrl: string, jobId: string, cancelJob: boolean) => invoke<string>("flink_trigger_savepoint", { flinkUrl, jobId, cancelJob });
export const flinkGetSavepointStatus = (flinkUrl: string, jobId: string, triggerId: string) => invoke<{status: string; location: string | null}>("flink_get_savepoint_status", { flinkUrl, jobId, triggerId });
export const flinkSubmitJob = (flinkUrl: string, jarId: string, entryClass: string, programArgs: string[], savepointPath: string | null) => invoke<string>("flink_submit_job", { flinkUrl, jarId, entryClass, programArgs, savepointPath });

// --- File Picker ---
export const pickJarFile = () => invoke<string>("pick_jar_file");

// --- Plugin Config ---
export const readPluginConfig = (pluginId: string) => invoke<string>("read_plugin_config", { pluginId });
export const writePluginConfig = (pluginId: string, config: string) => invoke<void>("write_plugin_config", { pluginId, config });
