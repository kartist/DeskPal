import { useEffect, useRef, useCallback } from "react";
import { useStore } from "./store";
import { togglePanel, triggerAutoHide, triggerHoverActivate } from "./lib/ipc";
import { listenToEvents } from "./lib/events";
import TitleBar from "./components/TitleBar";
import { ToolGrid } from "./components/ToolGrid";
import { SettingsPanel } from "./components/SettingsPanel";
import ToolPanel from "./components/ToolPanel";
import { StatusBar } from "./components/StatusBar";
import Toast from "./components/Toast";
import "./styles/global.css";

function App() {
  const { windowMode, resolvedTheme, activeTool } = useStore();
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 事件监听（窗口状态同步等）
  useEffect(() => {
    const unlisten = listenToEvents();
    return unlisten;
  }, []);

  // Auto-hide: 当显示收缩态时启动 2s 定时器，鼠标移入取消，移出重启
  const startAutoHideTimer = useCallback(() => {
    if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    autoHideTimer.current = setTimeout(() => {
      triggerAutoHide().catch(() => {});
      autoHideTimer.current = null;
    }, 2000);
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
            <span className="dormant-bar-label">DESKPAL</span>
          </div>
          <div className="dock-bar-inline">
            <div className="dock-icon" onClick={handleToggle} title="时间戳">⏰</div>
            <div className="dock-icon" onClick={handleToggle} title="JSON">{ }</div>
            <div className="dock-icon" onClick={handleToggle} title="文本">📝</div>
            <div className="dock-icon" onClick={handleToggle} title="变量命名">Aa</div>
            <div className="dock-icon" onClick={handleToggle} title="文本比对">⇄</div>
            <div className="dock-icon" onClick={handleToggle} title="UUID">🎲</div>
            <div className="dock-icon" onClick={handleToggle} title="随机字符">🔀</div>
            <div className="dock-icon" onClick={handleToggle} title="URL">🔗</div>
            <div className="dock-icon" onClick={handleToggle} title="正则">.*</div>
            <div className="dock-icon" onClick={handleToggle} title="JWT">🛡</div>
            <div className="dock-icon" onClick={handleToggle} title="终端">▶</div>
            <div className="dock-icon" onClick={() => { handleToggle(); useStore.getState().setActiveTool('settings'); }} title="设置">⚙️</div>
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
          <div className="tool-grid-wrapper">
            <ToolGrid />
          </div>
          <StatusBar />
          <div className="resize-grip" title="拖拽调整高度" />
        </div>
      )}
      <Toast />
    </>
  );
}

export default App;
