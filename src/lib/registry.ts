import { ToolPlugin } from "../types";

export const toolRegistry: ToolPlugin[] = [
  { id: "timestamp", name: "时间戳", icon: "clock", keywords: ["ts", "unix", "time"], order: 0 },
  { id: "json", name: "JSON", icon: "braces", keywords: ["json", "format"], order: 1 },
  { id: "text", name: "文本", icon: "type", keywords: ["text", "文本", "大小写", "排序", "统计"], order: 2 },
  { id: "jwt", name: "JWT", icon: "shield", keywords: ["jwt", "token"], order: 3 },
  { id: "command", name: "命令", icon: "terminal", keywords: ["cmd", "shell", "run"], order: 4 },
  { id: "base64", name: "Base64", icon: "lock", keywords: ["base64", "encode"], order: 5 },
  { id: "color", name: "颜色", icon: "palette", keywords: ["color", "rgb", "hex"], order: 6 },
  { id: "template", name: "模板", icon: "file-text", keywords: ["template", "snippet"], order: 7 },
  { id: "url", name: "URL", icon: "link", keywords: ["url", "query"], order: 8 },
  { id: "naming", name: "变量命名", icon: "case-sensitive", keywords: ["naming", "命名", "变量", "case"], order: 10 },
  { id: "diff", name: "文本比对", icon: "file-diff", keywords: ["diff", "比对", "比较", "差异"], order: 11 },
  { id: "settings", name: "设置", icon: "settings", keywords: ["config", "pref"], order: 9 },
];

export const gridTools = toolRegistry.filter((t) => t.id !== "settings");
