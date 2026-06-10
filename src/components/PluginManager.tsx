import { useCallback } from "react";
import { useStore } from "../store";
import { useToast } from "../store/toastStore";
import { listPlugins, getPluginCode, getPluginCss } from "../lib/ipc";
import { loadPluginComponent, loadPluginCSS } from "../lib/pluginLoader";
import { registerExternalComponent, unregisterExternalComponent } from "../tools";
import { registerExternalPlugin } from "../lib/registry";
import { Box, RefreshCw, FolderOpen, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const CONTAINER_STYLE: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "16px 12px",
};

const CARD_STYLE: React.CSSProperties = {
  background: "var(--btn-bg)",
  border: "1px solid var(--btn-border)",
  borderRadius: 8,
  padding: "12px 14px",
  marginBottom: 8,
};

const HEADER_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 16,
};

const EMPTY_STYLE: React.CSSProperties = {
  textAlign: "center",
  padding: "32px 16px",
  color: "var(--text-muted)",
  fontSize: 13,
  lineHeight: 1.6,
};

const ACTION_BTN_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  height: 28,
  padding: "0 10px",
  border: "1px solid var(--btn-border)",
  background: "var(--btn-bg)",
  color: "var(--text-primary)",
  borderRadius: 4,
  fontSize: 12,
  cursor: "pointer",
};

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  loaded: { color: "var(--success)" },
  loading: { color: "var(--warning)" },
  error: { color: "var(--danger)" },
};

export function PluginManager() {
  const { pluginMetas, setPluginMetas, setPluginLoadError } = useStore();
  const toast = useToast((s) => s.show);

  const handleRescan = useCallback(async () => {
    try {
      setPluginLoadError(null);

      // 先卸载所有已有外部插件
      for (const m of pluginMetas) {
        if (m.status === "loaded") {
          unregisterExternalComponent(m.manifest.id);
          // CSS 清理由 pluginLoader 负责
        }
      }

      const results = await listPlugins();
      const metas = results.map((r) => ({
        manifest: r.manifest,
        status: (r.status === "ok" ? "loading" : "error") as "loading" | "error",
        error: r.error ?? undefined,
      }));
      setPluginMetas(metas);

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.status !== "ok") continue;

        const idx = i;
        try {
          const code = await getPluginCode(r.manifest.id);
          const component = loadPluginComponent(code);
          registerExternalComponent(r.manifest.id, component);

          const css = await getPluginCss(r.manifest.id);
          if (css.trim()) loadPluginCSS(css, r.manifest.id);

          registerExternalPlugin({ manifest: r.manifest, status: "loaded" });

          setPluginMetas(
            useStore.getState().pluginMetas.map((m, i2) =>
              i2 === idx ? { ...m, status: "loaded" as const } : m
            )
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[DeskPal] Plugin '${r.manifest.id}' load failed:`, msg);
          setPluginMetas(
            useStore.getState().pluginMetas.map((m, i2) =>
              i2 === idx ? { ...m, status: "error" as const, error: msg } : m
            )
          );
        }
      }

      toast("插件扫描完成");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPluginLoadError(msg);
      toast("插件扫描失败: " + msg);
    }
  }, [pluginMetas, setPluginMetas, setPluginLoadError, toast]);

  const handleOpenDir = useCallback(async () => {
    try {
      // 通过 shell open 打开插件目录
      const { open } = await import("@tauri-apps/plugin-shell");
      const pluginsDir = await import("@tauri-apps/api/path").then((p) =>
        p.appDataDir()
      ).then((dir) => `${dir}plugins`);
      open(pluginsDir);
    } catch (e) {
      toast("无法打开插件目录");
      console.error(e);
    }
  }, [toast]);

  const loadedCount = pluginMetas.filter((m) => m.status === "loaded").length;
  const errorCount = pluginMetas.filter((m) => m.status === "error").length;

  return (
    <div style={CONTAINER_STYLE}>
      <div style={HEADER_STYLE}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>外部插件</span>
          {pluginMetas.length > 0 && (
            <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 8 }}>
              {loadedCount} 已加载{errorCount > 0 ? ` · ${errorCount} 失败` : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={ACTION_BTN_STYLE} onClick={handleOpenDir} title="打开插件目录">
            <FolderOpen size={14} /> 目录
          </button>
          <button
            style={{ ...ACTION_BTN_STYLE, borderColor: "var(--accent)", color: "var(--accent)" }}
            onClick={handleRescan}
            title="重新扫描插件目录"
          >
            <RefreshCw size={14} /> 重新扫描
          </button>
        </div>
      </div>

      {pluginMetas.length === 0 && (
        <div style={EMPTY_STYLE}>
          <Box size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
          <div>暂无外部插件</div>
          <div style={{ marginTop: 4 }}>
            将插件放入 <code style={{ background: "var(--input-bg)", padding: "2px 6px", borderRadius: 3, fontSize: 11 }}>%APPDATA%/deskpal/plugins/</code> 目录
          </div>
          <div>后点击"重新扫描"即可加载。</div>
          <div style={{ marginTop: 8, fontSize: 11 }}>
            每个插件需要包含 <code style={{ background: "var(--input-bg)", padding: "1px 4px", borderRadius: 2 }}>manifest.json</code> 和 <code style={{ background: "var(--input-bg)", padding: "1px 4px", borderRadius: 2 }}>index.js</code>
          </div>
        </div>
      )}

      {pluginMetas.map((meta) => (
        <div key={meta.manifest.id} style={CARD_STYLE}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>
              {meta.manifest.name}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              v{meta.manifest.version}
            </span>
            <span
              style={{
                fontSize: 11,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                ...(STATUS_STYLE[meta.status] || {}),
              }}
            >
              {meta.status === "loaded" && <CheckCircle2 size={12} />}
              {meta.status === "loading" && <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />}
              {meta.status === "error" && <AlertCircle size={12} />}
              {meta.status === "loaded" ? "已加载" : meta.status === "loading" ? "加载中..." : "加载失败"}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            ID: {meta.manifest.id}
          </div>
          {meta.error && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "var(--danger)",
                background: "var(--input-bg)",
                padding: "4px 8px",
                borderRadius: 4,
                wordBreak: "break-word",
              }}
            >
              {meta.error}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
