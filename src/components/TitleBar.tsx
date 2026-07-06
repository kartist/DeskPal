import { useEffect, useRef } from "react";
import { ChevronRight, Pin, PinOff, ArrowLeft, Settings, RotateCcw, Save, Pencil, Check } from "lucide-react";
import { togglePanel, setConfig as ipcSetConfig, resetConfig, setWidthPreset } from "../lib/ipc";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../store";
import { useToast } from "../store/toastStore";
import { toolRegistry } from "../lib/registry";

function WidthControls() {
  const widthPreset = useStore((s) => s.widthPreset);

  const handlePreset = (preset: "narrow" | "wide") => {
    setWidthPreset(preset).catch(console.error);
  };

  return (
    <div className="width-controls">
      <button
        className={`width-btn ${widthPreset === "narrow" ? "active" : ""}`}
        onClick={() => handlePreset("narrow")}
      >{"\u25BA\u25C4"}</button>
      <button
        className={`width-btn ${widthPreset === "wide" ? "active" : ""}`}
        onClick={() => handlePreset("wide")}
      >{"\u25C4\u25BA"}</button>
    </div>
  );
}

export default function TitleBar() {
  const pinned = useStore((s) => s.pinned);
  const setPinned = useStore((s) => s.setPinned);
  const editMode = useStore((s) => s.editMode);
  const setEditMode = useStore((s) => s.setEditMode);
  const activeTool = useStore((s) => s.activeTool);
  const setActiveTool = useStore((s) => s.setActiveTool);

  const toolMeta = activeTool ? toolRegistry.find((t) => t.id === activeTool) : null;

  const lastMouseUpRef = useRef(0);
  const mouseDownRef = useRef(false);
  const dragStartedRef = useRef(false);

  useEffect(() => {
    const onUp = () => {
      mouseDownRef.current = false;
      dragStartedRef.current = false;
      lastMouseUpRef.current = Date.now();
    };
    document.addEventListener("mouseup", onUp);
    return () => document.removeEventListener("mouseup", onUp);
  }, []);

  useEffect(() => {
    const onMove = () => {
      if (mouseDownRef.current && !dragStartedRef.current) {
        dragStartedRef.current = true;
        invoke("drag_window").catch((err) =>
          console.error("drag_window error:", err)
        );
      }
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  const handleClose = () => {
    togglePanel().catch(() => {});
  };

  const handlePinToggle = () => {
    setPinned(!pinned);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;

    const cfg = useStore.getState().config;

    if (!cfg?.double_click_pin_enabled) {
      mouseDownRef.current = true;
      dragStartedRef.current = false;
      return;
    }

    const now = Date.now();
    const threshold = cfg?.dblclick_threshold_ms ?? 300;
    if (now - lastMouseUpRef.current < threshold) {
      lastMouseUpRef.current = 0;
      setPinned(!pinned);
      return;
    }

    mouseDownRef.current = true;
    dragStartedRef.current = false;
  };

  if (activeTool) {
    return (
      <div className="titlebar" onMouseDown={handleMouseDown}>
        <div className="titlebar-left">
          <button
            className="titlebar-btn"
            onClick={() => setActiveTool(null)}
            title="返回"
            aria-label="返回工具列表"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13,
              fontWeight: 500,
              width: "auto",
              padding: "0 8px",
            }}
          >
            <ArrowLeft size={16} />
            返回
          </button>
          <span className="titlebar-title" style={{ fontSize: 13, fontWeight: 600 }}>
            {toolMeta?.name ?? activeTool}
          </span>
        </div>
        <div className="titlebar-center">
          <WidthControls />
        </div>
        <div className="titlebar-right">
          <button
            className={`titlebar-btn ${pinned ? "active" : ""}`}
            onClick={handlePinToggle}
            title={pinned ? "取消固定" : "固定面板"}
            aria-label={pinned ? "取消固定" : "固定面板"}
          >
            {pinned ? <Pin size={14} /> : <PinOff size={14} />}
          </button>
          {activeTool === "settings" ? (
            <>
              <button
                className="titlebar-btn"
                onClick={() => {
                  resetConfig().then((defaults) => {
                    useStore.getState().setConfig(defaults);
                    return ipcSetConfig(defaults);
                  }).then(() => {
                    useToast.getState().show("已恢复默认值");
                  }).catch(console.error);
                }}
                title="恢复默认"
                aria-label="恢复默认"
              >
                <RotateCcw size={14} />
              </button>
              <button
                className="titlebar-btn"
                onClick={() => {
                  const cfg = useStore.getState().config;
                  if (cfg) ipcSetConfig(cfg).then(() => {
                    useToast.getState().show("已保存");
                  }).catch(console.error);
                }}
                title="保存"
                aria-label="保存"
              >
                <Save size={14} />
              </button>
            </>
          ) : (
            <button
              className="titlebar-btn"
              onClick={() => setActiveTool("settings")}
              title="设置"
              aria-label="设置"
            >
              <Settings size={14} />
            </button>
          )}
          <button
            className="titlebar-btn titlebar-close"
            onClick={handleClose}
            title="折叠"
            aria-label="折叠面板"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="titlebar" onMouseDown={handleMouseDown}>
      <div className="titlebar-left">
        <span className="titlebar-title">DeskPal</span>
      </div>
      <div className="titlebar-center">
        <WidthControls />
      </div>
      <div className="titlebar-right">
        <button
          className={`titlebar-btn ${pinned ? "active" : ""}`}
          onClick={handlePinToggle}
          title={pinned ? "取消固定" : "固定面板"}
          aria-label={pinned ? "取消固定" : "固定面板"}
        >
          {pinned ? <Pin size={14} /> : <PinOff size={14} />}
        </button>
        <button
          className={`titlebar-btn${editMode ? " active" : ""}`}
          onClick={() => setEditMode(!editMode)}
          title={editMode ? "完成编辑" : "编辑布局"}
          aria-label={editMode ? "完成编辑" : "编辑布局"}
        >
          {editMode ? <Check size={14} /> : <Pencil size={14} />}
        </button>
        <button
          className="titlebar-btn"
          onClick={() => setActiveTool("settings")}
          title="设置"
          aria-label="设置"
        >
          <Settings size={14} />
        </button>
        <button
          className="titlebar-btn titlebar-close"
          onClick={handleClose}
          title="折叠"
          aria-label="折叠面板"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}