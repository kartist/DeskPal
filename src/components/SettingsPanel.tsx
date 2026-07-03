import { useState, useEffect, useRef } from "react";
import { getConfig, setConfig as ipcSetConfig } from "../lib/ipc";
import type { DeskPalConfig } from "../types";
import { useStore } from "../store";
import { PluginManager } from "./PluginManager";

type ConfigKey = keyof DeskPalConfig;

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div style={styles.row}>
      <div style={styles.labelCol}>
        <span style={styles.labelText}>{label}</span>
        {description && <span style={styles.description}>{description}</span>}
      </div>
      <div style={styles.controlCol}>{children}</div>
    </div>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        ...styles.toggle,
        background: value ? "var(--accent)" : "var(--btn-bg)",
        borderColor: value ? "var(--accent)" : "var(--btn-border)",
      }}
      aria-checked={value}
      role="switch"
    >
      <div
        style={{
          ...styles.toggleKnob,
          transform: value ? "translateX(16px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

interface SectionCardProps {
  icon: string;
  title: string;
  children: React.ReactNode;
}

function SectionCard({ icon, title, children }: SectionCardProps) {
  return (
    <div style={styles.sectionCard}>
      <div style={styles.sectionHeader}>
        <span style={styles.sectionIcon}>{icon}</span>
        <span style={styles.sectionTitle}>{title}</span>
      </div>
      <div style={styles.sectionBody}>{children}</div>
    </div>
  );
}

const THEME_OPTIONS = [
  { value: "dark", label: "深色" },
  { value: "light", label: "浅色" },
  { value: "system", label: "跟随系统" },
];

export function SettingsPanel() {
  const storeConfig = useStore((s) => s.config);
  const setStoreConfig = useStore((s) => s.setConfig);
  const [localConfig, setLocalConfig] = useState<DeskPalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"general" | "plugins">("general");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // 加载配置：优先从 store，否则从 Rust
  useEffect(() => {
    if (storeConfig) {
      setLocalConfig(storeConfig);
      setLoading(false);
      return;
    }
    getConfig()
      .then((cfg) => {
        setLocalConfig(cfg);
        setStoreConfig(cfg);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load config:", err);
        setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 自动保存：localConfig 变化 500ms 后提交到 store + Rust
  useEffect(() => {
    if (!localConfig) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setStoreConfig(localConfig);
      ipcSetConfig(localConfig).catch(console.error);
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [localConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = <K extends ConfigKey>(key: K, value: DeskPalConfig[K]) => {
    if (!localConfig) return;
    setLocalConfig({ ...localConfig, [key]: value });
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingText}>加载中...</div>
      </div>
    );
  }

  if (!localConfig) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingText}>无法加载配置</div>
      </div>
    );
  }

  const config = localConfig;

  return (
    <div style={styles.container}>
      {/* Tab 切换 */}
      <div style={styles.tabBar}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === "general" ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab("general")}
        >
          ⚙️ 通用
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === "plugins" ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab("plugins")}
        >
          🧩 插件
        </button>
      </div>

      {activeTab === "general" ? (
      <div style={styles.body}>
        {/* 🖥 窗口 */}
        <SectionCard icon="🖥" title="窗口">
          <SettingRow
            label="收缩条宽度"
            description={`${config.dormant_width}px`}
          >
            <input
              type="range"
              min={14}
              max={60}
              step={2}
              value={config.dormant_width}
              onChange={(e) =>
                updateField("dormant_width", Number(e.target.value))
              }
              style={styles.slider}
            />
          </SettingRow>
        </SectionCard>

        {/* 🎨 外观 */}
        <SectionCard icon="🎨" title="外观">
          <SettingRow label="主题">
            <select
              value={config.theme}
              onChange={(e) => updateField("theme", e.target.value)}
              style={styles.select}
            >
              {THEME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </SettingRow>

          <SettingRow label="收缩态背景色(深色)">
            <div style={styles.colorRow}>
              <input
                type="color"
                value={config.dormant_bar_bg_dark}
                onChange={(e) =>
                  updateField("dormant_bar_bg_dark", e.target.value)
                }
                style={styles.colorPicker}
              />
              <span style={styles.colorValue}>{config.dormant_bar_bg_dark}</span>
            </div>
          </SettingRow>

          <SettingRow label="收缩态背景色(浅色)">
            <div style={styles.colorRow}>
              <input
                type="color"
                value={config.dormant_bar_bg_light}
                onChange={(e) =>
                  updateField("dormant_bar_bg_light", e.target.value)
                }
                style={styles.colorPicker}
              />
              <span style={styles.colorValue}>{config.dormant_bar_bg_light}</span>
            </div>
          </SettingRow>

          <SettingRow label="收缩态文字色(深色)">
            <div style={styles.colorRow}>
              <input
                type="color"
                value={config.dormant_bar_text_color_dark}
                onChange={(e) =>
                  updateField("dormant_bar_text_color_dark", e.target.value)
                }
                style={styles.colorPicker}
              />
              <span style={styles.colorValue}>
                {config.dormant_bar_text_color_dark}
              </span>
            </div>
          </SettingRow>

          <SettingRow label="收缩态文字色(浅色)">
            <div style={styles.colorRow}>
              <input
                type="color"
                value={config.dormant_bar_text_color_light}
                onChange={(e) =>
                  updateField("dormant_bar_text_color_light", e.target.value)
                }
                style={styles.colorPicker}
              />
              <span style={styles.colorValue}>
                {config.dormant_bar_text_color_light}
              </span>
            </div>
          </SettingRow>

          <SettingRow label="收缩态悬停色(深色)">
            <div style={styles.colorRow}>
              <input
                type="color"
                value={config.dormant_bar_hover_bg_dark}
                onChange={(e) =>
                  updateField("dormant_bar_hover_bg_dark", e.target.value)
                }
                style={styles.colorPicker}
              />
              <span style={styles.colorValue}>{config.dormant_bar_hover_bg_dark}</span>
            </div>
          </SettingRow>

          <SettingRow label="收缩态悬停色(浅色)">
            <div style={styles.colorRow}>
              <input
                type="color"
                value={config.dormant_bar_hover_bg_light}
                onChange={(e) =>
                  updateField("dormant_bar_hover_bg_light", e.target.value)
                }
                style={styles.colorPicker}
              />
              <span style={styles.colorValue}>{config.dormant_bar_hover_bg_light}</span>
            </div>
          </SettingRow>

          <SettingRow label="收缩态标签">
            <input
              type="text"
              value={config.dormant_bar_label}
              onChange={(e) =>
                updateField("dormant_bar_label", e.target.value)
              }
              style={styles.textInput}
            />
          </SettingRow>

          <SettingRow
            label="收缩态字号"
            description={`${config.dormant_bar_font_size}px`}
          >
            <input
              type="range"
              min={8}
              max={24}
              step={1}
              value={config.dormant_bar_font_size}
              onChange={(e) =>
                updateField("dormant_bar_font_size", Number(e.target.value))
              }
              style={styles.slider}
            />
          </SettingRow>
        </SectionCard>

        {/* ⌨ 交互 */}
        <SectionCard icon="⌨" title="交互">
          <SettingRow label="双击固定面板">
            <Toggle
              value={config.double_click_pin_enabled}
              onChange={(v) => updateField("double_click_pin_enabled", v)}
            />
          </SettingRow>

          <SettingRow label="自动隐藏">
            <Toggle
              value={config.auto_hide_enabled}
              onChange={(v) => updateField("auto_hide_enabled", v)}
            />
          </SettingRow>

          <SettingRow
            label="隐藏延迟"
            description={`${config.auto_hide_delay_ms}ms`}
          >
            <input
              type="range"
              min={500}
              max={5000}
              step={100}
              value={config.auto_hide_delay_ms}
              onChange={(e) =>
                updateField("auto_hide_delay_ms", Number(e.target.value))
              }
              style={styles.slider}
            />
          </SettingRow>

          <SettingRow
            label="双击判定时间"
            description={`${config.dblclick_threshold_ms}ms`}
          >
            <input
              type="range"
              min={100}
              max={1000}
              step={50}
              value={config.dblclick_threshold_ms}
              onChange={(e) =>
                updateField("dblclick_threshold_ms", Number(e.target.value))
              }
              style={styles.slider}
            />
          </SettingRow>
        </SectionCard>
      </div>
      ) : (
        <PluginManager />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  tabBar: {
    display: "flex",
    borderBottom: "1px solid var(--divider)",
    padding: "0 12px",
    gap: 0,
    minHeight: 36,
  },
  tab: {
    padding: "8px 14px",
    fontSize: 12,
    fontWeight: 500,
    border: "none",
    background: "transparent",
    color: "var(--text-muted)",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    transition: "all 100ms ease",
  },
  tabActive: {
    color: "var(--accent)",
    borderBottom: "2px solid var(--accent)",
  },
  body: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  sectionCard: {
    border: "1px solid var(--btn-border)",
    borderRadius: 8,
    overflow: "hidden",
    background: "var(--card-bg)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderBottom: "1px solid var(--divider)",
    background: "var(--card-header-bg)",
  },
  sectionIcon: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  sectionBody: {
    padding: "4px 12px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid var(--divider)",
  },
  labelCol: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  labelText: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--text-primary)",
  },
  description: {
    fontSize: 11,
    color: "var(--text-muted)",
  },
  controlCol: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 100,
  },
  toggle: {
    width: 36,
    height: 20,
    borderRadius: 10,
    border: "1px solid var(--btn-border)",
    cursor: "pointer",
    padding: 2,
    display: "flex",
    alignItems: "center",
    transition: "all 150ms ease",
    position: "relative" as const,
  },
  toggleKnob: {
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "var(--text-primary)",
    transition: "transform 150ms ease",
  },
  slider: {
    width: 120,
    height: 4,
    accentColor: "var(--accent)",
    cursor: "pointer",
  },
  select: {
    background: "var(--input-bg)",
    color: "var(--input-text)",
    border: "1px solid var(--input-border)",
    borderRadius: 4,
    padding: "4px 8px",
    fontSize: 12,
    outline: "none",
    cursor: "pointer",
    minWidth: 100,
  },
  colorRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  colorPicker: {
    width: 28,
    height: 24,
    padding: 0,
    border: "1px solid var(--input-border)",
    borderRadius: 4,
    cursor: "pointer",
    background: "none",
  },
  colorValue: {
    fontSize: 11,
    color: "var(--text-muted)",
    fontFamily: "monospace",
  },
  textInput: {
    background: "var(--input-bg)",
    color: "var(--input-text)",
    border: "1px solid var(--input-border)",
    borderRadius: 4,
    padding: "4px 8px",
    fontSize: 12,
    outline: "none",
    width: 90,
  },
  saveBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    height: 30,
    padding: "0 12px",
    border: "1px solid var(--accent)",
    background: "var(--accent)",
    color: "#ffffff",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 100ms ease",
  },
  loadingText: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    color: "var(--text-muted)",
  },
};
