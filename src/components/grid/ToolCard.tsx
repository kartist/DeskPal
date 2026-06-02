import { Clock, Terminal, Braces, Type, CaseSensitive, FileDiff, Fingerprint, Shuffle, Link2, Code, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ToolPlugin } from "../../types";

const iconMap: Record<string, LucideIcon> = {
  clock: Clock, braces: Braces, type: Type, "case-sensitive": CaseSensitive,
  "file-diff": FileDiff, fingerprint: Fingerprint, shuffle: Shuffle,
  link: Link2, code: Code, shield: Shield, terminal: Terminal,
};

interface ToolCardProps {
  tool: ToolPlugin;
  isActive: boolean;
  editMode: boolean;
  isDragging?: boolean;
  onSelect: (toolId: string | null) => void;
  onDragStart: (e: React.MouseEvent, toolId: string) => void;
}

export default function ToolCard({ tool, isActive, editMode, isDragging, onSelect, onDragStart }: ToolCardProps) {
  const Icon = iconMap[tool.icon] || Clock;

  return (
    <div
      className={`tool-card${isActive ? " active" : ""}${editMode ? " edit-mode" : ""}${isDragging ? " dragging" : ""}`}
      onClick={() => {
        if (editMode) return;
        onSelect(isActive ? null : tool.id);
      }}
      onMouseDown={(e) => {
        if (!editMode) return;
        onDragStart(e, tool.id);
      }}
    >
      <Icon className="tool-card-icon" size={24} />
      <span className="tool-card-label">{tool.name}</span>
    </div>
  );
}
