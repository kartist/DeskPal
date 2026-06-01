import { useState, useCallback } from "react";
import { parseJwt } from "./utils";
import "./jwt.css";

export default function JwtTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ header: string; payload: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDecode = useCallback(() => {
    if (!input.trim()) { setResult(null); setError(null); return; }
    try {
      const { header, payload } = parseJwt(input.trim());
      setResult({
        header: JSON.stringify(header, null, 2),
        payload: JSON.stringify(payload, null, 2),
      });
      setError(null);
    } catch (e: any) {
      setError(e.message || "JWT 解析失败");
      setResult(null);
    }
  }, [input]);

  return (
    <div className="tool-panel jw-container">
      <textarea className="jw-textarea" placeholder="粘贴 JWT Token…" value={input} onChange={(e) => setInput(e.target.value)} />
      <button className="action-btn" onClick={handleDecode}>解析</button>
      <button className="action-btn" onClick={() => { setInput(""); setResult(null); setError(null); }}>↻ 清空</button>
      {error && <div className="jw-error">{error}</div>}
      {result && (
        <>
          <div className="jw-section">
            <span className="jw-section-title">Header</span>
            <pre className="jw-json">{result.header}</pre>
          </div>
          <div className="jw-section">
            <span className="jw-section-title">Payload</span>
            <pre className="jw-json">{result.payload}</pre>
          </div>
        </>
      )}
    </div>
  );
}
