import { useState, useEffect, useCallback } from "react";
import TextProcessor, { escapeChars } from "./utils";
import "./text.css";

export default function TextTool() {
  const [input, setInput] = useState("");
  const [stats, setStats] = useState<Record<string, number> | null>(null);

  // 统计防抖
  useEffect(() => {
    if (!input.trim()) { setStats(null); return; }
    const timer = setTimeout(() => {
      setStats(new TextProcessor(input).stat());
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  // 通用变换处理器
  const handleTransform = useCallback((method: string, options?: any) => {
    if (!input.trim()) return;
    const processor = new TextProcessor(input);
    const result = (processor as any)[method](options) as string;
    setInput(result);
  }, [input]);

  // 处理命名转换
  const handleRename = useCallback((type: string) => {
    handleTransform("rename", { type });
  }, [handleTransform]);

  // Ctrl+Enter = 全大写快捷键
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === "Enter") {
      handleTransform("upper");
    }
  }, [handleTransform]);

  return (
    <div className="tool-panel t-container">
      <textarea
        className="t-textarea"
        placeholder="粘贴或输入文本…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <div className="t-status">
        {stats ? (
          <span>
            字符:{stats.string_length} 中文:{stats.zh_word} 英文:{stats.en_word}
            {" | "}行:{stats.line_length} UTF8:{stats.byte_utf8_length}B GBK:{stats.byte_gbk_length}B
          </span>
        ) : (
          <span className="t-status-hint">输入文本后查看统计</span>
        )}
      </div>

      {/* 大小写 */}
      <div className="t-btn-group">
        <span className="t-section">大小写</span>
        <button className="action-btn" onClick={() => handleTransform("upper")}>全大写</button>
        <button className="action-btn" onClick={() => handleTransform("lower")}>全小写</button>
        <button className="action-btn" onClick={() => handleTransform("upperLineStart")}>行首大写</button>
        <button className="action-btn" onClick={() => handleTransform("lowerLineStart")}>行首小写</button>
        <button className="action-btn" onClick={() => handleTransform("upperStart")}>词首大写</button>
        <button className="action-btn" onClick={() => handleTransform("lowerStart")}>词首小写</button>
      </div>

      {/* 行操作 */}
      <div className="t-btn-group">
        <span className="t-section">行操作</span>
        <button className="action-btn" onClick={() => handleTransform("filterBlankLine")}>移除空行</button>
        <button className="action-btn" onClick={() => handleTransform("lineRemoveRepeat")}>去重</button>
        <button className="action-btn" onClick={() => handleTransform("lineTrim")}>Trim</button>
        <button className="action-btn" onClick={() => handleTransform("removeLineIndex")}>移除行号</button>
        <button className="action-btn" onClick={() => handleTransform("addLineIndex")}>添加行号</button>
        <button className="action-btn" onClick={() => handleTransform("filterAllBr")}>移除换行</button>
      </div>

      {/* 排序/反转 */}
      <div className="t-btn-group">
        <span className="t-section">排序/反转</span>
        <button className="action-btn" onClick={() => handleTransform("sort", { type: "reverse_line" })}>行反转</button>
        <button className="action-btn" onClick={() => handleTransform("sort", { type: "line_asc" })}>行升序</button>
        <button className="action-btn" onClick={() => handleTransform("sort", { type: "line_desc" })}>行降序</button>
        <button className="action-btn" onClick={() => handleTransform("sort", { type: "reverse_line_string" })}>行内反转</button>
        <button className="action-btn" onClick={() => handleTransform("sort", { type: "reverse_all" })}>整串反转</button>
      </div>

      {/* 命名转换 */}
      <div className="t-btn-group">
        <span className="t-section">命名转换</span>
        <button className="action-btn" onClick={() => handleRename("spaceCase")}>space case</button>
        <button className="action-btn" onClick={() => handleRename("camelCase")}>camelCase</button>
        <button className="action-btn" onClick={() => handleRename("pascalCase")}>PascalCase</button>
        <button className="action-btn" onClick={() => handleRename("kebabCase")}>kebab-case</button>
        <button className="action-btn" onClick={() => handleRename("lowerSnakeCase")}>snake_case</button>
        <button className="action-btn" onClick={() => handleRename("upperSnakeCase")}>SNAKE_CASE</button>
        <button className="action-btn" onClick={() => handleRename("pascalCaseSpace")}>Camel Case</button>
      </div>

      {/* 转义 */}
      <div className="t-btn-group">
        <span className="t-section">转义</span>
        <button className="action-btn" onClick={() => handleTransform("escape", { lists: Object.keys(escapeChars) })}>转义</button>
        <button className="action-btn" onClick={() => handleTransform("unescape", { lists: Object.keys(escapeChars) })}>反转义</button>
      </div>

      {/* 标点 */}
      <div className="t-btn-group">
        <span className="t-section">标点</span>
        <button className="action-btn" onClick={() => handleTransform("replacePunctuation", { type: "en" })}>中→英</button>
        <button className="action-btn" onClick={() => handleTransform("replacePunctuation", { type: "zh" })}>英→中</button>
      </div>

      {/* 简繁 */}
      <div className="t-btn-group">
        <span className="t-section">简繁</span>
        <button className="action-btn" onClick={() => handleTransform("zhTran", { type: "simplified" })}>简→繁</button>
        <button className="action-btn" onClick={() => handleTransform("zhTran", { type: "traditional" })}>繁→简</button>
      </div>

      {/* 清空 */}
      <button className="action-btn" onClick={() => setInput("")} style={{ marginTop: 4 }}>
        ↻ 清空
      </button>
    </div>
  );
}
