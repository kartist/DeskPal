import { useState, useEffect, useCallback, useRef } from "react";
import ctoolJson from "./utils";
import { typeLists } from "../text/nameConvert";
import type { TypeLists } from "../text/nameConvert";
import { useToast } from "../../store/toastStore";
import { useStore } from "../../store";
import Editor, { OnMount, BeforeMount, loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import "./json.css";

// 使用本地 monaco-editor 包，不走 CDN（桌面应用需要离线可用）
loader.config({ monaco });

export default function JsonTool() {
  const setJsonInput = useStore((s) => s.setJsonInput);
  const setJsonpathInput = useStore((s) => s.setJsonpathInput);

  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ valid: boolean; formatted: string; error?: string; line?: number; col?: number; parseTime?: number } | null>(null);
  const [jsonpath, setJsonpath] = useState("");
  const [jsonpathResult, setJsonpathResult] = useState<string | null>(null);
  const [renameType, setRenameType] = useState<TypeLists>("camelCase");
  const resolvedTheme = useStore((s) => s.resolvedTheme);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const resultRef = useRef<HTMLTextAreaElement>(null);
  const inited = useRef(false);

  const hasJsonpath = jsonpath.trim().length > 0;

  // 挂载时从 store 恢复缓存；仅输入框为空时才尝试剪贴板
  useEffect(() => {
    if (inited.current) return;
    inited.current = true;

    const storedInput = useStore.getState().jsonInput;
    const storedJsonpath = useStore.getState().jsonpathInput;

    if (storedInput.trim()) {
      // 有缓存 → 恢复
      setInput(storedInput);
      updateResult(storedInput);
      if (storedJsonpath.trim()) setJsonpath(storedJsonpath);
      return;
    }

    // 无缓存 → 读剪贴板（有效 JSON 才填充）
    navigator.clipboard
      .readText()
      .then((text) => {
        if (!text.trim()) return;
        try {
          JSON.parse(text);
          setInput(text);
          updateResult(text);
        } catch {
          // 不是有效 JSON，不填充
        }
      })
      .catch(() => {});
  }, []);

  const updateResult = useCallback((val: string) => {
    if (!val.trim()) {
      setResult(null);
      return;
    }
    const start = performance.now();
    try {
      const parsed = JSON.parse(val);
      const formatted = JSON.stringify(parsed, null, 2);
      setResult({
        valid: true,
        formatted,
        parseTime: Math.round((performance.now() - start) * 100) / 100,
      });
    } catch (e) {
      const msg = (e as Error).message;
      let line: number | undefined;
      let col: number | undefined;
      const posMatch = msg.match(/position\s+(\d+)/i);
      if (posMatch) {
        const pos = parseInt(posMatch[1]);
        const before = val.substring(0, pos);
        line = (before.match(/\n/g) || []).length + 1;
        col = pos - before.lastIndexOf('\n');
      }
      setResult({ valid: false, formatted: '', error: msg, line, col });
    }
  }, []);

  // 输入防抖校验（仅 textarea 路径用，Monaco 路径直接调用 updateResult）
  useEffect(() => {
    const timer = setTimeout(() => {
      updateResult(input);
    }, 300);
    return () => clearTimeout(timer);
  }, [input, updateResult]);

  // 输入变更 → 同步到 store 缓存
  useEffect(() => {
    setJsonInput(input);
  }, [input, setJsonInput]);

  // JSONPath 变更 → 同步到 store 缓存
  useEffect(() => {
    setJsonpathInput(jsonpath);
  }, [jsonpath, setJsonpathInput]);

  // JSONPath 防抖查询
  useEffect(() => {
    if (!jsonpath.trim() || !result?.valid) {
      setJsonpathResult(null);
      return;
    }
    const timer = setTimeout(() => {
      try {
        const obj = JSON.parse(input);
        if (!jsonpath.startsWith("$")) {
          setJsonpathResult("错误: JSONPath 必须以 $ 开头");
          return;
        }
        const expr = jsonpath.slice(1);
        if (!expr) {
          setJsonpathResult(JSON.stringify(obj, null, 2));
          return;
        }
        // 简单路径解析：$.a.b[0].c
        const parts: string[] = [];
        let current = "";
        for (let i = 0; i < expr.length; i++) {
          if (expr[i] === ".") {
            if (current) { parts.push(current); current = ""; }
          } else if (expr[i] === "[") {
            if (current) { parts.push(current); current = ""; }
            let j = i + 1;
            while (j < expr.length && expr[j] !== "]") j++;
            parts.push(expr.substring(i, j + 1));
            i = j;
          } else {
            current += expr[i];
          }
        }
        if (current) parts.push(current);

        let value: unknown = obj;
        for (const part of parts) {
          if (!part) continue;
          if (part.startsWith("[")) {
            const idx = parseInt(part.slice(1, -1), 10);
            if (Array.isArray(value) && !isNaN(idx)) {
              value = value[idx];
            } else {
              setJsonpathResult(`错误: 无法访问 ${part}`);
              return;
            }
          } else {
            if (value && typeof value === "object" && !Array.isArray(value)) {
              value = (value as Record<string, unknown>)[part];
            } else {
              setJsonpathResult(`错误: 键 '${part}' 不存在`);
              return;
            }
          }
          if (value === undefined) {
            setJsonpathResult(`错误: 路径 ${part} 的值是 undefined`);
            return;
          }
        }
        setJsonpathResult(
          typeof value === "string" ? value : JSON.stringify(value, null, 2)
        );
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

  const handleFormat = useCallback(async () => {
    if (!input.trim()) return;
    try {
      const formatted = await ctoolJson.beautify(input, {tab: 2});
      setInput(formatted);
    } catch {}
  }, [input]);

  const handleMinify = useCallback(async () => {
    if (!input.trim()) return;
    try {
      setInput(await ctoolJson.compress(input));
    } catch {}
  }, [input]);

  const handleSortAsc = useCallback(() => {
    if (!input.trim()) return;
    try {
      setInput(JSON.stringify(ctoolJson.sortAsc(JSON.parse(input)), null, 2));
    } catch {}
  }, [input]);

  const handleSortDesc = useCallback(() => {
    if (!input.trim()) return;
    try {
      setInput(JSON.stringify(ctoolJson.sortDesc(JSON.parse(input)), null, 2));
    } catch {}
  }, [input]);

  const handleEscape = useCallback(() => {
    setInput(ctoolJson.escape(input));
  }, [input]);

  const handleUnescape = useCallback(() => {
    const r = ctoolJson.clearEscape(input);
    if (r !== input) setInput(r);
  }, [input]);

  const handleUnicode2zh = useCallback(() => {
    setInput(ctoolJson.unicode2zh(input));
  }, [input]);

  const handleZh2unicode = useCallback(() => {
    setInput(ctoolJson.zh2unicode(input));
  }, [input]);

  const handleRename = useCallback(() => {
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input);
      const renamed = ctoolJson.rename(parsed, renameType);
      setInput(JSON.stringify(renamed, null, 2));
    } catch {}
  }, [input, renameType]);

  const handleClear = useCallback(() => {
    setInput("");
    setResult(null);
    setJsonpath("");
    setJsonpathResult(null);
  }, []);

  const handleJsonpathChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setJsonpath(e.target.value);
    },
    []
  );

  // Monaco Editor 挂载后保存实例引用
  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleFoldAll = useCallback(() => {
    editorRef.current?.getAction("editor.foldAll")?.run();
  }, []);

  const handleUnfoldAll = useCallback(() => {
    editorRef.current?.getAction("editor.unfoldAll")?.run();
  }, []);

  // Monaco 注入 JSON 折叠提示的自定义语言配置
  const handleBeforeMount: BeforeMount = useCallback((_monaco) => {
    // 注册 JSON 语言的自定义折叠规则（默认就有，这里是确保）
    _monaco.languages.registerFoldingRangeProvider("json", {
      provideFoldingRanges: () => {
        // 让 Monaco 使用默认的 indent 和语法折叠
        return [];
      },
    });
  }, []);

  const handleEditorChange = useCallback((value: string | undefined) => {
    setInput(value ?? "");
  }, []);

  return (
    <div className="tool-panel j-container">
      {/* 主体区域 */}
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

        {/* Monaco 编辑器 — 替代 textarea */}
        <div className={`j-monaco-wrap${hasJsonpath ? " compact" : ""}`}>
          <Editor
            defaultLanguage="json"
            theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
            value={input}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            beforeMount={handleBeforeMount}
            loading={
              <div className="j-monaco-loading">加载编辑器…</div>
            }
            options={{
              fontSize: 13,
              fontFamily: "inherit",
              lineNumbers: "on",
              minimap: { enabled: false },
              folding: true,
              foldingStrategy: "indentation",
              automaticLayout: true,
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
              renderWhitespace: "selection",
              bracketPairColorization: { enabled: true },
              matchBrackets: "always",
              overviewRulerLanes: 0,
              overviewRulerBorder: false,
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
              padding: { top: 8, bottom: 8 },
              // JSON 错误提示使用内置的 JSON 诊断
              // JSON 诊断由 Monaco 内置完成
            }}
          />
        </div>
      </div>

      {/* 大型 JSON 提示 */}
      {result?.valid && result.formatted.length > 1_000_000 && (
        <div className="j-warning-banner">
          大型 JSON（{result.formatted.length} 字符）
        </div>
      )}

      {/* 按钮组：第一行 — 折叠/展开 + 常用操作 */}
      <div className="j-btn-group">
        <button className="action-btn" onClick={handleFoldAll} type="button">
          ▸ 全部折叠
        </button>
        <button className="action-btn" onClick={handleUnfoldAll} type="button">
          ▾ 全部展开
        </button>

        <span className="j-btn-sep" />
        <button className="action-btn" onClick={handleFormat} type="button">
          格式化
        </button>
        <button className="action-btn" onClick={handleMinify} type="button">
          压缩
        </button>
        <button className="action-btn" onClick={handleSortAsc} type="button">
          键升序
        </button>
        <button className="action-btn" onClick={handleSortDesc} type="button">
          键降序
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

      {/* 按钮组：第二行 — Unicode 和命名转换 */}
      <div className="j-btn-group" style={{marginTop: 6}}>
        <button className="action-btn" onClick={handleUnicode2zh} type="button">
          Unicode→中文
        </button>
        <button className="action-btn" onClick={handleZh2unicode} type="button">
          中文→Unicode
        </button>
        <span className="j-btn-sep" />
        <select
          className="tool-select"
          value={renameType}
          onChange={(e) => setRenameType(e.target.value as TypeLists)}
        >
          {typeLists.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button className="action-btn" onClick={handleRename} type="button">
          键重命名
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
