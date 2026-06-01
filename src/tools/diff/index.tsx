import { useState } from "react";
import { diffLines } from "diff";
import "./diff.css";

export default function DiffTool() {
  const [original, setOriginal] = useState("");
  const [modified, setModified] = useState("");

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
