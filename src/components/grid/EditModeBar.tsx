import { useStore } from "../../store";

export default function EditModeBar() {
  const { setEditMode } = useStore();

  return (
    <div className="edit-mode-bar">
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
        拖拽工具卡片调整顺序，点击分类标签右侧按钮管理分类
      </span>
      <button
        className="edit-btn done"
        onClick={() => setEditMode(false)}
      >
        完成
      </button>
    </div>
  );
}
