import { useEffect, useRef, useCallback, useState } from "react";
import { useStore } from "./store";
import { togglePanel, triggerAutoHide, triggerHoverActivate, getConfig, listPlugins, getPluginCode, getPluginCss } from "./lib/ipc";
import { listenToEvents } from "./lib/events";
import { loadPluginComponent, loadPluginCSS } from "./lib/pluginLoader";
import { registerExternalComponent } from "./tools";
import { registerExternalPlugin } from "./lib/registry";
import TitleBar from "./components/TitleBar";
import ToolPanel from "./components/ToolPanel";
import ToolGridPanel from "./components/grid/ToolGridPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { StatusBar } from "./components/StatusBar";
import Toast from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles/global.css";

/**
 * 扫描并加载外部插件。
 * 每个插件加载失败不影响其他插件及内置工具。
 */
async function loadExternalPlugins() {
  try {
    const results = await listPlugins();
    const metas = results.map((r) => ({
      manifest: r.manifest,
      status: (r.status === "ok" ? "loading" : "error") as "loading" | "error",
      error: r.error ?? undefined,
    }));
    useStore.getState().setPluginMetas(metas);

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status !== "ok") continue;

      const metaIndex = i;
      try {
        // 加载 JS 组件
        const code = await getPluginCode(r.manifest.id);
        const component = loadPluginComponent(code);
        registerExternalComponent(r.manifest.id, component);

        // 加载 CSS
        const css = await getPluginCss(r.manifest.id);
        if (css.trim()) loadPluginCSS(css, r.manifest.id);

        // 注册元数据
        registerExternalPlugin({
          manifest: r.manifest,
          status: "loaded",
        });

        // 更新 store 状态
        useStore.getState().setPluginMetas(
          useStore.getState().pluginMetas.map((m, idx) =>
            idx === metaIndex ? { ...m, status: "loaded" as const } : m
          )
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[DeskPal] Plugin '${r.manifest.id}' load failed:`, msg);
        useStore.getState().setPluginMetas(
          useStore.getState().pluginMetas.map((m, idx) =>
            idx === metaIndex ? { ...m, status: "error" as const, error: msg } : m
          )
        );
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[DeskPal] Plugin scan failed:", msg);
    useStore.getState().setPluginLoadError(msg);
  }
}

function App() {
  const { windowMode, resolvedTheme, activeTool, config } = useStore();
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 面板展开动画触发（面板始终挂载，切换可见性时触发动画）
  const [animatePanel, setAnimatePanel] = useState(false);

  // 事件监听（窗口状态同步等）
  useEffect(() => {
    // 启动时加载配置
    getConfig()
      .then((cfg) => useStore.getState().setConfig(cfg))
      .catch((e) => console.error("Failed to load config:", e));

    // 加载外部插件
    loadExternalPlugins();

    const unlisten = listenToEvents();
    return unlisten;
  }, []);

  // Auto-hide: 当显示收缩态时启动定时器，鼠标移入取消，移出重启
  const startAutoHideTimer = useCallback(() => {
    const cfg = useStore.getState().config;
    if (!cfg?.auto_hide_enabled) return;  // 禁用时直接跳过

    if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    autoHideTimer.current = setTimeout(() => {
      triggerAutoHide().catch(() => {});
      autoHideTimer.current = null;
    }, cfg.auto_hide_delay_ms ?? 2000);
  }, []);

  const cancelAutoHideTimer = useCallback(() => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
      autoHideTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (windowMode === "dormant") {
      startAutoHideTimer();
    } else {
      cancelAutoHideTimer();
    }
  }, [windowMode, startAutoHideTimer, cancelAutoHideTimer]);

  // 配置变更时更新收缩态 CSS 变量（按 resolvedTheme 选择暗/亮值）
  useEffect(() => {
    if (!config) return;
    const root = document.documentElement;
    const isDark = resolvedTheme === "dark";
    root.style.setProperty('--dormant-bar-bg', isDark ? config.dormant_bar_bg_dark : config.dormant_bar_bg_light);
    root.style.setProperty('--dormant-bar-text', isDark ? config.dormant_bar_text_color_dark : config.dormant_bar_text_color_light);
    root.style.setProperty('--dormant-bar-hover', isDark ? config.dormant_bar_hover_bg_dark : config.dormant_bar_hover_bg_light);
    root.style.setProperty('--dormant-bar-font-size', `${config.dormant_bar_font_size ?? 13}px`);
  }, [config, resolvedTheme]);

  // 面板展开时触发 slideIn 动画（面板保持挂载，用 rAF 确保 display 已切换后再加动画类）
  useEffect(() => {
    if (windowMode === "expanded") {
      const raf = requestAnimationFrame(() => setAnimatePanel(true));
      return () => cancelAnimationFrame(raf);
    }
    setAnimatePanel(false);
  }, [windowMode]);

  const handleDormantMouseEnter = useCallback(() => {
    cancelAutoHideTimer();
  }, [cancelAutoHideTimer]);

  const handleDormantMouseLeave = useCallback(() => {
    startAutoHideTimer();
  }, [startAutoHideTimer]);

  // Hidden 态：鼠标进入时触发恢复
  const handleHiddenMouseEnter = useCallback(() => {
    triggerHoverActivate().catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme]);

  const handleToggle = async () => {
    try {
      const result = await togglePanel();
      useStore.getState().setWindowMode(result as "dormant" | "hidden" | "expanded");
    } catch (e) {
      console.error("Failed to toggle panel:", e);
    }
  };

  return (
    <>
      {/* Dormant bar overlay */}
      {(windowMode === "dormant") && (
        <div className="dormant-bar-fill"
          onMouseEnter={handleDormantMouseEnter}
          onMouseLeave={handleDormantMouseLeave}
        >
          <div className="dormant-bar" onClick={handleToggle}>
            <span className="dormant-bar-label">{config?.dormant_bar_label || "DESKPAL"}</span>
          </div>
        </div>
      )}

      {/* Hidden bar overlay */}
      {windowMode === "hidden" && (
        <div className="hidden-bar" onMouseEnter={handleHiddenMouseEnter} />
      )}

      {/* Panel: always mounted, visibility toggled by CSS to preserve all internal state */}
      <div className={`deskpal-panel${windowMode === "expanded" ? "" : " panel-hidden"}${animatePanel ? " panel-enter" : ""}`}>
        {activeTool === "settings" ? (
          <>
            <TitleBar />
            <SettingsPanel />
          </>
        ) : activeTool && activeTool !== "settings" ? (
          <>
            <TitleBar />
            <ErrorBoundary toolId={activeTool}>
              <ToolPanel />
            </ErrorBoundary>
          </>
        ) : (
          <>
            <TitleBar />
            <ToolGridPanel />
            <StatusBar />
            <div className="resize-grip" title="拖拽调整高度" />
          </>
        )}
      </div>
      <Toast />
    </>
  );
}

export default App;
