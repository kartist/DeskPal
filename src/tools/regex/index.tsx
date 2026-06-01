import { useState, useMemo, useCallback } from "react";
import { commonExpressions } from "./utils";
import "./regex.css";

export default function RegexTool() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("gm");
  const [testText, setTestText] = useState("");
  const [matchError, setMatchError] = useState<string | null>(null);

  const matches = useMemo(() => {
    if (!pattern.trim() || !testText.trim()) return null;
    setMatchError(null);
    try {
      const regex = new RegExp(pattern, flags);
      const results = [...testText.matchAll(regex)];
      return results.map((m) => ({
        full: m[0],
        index: m.index,
        groups: m.slice(1).filter((g) => g !== undefined),
      }));
    } catch (e: any) {
      setMatchError(e.message);
      return null;
    }
  }, [pattern, flags, testText]);

  const insertExpression = useCallback((value: string) => {
    setPattern(value);
  }, []);

  const toggleFlag = useCallback(
    (flag: string) => {
      setFlags((prev) => (prev.includes(flag) ? prev.replace(flag, "") : prev + flag));
    },
    []
  );

  return (
    <div className="tool-panel re-container">
      {/* 正则表达式输入 */}
      <div className="re-section">
        <span className="re-section-title">正则表达式</span>
        <input
          className="re-input"
          placeholder="输入正则表达式…"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
        />
        <div className="re-flags">
          {["g", "m", "i", "s", "u", "y"].map((f) => (
            <label key={f} className="re-flag-label">
              <input
                type="checkbox"
                checked={flags.includes(f)}
                onChange={() => toggleFlag(f)}
              />{" "}
              {f}
            </label>
          ))}
        </div>
      </div>

      {/* 测试文本 */}
      <div className="re-section">
        <span className="re-section-title">测试文本</span>
        <textarea
          className="re-textarea"
          placeholder="输入要匹配的文本…"
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
        />
      </div>

      {/* 匹配结果 */}
      <div className="re-section">
        <span className="re-section-title">
          匹配结果 ({matches ? matches.length : 0})
        </span>
        {matchError && <div className="re-error">{matchError}</div>}
        <div className="re-results">
          {matches && matches.length > 0
            ? matches.map((m, i) => (
                <div key={i} className="re-match">
                  <span className="re-match-index">
                    #{i + 1} @{m.index}
                  </span>
                  <span className="re-match-value">{m.full}</span>
                  {m.groups.length > 0 && (
                    <span className="re-match-groups">
                      捕获组: {m.groups.join(", ")}
                    </span>
                  )}
                </div>
              ))
            : matches && matches.length === 0
            ? <div className="re-no-match">无匹配</div>
            : null}
        </div>
      </div>

      {/* 常用表达式 */}
      <div className="re-section">
        <span className="re-section-title">常用表达式</span>
        <div className="re-common">
          {commonExpressions.map((exp, i) => (
            <button
              key={i}
              className="re-common-btn"
              onClick={() => insertExpression(exp.value)}
              title={exp.value}
            >
              {exp.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
