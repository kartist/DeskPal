import { ChevronRight, Pin, PinOff, ArrowLeft } from 'lucide-react';
import { togglePanel } from '../lib/ipc';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from '../store';
import { toolRegistry } from '../lib/registry';

export default function TitleBar() {
  const pinned = useStore((s) => s.pinned);
  const setPinned = useStore((s) => s.setPinned);
  const activeTool = useStore((s) => s.activeTool);
  const setActiveTool = useStore((s) => s.setActiveTool);

  const toolMeta = activeTool ? toolRegistry.find((t) => t.id === activeTool) : null;

  const handleClose = () => {
    togglePanel().catch(() => {});
  };

  const handlePinToggle = () => {
    setPinned(!pinned);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    invoke('drag_window').catch((err) => console.error('drag_window error:', err));
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
