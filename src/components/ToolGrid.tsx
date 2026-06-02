import { useState, useCallback } from "react";
import { useStore } from "../store";
import { gridTools } from "../lib/registry";
import ToolCard from "./grid/ToolCard";
import "../styles/global.css";

/** Merge __all__ category toolIds with current registry */
function mergeAllTools(existingToolIds: string[]): string[] {
  const registryIds = new Set(gridTools.map((t) => t.id));
  // Keep user-added tools that are still in registry
  const existing = existingToolIds.filter((id) => registryIds.has(id));
  // Add new registry tools not yet in the list
  const newTools = gridTools
    .filter((t) => !existingToolIds.includes(t.id))
    .map((t) => t.id);
  return [...existing, ...newTools];
}

export default function ToolGrid() {
  const {
    activeTool, setActiveTool,
    editMode,
    categories, setCategories,
    activeCategory,
  } = useStore();

  const [dragSource, setDragSource] = useState<{
    categoryId: string;
    toolId: string;
  } | null>(null);

  // Find the current category
  const category = categories.find((c) => c.id === activeCategory);
  if (!category) return null;

  // For __all__, merge with registry (always up-to-date)
  const resolvedToolIds =
    category.id === "__all__" ? mergeAllTools(category.toolIds) : category.toolIds;

  // Look up ToolPlugin for each toolId
  const tools = resolvedToolIds
    .map((id) => gridTools.find((t) => t.id === id))
    .filter(Boolean) as typeof gridTools;

  // Drag handlers
  const handleDragStart = useCallback(
    (_e: React.DragEvent, toolId: string) => {
      setDragSource({ categoryId: category.id, toolId });
    },
    [category.id]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, _index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    []
  );

  const handleDrop = useCallback(
    (_e: React.DragEvent, dropIndex: number) => {
      if (!dragSource) return;
      setDragSource(null);

      const fromCatId = dragSource.categoryId;
      const toolId = dragSource.toolId;

      if (fromCatId !== category.id) {
        // Moving between categories: remove from source, add to target
        const updated = categories.map((cat) => {
          if (cat.id === fromCatId && !cat.isSystem) {
            return { ...cat, toolIds: cat.toolIds.filter((id) => id !== toolId) };
          }
          if (cat.id === category.id) {
            // Insert at drop position
            const newIds = [...cat.toolIds];
            newIds.splice(dropIndex, 0, toolId);
            return { ...cat, toolIds: newIds };
          }
          return cat;
        });
        setCategories(updated);
      } else {
        // Reorder within the same category
        const ids = [...resolvedToolIds];
        const fromIdx = ids.indexOf(toolId);
        if (fromIdx === -1 || fromIdx === dropIndex) return;

        ids.splice(fromIdx, 1);
        ids.splice(fromIdx < dropIndex ? dropIndex - 1 : dropIndex, 0, toolId);

        const updated = categories.map((cat) =>
          cat.id === category.id
            ? { ...cat, toolIds: category.isSystem ? ids : ids }
            : cat
        );
        setCategories(updated);
      }
    },
    [dragSource, category.id, category.isSystem, categories, resolvedToolIds, setCategories]
  );

  const handleDragEnd = useCallback(() => {
    setDragSource(null);
  }, []);

  return (
    <div className="tool-grid-wrapper">
      {tools.length === 0 ? (
        <div className="empty-category">
          <span className="empty-category-icon">📦</span>
          <span>拖拽工具到此处</span>
        </div>
      ) : (
        <div className="tool-grid">
          {tools.map((tool, index) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              isActive={activeTool === tool.id}
              editMode={editMode}
              index={index}
              onSelect={setActiveTool}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}
