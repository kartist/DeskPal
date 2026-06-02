import { useState, useCallback, useRef } from "react";
import { useStore } from "../../store";
import { gridTools } from "../../lib/registry";
import { mergeAllTools } from "../../lib/categories";
import ToolCard from "./ToolCard";
import type { ToolCategory } from "../../types";

interface CategorySectionProps {
  category: ToolCategory;
  editMode: boolean;
  collapsed: boolean;
  onToggle: () => void;
}

export default function CategorySection({
  category,
  editMode,
  collapsed,
  onToggle,
}: CategorySectionProps) {
  const { setCategories, categories, activeTool, setActiveTool } = useStore();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(category.name);
  const [dropOver, setDropOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Resolve tool list
  const resolvedToolIds =
    category.id === "__all__"
      ? mergeAllTools(category.toolIds)
      : category.toolIds;

  const tools = resolvedToolIds
    .map((id) => gridTools.find((t) => t.id === id))
    .filter(Boolean) as typeof gridTools;

  // Rename
  const startRename = useCallback(() => {
    setNameInput(category.name);
    setEditingName(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [category.name]);

  const confirmRename = useCallback(() => {
    if (!nameInput.trim()) {
      setEditingName(false);
      return;
    }
    const updated = categories.map((cat) =>
      cat.id === category.id ? { ...cat, name: nameInput.trim() } : cat
    );
    setCategories(updated);
    setEditingName(false);
  }, [nameInput, category.id, categories, setCategories]);

  // Delete
  const deleteCat = useCallback(() => {
    if (category.isSystem) return;
    const remaining = categories.filter((c) => c.id !== category.id);
    setCategories(remaining);
  }, [category, categories, setCategories]);

  // Cross-category drop (on the section body area)
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropOver(false);

      const toolId = e.dataTransfer.getData("text/plain");
      if (!toolId || category.id === "__all__") return; // no-op on __all__

      // Find which category currently contains this tool
      const sourceCat = categories.find((cat) =>
        cat.toolIds.includes(toolId)
      );
      if (!sourceCat) return;
      if (sourceCat.id === category.id) return; // same category, no-op

      // Move: remove from source (unless __all__), add to target
      const updated = categories.map((cat) => {
        if (cat.id === sourceCat.id && !cat.isSystem) {
          return {
            ...cat,
            toolIds: cat.toolIds.filter((id) => id !== toolId),
          };
        }
        if (cat.id === category.id) {
          return { ...cat, toolIds: [...cat.toolIds, toolId] };
        }
        return cat;
      });
      setCategories(updated);
    },
    [category.id, categories, setCategories]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  // Within-category reorder
  const handleReorder = useCallback(
    (_e: React.DragEvent, from: number, to: number) => {
      if (category.id === "__all__" || category.isSystem) return;
      const ids = [...category.toolIds];
      ids.splice(from, 1);
      ids.splice(to, 0, category.toolIds[from]);
      const updated = categories.map((cat) =>
        cat.id === category.id ? { ...cat, toolIds: ids } : cat
      );
      setCategories(updated);
    },
    [category, categories, setCategories]
  );

  return (
    <div
      className={`cat-section${dropOver ? " drop-target" : ""}`}
      onDragOver={editMode ? handleDragOver : undefined}
      onDragEnter={editMode ? () => setDropOver(true) : undefined}
      onDragLeave={editMode ? () => setDropOver(false) : undefined}
      onDrop={editMode ? handleDrop : undefined}
    >
      {/* Header */}
      <div className="cat-header" onClick={onToggle}>
        <span className="cat-arrow">{collapsed ? "▶" : "▼"}</span>
        {category.isSystem && (
          <span className="cat-lock" title="系统分类，不可删除">🔒</span>
        )}
        {editingName ? (
          <input
            ref={inputRef}
            className="cat-name-input"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmRename();
              if (e.key === "Escape") setEditingName(false);
            }}
            onBlur={confirmRename}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="cat-name">{category.name}</span>
        )}
        {editMode && !category.isSystem && !editingName && (
          <span className="cat-header-actions">
            <button
              className="cat-action-btn"
              title="重命名"
              onClick={(e) => {
                e.stopPropagation();
                startRename();
              }}
            >
              ✏️
            </button>
            <button
              className="cat-action-btn danger"
              title="删除"
              onClick={(e) => {
                e.stopPropagation();
                deleteCat();
              }}
            >
              🗑️
            </button>
          </span>
        )}
      </div>

      {/* Tools grid (when expanded) */}
      {!collapsed && (
        <div className="cat-body">
          {tools.length === 0 ? (
            <div className="cat-empty">
              <span className="cat-empty-icon">📦</span>
              <span>拖拽工具到此处</span>
            </div>
          ) : (
            <div className="cat-tools">
              {tools.map((tool, index) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  isActive={activeTool === tool.id}
                  editMode={editMode}
                  index={index}
                  onSelect={(id) => setActiveTool(id)}
                  onDragStart={() => {}}
                  onDragOver={() => {}}
                  onDrop={(e, toIdx) =>
                    handleReorder(e, index, toIdx)
                  }
                  onDragEnd={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
