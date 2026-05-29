# 剪贴板自动填充 · 底层统一设计

> Plan mode — 只输出设计，不执行代码。

## 目标

将 JSON 工具和 Timestamp 工具中各自内联的剪贴板读取逻辑提取为独立的底层模块，提供统一的 hook 供所有工具组件使用。

---

## 现状分析

### JSON 工具的剪贴板逻辑 (`tools/json/index.tsx` L22-49)

```
挂载 → check store 缓存 → 有缓存则恢复(跳过剪贴板)
                         → 无缓存 → readText → processJson → valid? → setInput+setResult
```

特点：缓存优先（skipIf）

### Timestamp 工具的剪贴板逻辑 (`tools/timestamp/index.tsx` L32-42)

```
挂载 → readText → parseInput → type !== "invalid" → setInput+setResult
```

特点：无条件读取（无 skipIf）

### 共同模式

| 步骤 | JSON | Timestamp |
|------|------|-----------|
| 1. 读取剪贴板 | `navigator.clipboard.readText()` | 同 |
| 2. 空文本跳过 | `if (!text.trim()) return` | 同 |
| 3. 工具解析 | `processJson(text)` | `parseInput(text)` |
| 4. 验证判断 | `parsed.valid` | `parsed.type !== "invalid"` |
| 5. 接受回调 | `setInput+setResult` | `setInput+setResult` |
| 6. 错误处理 | `.catch(() => {})` | 同 |
| 7. 跳过条件 | `storedInput.trim()` | 无 |

差异仅在第 3/4/5/7 步，其余完全相同。

---

## 设计方案

### 新增文件：`src/lib/useClipboardFill.ts`

一个通用 React hook，封装剪贴板读取 + 解析 + 接受的全流程。

#### 类型定义

```typescript
export interface ClipboardFillConfig<T> {
  /**
   * 解析剪贴板文本 → 工具特定的结果。
   * 返回 null 表示剪贴板内容不适合本工具（不触发 onFill）。
   */
  parser: (text: string) => T | null;

  /**
   * 当 parser 返回非 null 时触发。
   * @param text 原始剪贴板文本
   * @param parsed parser 返回的结果
   */
  onFill: (text: string, parsed: T) => void;

  /**
   * 可选。返回 true 表示跳过剪贴板。
   *
   * 双重检查点：
   * ① 挂载时同步检查 → skip 则完全不调 readText()
   * ② readText() 回调中异步检查 → 防止用户在异步期间已输入内容被覆盖
   *
   * 典型用法：
   * - JSON 工具：检查 store 缓存是否有值
   * - Timestamp 工具：检查输入框 state 是否为空
   */
  skipIf?: () => boolean;
}
```

#### Hook 实现（最终版）

```typescript
import { useEffect, useRef } from "react";

export function useClipboardFill<T>(config: ClipboardFillConfig<T>): void {
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const inited = useRef(false);
    if (inited.current) return;
    inited.current = true;

    const { parser, onFill, skipIf } = configRef.current;

    // ① 读之前先检查：输入框已有值则完全跳过剪贴板
    if (skipIf?.()) return;

    navigator.clipboard
      .readText()
      .then((text) => {
        if (!text.trim()) return;

        // ② 读完之后再检查：异步期间用户可能已输入内容，阻止覆盖
        if (skipIf?.()) return;

        const parsed = parser(text);
        if (parsed !== null) {
          onFill(text, parsed);
        }
      })
      .catch(() => {});
  }, []);
}
```

### 不使用 useCallback 包裹的 memo/ref 策略

因为 `parser`、`onFill`、`skipIf` 由调用方传入，如果直接放进 deps 数组会导致每次渲染都重新执行。采用 **ref 模式**保持首次挂载行为：

```typescript
const configRef = useRef(config);
configRef.current = config;  // 始终保持最新

useEffect(() => {
  if (inited.current) return;
  inited.current = true;

  const { parser, onFill, skipIf } = configRef.current;
  if (skipIf?.()) return;

  navigator.clipboard.readText()
    .then((text) => {
      if (!text.trim()) return;
      const r = parser(text);
      if (r !== null) onFill(text, r);
    })
    .catch(() => {});
}, []);  // 空 deps = 只在 mount 执行一次
```

---

## 迁移方案

### JSON 工具 (`tools/json/index.tsx`)

**改前** (L21-49，约 28 行)：

```tsx
// 挂载时从 store 恢复缓存；仅输入框为空时才尝试剪贴板
useEffect(() => {
  if (inited.current) return;
  inited.current = true;
  const storedInput = useStore.getState().jsonInput;
  const storedJsonpath = useStore.getState().jsonpathInput;
  if (storedInput.trim()) {
    setInput(storedInput);
    setResult(processJson(storedInput));
    if (storedJsonpath.trim()) setJsonpath(storedJsonpath);
    return;
  }
  navigator.clipboard.readText()
    .then((text) => {
      if (!text.trim()) return;
      const parsed = processJson(text);
      if (parsed.valid) {
        setInput(text);
        setResult(parsed);
      }
    })
    .catch(() => {});
}, []);
```

**改后**（拆为两个 effect，各司其职）：

```tsx
// ① 缓存恢复
useEffect(() => {
  const storedInput = useStore.getState().jsonInput;
  const storedJsonpath = useStore.getState().jsonpathInput;
  if (storedInput.trim()) {
    setInput(storedInput);
    setResult(processJson(storedInput));
    if (storedJsonpath.trim()) setJsonpath(storedJsonpath);
  }
}, []);

// ② 剪贴板填充（统一 hook）
useClipboardFill({
  parser: (text) => {
    const r = processJson(text);
    return r.valid ? r : null;
  },
  onFill: (text, r) => {
    setInput(text);
    setResult(r);
  },
  skipIf: () => useStore.getState().jsonInput.trim() !== "",
});
```

### Timestamp 工具 (`tools/timestamp/index.tsx`)

**改前** (L32-42)：

```tsx
useEffect(() => {
  navigator.clipboard.readText().then((text) => {
    if (!text.trim()) return;
    const parsed = parseInput(text);
    if (parsed.type !== "invalid" && parsed.converted) {
      setInput(text);
      setResult(parsed.converted);
      setError(null);
    }
  }).catch(() => {});
}, []);
```

**改后**：

```tsx
import { useClipboardFill } from "../../lib/useClipboardFill";

useClipboardFill({
  parser: (text) => {
    const r = parseInput(text);
    return r.type !== "invalid" && r.converted ? r.converted : null;
  },
  onFill: (text, r) => {
    setInput(text);
    setResult(r);
    setError(null);
  },
  // 输入框已有内容 → 完全跳过（双重防护：读之前 + 读之后）
  skipIf: () => input.trim() !== "",
});
```

### 未来工具接入

新工具只需：

```tsx
import { useClipboardFill } from "../../lib/useClipboardFill";

useClipboardFill({
  parser: (text) => { /* 工具解析逻辑 */ },
  onFill: (text, parsed) => { /* 状态更新 */ },
  skipIf: () => { /* 可选：有缓存则跳过 */ },
});
```

---

## 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/useClipboardFill.ts` | **新增** | 剪贴板填充 hook |
| `src/tools/json/index.tsx` | **修改** | 替换为 hook，拆分为缓存恢复 + 剪贴板填充两个 effect |
| `src/tools/timestamp/index.tsx` | **修改** | 替换为 hook |

---

## 边界情况

| 场景 | 行为 |
|------|------|
| 剪贴板为空 | 不触发 onFill |
| 剪贴板权限拒绝 | 静默捕获（`.catch(() => {})`） |
| parser 返回 null | 不触发 onFill（内容不属于本工具） |
| skipIf 返回 true | 完全不读剪贴板（同步跳过） |
| 读剪贴板期间用户输入了内容 | skipIf 异步二次检查 → 阻止覆盖 |
| 组件重复挂载（StrictMode） | `inited.current` ref 防止重复执行 |
| 已缓存 + 剪贴板有新 JSON | 缓存优先，skipIf 在两次检查中都拦截 |

---

## 验证

1. 启动 `pnpm tauri dev`，打开 JSON 工具 → 剪贴板有 JSON → 自动填充 ✅
2. 在 JSON 工具输入内容 → 切换到其他工具 → 再切回 → 缓存恢复，不读剪贴板 ✅
3. 打开 Timestamp 工具 → 剪贴板有时间戳 → 自动填充 ✅
4. 空剪贴板 → 两个工具都不崩溃 ✅

---

## 不涉及的范围

- 不做全局剪贴板监听/监控（不在本次设计范围）
- 不做剪贴板历史记录
- 不改动 zustand store 结构
