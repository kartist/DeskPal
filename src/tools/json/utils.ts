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
