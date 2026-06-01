import { lazy } from "react";
import type { ComponentType } from "react";
import type { ToolProps } from "../types";

type ToolComponent = ComponentType<ToolProps>;

export const toolComponents: Record<string, ToolComponent> = {
  timestamp: lazy(() => import("./timestamp")),
  json: lazy(() => import("./json")),
  text: lazy(() => import("./text")),
  naming: lazy(() => import("./naming")),
  diff: lazy(() => import("./diff")),
  uuid: lazy(() => import("./uuid")),
  random: lazy(() => import("./random")),
  url: lazy(() => import("./url")),
  regex: lazy(() => import("./regex")),
  jwt: lazy(() => import("./jwt")),
  terminal: lazy(() => import("./terminal")),
  // 后续工具在这里加一行即可
};
