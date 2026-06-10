import { ToolPlugin, PluginMeta } from "../types";

/** 内置工具元数据 */
export const builtinToolRegistry: ToolPlugin[] = [
  { id: "timestamp", name: "时间戳", icon: "clock", keywords: ["ts", "unix", "time"], order: 0 },
  { id: "json", name: "JSON", icon: "braces", keywords: ["json", "format"], order: 1 },
  { id: "text", name: "文本", icon: "type", keywords: ["text", "文本", "大小写", "排序", "统计"], order: 2 },
  { id: "naming", name: "变量命名", icon: "case-sensitive", keywords: ["naming", "命名", "变量", "case"], order: 3 },
  { id: "diff", name: "文本比对", icon: "file-diff", keywords: ["diff", "比对", "比较", "差异"], order: 4 },
  { id: "uuid", name: "UUID", icon: "fingerprint", keywords: ["uuid", "ulid", "generate"], order: 5 },
  { id: "random", name: "随机字符", icon: "shuffle", keywords: ["random", "随机", "密码", "字符"], order: 6 },
  { id: "url", name: "URL 编解码", icon: "link", keywords: ["url", "encode", "decode", "编解码", "链接"], order: 7 },
  { id: "regex", name: "正则测试", icon: "code", keywords: ["regex", "正则", "正则表达式", "re"], order: 8 },
  { id: "jwt", name: "JWT 解析", icon: "shield", keywords: ["jwt", "token", "解析", "解码", "header", "payload"], order: 9 },
  { id: "terminal", name: "终端", icon: "terminal", keywords: ["cmd", "terminal", "命令行", "shell", "powershell"], order: 10 },
  { id: "settings", name: "设置", icon: "settings", keywords: ["config", "pref"], order: 99 },
];

/** 外部插件元数据（运行时动态注册） */
let externalToolRegistry: ToolPlugin[] = [];

/** 注册外部插件元数据 */
export function registerExternalPlugin(meta: PluginMeta): void {
  const existing = externalToolRegistry.findIndex((t) => t.id === meta.manifest.id);
  const toolPlugin: ToolPlugin = {
    id: meta.manifest.id,
    name: meta.manifest.name,
    icon: meta.manifest.icon,
    keywords: meta.manifest.keywords,
    order: 1000 + externalToolRegistry.length, // 排在内置工具之后
  };
  if (existing >= 0) {
    externalToolRegistry[existing] = toolPlugin;
  } else {
    externalToolRegistry.push(toolPlugin);
  }
}

/** 注销外部插件 */
export function unregisterExternalPlugin(pluginId: string): void {
  externalToolRegistry = externalToolRegistry.filter((t) => t.id !== pluginId);
}

/** 获取完整工具注册表（内置 + 外部） */
export function getAllTools(): ToolPlugin[] {
  return [...builtinToolRegistry, ...externalToolRegistry];
}

/** 获取网格中显示的工具（排除 settings） */
export function getGridTools(): ToolPlugin[] {
  return getAllTools().filter((t) => t.id !== "settings");
}

// 保持向后兼容：toolRegistry 仍是静态引用
export const toolRegistry: ToolPlugin[] = builtinToolRegistry;
// gridTools 改为动态 getter 以包含外部插件
export const gridTools = getGridTools();
