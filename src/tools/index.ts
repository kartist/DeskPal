import { lazy } from "react";
import type { ComponentType } from "react";
import type { ToolProps } from "../types";

type ToolComponent = ComponentType<ToolProps>;

// --- 内置组件（编译时） ---
const builtinComponents: Record<string, ToolComponent> = {
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
};

// --- 外部组件（运行时动态注册） ---
let externalComponents: Record<string, ToolComponent> = {};

/** 注册外部插件组件 */
export function registerExternalComponent(id: string, comp: ToolComponent): void {
  externalComponents[id] = comp;
}

/** 注销外部插件组件 */
export function unregisterExternalComponent(id: string): void {
  delete externalComponents[id];
}

/** 获取完整组件注册表（内置 + 外部） */
export const toolComponents: Record<string, ToolComponent> = new Proxy(
  { ...builtinComponents } as Record<string, ToolComponent>,
  {
    get(_target: Record<string, ToolComponent>, prop: string) {
      if (prop in externalComponents) return externalComponents[prop];
      return _target[prop];
    },
    ownKeys(_target: Record<string, ToolComponent>) {
      return [...Object.keys(_target), ...Object.keys(externalComponents)];
    },
    getOwnPropertyDescriptor(_target: Record<string, ToolComponent>, prop: string | symbol) {
      if (typeof prop === "string" && prop in externalComponents) {
        return { configurable: true, enumerable: true, value: externalComponents[prop] };
      }
      return Object.getOwnPropertyDescriptor(_target, prop);
    },
  }
) as Record<string, ToolComponent>;
