import { toSimplified, toTraditional } from "chinese-simple2traditional";
import { TypeLists as RenameType, convent as nameConvent } from "./nameConvert";

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function orderByAsc(arr: string[]): string[] {
  return [...arr].sort();
}
function orderByDesc(arr: string[]): string[] {
  return [...arr].sort((a, b) => b.localeCompare(a));
}

const regExpQuote = function(str: string) {
    return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

const getGbkStrLength = (str: string) => {
    let realLength = 0;
    let len = str.length;
    let charCode = -1;
    for (let i = 0; i < len; i++) {
        charCode = str.charCodeAt(i);
        if (charCode >= 0 && charCode <= 128) {
            realLength += 1;
        } else {
            realLength += 2;
        }
    }
    return realLength;
};

export const escapeChars = {
    backslash: { string: "\\\\", char: "\\" },
    single_quote: { string: "\\'", char: "'" },
    double_quote: { string: '\\"', char: '"' },
    new_line: { string: "\\n", char: "\n" },
    carriage_return: { string: "\\r", char: "\r" },
    tab: { string: "\\t", char: "\t" },
    vertical_tab: { string: "\\v", char: "\v" },
    backspace: { string: "\\b", char: "\b" },
    form_feed: { string: "\\f", char: "\f" },
};

export type EscapeCharsType = keyof typeof escapeChars

export default class {
    private readonly text: string;

    constructor(text: string) {
        this.text = text;
    }

    upper() { return this.text.toUpperCase(); }
    lower() { return this.text.toLowerCase(); }

    upperLineStart() {
        return this.text.split(/\r?\n/).map((str) => {
            if (str.length < 1) return "";
            return str[0].toUpperCase() + str.substr(1);
        }).join("\n");
    }

    lowerLineStart() {
        return this.text.split(/\r?\n/).map((str) => {
            if (str.length < 1) return "";
            return str[0].toLowerCase() + str.substr(1);
        }).join("\n");
    }

    upperStart() {
        return this.text.replace(/\b\w/g, function(str) {
            return str.toUpperCase();
        });
    }

    lowerStart() {
        return this.text.replace(/\b\w/g, function(str) {
            return str.toLowerCase();
        });
    }

    zhTran({ type = "simplified" }: Record<string, any> = {}) {
        if (type === "simplified") {
            return toTraditional(this.text);
        }
        return toSimplified(this.text);
    }

    replace({ search = [], replace = [] }: Record<string, any> = {}) {
        let text = this.text;
        for (let i in search) {
            if (search[i]) {
                text = text.replace(new RegExp(regExpQuote(search[i]), "g"), (i in replace ? replace[i] : ""));
            }
        }
        return text;
    }

    regularReplace({ search = "", replace = "" }: Record<string, any> = {}) {
        let text = this.text;
        if (search) {
            text = text.replace(new RegExp(search, "g"), replace);
        }
        return text;
    }

    lineRemoveRepeat() {
        return uniq(this.text.split("\n")).join("\n");
    }

    removeLineIndex() {
        return this.text.replace(new RegExp("^\\s*\\d+\\.?", "gm"), "");
    }

    addLineIndex() {
        return this.text.split("\n").map((line, index) => `${index + 1}. ${line}`).join("\n");
    }

    sort({ type = "" }: Record<string, any> = {}) {
        switch (type) {
            case "reverse_line":
                return this.text.split(/\r?\n/).reverse().join("\n");
            case "reverse_line_string":
                return this.text.split(/\r?\n/).map(text => {
                    return text.split("").reverse().join("");
                }).join("\n");
            case "reverse_all":
                return this.text.split("").reverse().join("");
            case "line_asc":
                return orderByAsc(this.text.split(/\r?\n/)).join("\n");
            case "line_desc":
                return orderByDesc(this.text.split(/\r?\n/)).join("\n");
        }
        return this.text;
    }

    lineTrim() {
        return this.text.split(/\r?\n/).map((item) => item.trim()).join("\n");
    }

    filterBlankLine() {
        return this.text.split(/\r?\n/).filter((item) => {
            return item.trim() !== "";
        }).join("\n");
    }

    filterAllBr() {
        return this.text.replace(/\r?\n|\r/g, "");
    }

    replacePunctuation({ type = "zh" }: Record<string, any> = {}) {
        const zh = ["\u201c", "\u201d", "\u2018", "\u2019", "\u3002", "\uff0c", "\uff1b", "\uff1a", "\uff1f", "\uff01", "\u2026\u2026", "\u2014", "\uff5e", "\uff08", "\uff09", "\u300a", "\u300b"];
        const en = ['"', '"', "'", "'", ".", ",", ";", ":", "?", "!", "\u2026", "-", "~", "(", ")", "<", ">"];
        let text = this.text;
        for (let i in zh) {
            text = text.replace(
                new RegExp(regExpQuote(type === "zh" ? en[i] : zh[i]), "g"),
                type === "zh" ? zh[i] : en[i],
            );
        }
        return text;
    }

    escape({ lists = [] }: { lists: EscapeCharsType[] } | Record<string, any>) {
        let text = this.text;
        for (let item of (lists as EscapeCharsType[])) {
            if (item in escapeChars) {
                const ec = escapeChars[item];
                text = text.replace(new RegExp(ec.string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), ec.char);
            }
        }
        return text;
    }

    unescape({ lists = [] }: { lists: EscapeCharsType[] } | Record<string, any>) {
        let text = this.text;
        for (let item of (lists as EscapeCharsType[])) {
            if (item in escapeChars) {
                const ec = escapeChars[item];
                text = text.replace(new RegExp(ec.char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), ec.string);
            }
        }
        return text;
    }

    rename({ type = "lowerSnakeCase" }) {
        return this.text.replace(/\b[\w\-_]+\b/g, function(str) {
            return nameConvent(str, type as RenameType);
        });
    }

    stat() {
        let content = this.text.replace(/\r?\n/g, "\n");

        let zh_word = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
        let zh_punctuation = (content.match(/[\u3002\uff1f\uff01\uff0c\u3001\uff1b\uff1a\u201c\u201d\u2018\u2019\uff08\uff09\u300a\u300b\u3008\u3009\u3010\u3011\u300e\u300f\u300c\u300d\ufe43\ufe44\u3014\u3015\u2026\u2014\uff5e\ufe4f\uffe5]/g) || []).length;
        let int_string = (content.match(/[0-9]/g) || []).length;
        let en_string = (content.match(/[A-Za-z]/g) || []).length;
        let int_word = (content.match(/\b\d+\b/g) || []).length;
        let en_word = (content.match(/\b\w+\b/g) || []).length - int_word;
        let en_punctuation = (content.match(/[~`!@#$%^&*()\-_+=|\\[\]{};:"',<.>/?]/g) || []).length;

        return {
            byte_utf8_length: new TextEncoder().encode(this.text).length,
            byte_gbk_length: getGbkStrLength(this.text),
            string_length: content.replace(/\n/g, "").length,
            word_length: zh_word + en_word + zh_punctuation + int_word + en_punctuation,
            zh_word,
            zh_punctuation,
            en_string,
            en_word,
            en_punctuation,
            int_string,
            int_word,
            line_length: this.text ? this.text.split("\n").length : 0,
        };
    }
}
