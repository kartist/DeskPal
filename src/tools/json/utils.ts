/**
 * JSON 工具核心逻辑模块
 * 提供 JSON 格式化、压缩和校验功能
 */

export interface JsonResult {
  formatted: string;
  minified: string;
  valid: boolean;
  error?: string;
  line?: number;
  col?: number;
  parseTime?: number;
}

/**
 * 处理 JSON 字符串，返回格式化结果、压缩结果和校验信息
 * @param input - 原始 JSON 字符串
 * @returns JsonResult 对象
 */
export function processJson(input: string): JsonResult {
  const start = performance.now();
  try {
    const parsed = JSON.parse(input);
    const formatted = JSON.stringify(parsed, null, 2);
    const minified = JSON.stringify(parsed);
    return {
      formatted,
      minified,
      valid: true,
      parseTime: Math.round((performance.now() - start) * 100) / 100,
    };
  } catch (e) {
    const msg = (e as Error).message;
    // 提取位置信息
    let line: number | undefined;
    let col: number | undefined;
    const posMatch = msg.match(/position\s+(\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1]);
      const before = input.substring(0, pos);
      line = (before.match(/\n/g) || []).length + 1;
      col = pos - before.lastIndexOf('\n');
    }
    return {
      formatted: '',
      minified: '',
      valid: false,
      error: msg,
      line,
      col,
    };
  }
}

/** 添加转义：普通字符串 → JSON 转义字符串（含外层引号） */
export function escapeJson(str: string): string {
  return JSON.stringify(str);
}

/** 移除转义：JSON 转义字符串 → 原始字符串 */
export function unescapeJson(str: string): string {
  if (!str) return str;
  const trimmed = str.trim();

  // 如果已经是有效 JSON（对象/数组），说明无需转义
  if (
    (trimmed.startsWith("{") || trimmed.startsWith("[")) &&
    trimmed.endsWith(trimmed.startsWith("{") ? "}" : "]")
  ) {
    try {
      JSON.parse(trimmed);
      return trimmed; // 已是非转义 JSON，直接返回
    } catch {
      // 不是有效 JSON，继续尝试反转义
    }
  }

  // 尝试作为 JSON 字符串解析（处理 \" 等转义）
  try {
    const result = JSON.parse(trimmed);
    return typeof result === "string" ? result : trimmed;
  } catch {
    // 尝试包裹引号后解析
    try {
      const result = JSON.parse(`"${trimmed}"`);
      return typeof result === "string" ? result : trimmed;
    } catch {
      return trimmed;
    }
  }
}

/** 递归排序对象键 */
export function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);
  const sorted: Record<string, unknown> = {};
  Object.keys(obj)
    .sort()
    .forEach((k) => {
      sorted[k] = sortKeys((obj as Record<string, unknown>)[k]);
    });
  return sorted;
}

/** 简单 JSONPath 查询（支持 $.a.b、$.a[0].b、$.a[0] 语法） */
export function jsonpathQuery(
  obj: unknown,
  path: string
): { found: boolean; value: unknown; error?: string } {
  if (!path.startsWith("$"))
    return { found: false, value: null, error: "JSONPath 必须以 $ 开头" };
  const expr = path.slice(1); // 去掉 $
  if (!expr) return { found: true, value: obj };
  
  // 分割路径：$.a.b[0].c → ["a", "b", "[0]", "c"]
  const parts: string[] = [];
  let current = "";
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === ".") {
      if (current) { parts.push(current); current = ""; }
    } else if (expr[i] === "[") {
      if (current) { parts.push(current); current = ""; }
      let j = i + 1;
      while (j < expr.length && expr[j] !== "]") j++;
      parts.push(expr.substring(i, j + 1));
      i = j;
    } else {
      current += expr[i];
    }
  }
  if (current) parts.push(current);

  let result: unknown = obj;
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("[")) {
      const idx = parseInt(part.slice(1, -1), 10);
      if (Array.isArray(result) && !isNaN(idx)) {
        result = result[idx];
      } else {
        return { found: false, value: null, error: `无法访问 ${part}` };
      }
    } else {
      if (result && typeof result === "object" && !Array.isArray(result)) {
        result = (result as Record<string, unknown>)[part];
      } else {
        return { found: false, value: null, error: `键 '${part}' 不存在` };
      }
    }
    if (result === undefined) {
      return { found: false, value: null, error: `路径 ${part} 的值是 undefined` };
    }
  }
  return { found: true, value: result };
}
