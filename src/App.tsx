import { useEffect, useRef, useCallback } from "react";
import { useStore } from "./store";
import { togglePanel, triggerAutoHide, triggerHoverActivate, getConfig } from "./lib/ipc";
import { listenToEvents } from "./lib/events";
import TitleBar from "./components/TitleBar";
import ToolPanel from "./components/ToolPanel";
import ToolGridPanel from "./components/grid/ToolGridPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { StatusBar } from "./components/StatusBar";
import Toast from "./components/Toast";
import "./styles/global.css";

function App() {
  const { windowMode, resolvedTheme, activeTool, config } = useStore();
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 事件监听（窗口状态同步等）
  useEffect(() => {
    // 启动时加载配置
    getConfig()
      .then((cfg) => useStore.getState().setConfig(cfg))
      .catch((e) => console.error("Failed to load config:", e));

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

  // 配置变更时更新收缩态 CSS 变量
  useEffect(() => {
    if (!config) return;
    const root = document.documentElement;
    root.style.setProperty('--dormant-bar-bg', config.dormant_bar_bg || '#1C2333');
    root.style.setProperty('--dormant-bar-text', config.dormant_bar_text_color || '#58A6FF');
  }, [config]);

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

      {windowMode === "hidden" && (
        <div className="hidden-bar" onMouseEnter={handleHiddenMouseEnter} />
      )}

      {windowMode === "expanded" && activeTool === "settings" ? (
        <div className="deskpal-panel panel-enter">
          <TitleBar />
          <SettingsPanel />
        </div>
      ) : windowMode === "expanded" && activeTool && activeTool !== "settings" ? (
        <div className="deskpal-panel panel-enter">
          <TitleBar />
          <ToolPanel />
        </div>
      ) : windowMode === "expanded" && (
        <div className="deskpal-panel panel-enter">
          <TitleBar />
          <ToolGridPanel />
          <StatusBar />
          <div className="resize-grip" title="拖拽调整高度" />
        </div>
      )}
      <Toast />
    </>
  );
}

export default App;
