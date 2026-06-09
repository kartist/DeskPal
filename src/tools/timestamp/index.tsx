import { useState, useEffect, useRef } from "react";
import { Copy, Check } from "lucide-react";
import { transform, Format } from "./utils";
import type { Output } from "./utils";
import { useStore } from "../../store";
import "./timestamp.css";

export default function TimestampTool() {
  const setTimestampInput = useStore((s) => s.setTimestampInput);
  const [input, setInput] = useState("");
  const [now, setNow] = useState<Output>(() =>
    transform(Date.now().toString(), "local", Format.millisecond)
  );
  const [result, setResult] = useState<Output | null>(null);
  const inited = useRef(false);

  // 挂载时从 store 恢复；无缓存则尝试剪贴板
  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    const stored = useStore.getState().timestampInput;
    if (stored) {
      setInput(stored);
      const r = transform(stored, "local");
      if (r.isValid) setResult(r);
      return;
    }
    // 无缓存 → 读剪贴板
    navigator.clipboard
      .readText()
      .then((text) => {
        if (!text.trim()) return;
        const r = transform(text, "local");
        if (r.isValid) {
          setInput(text);
          setResult(r);
        }
      })
      .catch(() => {});
  }, []);

  // 输入变更 → 同步到 store
  useEffect(() => { setTimestampInput(input); }, [input, setTimestampInput]);

  // 实时刷新当前时间（每毫秒）
  useEffect(() => {
    const id = setInterval(() => {
      setNow(transform(Date.now().toString(), "local", Format.millisecond));
    }, 93);
    return () => clearInterval(id);
  }, []);

  // 输入变化时转换（防抖 300ms）
  useEffect(() => {
    if (!input.trim()) {
      setResult(null);
      return;
    }
    const timer = setTimeout(() => {
      setResult(transform(input, "local"));
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  return (
    <div className="tool-panel ts-container">
      {/* 当前时间 */}
      <div className="ts-section">
        <span className="ts-section-title">当前时间</span>
        {now.isValid && (
          <>
            <TimeRow label="second" value={now.second} />
            <TimeRow label="millisecond" value={now.millisecond} />
            <TimeRow label="nanosecond" value={now.nanosecond} />
            <TimeRow label="second timestamp" value={now.unixSecond} />
            <TimeRow label="millSecond timestamp" value={now.unixMillisecond} />
          </>
        )}
      </div>

      <hr className="ts-divider" />

      {/* 输入转换 */}
      <div className="ts-section">
        <span className="ts-section-title">转换</span>
        <input
          className="tool-input"
          placeholder="输入 Unix 时间戳或日期 (YYYY-MM-DD HH:mm:ss)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        {result && result.isValid ? (
          <>
            <TimeRow label="second" value={result.second} />
            <TimeRow label="millisecond" value={result.millisecond} />
            <TimeRow label="nanosecond" value={result.nanosecond} />
            <TimeRow label="unix second" value={result.unixSecond} />
            <TimeRow label="unix millisecond" value={result.unixMillisecond} />
            <div className="ts-hint">
              自动识别: {result.autoFormat} |{" "}
              输入类型:{" "}
              {result.type === InputTypeLabel.unix
                ? "unix"
                : result.type === InputTypeLabel.normal
                  ? "date"
                  : result.type === InputTypeLabel.empty
                    ? "empty"
                    : "error"}
            </div>
          </>
        ) : result && !result.isValid ? (
          <div className="ts-error">{result.second}</div>
        ) : null}
      </div>
    </div>
  );
}

// InputType 数值映射（enum 默认值：error=0, empty=1, normal=2, unix=3）
const InputTypeLabel = { error: 0, empty: 1, normal: 2, unix: 3 } as const;

function TimeRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 800);
    } catch {
      /* 静默失败 */
    }
  };
  return (
    <div className="ts-row">
      <span className="ts-row-label">{label}</span>
      <span className="ts-row-value" onClick={handleCopy}>
        {value}
      </span>
      <button
        className={`ts-copy-btn ${copied ? "copied" : ""}`}
        onClick={handleCopy}
        type="button"
        title="复制"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}
