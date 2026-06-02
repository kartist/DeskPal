import { Clock, Terminal, Braces, Type, CaseSensitive, FileDiff, Fingerprint, Shuffle, Link2, Code, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ToolPlugin } from "../../types";

// Map tool icon keys to lucide-react components
const iconMap: Record<string, LucideIcon> = {
  clock: Clock,
  braces: Braces,
  type: Type,
  "case-sensitive": CaseSensitive,
  "file-diff": FileDiff,
  fingerprint: Fingerprint,
  shuffle: Shuffle,
  link: Link2,
  code: Code,
  shield: Shield,
  terminal: Terminal,
};

interface ToolCardProps {
  tool: ToolPlugin;
  isActive: boolean;
  editMode: boolean;
  index: number;
  onSelect: (toolId: string | null) => void;
  onDragStart: (e: React.DragEvent, toolId: string) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export default function ToolCard({
  tool,
  isActive,
  editMode,
  index,
  onSelect,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: ToolCardProps) {
  const Icon = iconMap[tool.icon] || Clock;

  return (
    <div
      className={`tool-card${isActive ? " active" : ""}${editMode ? " edit-mode" : ""}`}
      draggable={editMode}
      onClick={() => {
        if (editMode) return; // edit mode: click doesn't select the tool
        onSelect(isActive ? null : tool.id);
      }}
      onDragStart={(e) => onDragStart(e, tool.id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e, index);
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(e, index);
      }}
      onDragEnd={onDragEnd}
    >
      <Icon className="tool-card-icon" size={24} />
      <span className="tool-card-label">{tool.name}</span>
    </div>
  );
}
