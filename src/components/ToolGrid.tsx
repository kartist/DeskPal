import { useStore } from "../store";
import { gridTools } from "../lib/registry";
import {
  Clock, Braces, Type, Shield, Terminal, Lock, Palette,
  FileText, Link, CaseSensitive, FileDiff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  clock: Clock,
  braces: Braces,
  type: Type,
  shield: Shield,
  terminal: Terminal,
  lock: Lock,
  palette: Palette,
  "file-text": FileText,
  link: Link,
  "case-sensitive": CaseSensitive,
  "file-diff": FileDiff,
};

export function ToolGrid() {
  const { activeTool, setActiveTool } = useStore();

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <div className="tool-grid">
        {gridTools.map((tool) => {
          const Icon = iconMap[tool.icon] || Clock;
          const isActive = activeTool === tool.id;
          return (
            <div
              key={tool.id}
              className={`tool-card ${isActive ? "active" : ""}`}
              onClick={() => setActiveTool(isActive ? null : tool.id)}
            >
              <Icon className="tool-card-icon" size={24} />
              <span className="tool-card-label">{tool.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
