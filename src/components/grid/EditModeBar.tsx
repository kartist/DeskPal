import { Pencil, Check } from "lucide-react";
import { useStore } from "../../store";

export default function EditModeBar() {
  const { editMode, setEditMode } = useStore();

  return (
    <div className="grid-header">
      <span style={{ flex: 1 }} />
      <button
        className={`grid-edit-btn${editMode ? " active" : ""}`}
        onClick={() => setEditMode(!editMode)}
        title={editMode ? "完成编辑" : "编辑布局"}
      >
        {editMode ? <Check size={16} /> : <Pencil size={16} />}
      </button>
    </div>
  );
}
