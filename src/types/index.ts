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
  dock_position: string;
  dormant_width: number;
  panel_width: number;
  panel_height_min: number;
  panel_height_max: number;
  smart_recommend: boolean;
  live_timestamp: boolean;
  dblclick_threshold_ms: number;
}

/** 工具分类 */
export interface ToolCategory {
  id: string;           // 唯一标识（系统分类用 "__all__" / "__frequent__"，用户自定义用 uuidv4）
  name: string;         // 显示名称
  toolIds: string[];    // 有序的工具 ID 列表（与 registry 中的 id 对应）
  isSystem: boolean;    // true = "全部"（不可删除、不可重命名）
}
