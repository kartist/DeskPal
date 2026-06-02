import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ToolCategory } from "../types";
import { buildDefaultCategories } from "../lib/categories";

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
  dblclick_threshold_ms: number;
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
  dblclick_threshold_ms: 300,
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

  /** 工具网格编辑模式 */
  editMode: boolean;
  setEditMode: (v: boolean) => void;

  /** 分类列表 */
  categories: ToolCategory[];
  setCategories: (cats: ToolCategory[]) => void;

  /** 当前选中的分类 ID */
  activeCategory: string;
  setActiveCategory: (id: string) => void;

  /** 折叠状态：已折叠的分类 ID 列表 */
  collapsedCategories: string[];
  setCollapsedCategories: (ids: string[]) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
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

      // 工具网格分类
      editMode: false,
      setEditMode: (v) => set({ editMode: v }),
      categories: buildDefaultCategories(),
      setCategories: (cats) => set({ categories: cats }),
      activeCategory: "__frequent__",
      setActiveCategory: (id) => set({ activeCategory: id }),

      // 折叠状态
      collapsedCategories: [] as string[],
      setCollapsedCategories: (ids) => set({ collapsedCategories: ids }),
    }),
    {
      name: "deskpal-ui-state",
      partialize: (state) => ({
        categories: state.categories,
        activeCategory: state.activeCategory,
        collapsedCategories: state.collapsedCategories,
      }),
    }
  )
);
