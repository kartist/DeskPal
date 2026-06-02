import { useState, useCallback, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useStore } from "../../store";
import { gridTools } from "../../lib/registry";
import { mergeAllTools } from "../../lib/categories";
import ToolCard from "./ToolCard";
import type { ToolCategory } from "../../types";

interface CategorySectionProps {
  category: ToolCategory;
  editMode: boolean;
  collapsed: boolean;
  dropTargetId: string | null;
  dragToolId: string | null;
  onToggle: () => void;
  onDragStart: (e: React.MouseEvent, toolId: string) => void;
}

export default function CategorySection({
  category, editMode, collapsed,
  dropTargetId, dragToolId,
  onToggle, onDragStart,
}: CategorySectionProps) {
  const { setCategories, categories, activeTool, setActiveTool } = useStore();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(category.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const resolvedToolIds = category.id === "__all__"
    ? mergeAllTools(category.toolIds)
    : [...new Set(category.toolIds)];  // dedup in case of stale duplicate data

  const tools = resolvedToolIds
    .map((id) => gridTools.find((t) => t.id === id))
    .filter(Boolean) as typeof gridTools;

  const isDropTarget = dropTargetId === category.id;

  const startRename = useCallback(() => {
    setNameInput(category.name); setEditingName(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [category.name]);

  const confirmRename = useCallback(() => {
    if (!nameInput.trim()) { setEditingName(false); return; }
    setCategories(categories.map((cat) =>
      cat.id === category.id ? { ...cat, name: nameInput.trim() } : cat));
    setEditingName(false);
  }, [nameInput, category.id, categories, setCategories]);

  const deleteCat = useCallback(() => {
    if (category.isSystem) return;
    setCategories(categories.filter((c) => c.id !== category.id));
  }, [category, categories, setCategories]);

  return (
    <div
      className={`cat-section${isDropTarget ? " drop-target" : ""}`}
      data-cat-id={category.id}
    >
      <div className="cat-header" onClick={onToggle}>
        <span className="cat-arrow">{collapsed ? "▶" : "▼"}</span>
        {category.isSystem && <span className="cat-lock" title="系统分类，不可删除">🔒</span>}
        {editingName ? (
          <input ref={inputRef} className="cat-name-input" value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setEditingName(false); }}
            onBlur={confirmRename} onClick={(e) => e.stopPropagation()} />
        ) : (
          <span className="cat-name">{category.name}</span>
        )}
        {editMode && !category.isSystem && !editingName && (
          <span className="cat-header-actions">
            <button className="cat-action-btn" title="重命名"
              onClick={(e) => { e.stopPropagation(); startRename(); }}><Pencil size={14} /></button>
            <button className="cat-action-btn danger" title="删除"
              onClick={(e) => { e.stopPropagation(); deleteCat(); }}><Trash2 size={14} /></button>
          </span>
        )}
      </div>

      {!collapsed && (
        <div className="cat-body">
          {tools.length === 0 ? (
            <div className="cat-empty">
              <span className="cat-empty-icon">📦</span>
              <span>拖拽工具到此处</span>
            </div>
          ) : (
            <div className="cat-tools">
              {tools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  isActive={activeTool === tool.id}
                  editMode={editMode}
                  isDragging={dragToolId === tool.id}
                  onSelect={(id) => setActiveTool(id)}
                  onDragStart={onDragStart}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
