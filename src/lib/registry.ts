import { ToolPlugin } from "../types";

export const toolRegistry: ToolPlugin[] = [
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
  { id: "settings", name: "设置", icon: "settings", keywords: ["config", "pref"], order: 99 },
];

export const gridTools = toolRegistry.filter((t) => t.id !== "settings");
