import { useState, useRef, useCallback, useEffect } from "react";
import { Terminal, Play, Copy, Trash2, Settings, Plus } from "lucide-react";
import { executeCommand, type ExecutionResult } from "./utils";
import { useToast } from "../../store/toastStore";
import { useStore } from "../../store";
import type { TermPreset } from "../../types";
import TermPresetManager from "./TermPresetManager";
import "./terminal.css";

export default function TerminalTool() {
  const setTerminalInput = useStore((s) => s.setTerminalInput);
  const presets = useStore((s) => s.terminalPresets);
  const setPresets = useStore((s) => s.setTerminalPresets);

  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showManager, setShowManager] = useState(false);
  const [managerPrefill, setManagerPrefill] = useState("");
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const inited = useRef(false);
  const toast = useToast();

  // 右键菜单
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    preset: TermPreset;
  } | null>(null);

  // 挂载时从 store 恢复
  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    const stored = useStore.getState().terminalInput;
    if (stored) setInput(stored);
  }, []);

  // 输入变更 → 同步到 store
  useEffect(() => {
    setTerminalInput(input);
  }, [input, setTerminalInput]);

  // Auto-scroll output to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [result]);

  // 全局点击关闭右键菜单
  useEffect(() => {
    const handler = () => setCtxMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const run = useCallback(
    async (command: string) => {
      if (!command.trim() || running) return;
      setRunning(true);
      setError(null);
      setResult(null);
      try {
        const res = await executeCommand(command);
        setResult(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setRunning(false);
      }
    },
    [running]
  );

  const handleExecute = useCallback(() => {
    run(input);
  }, [run, input]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        handleExecute();
      }
    },
    [handleExecute]
  );

  const handlePreset = useCallback(
    (cmd: string) => {
      setInput(cmd);
      run(cmd);
    },
    [run]
  );

  // 右键菜单：编辑
  const openManagerForEdit = useCallback((_preset: TermPreset) => {
    setManagerPrefill("");
    setCtxMenu(null);
    setShowManager(true);
  }, []);

  // 右键菜单：删除
  const handleContextDelete = useCallback(
    (preset: TermPreset) => {
      setPresets(presets.filter((p) => p.id !== preset.id));
      setCtxMenu(null);
      toast.show(`已删除「${preset.label}」`);
    },
    [presets, setPresets, toast]
  );

  // 右键菜单触发
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, preset: TermPreset) => {
      e.preventDefault();
      setCtxMenu({ x: e.clientX, y: e.clientY, preset });
    },
    []
  );

  // 打开管理浮层（新增模式：预填当前输入的命令）
  const openManagerForAdd = useCallback(() => {
    setManagerPrefill(input);
    setShowManager(true);
  }, [input]);

  // 打开管理浮层（管理模式）
  const openManager = useCallback(() => {
    setManagerPrefill("");
    setShowManager(true);
  }, []);

  const closeManager = useCallback(() => {
    setShowManager(false);
  }, []);

  const handleCopy = useCallback(async () => {
    const text = result ? `${result.stdout}${result.stderr}`.trim() : "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.show("已复制");
    } catch {
      toast.show("复制失败");
    }
  }, [result, toast]);

  const handleClear = useCallback(() => {
    setResult(null);
    setError(null);
    setInput("");
  }, []);

  const statusCode = result?.code;
  const statusDuration = result?.duration;

  return (
    <div className="tool-panel term-container">
      {/* Input row */}
      <div className="term-input-row">
        <textarea
          className="term-input"
          placeholder={"; 输入命令后点击执行或按 Ctrl+Enter"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={running}
        />
        <button
          className="term-btn primary"
          onClick={handleExecute}
          disabled={running || !input.trim()}
        >
          {running ? (
            <span className="term-spinner" />
          ) : (
            <Play size={14} />
          )}
          执行
        </button>
      </div>

      {/* Preset row */}
      <div className="term-preset-row">
        <span className="term-preset-label">预设命令</span>
        <div className="term-preset-btns">
          {presets.map((p) => (
            <div key={p.id} className="term-preset-btn-wrapper">
              <button
                className="term-btn term-preset-btn"
                onClick={() => handlePreset(p.cmd)}
                onContextMenu={(e) => handleContextMenu(e, p)}
                disabled={running}
                title={
                  p.note
                    ? `${p.cmd}\n📝 ${p.note}`
                    : p.cmd
                }
              >
                <Terminal size={12} />
                {p.label}
              </button>
              {/* Tooltip */}
              <div className="term-tooltip">
                <div className="term-tooltip-cmd">{p.cmd}</div>
                {p.note && <div className="term-tooltip-note">📝 {p.note}</div>}
              </div>
            </div>
          ))}
          <button
            className="term-btn term-preset-add"
            onClick={openManagerForAdd}
            disabled={running}
            title="将当前输入的命令保存为预设"
          >
            <Plus size={12} />
            新增
          </button>
          <button
            className="term-btn term-preset-mgr"
            onClick={openManager}
            title="管理预设命令"
          >
            <Settings size={12} />
            管理
          </button>
        </div>
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (
        <div
          className="term-ctxmenu"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          <div
            className="term-ctxmenu-item"
            onClick={() => openManagerForEdit(ctxMenu.preset)}
          >
            ✏ 编辑
          </div>
          <div
            className="term-ctxmenu-item term-ctxmenu-item-danger"
            onClick={() => handleContextDelete(ctxMenu.preset)}
          >
            🗑 删除
          </div>
        </div>
      )}

      {/* Output body */}
      <div className="term-body">
        <textarea
          ref={outputRef}
          className="term-output"
          readOnly
          value={
            error
              ? `错误: ${error}`
              : result
              ? `${result.stdout}${result.stderr ? "\n" + result.stderr : ""}`
              : ""
          }
          placeholder={"; 执行结果将显示在这里"}
        />
      </div>

      {/* Status bar */}
      <div className="term-status">
        {statusCode !== undefined && statusCode !== null ? (
          <>
            <span>
              退出码:{" "}
              <span
                className={`term-status-code ${statusCode === 0 ? "success" : "error"}`}
              >
                {statusCode}
              </span>
            </span>
            <span>耗时: {statusDuration}ms</span>
          </>
        ) : error ? (
          <span style={{ color: "#f44747" }}>执行失败</span>
        ) : (
          <span>就绪</span>
        )}

        <span style={{ flex: 1 }} />

        <button
          className="term-btn"
          onClick={handleCopy}
          disabled={!result && !error}
          title="复制输出"
        >
          <Copy size={12} />
          复制
        </button>
        <button className="term-btn" onClick={handleClear} title="清空">
          <Trash2 size={12} />
          清空
        </button>
      </div>

      {/* Manager overlay */}
      {showManager && (
        <TermPresetManager
          onClose={closeManager}
          prefillCmd={managerPrefill || undefined}
        />
      )}
    </div>
  );
}
