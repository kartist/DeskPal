import { useState, useEffect, useCallback, useRef } from "react";
import { processJson, sortKeys, escapeJson, unescapeJson, jsonpathQuery } from "./utils";
import type { JsonResult } from "./utils";
import { useToast } from "../../store/toastStore";
import { useStore } from "../../store";
import "./json.css";

export default function JsonTool() {
  // 从 zustand store 恢复缓存（跨工具切换持久化）
  const cachedInput = useStore((s) => s.jsonInput);
  const cachedJsonpath = useStore((s) => s.jsonpathInput);
  const setJsonInput = useStore((s) => s.setJsonInput);
  const setJsonpathInput = useStore((s) => s.setJsonpathInput);

  const [input, setInput] = useState(cachedInput);
  const [result, setResult] = useState<JsonResult | null>(() => {
    if (cachedInput.trim()) return processJson(cachedInput);
    return null;
  });
  const [jsonpath, setJsonpath] = useState(cachedJsonpath);
  const [jsonpathResult, setJsonpathResult] = useState<string | null>(null);
  const resultRef = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(false);

  const hasJsonpath = jsonpath.trim().length > 0;

  // 挂载时：有缓存直接用，无缓存才尝试剪贴板
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    if (cachedInput.trim()) {
      // 缓存已有内容，不读剪贴板
      return;
    }

    // 输入框为空时才读剪贴板
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 输入变更 → 同步缓存到 store
  const syncInput = useCallback(
    (value: string) => {
      setInput(value);
      setJsonInput(value);
    },
    [setJsonInput]
  );

  const syncJsonpath = useCallback(
    (value: string) => {
      setJsonpath(value);
      setJsonpathInput(value);
    },
    [setJsonpathInput]
  );

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

  // 复制 JSONPath 结果
  const copyJsonpathResult = useCallback(() => {
    if (!jsonpathResult) return;
    navigator.clipboard
      .writeText(jsonpathResult)
      .then(() => useToast.getState().show("已复制"))
      .catch(() => {});
  }, [jsonpathResult]);

  // 所有按钮直接操作 input
  const handleFormat = useCallback(() => {
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input);
      syncInput(JSON.stringify(parsed, null, 2));
    } catch {}
  }, [input, syncInput]);

  const handleMinify = useCallback(() => {
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input);
      syncInput(JSON.stringify(parsed));
    } catch {}
  }, [input, syncInput]);

  const handleSortKeys = useCallback(() => {
    if (!input.trim()) return;
    try {
      syncInput(JSON.stringify(sortKeys(JSON.parse(input)), null, 2));
    } catch {}
  }, [input, syncInput]);

  const handleEscape = useCallback(() => {
    syncInput(escapeJson(input));
  }, [input, syncInput]);

  const handleUnescape = useCallback(() => {
    const r = unescapeJson(input);
    if (r !== input) syncInput(r);
  }, [input, syncInput]);

  const handleClear = useCallback(() => {
    syncInput("");
    setResult(null);
    syncJsonpath("");
    setJsonpathResult(null);
  }, [syncInput, syncJsonpath]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      syncInput(e.target.value);
    },
    [syncInput]
  );

  const handleJsonpathChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      syncJsonpath(e.target.value);
    },
    [syncJsonpath]
  );

  return (
    <div className="tool-panel j-container">
      {/* 主体区域：输入框 + JSONPath 结果 */}
      <div className="j-body">
        {/* JSONPath 结果区 — 仅当 jsonpath 有内容时显示 */}
        {hasJsonpath && (
          <textarea
            ref={resultRef}
            className="j-result-area"
            readOnly
            value={jsonpathResult ?? ""}
            placeholder={
              result?.valid
                ? "输入 JSONPath 查询…"
                : "请先输入有效的 JSON"
            }
            onClick={copyJsonpathResult}
          />
        )}

        {/* 主输入框 — 默认占满，有 jsonpath 时压缩至 30% */}
        <textarea
          className={`j-textarea${hasJsonpath ? " compact" : ""}`}
          placeholder="粘贴 JSON 文本…"
          value={input}
          onChange={handleInputChange}
        />
      </div>

      {/* 大型 JSON 提示 */}
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

      {/* JSONPath 输入 — 始终可见 */}
      <div className="j-jsonpath-row">
        <input
          className="tool-input"
          type="text"
          placeholder="$.store.book[0].title"
          value={jsonpath}
          onChange={handleJsonpathChange}
        />
      </div>

      {/* 状态 / 错误 */}
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
    </div>
  );
}
