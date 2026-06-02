import { useStore } from "../store";

export function StatusBar() {
  const { editMode, setEditMode } = useStore();

  return (
    <div className="statusbar">
      <span>就绪 | DeskPal v1.1</span>
      <span style={{ flex: 1 }} />
      {!editMode && (
        <button
          className="edit-btn active"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            padding: "2px 8px",
            border: "1px solid var(--btn-border)",
            borderRadius: 4,
            background: "var(--btn-bg)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
          }}
          onClick={() => setEditMode(true)}
        >
          编辑布局
        </button>
      )}
    </div>
  );
}
