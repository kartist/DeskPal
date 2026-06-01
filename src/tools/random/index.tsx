import { useState, useCallback } from "react";
import { useToast } from "../../store/toastStore";
import "./random.css";

const DEFAULT_CHARS = {
  numbers: "0123456789",
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  special: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

export default function RandomTool() {
  const [length, setLength] = useState(16);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useUpper, setUseUpper] = useState(true);
  const [useSpecial, setUseSpecial] = useState(false);
  const [result, setResult] = useState("");

  const generate = useCallback(() => {
    let chars = "";
    if (useNumbers) chars += DEFAULT_CHARS.numbers;
    if (useLower) chars += DEFAULT_CHARS.lower;
    if (useUpper) chars += DEFAULT_CHARS.upper;
    if (useSpecial) chars += DEFAULT_CHARS.special;
    if (!chars) return;

    let result = "";
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
    setResult(result);
    navigator.clipboard.writeText(result).then(() => useToast.getState().show("已复制"));
  }, [length, useNumbers, useLower, useUpper, useSpecial]);

  return (
    <div className="tool-panel r-container">
      <div className="r-row">
        <span>长度: {length}</span>
        <input type="range" min="4" max="128" value={length} onChange={(e) => setLength(Number(e.target.value))} />
      </div>
      <div className="r-row">
        <label><input type="checkbox" checked={useNumbers} onChange={() => setUseNumbers(!useNumbers)} /> 数字 (0-9)</label>
        <label><input type="checkbox" checked={useLower} onChange={() => setUseLower(!useLower)} /> 小写 (a-z)</label>
        <label><input type="checkbox" checked={useUpper} onChange={() => setUseUpper(!useUpper)} /> 大写 (A-Z)</label>
        <label><input type="checkbox" checked={useSpecial} onChange={() => setUseSpecial(!useSpecial)} /> 特殊字符</label>
      </div>
      <button className="action-btn" onClick={generate}>生成</button>
      {result && (
        <div className="r-result" onClick={() => {
          navigator.clipboard.writeText(result).then(() => useToast.getState().show("已复制"));
        }}>{result}</div>
      )}
    </div>
  );
}
