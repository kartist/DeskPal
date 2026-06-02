import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useStore } from "../../store";
import { gridTools } from "../../lib/registry";
import CategorySection from "./CategorySection";
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
  const { categories, setCategories, editMode, collapsedCategories, setCollapsedCategories } = useStore();
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // One-time cleanup: deduplicate persisted toolIds (remove stale duplicates from localStorage)
  useEffect(() => {
    let dirty = false;
    const cleaned = categories.map((cat) => {
      const deduped = [...new Set(cat.toolIds)];
      if (deduped.length !== cat.toolIds.length) { dirty = true; }
      return { ...cat, toolIds: deduped };
    });
    if (dirty) setCategories(cleaned);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — only on mount

  const handleToggle = useCallback((catId: string) => {
    const isCollapsed = collapsedCategories.includes(catId);
    if (isCollapsed) {
      setCollapsedCategories(collapsedCategories.filter((id) => id !== catId));
    } else {
      setCollapsedCategories([...collapsedCategories, catId]);
    }
  }, [collapsedCategories, setCollapsedCategories]);

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

    // Find source category — prefer non-__all__ (where user actually placed it)
    const sourceCat =
      categories.filter(c => c.id !== "__all__").find((c) => c.toolIds.includes(toolId))
      ?? categories.find((c) => c.id === "__all__");
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
        const next = categories.map((cat) => {
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
          });
        setCategories(next);
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
            collapsed={collapsedCategories.includes(cat.id)}
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
