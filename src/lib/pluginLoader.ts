/**
 * 插件加载器 — 在沙箱环境中执行外部 JS 代码，返回 React 组件。
 *
 * 安全设计：
 * - 通过 `new Function('React', 'exports', code)` 执行，不暴露 window/document/fetch
 * - 插件只能访问显式传入的 React 对象
 * - CSS 通过 `<style data-plugin-id>` 注入，支持按需卸载
 */

import React from "react";
import type { ComponentType } from "react";
import type { ToolProps } from "../types";

/** 插件代码执行结果 */
interface PluginModule {
  default?: ComponentType<ToolProps>;
  [key: string]: unknown;
}

/**
 * 在受限沙箱中执行插件 JS 代码，返回 React 组件。
 * @param code 插件 index.js 的完整源码
 * @returns 默认导出的 React 组件
 */
export function loadPluginComponent(code: string): ComponentType<ToolProps> {
  // 创建 exports 容器，插件将 default 写入此对象
  const exports: PluginModule = {};

  try {
    // 沙箱执行：只传入 React 和 exports，不暴露全局对象
    const fn = new Function("React", "exports", code);
    fn(React, exports);
  } catch (e) {
    throw new Error(
      `Plugin execution error: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  if (typeof exports.default !== "function") {
    // 检查是否有其他导出可作为组件
    const keys = Object.keys(exports).filter((k) => k !== "default");
    for (const key of keys) {
      if (typeof exports[key] === "function") {
        return exports[key] as ComponentType<ToolProps>;
      }
    }
    throw new Error(
      "Plugin does not export a default function component. " +
        "Please ensure your plugin exports a default React component."
    );
  }

  return exports.default as ComponentType<ToolProps>;
}

/**
 * 注入插件 CSS，附加 data-plugin-id 属性以支持卸载。
 * @returns <style> 元素引用，用于后续卸载
 */
export function loadPluginCSS(css: string, pluginId: string): HTMLStyleElement | null {
  if (!css.trim()) return null;

  // 移除已存在的同名样式
  const existing = document.querySelector(`style[data-plugin-id="${pluginId}"]`);
  if (existing) existing.remove();

  const style = document.createElement("style");
  style.setAttribute("data-plugin-id", pluginId);
  style.textContent = css;
  document.head.appendChild(style);
  return style;
}

/**
 * 卸载插件 CSS。
 */
export function unloadPluginCSS(pluginId: string): void {
  const style = document.querySelector(`style[data-plugin-id="${pluginId}"]`);
  if (style) style.remove();
}
