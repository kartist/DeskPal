import { useState, useEffect, useCallback } from "react";
import { processJson, sortKeys, escapeJson, unescapeJson, jsonpathQuery } from "./utils";
import type { JsonResult } from "./utils";
import { useToast } from "../../store/toastStore";
import "./json.css";

export default function JsonTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<JsonResult | null>(null);
  const [jsonpath, setJsonpath] = useState("");
  const [jsonpathResult, setJsonpathResult] = useState<string | null>(null);

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
        }
      })
      .catch(() => {});
  }, []);

  // 输入防抖校验
  useEffect(() => {
    if (!input.trim()) {
      setResult(null);
      return;
    }
    const timer = setTimeout(() => {
      setResult(processJson(input));
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  // JSONPath 防抖查询
  useEffect(() => {
    if (!jsonpath.trim() || !result?.valid) {
      setJsonpathResult(null);
      return;
    }
    const timer = setTimeout(() => {
      try {
        const obj = JSON.parse(input);
        const res = jsonpathQuery(obj, jsonpath.trim());
        if (res.found) {
          setJsonpathResult(
            typeof res.value === "string"
              ? res.value
              : JSON.stringify(res.value, null, 2)
          );
        } else {
          setJsonpathResult(`错误: ${res.error}`);
        }
      } catch {
        setJsonpathResult(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [jsonpath, input, result?.valid]);

  // 所有按钮直接操作 input
  const handleFormat = useCallback(() => {
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed, null, 2));
    } catch {}
  }, [input]);

  const handleMinify = useCallback(() => {
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed));
    } catch {}
  }, [input]);

  const handleSortKeys = useCallback(() => {
    if (!input.trim()) return;
    try {
      setInput(JSON.stringify(sortKeys(JSON.parse(input)), null, 2));
    } catch {}
  }, [input]);

  const handleEscape = useCallback(() => {
    setInput(escapeJson(input));
  }, [input]);

  const handleUnescape = useCallback(() => {
    const r = unescapeJson(input);
    if (r !== input) setInput(r);
  }, [input]);

  const handleClear = useCallback(() => {
    setInput("");
    setResult(null);
    setJsonpath("");
    setJsonpathResult(null);
  }, []);

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

  return (
    <div className="tool-panel j-container">
      {/* 输入区 */}
      <textarea
        className="j-textarea"
        placeholder="粘贴 JSON 文本…"
        value={input}
        onChange={handleInputChange}
      />

      {/* 状态/错误信息 */}
      {result && result.valid && (
        <div className="j-status ok">
          ✓ JSON 格式正确 ({result.parseTime}ms) |{" "}
          {result.formatted.split("\n").length} 行 {result.formatted.length} 字符
        </div>
      )}
      {result && !result.valid && (
        <div className="j-error-card">
          {result.error}
          {result.line && `（第 ${result.line} 行 第 ${result.col} 列）`}
        </div>
      )}

      {/* 大 JSON 提示 */}
      {result?.valid && result.formatted.length > 1_000_000 && (
        <div className="j-warning-banner">
          大型 JSON（{result.formatted.length} 字符）
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
        <button className="action-btn" onClick={handleClear} type="button">
          ↻ 清空
        </button>
      </div>

      {/* JSONPath */}
      {result?.valid && (
        <div className="j-jsonpath-row">
          <input
            className="tool-input"
            type="text"
            placeholder="$.store.book[0].title"
            value={jsonpath}
            onChange={handleJsonpathChange}
          />
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
    </div>
  );
}
