import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DeskPalConfig, ToolCategory } from "../types";
import { buildDefaultCategories } from "../lib/categories";

export type WindowMode = "dormant" | "hidden" | "expanded";

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
  /** 工具输入缓存 — 面板折叠/展开时保持内容 */
  textInput: string;
  setTextInput: (text: string) => void;
  diffOriginal: string;
  setDiffOriginal: (text: string) => void;
  diffModified: string;
  setDiffModified: (text: string) => void;
  jwtInput: string;
  setJwtInput: (text: string) => void;
  regexPattern: string;
  setRegexPattern: (text: string) => void;
  regexFlags: string;
  setRegexFlags: (text: string) => void;
  regexTestText: string;
  setRegexTestText: (text: string) => void;
  urlInput: string;
  setUrlInput: (text: string) => void;
  namingInput: string;
  setNamingInput: (text: string) => void;
  timestampInput: string;
  setTimestampInput: (text: string) => void;
  terminalInput: string;
  setTerminalInput: (text: string) => void;

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
      textInput: "",
      setTextInput: (text) => set({ textInput: text }),
      diffOriginal: "",
      setDiffOriginal: (text) => set({ diffOriginal: text }),
      diffModified: "",
      setDiffModified: (text) => set({ diffModified: text }),
      jwtInput: "",
      setJwtInput: (text) => set({ jwtInput: text }),
      regexPattern: "",
      setRegexPattern: (text) => set({ regexPattern: text }),
      regexFlags: "gm",
      setRegexFlags: (text) => set({ regexFlags: text }),
      regexTestText: "",
      setRegexTestText: (text) => set({ regexTestText: text }),
      urlInput: "",
      setUrlInput: (text) => set({ urlInput: text }),
      namingInput: "",
      setNamingInput: (text) => set({ namingInput: text }),
      timestampInput: "",
      setTimestampInput: (text) => set({ timestampInput: text }),
      terminalInput: "",
      setTerminalInput: (text) => set({ terminalInput: text }),

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
        textInput: state.textInput,
        diffOriginal: state.diffOriginal,
        diffModified: state.diffModified,
        jwtInput: state.jwtInput,
        regexPattern: state.regexPattern,
        regexFlags: state.regexFlags,
        regexTestText: state.regexTestText,
        urlInput: state.urlInput,
        namingInput: state.namingInput,
        timestampInput: state.timestampInput,
        terminalInput: state.terminalInput,
        jsonInput: state.jsonInput,
        jsonpathInput: state.jsonpathInput,
        categories: state.categories,
        activeCategory: state.activeCategory,
        collapsedCategories: state.collapsedCategories,
      }),
    }
  )
);
