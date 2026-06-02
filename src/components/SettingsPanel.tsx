import { useState, useEffect } from "react";
import { getConfig, setConfig as ipcSetConfig } from "../lib/ipc";
import type { DeskPalConfig } from "../types";
import { useStore } from "../store";
import { ArrowLeft, Save } from "lucide-react";

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

const THEME_OPTIONS = [
  { value: "dark", label: "深色" },
  { value: "light", label: "浅色" },
  { value: "system", label: "跟随系统" },
];

export function SettingsPanel() {
  const setActiveTool = useStore((s) => s.setActiveTool);
  const [config, setConfig] = useState<DeskPalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getConfig()
      .then((cfg) => {
        setConfig(cfg);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load config:", err);
        setLoading(false);
      });
  }, []);

  const updateField = <K extends ConfigKey>(key: K, value: DeskPalConfig[K]) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    try {
      await ipcSetConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save config:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setActiveTool(null);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.title}>设置</span>
        </div>
        <div style={styles.loadingText}>加载中...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.title}>设置</span>
        </div>
        <div style={styles.loadingText}>无法加载配置</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>设置</span>
      </div>

      <div style={styles.body}>
        <SettingRow label="自动隐藏" description="鼠标离开面板时自动收缩">
          <Toggle
            value={config.auto_hide_enabled}
            onChange={(v) => updateField("auto_hide_enabled", v)}
          />
        </SettingRow>

        <SettingRow
          label="隐藏延迟 (ms)"
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

        <SettingRow
          label="收缩条宽度 (px)"
          description={`${config.dormant_width}px`}
        >
          <input
            type="range"
            min={10}
            max={60}
            step={2}
            value={config.dormant_width}
            onChange={(e) =>
              updateField("dormant_width", Number(e.target.value))
            }
            style={styles.slider}
          />
        </SettingRow>

        <SettingRow
          label="面板宽度 (px)"
          description={`${config.panel_width}px`}
        >
          <input
            type="range"
            min={200}
            max={1200}
            step={20}
            value={config.panel_width}
            onChange={(e) =>
              updateField("panel_width", Number(e.target.value))
            }
            style={styles.slider}
          />
        </SettingRow>

        <SettingRow
          label="双击判定时间 (ms)"
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
      </div>

      <div style={styles.footer}>
        <button onClick={handleBack} style={styles.backBtn}>
          <ArrowLeft size={14} />
          <span>返回</span>
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...styles.saveBtn,
            ...(saved ? styles.saveBtnSuccess : {}),
            ...(saving ? styles.saveBtnDisabled : {}),
          }}
        >
          <Save size={14} />
          <span>{saving ? "保存中..." : saved ? "已保存" : "保存"}</span>
        </button>
      </div>
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
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderBottom: "1px solid var(--divider)",
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  body: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
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
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    borderTop: "1px solid var(--divider)",
    gap: 8,
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    height: 30,
    padding: "0 12px",
    border: "1px solid var(--btn-border)",
    background: "var(--btn-bg)",
    color: "var(--text-primary)",
    borderRadius: 4,
    fontSize: 12,
    cursor: "pointer",
    transition: "all 100ms ease",
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
  saveBtnSuccess: {
    background: "var(--success)",
    borderColor: "var(--success)",
  },
  saveBtnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
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
