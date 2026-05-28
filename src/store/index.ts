import { create } from "zustand";

export type WindowMode = "dormant" | "hidden" | "expanded";

export interface DeskPalConfig {
  theme: string;
  dock_position: string;
  panel_width: number;
  panel_height_ratio: number;
  auto_hide_delay: number;
  smart_recommend: boolean;
  auto_fill_from_clipboard: boolean;
  live_timestamp: boolean;
}

export const DEFAULT_CONFIG: DeskPalConfig = {
  theme: "dark",
  dock_position: "right",
  panel_width: 480,
  panel_height_ratio: 0.5,
  auto_hide_delay: 300,
  smart_recommend: true,
  auto_fill_from_clipboard: true,
  live_timestamp: true,
};

export interface AppState {
  windowMode: WindowMode;
  setWindowMode: (mode: WindowMode) => void;
  activeTool: string | null;
  setActiveTool: (toolId: string | null) => void;
  clipboardText: string;
  setClipboardText: (text: string) => void;
  config: DeskPalConfig | null;
  setConfig: (config: DeskPalConfig) => void;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  pinned: boolean;
  setPinned: (pinned: boolean) => void;
  /** JSON 工具缓存 */
  jsonInput: string;
  setJsonInput: (text: string) => void;
  jsonpathInput: string;
  setJsonpathInput: (text: string) => void;
}

export const useStore = create<AppState>((set) => ({
  windowMode: "dormant" as WindowMode,
  setWindowMode: (mode) => set({ windowMode: mode }),
  activeTool: null,
  setActiveTool: (toolId) => set({ activeTool: toolId }),
  clipboardText: "",
  setClipboardText: (text) => set({ clipboardText: text }),
  config: null,
  setConfig: (config) => set({ config, resolvedTheme: config.theme === "light" ? "light" : "dark" }),
  resolvedTheme: "dark",
  setTheme: (theme) => set({ resolvedTheme: theme }),
  pinned: false,
  setPinned: (pinned) => set({ pinned }),
  jsonInput: "",
  setJsonInput: (text) => set({ jsonInput: text }),
  jsonpathInput: "",
  setJsonpathInput: (text) => set({ jsonpathInput: text }),
}));
