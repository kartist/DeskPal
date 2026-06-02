import { useState, useCallback } from "react";
import { useStore } from "../../store";

export default function CategoryTabs() {
  const { categories, setCategories, activeCategory, setActiveCategory, editMode } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Start rename
  const startRename = useCallback((catId: string, currentName: string) => {
    setEditingId(catId);
    setEditName(currentName);
  }, []);

  // Confirm rename
  const confirmRename = useCallback(() => {
    if (!editingId || !editName.trim()) {
      setEditingId(null);
      return;
    }
    const updated = categories.map((cat) =>
      cat.id === editingId ? { ...cat, name: editName.trim() } : cat
    );
    setCategories(updated);
    setEditingId(null);
  }, [editingId, editName, categories, setCategories]);

  // Cancel rename
  const cancelRename = useCallback(() => {
    setEditingId(null);
  }, []);

  // Delete category
  const deleteCategory = useCallback(
    (catId: string) => {
      // isSystem categories (__all__) cannot be deleted
      const cat = categories.find((c) => c.id === catId);
      if (!cat || cat.isSystem) return;
      const remaining = categories.filter((c) => c.id !== catId);
      setCategories(remaining);
      // If the deleted category was active, switch to first available
      if (activeCategory === catId && remaining.length > 0) {
        setActiveCategory(remaining[0].id);
      }
    },
    [categories, setCategories, activeCategory, setActiveCategory]
  );

  // Add new category
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
    setActiveCategory(newCat.id);
  }, [categories, setCategories, setActiveCategory]);

  // Handle rename input keydown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        confirmRename();
      } else if (e.key === "Escape") {
        cancelRename();
      }
    },
    [confirmRename, cancelRename]
  );

  return (
    <div className="cat-tabs">
      {categories.map((cat) => (
        <div
          key={cat.id}
          className={`cat-tab${activeCategory === cat.id ? " active" : ""}${cat.isSystem ? " system" : ""}`}
          onClick={() => setActiveCategory(cat.id)}
        >
          {editingId === cat.id ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={confirmRename}
              autoFocus
              style={{
                width: Math.max(editName.length * 8 + 16, 60),
                background: "var(--input-bg)",
                border: "1px solid var(--accent)",
                borderRadius: 3,
                color: "var(--text-primary)",
                fontSize: 12,
                padding: "1px 4px",
                outline: "none",
                fontFamily: "var(--font-ui)",
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              {cat.isSystem && <span className="cat-tab-lock">🔒</span>}
              <span>{cat.name}</span>
            </>
          )}
          {editMode && !cat.isSystem && editingId !== cat.id && (
            <>
              <button
                className="cat-tab-edit-btn"
                title="重命名"
                onClick={(e) => {
                  e.stopPropagation();
                  startRename(cat.id, cat.name);
                }}
              >
                ✏️
              </button>
              <button
                className="cat-tab-edit-btn danger"
                title="删除"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCategory(cat.id);
                }}
              >
                🗑️
              </button>
            </>
          )}
        </div>
      ))}
      {editMode && (
        <button className="cat-add-btn" title="新增分类" onClick={addCategory}>
          +
        </button>
      )}
    </div>
  );
}
