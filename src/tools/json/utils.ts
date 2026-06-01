import unicode from "./unicode";
import jsonKeysSort from "json-keys-sort";
import jsonMinify from "./jsonMinify";
import { TypeLists as RenameType, convent as nameConvent } from "../text/nameConvert";

const beautify = async (code: string, {tab = 2}: any = {}) => {
  return code !== "" ? JSON.stringify(JSON.parse(code), null, tab) : "";
};

const compress = async (code: string) => {
  return code !== "" ? jsonMinify(code) : "";
};

const rename = (code: any, type: RenameType) => {
  if (typeof code === "object" && code !== null && !Array.isArray(code)) {
    for (let i in code) {
      let temp = code[i];
      delete code[i];
      code[nameConvent(i, type)] = rename(temp, type);
    }
  } else if (Array.isArray(code)) {
    for (let i in code) {
      code[i] = rename(code[i], type);
    }
  }
  return code;
};

// unicode2zh
const unicode2zh = (content: string) => {
  return unicode.decode(
    content.replace(/\\U[0-9a-fA-F]{4}/g, (item) => {
      // \Uxxxx=>\uxxxx
      return item.replace("\\U", "\\u");
    })
  )
};

// zh2unicode
const zh2unicode = (content: string) => {
  if (content !== "") {
    let newStr = ''
    for (let i = 0; i < content.length; i++) {
      let str = content.charAt(i)
      newStr += /[\u4e00-\u9fa5]/.test(str) ? '\\u' + str.charCodeAt(0).toString(16) : str
    }
    return newStr
  }
  return content
};

const sortAsc = (data: object) => jsonKeysSort.sort(data);
const sortDesc = (data: object) => jsonKeysSort.sort(data, false);

const escape = (content: string) => content.trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const clearEscape = (content: string) => content.trim().replace(/\\\\/g, '\\').replace(/\\"/g, '"');

export default {
  beautify,
  compress,
  rename,
  unicode2zh,
  zh2unicode,
  sortAsc,
  sortDesc,
  escape,
  clearEscape,
};
