import { useState, useEffect, useRef } from "react";
import { diffLines } from "diff";
import { useStore } from "../../store";
import "./diff.css";

export default function DiffTool() {
  const setDiffOriginal = useStore((s) => s.setDiffOriginal);
  const setDiffModified = useStore((s) => s.setDiffModified);
  const [original, setOriginal] = useState("");
  const [modified, setModified] = useState("");
  const inited = useRef(false);

  // 挂载时从 store 恢复
  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    const s = useStore.getState();
    if (s.diffOriginal) setOriginal(s.diffOriginal);
    if (s.diffModified) setModified(s.diffModified);
  }, []);

  // 输入变更 → 同步到 store
  useEffect(() => { setDiffOriginal(original); }, [original, setDiffOriginal]);
  useEffect(() => { setDiffModified(modified); }, [modified, setDiffModified]);

  const changes = diffLines(original, modified);

  return (
    <div className="tool-panel d-container">
      <div className="d-inputs">
        <textarea
          className="d-textarea"
          placeholder="原文…"
          value={original}
          onChange={(e) => setOriginal(e.target.value)}
        />
        <textarea
          className="d-textarea"
          placeholder="修改文…"
          value={modified}
          onChange={(e) => setModified(e.target.value)}
        />
      </div>

      <div className="d-output">
        <div className="d-output-header">差异对比</div>
        <div className="d-output-content">
          {changes.map((part, i) => {
            if (part.added) {
              return <div key={i} className="d-line d-added"><span className="d-sign">+</span>{part.value}</div>;
            }
            if (part.removed) {
              return <div key={i} className="d-line d-removed"><span className="d-sign">-</span>{part.value}</div>;
            }
            return <div key={i} className="d-line d-unchanged"><span className="d-sign"> </span>{part.value}</div>;
          })}
        </div>
      </div>
    </div>
  );
}
