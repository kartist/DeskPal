import { useState, useCallback } from "react";
import { uuidV4, ulid } from "./utils";
import { useToast } from "../../store/toastStore";
import "./uuid.css";

export default function UuidTool() {
  const [uuid, setUuid] = useState("");
  const [ulidStr, setUlidStr] = useState("");

  const generateUuid = useCallback(() => {
    const id = uuidV4();
    setUuid(id);
    navigator.clipboard.writeText(id).then(() => useToast.getState().show("已复制"));
  }, []);

  const generateUlid = useCallback(() => {
    const id = ulid();
    setUlidStr(id);
    navigator.clipboard.writeText(id).then(() => useToast.getState().show("已复制"));
  }, []);

  return (
    <div className="tool-panel u-container">
      <div className="u-section">
        <span className="u-section-title">UUID v4</span>
        <div className="u-row">
          <span className="u-value">{uuid || "—"}</span>
          <button className="action-btn" onClick={generateUuid}>生成 UUID</button>
        </div>
      </div>
      <div className="u-section">
        <span className="u-section-title">ULID</span>
        <div className="u-row">
          <span className="u-value">{ulidStr || "—"}</span>
          <button className="action-btn" onClick={generateUlid}>生成 ULID</button>
        </div>
      </div>
    </div>
  );
}
