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
