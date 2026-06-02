import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useStore } from "../../store";
import { gridTools } from "../../lib/registry";
import { mergeAllTools } from "../../lib/categories";
import CategorySection from "./CategorySection";
import EditModeBar from "./EditModeBar";
import { Clock, Terminal, Braces, Type, CaseSensitive, FileDiff, Fingerprint, Shuffle, Link2, Code, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import "./grid.css";

const iconMap: Record<string, LucideIcon> = {
  clock: Clock, braces: Braces, type: Type, "case-sensitive": CaseSensitive,
  "file-diff": FileDiff, fingerprint: Fingerprint, shuffle: Shuffle,
  link: Link2, code: Code, shield: Shield, terminal: Terminal,
};

interface DragState {
  toolId: string;
  sourceCatId: string;
  mouseX: number;
  mouseY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export default function ToolGridPanel() {
  const { categories, setCategories, editMode } = useStore();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const handleToggle = useCallback((catId: string) => {
    setCollapsed((prev) => ({ ...prev, [catId]: !prev[catId] }));
  }, []);

  const addCategory = useCallback(() => {
    const name = prompt("请输入分类名称:");
    if (!name || !name.trim()) return;
    setCategories([...categories, { id: `cat_${Date.now()}`, name: name.trim(), toolIds: [], isSystem: false }]);
  }, [categories, setCategories]);

  // --- Mouse-drag: start from ToolCard ---
  const handleDragStart = useCallback((e: React.MouseEvent, toolId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();

    // Find source category
    const sourceCat = categories.find((c) => {
      const ids = c.id === "__all__" ? mergeAllTools(c.toolIds) : c.toolIds;
      return ids.includes(toolId);
    });
    if (!sourceCat) return;

    setDrag({
      toolId,
      sourceCatId: sourceCat.id,
      mouseX: e.clientX,
      mouseY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    });
  }, [categories]);

  // --- Document-level mouse move / up ---
  useEffect(() => {
    if (!drag) return;

    const findCategoryAt = (x: number, y: number): string | null => {
      const els = document.elementsFromPoint(x, y);
      for (const el of els) {
        const section = (el as HTMLElement).closest?.("[data-cat-id]") as HTMLElement | null;
        if (section) return section.getAttribute("data-cat-id");
      }
      return null;
    };

    const onMove = (e: MouseEvent) => {
      setDrag((prev) => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null);
      const target = findCategoryAt(e.clientX, e.clientY);
      setDropTarget((prev) => prev !== target ? target : prev);
    };

    const onUp = (e: MouseEvent) => {
      const targetCatId = findCategoryAt(e.clientX, e.clientY);
      if (targetCatId && targetCatId !== drag.sourceCatId) {
        setCategories(
          categories.map((cat) => {
            // Remove from source (unless __all__)
            if (cat.id === drag.sourceCatId && !cat.isSystem) {
              return { ...cat, toolIds: cat.toolIds.filter((id) => id !== drag.toolId) };
            }
            // Add to target (unless __all__, and deduplicate)
            if (cat.id === targetCatId && cat.id !== "__all__") {
              if (!cat.toolIds.includes(drag.toolId)) {
                return { ...cat, toolIds: [...cat.toolIds, drag.toolId] };
              }
            }
            return cat;
          })
        );
      }
      setDrag(null);
      setDropTarget(null);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [drag, categories, setCategories]);

  // Look up tool metadata for the ghost
  const dragTool = drag ? gridTools.find((t) => t.id === drag.toolId) : null;

  return (
    <div className="toolgrid-panel">
      <div className="cat-sections">
        {categories.map((cat) => (
          <CategorySection
            key={cat.id}
            category={cat}
            editMode={editMode}
            collapsed={!!collapsed[cat.id]}
            dropTargetId={dropTarget}
            dragToolId={drag?.toolId ?? null}
            onToggle={() => handleToggle(cat.id)}
            onDragStart={handleDragStart}
          />
        ))}
        {editMode && (
          <button className="cat-add-btn" title="新增分类" onClick={addCategory}>+</button>
        )}
      </div>
      {editMode && <EditModeBar />}

      {/* Drag ghost via portal */}
      {drag && dragTool && createPortal(
        <div
          className="drag-ghost"
          style={{
            position: "fixed",
            left: drag.mouseX - drag.offsetX,
            top: drag.mouseY - drag.offsetY,
            width: drag.width,
            height: drag.height,
            pointerEvents: "none",
            zIndex: 9999,
          }}
        >
          {(() => {
            const GIcon = iconMap[dragTool.icon] || Clock;
            return (
              <div className="tool-card drag-ghost-card" style={{ width: "100%", height: "100%" }}>
                <GIcon className="tool-card-icon" size={22} />
                <span className="tool-card-label">{dragTool.name}</span>
              </div>
            );
          })()}
        </div>,
        document.body
      )}
    </div>
  );
}
