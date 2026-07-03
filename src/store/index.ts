import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DeskPalConfig, ToolCategory, TermPreset, PluginMeta } from "../types";
import { buildDefaultCategories } from "../lib/categories";

/** 构建默认终端预设命令 */
export function buildDefaultTerminalPresets(): TermPreset[] {
  return [
    { id: "preset-1", label: "ipconfig", cmd: "ipconfig", note: "查看本机网络配置" },
    { id: "preset-2", label: "dir", cmd: "dir", note: "列出当前目录" },
    { id: "preset-3", label: "echo hello", cmd: "echo hello", note: "测试命令执行" },
    { id: "preset-4", label: "ping localhost", cmd: "ping -n 4 localhost", note: "Ping 本机 4 次测试网络" },
  ];
}

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
  /** 当前面板逻辑宽度（由 Rust panel-resized 事件更新） */
  panelWidth: number;
  setPanelWidth: (w: number) => void;
  /** 宽度预设模式 */
  widthPreset: "narrow" | "wide" | "custom";
  setWidthPreset: (p: "narrow" | "wide" | "custom") => void;

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

  /** 终端预设命令 */
  terminalPresets: TermPreset[];
  setTerminalPresets: (presets: TermPreset[]) => void;

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

  /** 外部插件元数据 */
  pluginMetas: PluginMeta[];
  setPluginMetas: (metas: PluginMeta[]) => void;

  /** 全局插件加载错误 */
  pluginLoadError: string | null;
  setPluginLoadError: (err: string | null) => void;
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

      // 宽度预设（运行时状态，不持久化）
      panelWidth: 480,
      setPanelWidth: (w) => set({ panelWidth: w }),
      widthPreset: "custom",
      setWidthPreset: (p) => set({ widthPreset: p }),

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

      // 终端预设命令
      terminalPresets: buildDefaultTerminalPresets(),
      setTerminalPresets: (presets) => set({ terminalPresets: presets }),

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

      // 外部插件
      pluginMetas: [] as PluginMeta[],
      setPluginMetas: (metas) => set({ pluginMetas: metas }),
      pluginLoadError: null,
      setPluginLoadError: (err) => set({ pluginLoadError: err }),
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
        terminalPresets: state.terminalPresets,
        jsonInput: state.jsonInput,
        jsonpathInput: state.jsonpathInput,
        categories: state.categories,
        activeCategory: state.activeCategory,
        collapsedCategories: state.collapsedCategories,
      }),
    }
  )
);
