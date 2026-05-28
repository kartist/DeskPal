import { useState, useEffect, useCallback, useRef } from "react";
import { Copy, Check } from "lucide-react";
import { processJson, sortKeys, escapeJson, unescapeJson, jsonpathQuery } from "./utils";
import JsonTreeView from "./JsonTreeView";
import type { JsonTreeViewHandle } from "./JsonTreeView";
import type { JsonResult } from "./utils";
import { useToast } from "../../store/toastStore";
import "./json.css";

export default function JsonTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<JsonResult | null>(null);
  const [parsedObj, setParsedObj] = useState<unknown>(null);
  const [mode, setMode] = useState<"formatted" | "minified">("formatted");
  const [viewMode, setViewMode] = useState<"tree" | "text">("tree");
  const [copied, setCopied] = useState(false);
  const [jsonpath, setJsonpath] = useState("");
  const [jsonpathResult, setJsonpathResult] = useState<string | null>(null);

  const treeRef = useRef<JsonTreeViewHandle>(null);

  // 挂载时读剪贴板
  useEffect(() => {
    navigator.clipboard
      .readText()
      .then((text) => {
        if (!text.trim()) return;
        const parsed = processJson(text);
        if (parsed.valid) {
          setInput(text);
          setResult(parsed);
          try { setParsedObj(JSON.parse(text)); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // 输入防抖处理
  useEffect(() => {
    if (!input.trim()) {
      setResult(null);
      setParsedObj(null);
      return;
    }
    const timer = setTimeout(() => {
      const parsed = processJson(input);
      setResult(parsed);
      if (parsed.valid) {
        try { setParsedObj(JSON.parse(input)); } catch { setParsedObj(null); }
      } else {
        setParsedObj(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const handleFormat = useCallback(() => {
    if (!input.trim()) return;
    const parsed = processJson(input);
    setResult(parsed);
    setMode("formatted");
    setViewMode("text");
  }, [input]);

  const handleMinify = useCallback(() => {
    if (!input.trim()) return;
    const parsed = processJson(input);
    setResult(parsed);
    setMode("minified");
    setViewMode("text");
  }, [input]);

  const handleSortKeys = useCallback(() => {
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input);
      const sorted = sortKeys(parsed);
      const formatted = JSON.stringify(sorted, null, 2);
      setInput(formatted);
    } catch {}
  }, [input]);

  const handleEscape = useCallback(() => {
    setInput(escapeJson(input));
  }, [input]);

  const handleUnescape = useCallback(() => {
    const result = unescapeJson(input);
    if (result !== input) setInput(result);
  }, [input]);

  const handleClear = useCallback(() => {
    setInput("");
    setResult(null);
    setParsedObj(null);
    setJsonpath("");
    setJsonpathResult(null);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!result || !result.valid) return;
    const text = mode === "formatted" ? result.formatted : result.minified;
    try {
      await navigator.clipboard.writeText(text);
      useToast.getState().show("已复制");
      setCopied(true);
      setTimeout(() => setCopied(false), 800);
    } catch {}
  }, [result, mode]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  const handleJsonpathChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setJsonpath(e.target.value);
    },
    []
  );

  const handleJsonpathExtract = useCallback(() => {
    if (!jsonpath.trim() || parsedObj === null) return;
    const res = jsonpathQuery(parsedObj, jsonpath.trim());
    if (res.found) {
      const text =
        typeof res.value === "string"
          ? res.value
          : JSON.stringify(res.value, null, 2);
      setJsonpathResult(text);
    } else {
      setJsonpathResult(`错误: ${res.error}`);
    }
  }, [jsonpath, parsedObj]);

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

      {/* 大 JSON 提示 */}
      {result?.valid && result.formatted.length > 1_000_000 && (
        <div className="j-warning-banner">
          大型 JSON（{result.formatted.length} 字符），建议使用文本模式
        </div>
      )}

      {/* 按钮组 */}
      <div className="j-btn-group">
        <button className="action-btn" onClick={handleFormat} type="button">
          格式化
        </button>
        <button className="action-btn" onClick={handleMinify} type="button">
          压缩
        </button>
        <button className="action-btn" onClick={handleSortKeys} type="button">
          键排序
        </button>
        <button className="action-btn" onClick={handleEscape} type="button">
          转义
        </button>
        <button className="action-btn" onClick={handleUnescape} type="button">
          反转义
        </button>
        <span className="j-btn-sep" />
        <button
          className={`action-btn ${viewMode === "tree" ? "active" : ""}`}
          onClick={() => setViewMode("tree")}
          type="button"
        >
          🌲树
        </button>
        <button
          className={`action-btn ${viewMode === "text" ? "active" : ""}`}
          onClick={() => setViewMode("text")}
          type="button"
        >
          📄文本
        </button>
        <span className="j-btn-sep" />
        <button
          className="action-btn"
          onClick={() => treeRef.current?.expandAll()}
          type="button"
        >
          全部展开
        </button>
        <button
          className="action-btn"
          onClick={() => treeRef.current?.collapseAll()}
          type="button"
        >
          全部收起
        </button>
        <span className="j-btn-sep" />
        <button className="action-btn" onClick={handleClear} type="button">
          ↻ 清空
        </button>
      </div>

      {/* 错误信息 */}
      {result && !result.valid && (
        <div className="j-error-card">{result.error}</div>
      )}

      {/* 树形视图输出 */}
      {result?.valid && viewMode === "tree" && parsedObj !== null && (
        <div className="j-output">
          <JsonTreeView
            ref={treeRef}
            data={parsedObj}
            defaultExpandedDepth={2}
          />
        </div>
      )}

      {/* 文本视图输出 */}
      {result?.valid && viewMode === "text" && (
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

      {/* JSONPath 区域 */}
      {result?.valid && (
        <div className="j-jsonpath-row">
          <input
            className="tool-input"
            type="text"
            placeholder="$.store.book[0].title"
            value={jsonpath}
            onChange={handleJsonpathChange}
            onKeyDown={(e) => e.key === "Enter" && handleJsonpathExtract()}
          />
          <button
            className="action-btn"
            onClick={handleJsonpathExtract}
            type="button"
          >
            提取
          </button>
        </div>
      )}
      {jsonpathResult !== null && (
        <div
          className="j-jsonpath-result"
          onClick={() => {
            navigator.clipboard
              .writeText(jsonpathResult)
              .then(() => useToast.getState().show("已复制"))
              .catch(() => {});
          }}
        >
          {jsonpathResult}
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
