import { useState, useEffect, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { processJson } from "./utils";
import type { JsonResult } from "./utils";
import { useToast } from "../../store/toastStore";
import "./json.css";

export default function JsonTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<JsonResult | null>(null);
  const [mode, setMode] = useState<"formatted" | "minified">("formatted");
  const [copied, setCopied] = useState(false);

  // 挂载时读取剪贴板，自动填充有效 JSON
  useEffect(() => {
    navigator.clipboard
      .readText()
      .then((text) => {
        if (!text.trim()) return;
        const parsed = processJson(text);
        if (parsed.valid) {
          setInput(text);
          setResult(parsed);
        }
      })
      .catch(() => {});
  }, []);

  // 输入变化时 300ms 防抖处理
  useEffect(() => {
    if (!input.trim()) {
      setResult(null);
      return;
    }
    const timer = setTimeout(() => {
      const parsed = processJson(input);
      setResult(parsed);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const handleFormat = useCallback(() => {
    if (!input.trim()) return;
    const parsed = processJson(input);
    setResult(parsed);
    setMode("formatted");
  }, [input]);

  const handleMinify = useCallback(() => {
    if (!input.trim()) return;
    const parsed = processJson(input);
    setResult(parsed);
    setMode("minified");
  }, [input]);

  const handleClear = useCallback(() => {
    setInput("");
    setResult(null);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!result || !result.valid) return;
    const text = mode === "formatted" ? result.formatted : result.minified;
    try {
      await navigator.clipboard.writeText(text);
      useToast.getState().show("已复制");
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 800);
    } catch {
      // 静默失败
    }
  }, [result, mode]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  return (
    <div className="tool-panel j-container">
      {/* 输入区 */}
      <textarea
        className="j-textarea"
        placeholder="粘贴 JSON 文本…"
        value={input}
        onChange={handleInputChange}
        rows={8}
      />

      {/* 按钮组 */}
      <div className="j-btn-group">
        <button className="action-btn" onClick={handleFormat} type="button">
          格式化
        </button>
        <button className="action-btn" onClick={handleMinify} type="button">
          压缩
        </button>
        <button className="action-btn" onClick={handleClear} type="button">
          ↻ 清空
        </button>
      </div>

      {/* 错误信息 */}
      {result && !result.valid && (
        <div className="j-error-card">{result.error}</div>
      )}

      {/* 输出区域 */}
      {result && result.valid && (
        <div className="j-output">
          <pre className="j-output-text" onClick={handleCopy}>
            {mode === "formatted" ? result.formatted : result.minified}
          </pre>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 4,
            }}
          >
            <button className="copy-btn" onClick={handleCopy} type="button">
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* 状态栏 */}
      {result && result.valid && (
        <div className="j-status ok">
          ✓ JSON 格式正确 ({result.parseTime}ms) |{" "}
          {result.formatted.split("\n").length} 行 {result.formatted.length}{" "}
          字符
        </div>
      )}
      {result && !result.valid && result.line && (
        <div className="j-status error">
          ✗ 第 {result.line} 行 第 {result.col} 列
        </div>
      )}
    </div>
  );
}
