import { ToolPlugin } from "../types";

export const toolRegistry: ToolPlugin[] = [
  { id: "timestamp", name: "时间戳", icon: "clock", keywords: ["ts", "unix", "time"], order: 0 },
  { id: "json", name: "JSON", icon: "braces", keywords: ["json", "format"], order: 1 },
  { id: "jwt", name: "JWT", icon: "shield", keywords: ["jwt", "token"], order: 2 },
  { id: "command", name: "命令", icon: "terminal", keywords: ["cmd", "shell", "run"], order: 3 },
  { id: "base64", name: "Base64", icon: "lock", keywords: ["base64", "encode"], order: 4 },
  { id: "color", name: "颜色", icon: "palette", keywords: ["color", "rgb", "hex"], order: 5 },
  { id: "template", name: "模板", icon: "file-text", keywords: ["template", "snippet"], order: 6 },
  { id: "url", name: "URL", icon: "link", keywords: ["url", "query"], order: 7 },
  { id: "settings", name: "设置", icon: "settings", keywords: ["config", "pref"], order: 8 },
];

export const gridTools = toolRegistry.filter((t) => t.id !== "settings");
