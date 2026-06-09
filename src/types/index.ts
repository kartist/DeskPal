export interface ToolPlugin {
  id: string;
  name: string;
  icon: string;
  keywords: string[];
  order: number;
}

export interface ToolProps {
  input?: string;
  onResult?: (result: string) => void;
}

export interface DeskPalConfig {
  auto_hide_enabled: boolean;
  auto_hide_delay_ms: number;
  theme: string;
  dormant_width: number;
  panel_width: number;
  dblclick_threshold_ms: number;
  dormant_bar_bg_dark: string;         // hex e.g. "#1C2333"
  dormant_bar_bg_light: string;        // hex e.g. "#F6F8FA"
  dormant_bar_text_color_dark: string; // hex e.g. "#58A6FF"
  dormant_bar_text_color_light: string;// hex e.g. "#0969DA"
  dormant_bar_hover_bg_dark: string;   // hex e.g. "#262D3D"
  dormant_bar_hover_bg_light: string;  // hex e.g. "#EAEEF2"
  dormant_bar_label: string;           // text shown in dormant bar
  dormant_bar_font_size: number;       // font size for dormant bar label
  double_click_pin_enabled: boolean;
}

/** 终端预设命令 */
export interface TermPreset {
  id: string;        // uuid，用于 key 和操作标识
  label: string;     // 按钮上显示的名称
  cmd: string;       // 要执行的命令
  note?: string;     // 可选注释说明
}

/** 工具分类 */
export interface ToolCategory {
  id: string;           // 唯一标识（系统分类用 "__all__" / "__frequent__"，用户自定义用 uuidv4）
  name: string;         // 显示名称
  toolIds: string[];    // 有序的工具 ID 列表（与 registry 中的 id 对应）
  isSystem: boolean;    // true = "全部"（不可删除、不可重命名）
}
