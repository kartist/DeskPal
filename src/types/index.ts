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
}
