import { useState, useEffect, useCallback, useRef } from "react";
import { Copy, Check } from "lucide-react";
import {
  getNow,
  parseInput,
  timestampToDate,
} from "./utils";
import type { TimestampResult } from "./utils";
import { useToast } from "../../store/toastStore";
import "./timestamp.css";

type CopyKey = "unixSec" | "unixMs" | "iso8601" | "locale";

export default function TimestampTool() {
  const [now, setNow] = useState<TimestampResult>(getNow);
  const [live, setLive] = useState(true);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<TimestampResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  // 实时刷新
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      setNow(getNow());
    }, 1000);
    return () => clearInterval(id);
  }, [live]);

  // 挂载时读取剪贴板
  useEffect(() => {
    navigator.clipboard.readText().then((text) => {
      if (!text.trim()) return;
      const parsed = parseInput(text);
      if (parsed.type !== "invalid" && parsed.converted) {
        setInput(text);
        setResult(parsed.converted);
        setError(null);
      }
    }).catch(() => {});
  }, []);

  // 复制功能
  const handleCopy = useCallback(async (key: CopyKey, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      useToast.getState().show("已复制");
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopied((prev) => ({ ...prev, [key]: false }));
      }, 800);
    } catch {
      // 静默失败
    }
  }, []);

  const handleCopyResult = useCallback(
    async (key: string, value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        useToast.getState().show("已复制");
        setCopied((prev) => ({ ...prev, [key]: true }));
        setTimeout(() => {
          setCopied((prev) => ({ ...prev, [key]: false }));
        }, 800);
      } catch {
        // 静默失败
      }
    },
    []
  );

  // 自动识别
  const handleAutoDetect = useCallback(() => {
    if (!input.trim()) {
      setResult(null);
      setError(null);
      return;
    }
    setError(null);
    const parsed = parseInput(input);
    if (parsed.type === "invalid") {
      setResult(null);
      setError(parsed.error ?? "无法识别");
    } else if (parsed.converted) {
      setResult(parsed.converted);
    }
  }, [input]);

  // 转为秒
  const handleToSec = useCallback(() => {
    if (!input.trim()) {
      setResult(null);
      setError(null);
      return;
    }
    setError(null);
    const trimmed = input.trim();
    const num = Number(trimmed);
    if (isNaN(num)) {
      setError("请输入有效的数字");
      setResult(null);
      return;
    }
    try {
      const r = timestampToDate(num);
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    }
  }, [input]);

  // 转为毫秒
  const handleToMs = useCallback(() => {
    if (!input.trim()) {
      setResult(null);
      setError(null);
      return;
    }
    setError(null);
    const trimmed = input.trim();
    const num = Number(trimmed);
    if (isNaN(num)) {
      setError("请输入有效的数字");
      setResult(null);
      return;
    }
    try {
      const r = timestampToDate(num * 1000);
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    }
  }, [input]);

  // 切换实时刷新
  const toggleLive = useCallback(() => {
    setLive((prev) => !prev);
  }, []);

  // 输入变化时只更新 input，防抖处理在 useEffect 中完成
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInput(e.target.value);
    },
    []
  );

  // 防抖自动转换：input 变化后 300ms 自动解析
  useEffect(() => {
    if (!input.trim()) {
      setResult(null);
      setError(null);
      return;
    }
    const timer = setTimeout(() => {
      const parsed = parseInput(input);
      if (parsed.type === "invalid") {
        setResult(null);
        setError(parsed.error ?? "无法识别");
      } else if (parsed.converted) {
        setResult(parsed.converted);
        setError(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  // 键盘回车触发自动识别
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleAutoDetect();
      }
    },
    [handleAutoDetect]
  );

  const nowEntries: { key: CopyKey; label: string; value: string }[] = [
    { key: "unixSec", label: "Unix(秒)", value: String(now.unixSec) },
    { key: "unixMs", label: "Unix(毫秒)", value: String(now.unixMs) },
    { key: "iso8601", label: "ISO 8601", value: now.iso8601 },
    { key: "locale", label: "本地时间", value: now.locale },
  ];

  const resultEntries: { key: string; label: string; value: string }[] =
    result
      ? [
          {
            key: "r_unixSec",
            label: "Unix(秒)",
            value: String(result.unixSec),
          },
          {
            key: "r_unixMs",
            label: "Unix(毫秒)",
            value: String(result.unixMs),
          },
          { key: "r_iso8601", label: "ISO 8601", value: result.iso8601 },
          { key: "r_locale", label: "本地时间", value: result.locale },
        ]
      : [];

  return (
    <div className="tool-panel ts-container">
      {/* 当前时间区域 */}
      <div className="ts-header">
        <span className="ts-section-title">当前时间</span>
        <label>
          <span>实时刷新</span>
          <button
            className={`ts-toggle ${live ? "active" : ""}`}
            onClick={toggleLive}
            type="button"
            aria-label={live ? "关闭实时刷新" : "开启实时刷新"}
          />
        </label>
      </div>

      {nowEntries.map((entry) => (
        <div className="ts-row" key={entry.key}>
          <span className="ts-row-label">{entry.label}</span>
          <span className="ts-row-value" onClick={() => handleCopy(entry.key, entry.value)}>{entry.value}</span>
          <button
            className={`ts-copy-btn ${copied[entry.key] ? "copied" : ""}`}
            onClick={() => handleCopy(entry.key, entry.value)}
            title="复制"
            type="button"
          >
            {copied[entry.key] ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      ))}

      <hr className="ts-divider" />

      {/* 转换区域 */}
      <div className="ts-input-area">
        <span className="ts-section-title">转换</span>
        <div className="ts-input-row">
          <input
            className="tool-input"
            type="text"
            placeholder="输入 Unix 时间戳或日期字符串…"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="ts-btn-group" style={{ marginTop: 6 }}>
          <button className="action-btn" onClick={handleAutoDetect} type="button">
            自动识别
          </button>
          <button className="action-btn" onClick={handleToSec} type="button">
            转秒
          </button>
          <button className="action-btn" onClick={handleToMs} type="button">
            转毫秒
          </button>
        </div>

        {/* 结果区域 */}
        {error && (
          <div className="ts-result-card ts-result-error">{error}</div>
        )}
        {result && !error && (
          <div className="ts-result-card">
            {resultEntries.map((entry) => (
              <div className="ts-row" key={entry.key}>
                <span className="ts-row-label">{entry.label}</span>
                <span className="ts-row-value" onClick={() => handleCopyResult(entry.key, entry.value)}>{entry.value}</span>
                <button
                  className={`ts-copy-btn ${copied[entry.key] ? "copied" : ""}`}
                  onClick={() => handleCopyResult(entry.key, entry.value)}
                  title="复制"
                  type="button"
                >
                  {copied[entry.key] ? (
                    <Check size={14} />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
