import { Suspense } from "react";
import { useStore } from "../store";
import { toolComponents } from "../tools";

export default function ToolPanel() {
  const activeTool = useStore((s) => s.activeTool);
  const ToolComponent = activeTool ? toolComponents[activeTool] : null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {ToolComponent ? (
          <Suspense
            fallback={
              <div
                className="tool-panel"
                style={{
                  textAlign: "center",
                  color: "var(--text-muted)",
                  paddingTop: 24,
                }}
              >
                加载中...
              </div>
            }
          >
            <ToolComponent />
          </Suspense>
        ) : (
          <div
            className="tool-panel"
            style={{
              textAlign: "center",
              color: "var(--text-muted)",
              paddingTop: 24,
            }}
          >
            工具未找到
          </div>
        )}
      </div>
    </div>
  );
}
