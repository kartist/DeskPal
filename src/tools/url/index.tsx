import { useState, useCallback } from "react";
import "./url.css";

export default function UrlTool() {
  const [input, setInput] = useState("");

  const handleEncode = useCallback(() => {
    if (!input.trim()) return;
    try { setInput(encodeURIComponent(input)); } catch {}
  }, [input]);

  const handleDecode = useCallback(() => {
    if (!input.trim()) return;
    try { setInput(decodeURIComponent(input)); } catch {}
  }, [input]);

  const handleEncodeFull = useCallback(() => {
    if (!input.trim()) return;
    try { setInput(encodeURI(input)); } catch {}
  }, [input]);

  const handleDecodeFull = useCallback(() => {
    if (!input.trim()) return;
    try { setInput(decodeURI(input)); } catch {}
  }, [input]);

  return (
    <div className="tool-panel ua-container">
      <textarea className="ua-textarea" placeholder="输入 URL 或文本…" value={input} onChange={(e) => setInput(e.target.value)} />
      <div className="ua-btn-group">
        <button className="action-btn" onClick={handleEncode}>encodeURIComponent</button>
        <button className="action-btn" onClick={handleDecode}>decodeURIComponent</button>
        <button className="action-btn" onClick={handleEncodeFull}>encodeURI</button>
        <button className="action-btn" onClick={handleDecodeFull}>decodeURI</button>
      </div>
      <button className="action-btn" onClick={() => setInput("")}>↻ 清空</button>
    </div>
  );
}
