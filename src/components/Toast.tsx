import { useToast } from "../store/toastStore";

export default function Toast() {
  const { message, visible } = useToast();

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 48,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        pointerEvents: "none",
        animation: "toastFadeIn 200ms ease-out",
      }}
    >
      <div
        style={{
          background: "var(--panel-bg)",
          color: "var(--text-primary)",
          padding: "8px 16px",
          borderRadius: 8,
          fontSize: 13,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          border: "1px solid var(--panel-border)",
          whiteSpace: "nowrap",
        }}
      >
        {message}
      </div>
    </div>
  );
}
