# 4 个工具 · 整合 ctool 方案

> 基于文本工具的实践经验，规划 JSON、时间戳、变量名、文本比对
> Copy → Adapt → Integrate 模式

---

## 工具总览

| 工具 | 状态 | ctool 源 | 依赖 |
|------|------|---------|------|
| JSON | 替换现有 | `tools/json/util.ts` | formatter(prettier), lodash, json-keys-sort, unicode, nameConvert |
| 时间戳 | 替换现有 | `tools/time/util/timestamp.ts` | dayjs(+utc/timezone) |
| 变量名 | 新增 | `tools/variableConversion/VariableConversion.vue` → 纯逻辑复用 nameConvert | nameConvert（已复制） |
| 文本比对 | 新增 | Monaco Diff 组件太重 | 改用 `diff` npm 包（轻量） |

---

## 1. JSON — 完全使用 ctool 功能

### 原则

- ❌ 废弃 DeskPal 原有的所有 JSON 处理函数（`processJson`, `sortKeys`, `escapeJson`, `unescapeJson`, `jsonpathQuery`）
- ✅ 所有 JSON 变换函数从 ctool `util.ts` 复制并适配
- ✅ React 组件 `index.tsx` 作为 UI 容器，内部逻辑全部替换为 ctool 函数调用
- ⚠️ `jsonpathQuery` — ctool 的 JSONPath 实现在 `Path.vue`（Vue 组件），不包含在 `util.ts` 中。可以在 React 组件中保留独立 JSONPath 逻辑，或由你决定是否去掉

### ctool JSON util.ts 导出的全部函数

| 函数 | 说明 | 适配后使用方式 |
|------|------|---------------|
| `beautify(code, {tab})` | JSON 格式化（prettier） | 复制 jsonMinify + 简易 JSON.stringify 实现 |
| `compress(code)` | JSON 压缩（支持注释） | 复制 `jsonMinify.ts`，完全使用 |
| `rename(code, type)` | 键名递归命名转换 | 完全使用（依赖 nameConvert + 内联 isPlainObject/isArray） |
| `unicode2zh(content)` | Unicode 转中文 | 复制 `unicode.ts`，完全使用 |
| `zh2unicode(content)` | 中文转 Unicode | 复制 `unicode.ts`，完全使用 |
| `sortAsc(data)` | 键升序排序 | 完全使用（依赖 json-keys-sort） |
| `sortDesc(data)` | 键降序排序 | 完全使用（依赖 json-keys-sort） |
| `escape(content)` | JSON 字符串转义 | 完全使用 |
| `clearEscape(content)` | JSON 字符串反转义 | 完全使用 |

### React 组件 buttons（保留 UI，逻辑全换）

| 按钮 | 原逻辑（废弃） | 新逻辑（ctool） |
|------|--------------|----------------|
| 格式化 | `JSON.stringify(JSON.parse())` | `beautify(input, {tab: 2})` |
| 压缩 | `JSON.stringify(JSON.parse())` | `compress(input)` |
| 键排序 | 自定义 `sortKeys` | `sortAsc(JSON.parse(input))` + stringify |
| 键降序 | — | `sortDesc(JSON.parse(input))` + stringify（新增按钮） |
| 转义 | 自定义 `escapeJson` | `escape(input)` |
| 反转义 | 自定义 `unescapeJson` | `clearEscape(input)` |
| Unicode→中文 | — | `unicode2zh(input)`（新增按钮） |
| 中文→Unicode | — | `zh2unicode(input)`（新增按钮） |
| 命名转换 | — | `rename(JSON.parse(input), type)`（新增下拉/按钮） |

### 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **复制+改** | `src/tools/json/utils.ts` | 从 `tools/json/util.ts` 复制，适配依赖 |
| **复制** | `src/tools/json/jsonMinify.ts` | 从 `formatter/jsonMinify.ts` 复制（零依赖） |
| **复制** | `src/tools/json/unicode.ts` | 从 `tools/unicode/util.ts` 复制（零依赖） |
| **保留不变** | `src/tools/json/index.tsx` | React 组件，只改 import 路径 |
| **保留不变** | `src/tools/json/json.css` | 样式 |
| **安装** | — | `json-keys-sort` |
| **不复制** | `formatter/json.ts` + `base.ts` | 改用 `JSON.parse/stringify` 替代 prettier |

### utils.ts 适配点

| ctool 写法 | 改为 |
|-----------|------|
| `import formatter from "@/tools/code/formatter"` | 删除，内联 `JSON.parse/stringify` |
| `import unicode from "@/tools/unicode/util"` | `import unicode from "./unicode"` |
| `import { isPlainObject, isArray } from "lodash"` | 内联 `typeof === "object"` / `Array.isArray` |
| `import jsonKeysSort from "json-keys-sort"` | 保留（新安装的 npm 包） |
| `import { convent as nameConvent } from "@/helper/nameConvert"` | `import { convent as nameConvent } from "../text/nameConvert"` |

### beautify/compress 处理

不复制 ctool 的 prettier 格式化器（太重，~200KB），改用简易实现：

```typescript
// beautify — 保持现有 JSON.parse/stringify 方式
async function beautify(code: string, { tab = 4 } = {}) {
  const indent = " ".repeat(tab);
  return JSON.stringify(JSON.parse(code), null, indent);
}

// compress — 复制 jsonMinify（支持注释的 JSON 压缩）
async function compress(code: string) {
  return code !== "" ? jsonMinify(code) : "";
}
```

---

## 2. 时间戳 — 完全使用 ctool 功能

### 原则

- ❌ 废弃 DeskPal 原有的所有时间戳处理函数（`getNow`, `parseInput`, `timestampToDate`, `detectTimestampUnit`）
- ✅ 所有时间戳处理逻辑从 ctool `time/util/timestamp.ts` 复制并适配
- ✅ React 组件作为 UI 容器，逻辑全部替换为 ctool 的 `transform()` 函数
- ❌ 不保留 DeskPal 原有的 `ISO 8601`/`本地时间` 等格式化方式 —— 用 ctool 的 sec/ms/ns 输出模式替代

### ctool timestamp.ts 导出的全部函数

| 函数 | 说明 | 使用方式 |
|------|------|---------|
| `transform(input, timezone, format)` | 核心转换函数：输入时间戳/日期字符串 → 自动识别类型 → 输出 sec/ms/ns | 完全使用 |
| `getTimeType(input)` | 自动识别输入类型（unix/normal/error/empty）和精度（sec/ms/ns） | 内部使用 |
| `Format` | 枚举：`second`, `millisecond`, `nanosecond` | 完全使用 |
| `InputType` | 枚举：`error`, `empty`, `normal`(日期字符串), `unix`(数字) | 完全使用 |

### transform() 的 Output 结构

```typescript
{
  isValid: boolean,      // 是否有效
  second: string,        // 秒级输出（unix 转日期 / 日期转 unix）
  millisecond: string,   // 毫秒级输出
  nanosecond: string,    // 纳秒级输出
  format?: Format,       // 实际使用的精度
  autoFormat?: Format,   // 自动检测的精度
  type?: InputType       // 输入类型
}
```

### React 组件设计

替换后不再有 `ISO 8601` / `本地时间` 等非 ctool 的输出格式。
统一使用 ctool 的 transform() 输出模式：

| UI 区域 | 数据来源 | 说明 |
|---------|---------|------|
| 当前时间 | `transform(Date.now().toString(), "local", Format.millisecond)` | 实时刷新 |
| 输入转换 | `transform(input, "local")` | 自动识别类型 + 3 种精度输出 |

---

## 3. 变量名 — 新增 `src/tools/naming/`

### 功能

输入一个变量名（或每行一个变量名），自动显示 7 种命名风格的转换结果。

这是 ctool 的 `VariableConversion.vue` + `helper/nameConvert.ts`（已复制）的组合。

### 核心逻辑（ctool 源码）

```typescript
// VariableConversion.vue 的核心
const batchConvent = (str: string, type: TypeLists) => {
  return str.split("\n").map(line => {
    line = line.trim();
    if (line === "") return "";
    return convent(line, type);
  }).join("\n");
};
```

依赖 `nameConvert.ts`（已从 ctool 复制到 `src/tools/text/nameConvert.ts`）。

### 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **新建** | `src/tools/naming/index.tsx` | React 组件 |
| **新建** | `src/tools/naming/naming.css` | 样式 |
| **引用** | `../text/nameConvert` | 复用已复制的 nameConvert |

### 交互设计

```
┌──────────────────────────────────┐
│  输入变量名（textarea）            │
│  user_name                       │
│  user-id                         │
│  UserName                        │
├──────────────────────────────────┤
│  结果实时显示（输入即转换）         │
│                                   │
│  space case    │ user name        │
│  Camel Case    │ User Name        │
│  kebab-case    │ user-name        │
│  SNAKE_CASE    │ USER_NAME        │
│  CamelCase     │ UserName         │
│  camelCase     │ userName         │
│  snake_case    │ user_name        │
├──────────────────────────────────┤
│  点击结果行 → 复制到剪贴板         │
└──────────────────────────────────┘
```

- 输入变化时实时计算（防抖 300ms）
- 每行独立转换，多行时批量处理
- 每行结果可点击复制

---

## 4. 文本比对 — 新增 `src/tools/diff/`

### 功能

两个文本框输入原文和修改文，显示差异对比。

### ctool 分析

ctool 的 `Diffs.vue` 使用 Monaco Editor 的 Diff 组件，依赖 `monaco-editor`（太重量级，~5MB）。
不适合复制到 DeskPal。

### 替代方案

使用轻量级 `diff` npm 包（~15KB）进行文本差异计算，自实现差异渲染。

```bash
pnpm add diff
pnpm add -D @types/diff
```

### 核心逻辑

```typescript
import { diffLines, diffWords, diffChars } from "diff";

// 按行对比
const changes = diffLines(originalText, modifiedText);

// 渲染差异（React 组件）
// 添加行: 绿色背景
// 删除行: 红色背景  
// 不变行: 无背景
// changes.map(part => {
//   if (part.added) return <ins style="background:#a6f3a6">{part.value}</ins>
//   if (part.removed) return <del style="background:#f3a6a6">{part.value}</del>
//   return <span>{part.value}</span>
// })
```

### 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **新建** | `src/tools/diff/index.tsx` | React 组件（双文本框 + 差异渲染） |
| **新建** | `src/tools/diff/diff.css` | 样式 |
| **安装** | — | `diff` npm 包 |

### 交互设计

```
┌──────────────────────────────────┐
│  原文（textarea）  │  修改文（textarea）│
│                   │                  │
│  line 1           │  line 1          │
│  line 2           │  line 2 modified │
│  line 3           │  line 4          │
├──────────────────────────────────┤
│  差异预览（只读）                   │
│  line 1                           │
│  -line 2         ← 红色删除        │
│  +line 2 modified ← 绿色新增       │
│  -line 3         ← 红色删除        │
│  +line 4         ← 绿色新增        │
└──────────────────────────────────┘
```

---

## 依赖安装汇总

```bash
cd deskpal

# JSON
pnpm add json-keys-sort

# 时间戳
pnpm add dayjs

# 文本比对
pnpm add diff
pnpm add -D @types/diff

# 已有（文本工具已安装）
# chinese-simple2traditional
```

---

## 注册点变更

按 `04-tools-development.md` 规范，每个新工具需要 3 个注册点。

| 工具 | 图标 (lucide-react) | order |
|------|---------------------|-------|
| JSON | `Braces`（已有） | 1（不变） |
| 时间戳 | `Clock`（已有） | 0（不变） |
| 变量名 | `CaseSensitive` 或 `TextCursorInput` | 需插入 |
| 文本比对 | `FileDiff` 或 `GitCompare` | 需插入 |

---

## 执行顺序

```
Phase 1 — 无依赖独立工具
  1a. JSON     ← 替换 utils.ts，保持组件不变
  1b. 变量名    ← 新增工具，依赖 nameConvert（已存在）

Phase 2 — 需安装依赖
  2a. 时间戳    ← 安装 dayjs，替换 utils.ts
  2b. 文本比对   ← 安装 diff，新建组件+样式

Phase 3 — 注册
  3.  注册 4 个工具到 3 个注册点
```

---

## 风险与注意

| 工具 | 风险 |
|------|------|
| JSON | `json-keys-sort` 包可能不活跃；jsonMinify 是非标准 JSON 解析器 |
| 时间戳 | dayjs 增加 ~30KB 产物体积；时区功能暂不引入，后续可按需加 |
| 变量名 | 依赖已复制的 nameConvert，注意路径引用一致性 |
| 文本比对 | `diff` 包是纯计算库，不提供 UI 渲染；差异高亮需要自实现 CSS |
