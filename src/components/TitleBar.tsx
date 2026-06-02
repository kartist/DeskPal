import { useEffect, useRef } from 'react';
import { ChevronRight, Pin, PinOff, ArrowLeft, Settings, RotateCcw, Save } from 'lucide-react';
import { togglePanel, setConfig as ipcSetConfig, resetConfig } from '../lib/ipc';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from "../store";
import { useToast } from "../store/toastStore";
import { toolRegistry } from '../lib/registry';

export default function TitleBar() {
  const pinned = useStore((s) => s.pinned);
  const setPinned = useStore((s) => s.setPinned);
  const activeTool = useStore((s) => s.activeTool);
  const setActiveTool = useStore((s) => s.setActiveTool);

  const toolMeta = activeTool ? toolRegistry.find((t) => t.id === activeTool) : null;

  // refs 追踪鼠标状态
  const lastMouseUpRef = useRef(0);        // 最近一次 mouseup 的时间戳
  const mouseDownRef = useRef(false);      // 鼠标是否按着
  const dragStartedRef = useRef(false);    // 是否已调用 drag_window

  // document 级 mouseup：保证无论鼠标在哪释放都能捕获到时间戳
  useEffect(() => {
    const onUp = () => {
      mouseDownRef.current = false;
      dragStartedRef.current = false;
      lastMouseUpRef.current = Date.now();
    };
    document.addEventListener('mouseup', onUp);
    return () => document.removeEventListener('mouseup', onUp);
  }, []);

  // document 级 mousemove：检测拖拽意图
  useEffect(() => {
    const onMove = () => {
      if (mouseDownRef.current && !dragStartedRef.current) {
        dragStartedRef.current = true;
        invoke('drag_window').catch((err) =>
          console.error('drag_window error:', err)
        );
      }
    };
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);

  const handleClose = () => {
    togglePanel().catch(() => {});
  };

  const handlePinToggle = () => {
    setPinned(!pinned);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;

    const cfg = useStore.getState().config;

    if (!cfg?.double_click_pin_enabled) {
      // 双击固定已禁用，进入拖拽模式
      mouseDownRef.current = true;
      dragStartedRef.current = false;
      return;
    }

    const now = Date.now();
    const threshold = cfg?.dblclick_threshold_ms ?? 300;
    if (now - lastMouseUpRef.current < threshold) {
      // 短时间内 mouseup → mousedown → 双击判定
      lastMouseUpRef.current = 0; // 防三次点击连环触发
      setPinned(!pinned);
      return;
    }

    // 单击或拖拽起点：标记按下，等待 mousemove 或 mouseup
    mouseDownRef.current = true;
    dragStartedRef.current = false;
  };

  if (activeTool) {
    return (
      <div className="titlebar" onMouseDown={handleMouseDown}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="titlebar-btn"
            onClick={() => setActiveTool(null)}
            title="返回"
            aria-label="返回工具列表"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 13,
              fontWeight: 500,
              width: 'auto',
              padding: '0 8px',
            }}
          >
            <ArrowLeft size={16} />
            返回
          </button>
          <span className="titlebar-title" style={{ fontSize: 13, fontWeight: 600 }}>
            {toolMeta?.name ?? activeTool}
          </span>
        </div>
        <div className="titlebar-actions">
          <button
            className={`titlebar-btn ${pinned ? 'active' : ''}`}
            onClick={handlePinToggle}
            title={pinned ? '取消固定' : '固定面板'}
            aria-label={pinned ? '取消固定' : '固定面板'}
          >
            {pinned ? <Pin size={14} /> : <PinOff size={14} />}
          </button>
          {activeTool === 'settings' ? (
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
              onClick={() => setActiveTool('settings')}
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
      <span className="titlebar-title">DeskPal</span>
      <div className="titlebar-actions">
        <button
          className={`titlebar-btn ${pinned ? 'active' : ''}`}
          onClick={handlePinToggle}
          title={pinned ? '取消固定' : '固定面板'}
          aria-label={pinned ? '取消固定' : '固定面板'}
        >
          {pinned ? <Pin size={14} /> : <PinOff size={14} />}
        </button>
        <button
          className="titlebar-btn"
          onClick={() => setActiveTool('settings')}
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
