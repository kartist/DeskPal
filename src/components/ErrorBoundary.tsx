import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  toolId: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: string | null;
}

/**
 * 插件错误边界 — 捕获子组件渲染错误，隔离单个插件崩溃不影响整体。
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[DeskPal] ErrorBoundary caught error in tool '${this.props.toolId}':`, error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="tool-panel" style={{ textAlign: "center", paddingTop: 24 }}>
          <div style={{ color: "var(--danger)", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            ⚠️ 工具加载失败
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 12, maxWidth: "80%", margin: "0 auto", wordBreak: "break-word", userSelect: "text", cursor: "text" }}>
            {this.state.error || "未知错误"}
          </div>
          <button
            className="action-btn"
            style={{ marginTop: 12 }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
