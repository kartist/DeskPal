# 文本处理工具 · 容器化方案 v2

> 分支: v1.2 | 原则: **零复制、零修改** — DeskPal 直接引用 ctool 源码

---

## 一、架构原则

```
DeskPal (Tauri 2.x 窗口壳)
  ├── 贴边悬浮 / 展开收缩  ← Rust 状态机
  ├── TitleBar + ToolGrid  ← React UI
  └── 工具面板
       ├── timestamp  ← 自有实现
       ├── json       ← 自有实现
       └── text       ← React 包装 → 直接引用 ctool 源码
                                        └── ctool/packages/ctool-core/src/tools/text/util.ts
                                        └── ctool/packages/ctool-core/src/helper/nameConvert.ts
```

- ✅ **ctool 源码不动** — 不复制、不修改
- ✅ **DeskPal 仅做 React 包装** — 只写 `index.tsx` + `text.css`
- ✅ **编译时直接引用** — Vite 解析 ctool 文件路径

---

## 二、ctool 引用路径

ctool 文本处理涉及两个源文件，它们的相互引用链：

```
ctool/packages/ctool-core/src/
  tools/text/util.ts
    ├── import { convent as nameConvent } from "@/helper/nameConvert"
    ├── import { orderBy, uniq } from "lodash"
    ├── import { Buffer } from "buffer"
    ├── import { toSimplified, toTraditional } from "chinese-simple2traditional"
    └── import { setupEnhance } from "chinese-simple2traditional/enhance"

  helper/nameConvert.ts   ← 纯 TS，零外部依赖
```

**引用策略：** DeskPal 的 Vite 配置 `@` 别名指向 ctool 的 src 目录，ctool 文件中的 `@/helper/nameConvert` 自然解析到 `ctool/.../src/helper/nameConvert`。

---

## 三、DeskPal 需要改动的文件

### 3.1 vite.config.ts — 添加 resolve alias

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      // 让 ctool 源码中的 @/ 别名正确解析
      "@": resolve(__dirname, "../ctool/packages/ctool-core/src"),
    },
  },
  // ... 其余保持不动
}));
```

### 3.2 tsconfig.json — 添加 paths 映射

```json
{
  "compilerOptions": {
    // ... 原有配置 +
    "paths": {
      "@/*": ["../ctool/packages/ctool-core/src/*"]
    },
    "baseUrl": "."
  },
  "include": ["src", "../ctool/packages/ctool-core/src"]
}
```

### 3.3 package.json — 新增依赖

ctool 的 `tools/text/util.ts` 引用的 npm 包需要安装到 DeskPal：

```bash
pnpm add lodash chinese-simple2traditional buffer
pnpm add -D @types/lodash
pnpm add -D vite-plugin-node-polyfills
```

| 包 | 原因 | 替代方案 |
|---|------|----------|
| `lodash` | ctool 使用 `orderBy`, `uniq` | 无，ctool 源码直接引用 |
| `chinese-simple2traditional` | ctool 使用 `toSimplified`, `toTraditional` | 无，ctool 源码直接引用 |
| `buffer` + `vite-plugin-node-polyfills` | ctool 使用 `Buffer.byteLength()` | ctool 源码直接引用，浏览器需要 polyfill |

### 3.4 新增：src/tools/text/index.tsx

React 组件，直接引用 ctool 源码：

```typescript
// 直接引用 ctool 源码 — 零复制
import TextProcessor from "@ctool/tools/text/util";
// 实际通过 @ 别名：ctool/packages/ctool-core/src/tools/text/util
```

### 3.5 新增：src/tools/text/text.css

工具样式。

### 3.6 3 个注册点（按 04-tools-development.md）

| 文件 | 新增内容 |
|------|----------|
| `src/tools/index.ts` | `text: lazy(() => import("./text"))` |
| `src/lib/registry.ts` | `{ id: "text", name: "文本", icon: "type", ... }` |
| `src/components/ToolGrid.tsx` | 导入 `Type` 图标 + 加入 `iconMap` |

---

## 四、依赖安装问题（需确认）

### 4.1 buffer 浏览器兼容

ctool 的 `util.ts` 使用 `Buffer.byteLength(text, "utf8")` 和 `import { Buffer } from "buffer"`。
浏览器本身没有 Buffer API，需要 `vite-plugin-node-polyfills` 插件来 polyfill。

**但 ctool 的 vite.config.ts 已经使用了 `nodePolyfills()` 插件。** DeskPal 需要同样的 polyfill。

安装：
```bash
pnpm add buffer
pnpm add -D vite-plugin-node-polyfills
```

配置到 `vite.config.ts`：
```typescript
import { nodePolyfills } from "vite-plugin-node-polyfills";

plugins: [
  react(),
  nodePolyfills(),  // 新增
],
```

### 4.2 setupEnhance 调用

ctool 源码中 `setupEnhance()` 是 `chinese-simple2traditional` 的增强初始化。
引用 ctool 源码时这句会一起执行，不会报错，无需处理。

---

## 五、React 组件设计

### index.tsx 结构

```typescript
import { useState, useEffect, useCallback } from "react";
// 直接引用 ctool 源码 — 零复制零修改
import TextProcessor from "@/tools/text/util";
import { convent } from "@/helper/nameConvert";
import "./text.css";
```

**组件布局（按确认结果：模式 A — 原地替换）：**

```
┌──────────────────────────────────┐
│  文本输入区（textarea，占满）      │
│  [可编辑，结果直接写回此框]        │
│                                   │
├──────────────────────────────────┤
│  统计信息栏（自动更新）            │
│  字符: 123 | 中文: 45 | 英文: 67  │
│  行数: 10 | UTF8: 456B | GBK: 512B│
├──────────────────────────────────┤
│  功能按钮区（分组展示，ctool 风格）  │
│                                   │
│  ┌─ 大小写 ─────────────────────┐ │
│  │ [全大写] [全小写] [行首大写]   │ │
│  │ [词首大写] [行首小写] [词首小写]│ │
│  ├─ 行操作 ─────────────────────┤ │
│  │ [移除空行] [去重] [Trim]       │ │
│  │ [移除行号] [添加行号] [移除换行]│ │
│  ├─ 排序/反转 ──────────────────┤ │
│  │ [行反转] [行升序] [行降序]     │ │
│  │ [字符串反转] [整串反转]        │ │
│  ├─ 命名转换 ───────────────────┤ │
│  │ [snake] [camel] [Pascal]      │ │
│  │ [kebab] [SNAKE] [Camel Case]  │ │
│  ├─ 转义 ───────────────────────┤ │
│  │ [转义] [反转义]               │ │
│  ├─ 标点 ───────────────────────┤ │
│  │ [中→英] [英→中]              │ │
│  ├─ 简繁 ───────────────────────┤ │
│  │ [简→繁] [繁→简]              │ │
│  └─ 其他 ───────────────────────┘ │
│                                   │
│  [清空]                           │
└──────────────────────────────────┘
```

### 交互逻辑

```typescript
const handleTransform = (method: string, options?: any) => {
  if (!input.trim()) return;
  const processor = new TextProcessor(input);
  const result = (processor as any)[method](options) as string;
  setInput(result);
};
```

---

## 六、验证步骤

```bash
# 1. 安装依赖
pnpm add lodash chinese-simple2traditional buffer
pnpm add -D @types/lodash vite-plugin-node-polyfills

# 2. tsc 编译
npx tsc --noEmit

# 3. Vite 构建
pnpm build

# 4. 调试
pnpm tauri dev

# 5. 功能验证
#    - 输入文本 → 点击各按钮 → 结果写回输入框
#    - 统计信息实时更新
#    - 命名转换各格式正确
#    - 简繁转换正常
```

---

## 七、风险与注意

| 风险 | 说明 |
|------|------|
| ctool 依赖升级 | 以后 ctool 升级 `util.ts` 改了 import 语句，DeskPal 会同步受影响。但这是"容器"的设计目标——ctool 变，DeskPal 自动跟 |
| `@` 别名冲突 | DeskPal 当前不用 `@/` 别名，所以不会冲突 |
| Buffer polyfill 体积 | `buffer` 包约 30KB gzip，`nodePolyfills` 插件可能引入更多 polyfill |
| tsconfig paths | Vite 能解析别名，但 tsc 需要 `paths` 配置才能通过类型检查 |

## 八、需要你确认

**已确认：方案 A** ✅

安装：
```bash
pnpm add buffer chinese-simple2traditional lodash
pnpm add -D @types/lodash vite-plugin-node-polyfills
```
