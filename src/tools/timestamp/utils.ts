import dayjs from "dayjs";

export enum InputType {
  error,
  empty,
  normal,
  unix,
}

export enum Format {
  second = "second",
  millisecond = "millisecond",
  nanosecond = "nanosecond",
}

type TimeType = {
  type: InputType;
  format: Format;
};

export type Output = {
  isValid: boolean;
  second: string;
  millisecond: string;
  nanosecond: string;
  format?: Format;
  autoFormat?: Format;
  type?: InputType;
};

const formatDecimalLength: Record<Format, number> = {
  [Format.second]: 0,
  [Format.millisecond]: 3,
  [Format.nanosecond]: 9,
};

const getTimeType = (input: string): TimeType => {
  if (input === "") {
    return { type: InputType.empty, format: Format.second };
  }
  if (/^\d+-\d+-\d+ \d+:\d+:\d+$/.test(input)) {
    return { type: InputType.normal, format: Format.second };
  }
  if (/^\d+-\d+-\d+ \d+:\d+:\d+\.\d{0,3}$/.test(input)) {
    return { type: InputType.normal, format: Format.millisecond };
  }
  if (/^\d+-\d+-\d+ \d+:\d+:\d+\.\d{4,9}$/.test(input)) {
    return { type: InputType.normal, format: Format.nanosecond };
  }
  if (/^-?\d{1,12}$/.test(input)) {
    return { type: InputType.unix, format: Format.second };
  }
  if (/^-?\d{13,16}$/.test(input)) {
    return { type: InputType.unix, format: Format.millisecond };
  }
  if (/^-?\d{17,}$/.test(input)) {
    return { type: InputType.unix, format: Format.nanosecond };
  }
  return { type: InputType.error, format: Format.second };
};

export const transform = (
  input: string,
  _timezone: string,
  format: Format | "auto" = "auto"
): Output => {
  const { type, format: _format } = getTimeType(input);
  const resolvedFormat = (format === "auto" ? _format : format) as Format;
  try {
    if (type === InputType.empty) {
      return {
        isValid: false,
        second: "",
        millisecond: "",
        nanosecond: "",
      };
    }

    if (type === InputType.error) {
      throw new Error("时间格式错误");
    }

    let decimal: string;
    let time: dayjs.Dayjs;
    const decimalLength = formatDecimalLength[resolvedFormat];

    if (type === InputType.normal) {
      const fragment = input.split(".");
      decimal = (fragment[1] || "").slice(0, decimalLength);
      time = dayjs(fragment[0]);
    } else {
      const ms = parseInt(
        decimalLength
          ? input.slice(0, -1 * decimalLength)
          : input
      ) * 1000;
      time = dayjs(ms);
      decimal = decimalLength ? input.slice(-1 * decimalLength) : "";
    }

    if (!time.isValid()) {
      throw new Error("时间格式错误");
    }

    const second =
      type === InputType.normal
        ? time.unix().toString()
        : time.format("YYYY-MM-DD HH:mm:ss");
    const millisecond = decimal
      .slice(0, formatDecimalLength.millisecond)
      .padEnd(formatDecimalLength.millisecond, "0");
    const nanosecond = decimal
      .slice(0, formatDecimalLength.nanosecond)
      .padEnd(formatDecimalLength.nanosecond, "0");
    const separator = type === InputType.normal ? "" : ".";

    return {
      isValid: true,
      second,
      millisecond: `${second}${separator}${millisecond}`,
      nanosecond: `${second}${separator}${nanosecond}`,
      format: resolvedFormat,
      autoFormat: _format,
      type,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return {
      isValid: false,
      second: error,
      millisecond: error,
      nanosecond: error,
      type,
      format: resolvedFormat,
      autoFormat: _format,
    };
  }
};
