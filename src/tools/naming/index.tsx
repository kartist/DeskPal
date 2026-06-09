import { useState, useCallback, useEffect, useRef } from "react";
import { convent, typeLists } from "../text/nameConvert";
import type { TypeLists } from "../text/nameConvert";
import { useToast } from "../../store/toastStore";
import { useStore } from "../../store";
import "./naming.css";

export default function NamingTool() {
  const setNamingInput = useStore((s) => s.setNamingInput);
  const [input, setInput] = useState("");
  const inited = useRef(false);

  // 挂载时从 store 恢复
  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    const stored = useStore.getState().namingInput;
    if (stored) setInput(stored);
  }, []);

  // 输入变更 → 同步到 store
  useEffect(() => { setNamingInput(input); }, [input, setNamingInput]);

  // 批量转换函数（按 ctool VariableConversion.vue 的逻辑）
  const batchConvent = useCallback((str: string, type: TypeLists) => {
    return str
      .split("\n")
      .map((line) => {
        line = line.trim();
        if (line === "") return "";
        return convent(line, type);
      })
      .join("\n");
  }, []);

  // 计算结果 — 输入变化时实时计算
  const results = typeLists.map(({ value, label }) => ({
    key: value,
    label,
    value: input.trim()
      ? batchConvent(input, value as TypeLists)
      : "",
  }));

  const handleCopy = useCallback(
    async (text: string) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        useToast.getState().show("已复制");
      } catch {
        // 静默处理权限拒绝
      }
    },
    []
  );

  return (
    <div className="tool-panel n-container">
      {/* 输入区 */}
      <textarea
        className="n-textarea"
        placeholder={
          "输入变量名，每行一个\n例如:\nuser_name\nuser-id\nUserName"
        }
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      {/* 结果区 */}
      <div className="n-results">
        {results.map(({ key, label, value }) => (
          <div
            key={key}
            className="n-result-row"
            onClick={() => handleCopy(value)}
            title="点击复制"
          >
            <span className="n-result-label">{label}</span>
            <span className="n-result-value">{value || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
