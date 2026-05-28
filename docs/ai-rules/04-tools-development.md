# 工具模块开发规范

## 添加新工具的 3 个注册点

添加新工具必须同步修改以下 3 个位置，遗漏任意一处视为违反规范：

### 1. 组件注册 (`src/tools/index.ts`)

```typescript
import { lazy } from "react";
export const toolComponents: Record<string, ToolComponent> = {
  timestamp: lazy(() => import("./timestamp")),
  json: lazy(() => import("./json")),
  mytool: lazy(() => import("./mytool")),  // 加一行
};
```

### 2. 元数据注册 (`src/lib/registry.ts`)

```typescript
export const toolRegistry: ToolPlugin[] = [
  { id: "timestamp", name: "时间戳", icon: "clock", keywords: ["ts", "unix"], order: 0 },
  { id: "json", name: "JSON", icon: "braces", keywords: ["json", "format"], order: 1 },
  { id: "mytool", name: "我的工具", icon: "lock", keywords: ["my"], order: 9 },
];
```

### 3. 图标映射 (`src/components/ToolGrid.tsx`)

```typescript
import { Lock, /* 新工具图标 */ } from "lucide-react";
const iconMap = {
  lock: Lock,
  "my-icon-name": MyIcon,  // 加一行
};
```

- ✅ `icon` 字段值必须与 `ToolGrid.tsx` 中 `iconMap` 的 key 一致
- ✅ `order` 值不能与已有工具重复
- ❌ 不要直接硬编码图标名到 registry

## 工具目录结构

```
src/tools/[name]/
├── index.tsx       # React 组件（必需）
├── [name].css      # 样式文件（推荐）
└── utils.ts        # 逻辑层（可选）
```

### 组件规范

- ✅ 使用 `export default function [Name]Tool()`
- ✅ 组件外使用 `<div className="tool-panel [prefix]-container">` 作为根元素
- ✅ 前缀命名：每个工具有唯一 CSS 前缀（`ts-`、`j-`、`jsonpath-` 等）

### 逻辑层 (`utils.ts`)

- ✅ 纯函数（不依赖 React）
- ✅ 类型定义放在 utils.ts 中导出
- ❌ 不要在 utils.ts 中引入 React 或 CSS

## 组件开发模式

### 防抖处理

```typescript
// 输入防抖校验（300ms）
useEffect(() => {
  if (!input.trim()) { setResult(null); return; }
  const timer = setTimeout(() => { setResult(process(input)); }, 300);
  return () => clearTimeout(timer);
}, [input]);
```

- ✅ 输入变化使用 `useEffect` + `setTimeout` 防抖，不在 onChange 中直接处理
- ✅ 防抖清理必须 `return () => clearTimeout(timer)`
- ❌ 不要用 lodash debounce（引入额外依赖）

### 事件处理

```typescript
const handleXxx = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  },
  []  // setInput 是 stable 的，不需要依赖
);
```

- ✅ 所有事件处理用 `useCallback` 包裹
- ✅ 依赖数组包含回调中引用的所有 state 和外部变量
- ❌ 不要定义内联箭头函数直接传给 onChange/onClick（除非组件极小）

### 剪贴板操作

```typescript
import { useToast } from "../../store/toastStore";

navigator.clipboard
  .writeText(value)
  .then(() => useToast.getState().show("已复制"))
  .catch(() => {});
```

- ✅ 剪贴板操作统一使用 `navigator.clipboard` API
- ✅ 成功时调用 `useToast.getState().show("已复制")`
- ✅ `.catch(() => {})` 静默处理权限拒绝

### 跨工具状态缓存

```typescript
// store/index.ts 添加缓存字段
jsonInput: "",
setJsonInput: (text) => set({ jsonInput: text }),

// 工具组件中的用法：
// 挂载时从 store 恢复
const storedInput = useStore.getState().jsonInput;
if (storedInput.trim()) setInput(storedInput);

// 输入变更时同步到 store
useEffect(() => { setJsonInput(input); }, [input]);
```

- ✅ 需要持久化的工具状态通过 zustand store 缓存（字段在 `store/index.ts` 中定义）
- ✅ 挂载初始化用 `useStore.getState()` 直接读（绕过 hook 闭包）
- ✅ 写入用独立的 `useEffect` 同步（不在回调中手动调用 setStore）
- ❌ 不使用 localStorage/sessionStorage 做工具级缓存
- ❌ 挂载初始化不要用 `useStore` hook 的返回值做 `useState` 初始化（hook 闭包可能在 StrictMode 下不可靠）

## CSS 规范

### 全局 CSS 变量

全局 CSS 变量定义在 `src/styles/global.css` 中，工具 CSS 优先使用：

| 变量 | 用途 |
|------|------|
| `--input-bg` | 输入框背景色 |
| `--input-border` | 输入框边框色 |
| `--input-text` | 输入框文字色 |
| `--accent` | 主题色（聚焦/高亮） |
| `--output-bg` | 输出区域背景 |
| `--btn-border` | 按钮边框 |
| `--text-primary` | 主要文字色 |
| `--text-muted` | 次要文字色 |
| `--font-mono` | 等宽字体 |
| `--success` | 成功色 |
| `--danger` | 错误色 |
| `--warning` | 警告色 |
| `--divider` | 分割线色 |

### 工具 CSS 约定

- ✅ 使用前缀命名空间（如 `.ts-*`、`.j-*`），避免冲突
- ✅ 关键帧动画使用工具前缀（如 `@keyframes jsonpathFadeIn`）
- ✅ 动画时长使用 `150ms` 或 `200ms`（统一节奏）
- ❌ 不要使用 `!important`
- ❌ 不要覆盖全局 `.tool-panel`、`.tool-input`、`.action-btn` 等全局类的样式

### 按钮组布局

```css
.j-btn-group {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
  flex-shrink: 0;
}
```

- ✅ 按钮组使用 flex 布局 + `flex-shrink: 0`（底部固定）
- ✅ 分割线用 `.j-btn-sep`（1px + `margin: 0 4px`）

### 全高工具面板

由于 `ToolPanel.tsx` 的包装层不是 flex 容器：

```css
.j-container {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}
```

- ✅ 工具根容器用 `height: 100%` 而非 `flex: 1`（父级不是 flex 容器）
- ✅ 内部布局通过嵌套 flex 实现
- ✅ 可滚动区域用 `overflow-y: auto` 和 `min-height: 0`

## 工具间隔离

- ✅ 工具间零耦合，不互相引用或通信
- ✅ 共享的 wiring 文件（`tools/index.ts`、`ToolPanel.tsx`、`App.tsx`）集中管理
- ❌ 不要跨工具 import 其他工具的组件或样式
- ❌ 不要在其他工具的 CSS 中引用本工具的 className

## 调试模式

- ✅ 每次修改后必须 `git commit`（中文 message），然后启动 `pnpm tauri dev` 验证
- ✅ 只有在用户明确说「完工」或「收工」时才 `git push`
