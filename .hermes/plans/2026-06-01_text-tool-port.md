# 文本处理工具 · 移植方案

> 分支: v1.2 | 来源: ctool | 目标: DeskPal 新工具

---

## 一、总览

将 ctool 的文本处理功能（`tools/text/util.ts` + `helper/nameConvert.ts`）移植为 DeskPal 的 **text** 工具，遵循以下原则：

1. ❌ 不改动 ctool 原本的代码和依赖
2. ✅ 将核心逻辑复制到 DeskPal 项目内，做必要适配
3. ✅ DeskPal 已有的架构模式（组件/CSS/注册点）保持不变
4. ⚠️ 依赖冲突/缺失的，标记出来由你确认

---

## 二、来源文件清单

从 ctool 搬运的核心代码：

| ctool 源文件 | 说明 | 依赖 |
|-------------|------|------|
| `packages/ctool-core/src/tools/text/util.ts` | 文本处理主类（大小写、行操作、排序、统计、转义等） | `lodash`, `chinese-simple2traditional`, `Buffer`, `@/helper/nameConvert` |
| `packages/ctool-core/src/helper/nameConvert.ts` | 7 种命名风格互转 | 零外部依赖 ✅ |

---

## 三、依赖分析（需确认）

### 3.1 lodash（orderBy, uniq）

ctool 只用了 `orderBy` 和 `uniq` 两个函数，仅用于：
- `sort()` 方法中的行排序（`orderBy(lines, item => item, "asc"/"desc")`）
- `lineRemoveRepeat()` 方法中的去重（`uniq(lines)`）

**方案 A：安装 lodash**（约 70KB gzip 约 24KB）
**方案 B：内联替代**（各约 5 行，零新增依赖）

```typescript
// 替代 uniq
function uniq<T>(arr: T[]): T[] { return [...new Set(arr)]; }

// 替代 orderBy
function orderByAsc(arr: string[]): string[] { return [...arr].sort(); }
function orderByDesc(arr: string[]): string[] { return [...arr].sort((a, b) => b.localeCompare(a)); }
```

**建议：方案 B** — 函数极简，不值得加 lodash。

### 3.2 chinese-simple2traditional（简繁转换）

ctool 使用 npm 包 `chinese-simple2traditional`（约 1.2MB），仅用于 `zhTran()` 一个方法。

**已确认：保留** ✅

安装依赖：
```bash
cd deskpal && pnpm add chinese-simple2traditional@^2.2.0
```

ctool 中的 `setupEnhance()` 调用和 `@/helper/nameConvert` 引用保留不变，
仅把 `import` 路径从 `"chinese-simple2traditional"` 改为使用安装后的包路径（无需改）。

### 3.3 Buffer（字节数计算）

ctool 用 `Buffer.byteLength(text, "utf8")` 计算 UTF8 字节数，这是 Node.js API，在浏览器中用 `TextEncoder` 替代：

```typescript
// 替代 Buffer.byteLength
const utf8Bytes = new TextEncoder().encode(text).length;
```

**方案：无需新增依赖 ✅**

### 3.4 @/helper/nameConvert（内部模块引用）

ctool 的 `util.ts` 中 `import { convent as nameConvent } from "@/helper/nameConvert"` 引用的是 ctool 内部模块。
搬运后需要改为本地相对路径 `import { convent as nameConvent } from "./nameConvert"`。

**方案：修改 import 路径 ✅**

---

## 四、移植后的文件结构

```
src/tools/text/
├── index.tsx          # React 组件（UI + 交互）
├── text.css           # 样式
├── utils.ts           # 从 ctool 搬运的 Text 类（去依赖版）
└── nameConvert.ts     # 从 ctool 搬运的命名转换（零依赖）
```

### 4.1 utils.ts 的修改点

从 ctool 复制 `tools/text/util.ts`，做以下适配：

| 原始代码 | 改为 |
|----------|------|
| `import { toSimplified, toTraditional } from "chinese-simple2traditional"` | 去掉（确认后）或保留 |
| `import { orderBy, uniq } from "lodash"` | 内联 `uniq` + `orderByAsc`/`orderByDesc` |
| `import { Buffer } from "buffer"` | `new TextEncoder().encode(text).length` |
| `import { convent as nameConvent } from "@/helper/nameConvert"` | `import { convent as nameConvent } from "./nameConvert"` |
| `import { setupEnhance } from "chinese-simple2traditional/enhance"` | 去掉 |
| `setupEnhance()` 调用 | 去掉 |
| `class` 默认导出 | 改为具名导出 `export class TextProcessor` |
| `import type { ... }` 中 `RenameType` | 保留，改为 `import type { TypeLists as RenameType } from "./nameConvert"` |

> ⚠️ 注意：ctool 的 `@/helper/nameConvert` 中 `convent`（无 r）是原命名，搬运后保持相同函数名，不做重命名。

### 4.2 nameConvert.ts 的修改点

从 ctool 复制 `helper/nameConvert.ts`，零外部依赖，仅做格式调整：
- 去掉 `export default`，改为 `export { convent, typeLists }`
- 添加 `Convent` 类的导出支持

### 4.3 组件 index.tsx 的交互设计

参考 DeskPal 现有工具模式 + ctool 文本工具的功能特点：

```
┌──────────────────────────────────┐
│  文本输入区（textarea，占满）      │
│  [可编辑，支持粘贴大量文本]         │
│                                   │
├──────────────────────────────────┤
│  [清空] [粘贴]                    │
├──────────────────────────────────┤
│  功能按钮区（按类别分组）           │
│                                   │
│  ┌─ 大小写 ─────────────────────┐ │
│  │ [全大写] [全小写] [行首大写]   │ │
│  │ [词首大写] [行首小写] [词首小写]│ │
│  └──────────────────────────────┘ │
│                                   │
│  ┌─ 行操作 ─────────────────────┐ │
│  │ [移除空行] [移除重复行] [Trim] │ │
│  │ [移除行号] [添加行号] [移除换行]│ │
│  └──────────────────────────────┘ │
│                                   │
│  ┌─ 排序/反转 ──────────────────┐ │
│  │ [行反转] [行升序] [行降序]     │ │
│  │ [字符串反转] [整串反转]        │ │
│  └──────────────────────────────┘ │
│                                   │
│  ┌─ 命名转换 ───────────────────┐ │
│  │ [snake_case] [camelCase]      │ │
│  │ [PascalCase] [kebab-case]     │ │
│  │ [SNAKE_CASE] [Camel Case]     │ │
│  │ [space case]                  │ │
│  └──────────────────────────────┘ │
│                                   │
│  ┌─ 其他 ───────────────────────┐ │
│  │ [转义] [反转义]               │ │
│  │ [中英标点] [英中标点]          │ │
│  └──────────────────────────────┘ │
├──────────────────────────────────┤
│  统计信息栏                        │
│  字符: 123 | 中文: 45 | 英文: 67  │
│  行数: 10 | UTF8: 456B | GBK: 512B│
└──────────────────────────────────┘
```

**交互原则：**
- 输入框文本变化时自动更新统计信息（防抖 300ms）
- 每个按钮点击后立即将结果写回输入框（原地操作）
- 允许撤销（Ctrl+Z 或通过输入框自身撤销）
- 结果区域：不需要额外 output 区域，所有操作结果直接替换输入框内容

---

## 五、注册到 DeskPal

3 个注册点（遵循 `04-tools-development.md` 规范）：

### 5.1 tools/index.ts

```typescript
text: lazy(() => import("./text")),
```

### 5.2 lib/registry.ts

```typescript
{ id: "text", name: "文本", icon: "type", keywords: ["text", "文本", "大小写", "排序", "统计"], order: 2 },
```

图标：使用 lucide-react 的 `Type` 图标（`type`），最接近文本编辑语义。

### 5.3 ToolGrid.tsx

```typescript
import { FileText, ... } from "lucide-react";
// 或根据所选图标添加

iconMap: {
  "text": FileIcon,  // 或其他图标
}
```

---

## 六、剪贴板支持

根据 ctool 的 Text.vue 源码分析，ctool 的文本工具**没有**在挂载时自动读取剪贴板。
用户手动粘贴或输入文本后操作。DeskPal 的 text 工具也遵循此行为：

- ❌ 挂载时**不**自动读剪贴板
- ✅ 用户手动粘贴/输入
- ✅ 操作结果原地写回输入框
- ✅ 清空按钮清空输入框

---

## 七、待确认清单

| # | 问题 | 确认结果 |
|---|------|----------|
| 1 | **简繁转换** | ✅ 保留，安装 `chinese-simple2traditional` |
| 2 | **图标** | ✅ `Type`（lucide-react），注册 `icon: "type"` |
| 3 | **剪贴板** | ❌ 不自动读取（与 ctool 保持一致） |
| 4 | **交互模式** | ✅ A: 原地替换 |

---

## 八、验证步骤

```bash
# 1. tsc 编译
cd deskpal && npx tsc --noEmit

# 2. Vite 构建
pnpm build

# 3. 调试模式
pnpm tauri dev

# 4. 功能测试
#    - 输入文本，点击"全大写"→ 结果写回
#    - 点击"统计"→ 统计信息更新
#    - 点击"snake_case"→ 按单词转换命名风格
#    - 剪贴板自动填充（如启用）
```
