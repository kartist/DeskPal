import { useState, useCallback } from "react";
import { useStore } from "../../store";
import CategorySection from "./CategorySection";
import EditModeBar from "./EditModeBar";
import "./grid.css";

export default function ToolGridPanel() {
  const { categories, setCategories, editMode } = useStore();

  // Collapse state: Record<categoryId, boolean>
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const handleToggle = useCallback((catId: string) => {
    setCollapsed((prev) => ({ ...prev, [catId]: !prev[catId] }));
  }, []);

  // Add category
  const addCategory = useCallback(() => {
    const name = prompt("请输入分类名称:");
    if (!name || !name.trim()) return;
    const newCat = {
      id: `cat_${Date.now()}`,
      name: name.trim(),
      toolIds: [],
      isSystem: false,
    };
    setCategories([...categories, newCat]);
  }, [categories, setCategories]);

  return (
    <div className="toolgrid-panel">
      <div className="cat-sections">
        {categories.map((cat) => (
          <CategorySection
            key={cat.id}
            category={cat}
            editMode={editMode}
            collapsed={!!collapsed[cat.id]}
            onToggle={() => handleToggle(cat.id)}
          />
        ))}
        {editMode && (
          <button className="cat-add-btn" title="新增分类" onClick={addCategory}>
            +
          </button>
        )}
      </div>
      {editMode && <EditModeBar />}
    </div>
  );
}
