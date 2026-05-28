export interface TimestampResult {
  unixSec: number;
  unixMs: number;
  iso8601: string;
  locale: string;
}

export interface ParseResult {
  type: "timestamp" | "date" | "invalid";
  value: string;
  error?: string;
  converted?: TimestampResult;
}

/** 获取当前时间的 4 种格式 */
export function getNow(): TimestampResult {
  const d = new Date();
  return {
    unixSec: Math.floor(d.getTime() / 1000),
    unixMs: d.getTime(),
    iso8601: formatISO(d),
    locale: formatLocale(d),
  };
}

/** 判断数字是秒（10位）还是毫秒（13位），其他范围报错 */
export function detectTimestampUnit(ts: number): "sec" | "ms" | "invalid" {
  if (typeof ts !== "number" || isNaN(ts) || ts < 0 || !Number.isFinite(ts)) {
    return "invalid";
  }
  // 允许一定范围浮动：秒 10^9 ~ 10^10，毫秒 10^12 ~ 10^13
  // 但更严格的判断：100000000 ~ 9999999999 为秒，100000000000 ~ 9999999999999 为毫秒
  if (ts >= 100_000_000 && ts <= 99_999_999_999) {
    return "sec";
  }
  if (ts >= 1_000_000_000_00 && ts <= 999_999_999_999_9) {
    return "ms";
  }
  return "invalid";
}

/** 时间戳（秒或毫秒）→ 日期 */
export function timestampToDate(ts: number): TimestampResult {
  const unit = detectTimestampUnit(ts);
  let d: Date;
  if (unit === "sec") {
    d = new Date(ts * 1000);
  } else if (unit === "ms") {
    d = new Date(ts);
  } else {
    throw new Error(`无法识别的时间戳: ${ts}`);
  }
  if (isNaN(d.getTime())) {
    throw new Error(`无效的时间戳: ${ts}`);
  }
  return {
    unixSec: Math.floor(d.getTime() / 1000),
    unixMs: d.getTime(),
    iso8601: formatISO(d),
    locale: formatLocale(d),
  };
}

/** 日期字符串 → Unix 时间戳（秒），失败返回 null */
export function dateToTimestamp(dateStr: string): number | null {
  if (!dateStr || dateStr.trim() === "") return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor(d.getTime() / 1000);
}

/** 自动检测输入是时间戳还是日期字符串，返回转换结果 */
export function parseInput(input: string): ParseResult {
  if (!input || input.trim() === "") {
    return { type: "invalid", value: input, error: "输入为空" };
  }

  const trimmed = input.trim();

  // 纯数字 → 按时间戳处理
  if (/^\d+$/.test(trimmed)) {
    const ts = Number(trimmed);
    const unit = detectTimestampUnit(ts);
    if (unit === "invalid") {
      return {
        type: "invalid",
        value: input,
        error: "数字不在合理时间戳范围内（秒: 10~11 位, 毫秒: 13 位）",
      };
    }
    try {
      const converted = timestampToDate(ts);
      return { type: "timestamp", value: input, converted };
    } catch (e) {
      return {
        type: "invalid",
        value: input,
        error: (e as Error).message,
      };
    }
  }

  // 尝试作为日期字符串解析
  const sec = dateToTimestamp(trimmed);
  if (sec !== null) {
    try {
      const converted = timestampToDate(sec);
      return { type: "date", value: input, converted };
    } catch (e) {
      return {
        type: "invalid",
        value: input,
        error: (e as Error).message,
      };
    }
  }

  return { type: "invalid", value: input, error: "无法识别的输入，请输入 Unix 时间戳或日期字符串" };
}

/** 格式化为本地日期时间字符串 */
export function formatLocale(d: Date): string {
  return d.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** 格式化为 ISO 8601（东八区） */
export function formatISO(d: Date): string {
  return d.toISOString().replace("Z", "+08:00");
}
