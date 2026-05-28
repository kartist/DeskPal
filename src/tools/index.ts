import { lazy } from "react";
import type { ComponentType } from "react";
import type { ToolProps } from "../types";

type ToolComponent = ComponentType<ToolProps>;

export const toolComponents: Record<string, ToolComponent> = {
  timestamp: lazy(() => import("./timestamp")),
  // 后续工具在这里加一行即可
};
