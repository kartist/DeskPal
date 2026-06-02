import { gridTools } from "./registry";
import type { ToolCategory } from "../types";

/** 构建默认分类列表 */
export function buildDefaultCategories(): ToolCategory[] {
  return [
    {
      id: "__all__",
      name: "全部",
      toolIds: gridTools.map((t) => t.id),
      isSystem: true,
    },
    {
      id: "__frequent__",
      name: "常用",
      toolIds: [],
      isSystem: false,
    },
  ];
}

/** Merge __all__ category toolIds with current registry */
export function mergeAllTools(existingToolIds: string[]): string[] {
  const registryIds = new Set(gridTools.map((t) => t.id));
  // Keep user-added tools that are still in registry
  const existing = existingToolIds.filter((id) => registryIds.has(id));
  // Add new registry tools not yet in the list
  const newTools = gridTools
    .filter((t) => !existingToolIds.includes(t.id))
    .map((t) => t.id);
  return [...existing, ...newTools];
}
