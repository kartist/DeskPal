import { useState, useRef, useCallback, useEffect } from "react";
import { Terminal, Play, Copy, Trash2 } from "lucide-react";
import { executeCommand, type ExecutionResult } from "./utils";
import { useToast } from "../../store/toastStore";
import { useStore } from "../../store";
import "./terminal.css";

const PRESETS = [
  { label: "ipconfig", cmd: "ipconfig" },
  { label: "dir", cmd: "dir" },
  { label: "echo hello", cmd: "echo hello" },
  { label: "ping -n 4 localhost", cmd: "ping -n 4 localhost" },
];

export default function TerminalTool() {
  const setTerminalInput = useStore((s) => s.setTerminalInput);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const inited = useRef(false);
  const toast = useToast();

  // 挂载时从 store 恢复
  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    const stored = useStore.getState().terminalInput;
    if (stored) setInput(stored);
  }, []);

  // 输入变更 → 同步到 store
  useEffect(() => { setTerminalInput(input); }, [input, setTerminalInput]);

  // Auto-scroll output to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [result]);

  const run = useCallback(async (command: string) => {
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
  }, [running]);

  const handleExecute = useCallback(() => {
    run(input);
  }, [run, input]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      handleExecute();
    }
  }, [handleExecute]);

  const handlePreset = useCallback((cmd: string) => {
    setInput(cmd);
    run(cmd);
  }, [run]);

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

      {/* Preset buttons */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {PRESETS.map((p) => (
          <button
            key={p.cmd}
            className="term-btn"
            onClick={() => handlePreset(p.cmd)}
            disabled={running}
          >
            <Terminal size={12} />
            {p.label}
          </button>
        ))}
      </div>

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
        <button
          className="term-btn"
          onClick={handleClear}
          title="清空"
        >
          <Trash2 size={12} />
          清空
        </button>
      </div>
    </div>
  );
}
