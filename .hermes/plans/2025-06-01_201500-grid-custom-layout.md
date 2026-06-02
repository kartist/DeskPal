# DeskPal 工具网格自定义布局 — 实现计划

## 目标

展开态工具网格支持：
1. **编辑模式** — 进入编辑态后可拖拽调整工具图标位置
2. **分类系统** — 工具按钮按分类聚集，默认分类：`常用`、`全部`
3. **分类管理** — 编辑模式下可增删改分类，`全部`分类不可删改
4. **持久化** — 分类和排序保存到 localStorage，重启不丢失

---

## 现状分析

### 当前架构

```
App.tsx
  └─ (expanded && no activeTool)
       └─ tool-grid-wrapper
            └─ ToolGrid.tsx          ← 纯展示：遍历 gridTools 渲染卡片
                 └─ toolRegistry.ts   ← 静态工具列表（注册表）
```

| 组件 | 职责 |
|------|------|
| `ToolGrid.tsx` | 从 `gridTools` 取列表，CSS grid 渲染，点击选中/取消工具 |
| `registry.ts` | 工具元数据注册表（id, name, icon, keywords, order） |
| `global.css` | `.tool-grid`（CSS grid）、`.tool-card`（卡片样式） |
| `store/index.ts` | `activeTool`（当前选中的工具 ID） |
| `StatusBar.tsx` | 静态文字"就绪 \| DeskPal v1.1" |

### 关键约束

- **工具数量**：11 个（含 terminal），不含 settings
- **registry.ts 不可改**：它是工具注册的 source of truth
- **Rust 不改**：分类是前端 UI 数据，不应进 Rust `DeskPalConfig` 结构体
- **最小依赖**：DeskPal 哲学反对重量级 npm 包

---

## 数据模型

### 新类型定义（`src/types/index.ts` 追加）

```ts
export interface ToolCategory {
  id: string;           // 唯一标识（系统分类用 "__all__" / "__frequent__"，用户自定义用 uuid）
  name: string;         // 显示名称
  toolIds: string[];    // 有序的工具 ID 列表
  isSystem: boolean;    // true = 不可删除、不可重命名
}
```

### 默认分类

| ID | 名称 | toolIds | isSystem |
|----|------|---------|----------|
| `__all__` | 全部 | [所有工具的 id，与 registry 同步] | true |
| `__frequent__` | 常用 | [] （空，用户自己加） | false |

### 初始数据生成

```ts
import { gridTools } from "../lib/registry";

function buildDefaultCategories(): ToolCategory[] {
  return [
    {
      id: "__all__",
      name: "全部",
      toolIds: gridTools.map(t => t.id),  // 动态读取，不硬编码
      isSystem: true,
    },
    {
      id: "__frequent__",
      name: "常用",
      toolIds: [],
      isSystem: false,
    },
  ];
}
```

**`全部`分类的 toolIds 如何保持同步？**
- 每次打开 `全部` 分类时，动态合并 registry 中的所有 toolIds（增量追加新工具）
- 用户手动拖入的工具保留
- 注册表中已删除的工具自动剔除

---

## 持久化方案

**方案：zustand `persist` 中间件 → localStorage**

理由：
- 分类是 UI 数据（不是应用配置），不适合进 Rust `DeskPalConfig`
- zustand persist 零额外依赖、代码量极小
- localStorage 有 5MB 限制，但分类数据 < 5KB 绰绰有余
- 重启 DeskPal 后保持用户的分类和排序

**Store 新增字段：**

```ts
// store/index.ts 追加
export interface AppState {
  // ... 现有字段 ...
  
  /** 工具网格编辑模式 */
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  
  /** 分类列表 */
  categories: ToolCategory[];
  setCategories: (cats: ToolCategory[]) => void;
  
  /** 当前选中的分类 ID */
  activeCategory: string;
  setActiveCategory: (id: string) => void;
}
```

**persist 配置：**

```ts
import { persist } from "zustand/middleware";

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // ... 所有字段 ...
      editMode: false,
      setEditMode: (v) => set({ editMode: v }),
      categories: buildDefaultCategories(),
      setCategories: (cats) => set({ categories: cats }),
      activeCategory: "__frequent__",
      setActiveCategory: (id) => set({ activeCategory: id }),
    }),
    {
      name: "deskpal-ui-state",
      partialize: (state) => ({
        categories: state.categories,
        activeCategory: state.activeCategory,
        // 其他需要持久化的 UI 状态放这里
      }),
    }
  )
);
```

**注意**：`editMode` 不持久化 — 每次重启默认非编辑状态，避免用户困惑。

---

## 拖拽实现

**方案：HTML5 原生 Drag and Drop API**

理由：
- 零依赖（DeskPal 哲学）
- Tauri WebView2 完整支持
- 12 个工具的拖拽场景不需要高级动画库
- 实现简单（`draggable`、`onDragStart`、`onDragOver`、`onDrop`）

**拖拽交互：**
1. 编辑模式下，卡片变为 `draggable`
2. `onDragStart` — 记录被拖拽卡的 toolId
3. `onDragOver` — 高亮目标位置（插入指示器）
4. `onDrop` — 重新排列 toolIds 数组，移除旧位置，插入新位置
5. 拖到**分类标签**上 → 移动到该分类
6. 拖到网格内 → 调整该分类内的顺序

**CSS 拖拽状态：**
```css
.tool-card.dragging { opacity: 0.4; }
.tool-card.drag-over { border: 2px dashed var(--accent); }
```

---

## 组件架构

### 组件树

```
App.tsx
  └─ ToolGridPanel.tsx (新，替代原有的 tool-grid-wrapper 区块)
       ├─ CategoryTabs.tsx     — 分类标签栏
       │    ├─ 每个标签：<span>分类名</span> + 编辑模式下的删除/重命名
       │    └─ 编辑模式：[＋] 新增分类按钮
       ├─ EditModeBar.tsx      — 编辑模式工具栏
       │    └─ [ 完成 ] 按钮
       └─ ToolGrid.tsx         — 工具卡片网格（重写）
            └─ ToolCard.tsx    — 单个卡片（提取复用）
```

### 各组件职责

#### `ToolGridPanel.tsx`（新增）

顶层容器。从 store 读取 `editMode`、`activeCategory`、`categories`。

```
┌─────────────────────────────────────┐
│ [常用] [全部] [API]  [+ 新增分类]    │ ← CategoryTabs
│                              [ 完成 ]│ ← EditModeBar (仅编辑模式)
├─────────────────────────────────────┤
│  ⏰      { }    📝                  │
│ 时间戳   JSON   文本                │ ← ToolGrid (category-filtered)
│  ──     ──     ──                  │
│  Aa     ⇄      🎲                  │
│ ...                                 │
└─────────────────────────────────────┘
```

#### `CategoryTabs.tsx`（新增）

- 渲染 `<div className="cat-tabs">` 容器
- 每个分类渲染为 tab（高亮当前选中）
- 点击切换 `activeCategory`
- **编辑模式**：
  - `全部` 标签左侧显示 🔒（禁止删改的视觉提示）
  - 非系统标签右侧显示 ✏️（重命名）、🗑️（删除）
  - 右侧显示 **[＋]** 按钮，弹出输入框创建新分类

#### `EditModeBar.tsx`（新增）

- 仅在编辑模式下显示
- 一个 **[ 完成 ]** 按钮 → 退出编辑模式
- 也可以一个 **[ 进入编辑]** 按钮在正常模式的 StatusBar 中

#### `ToolGrid.tsx`（重写）

当前实现是遍历 `gridTools` 渲染所有卡片。重写后：
- 从 store 读取 `categories` 和 `activeCategory`
- 找到当前分类的 `toolIds`
- 从 registry 获取对应工具的元数据
- 按 `toolIds` 的顺序渲染卡片
- **`全部` 分类**：合并 registry 中所有 toolId + 分类中已记录但不在 registry 的（剔除已删除工具）

#### `ToolCard.tsx`（提取）

把现在 `ToolGrid.tsx` 中 30-39 行的卡片渲染逻辑提取为独立组件：

```tsx
interface ToolCardProps {
  tool: ToolPlugin;
  isActive: boolean;
  editMode: boolean;
  index: number;
  onClick: () => void;
  onDragStart: (toolId: string) => void;
  onDragOver: (index: number) => void;
  onDrop: (index: number) => void;
}
```

---

## 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **新增** | `src/components/grid/ToolGridPanel.tsx` | 顶层容器：tabs + 编辑栏 + 网格 |
| **新增** | `src/components/grid/CategoryTabs.tsx` | 分类标签栏（含增删改） |
| **新增** | `src/components/grid/EditModeBar.tsx` | 编辑模式工具栏 |
| **新增** | `src/components/grid/ToolCard.tsx` | 提取的单个工具卡片 |
| **新增** | `src/components/grid/grid.css` | 分类、编辑、拖拽相关样式 |
| **重写** | `src/components/ToolGrid.tsx` | 改为 category-filtered 渲染 + 拖拽 |
| **修改** | `src/App.tsx` | 替换 tool-grid-wrapper 区块为 ToolGridPanel |
| **修改** | `src/types/index.ts` | 追加 `ToolCategory` 接口 |
| **修改** | `src/store/index.ts` | 追加 `editMode`、`categories`、`activeCategory` + persist |
| **修改** | `src/styles/global.css` | 新增分类/拖拽类（或合入 grid.css，统一 import） |
| **修改** | `src/components/StatusBar.tsx` | 添加 [编辑布局] 按钮 |

---

## 实现步骤

### Step 1 — 类型与数据模型

1. `src/types/index.ts`：追加 `ToolCategory` 接口
2. 添加 `buildDefaultCategories()` 工具函数（放在 `src/lib/categories.ts` 或直接放在 store 附近）

### Step 2 — Store 扩展

1. `src/store/index.ts`：
   - 追加 `editMode`、`categories`、`activeCategory` 及其 setter
   - 包装 `persist` 中间件
   - 初始化默认分类数据

### Step 3 — 提取 ToolCard 组件

1. 新建 `src/components/grid/ToolCard.tsx`
2. 把现有 ToolGrid 的卡片渲染逻辑移过来
3. 添加 `editMode` 属性 → 条件渲染 `draggable`

### Step 4 — 重写 ToolGrid

1. `src/components/ToolGrid.tsx` → 改为从 store 读取 `activeCategory` 和 `categories`
2. 按分类过滤渲染
3. 添加 HTML5 DnD 事件处理
4. 拖放完成后更新 store 中的 `toolIds` 顺序

### Step 5 — CategoryTabs + EditModeBar

1. 新建 `src/components/grid/CategoryTabs.tsx`
2. 新建 `src/components/grid/EditModeBar.tsx`
3. 分类标签切换：`setActiveCategory(id)`
4. 新增分类：输入名称 → push 到 categories 数组
5. 重命名分类：inline edit 或 prompt
6. 删除分类：确认后移除（`全部` 不可删除）

### Step 6 — ToolGridPanel 容器

1. 新建 `src/components/grid/ToolGridPanel.tsx`
2. 组合 `CategoryTabs` + `EditModeBar` + `ToolGrid`
3. 从 store 读取所有状态

### Step 7 — App.tsx 集成

1. 替换原有 `tool-grid-wrapper` + `ToolGrid` 为 `ToolGridPanel`
2. 注意保留 `StatusBar`、`resize-grip` 等外围结构

### Step 8 — StatusBar 编辑按钮

1. `src/components/StatusBar.tsx`：添加 `[ 编辑布局 ]` 按钮（仅在正常模式可见）
2. 点击 → `setEditMode(true)`

### Step 9 — 样式

1. `src/components/grid/grid.css`：
   - 分类标签样式（`.cat-tabs`、`.cat-tab`、`.cat-tab.active`、`.cat-tab.system`）
   - 编辑模式卡片样式（`.tool-card.edit-mode`、`.tool-card.dragging`、`.tool-card.drag-over`）
   - 编辑栏样式（`.edit-mode-bar`）
   - 新增分类按钮（`.cat-add-btn`）

### Step 10 — 验证

1. `pnpm build` → TypeScript 编译通过
2. `pnpm tauri dev` → 实际运行验证
3. Git commit

---

## 风险与应对

| 风险 | 应对 |
|------|------|
| HTML5 DnD 在 WebView2 的边界情况 | Tauri 2.x 使用的是 Edge WebView2，HTML5 DnD 完全支持。原生实现，无兼容性问题 |
| persist 中间件和现有 store 的冲突 | persist 只序列化 `partialize` 中指定的字段，不影响其他字段的行为 |
| 新增工具后 `全部` 分类不同步 | 每次渲染 `全部` 时动态 merge registry，不依赖持久化数据 |
| 用户拖错后无法撤销 | 编辑模式下所有修改实时生效（不设"取消"），用户退出编辑模式即视为确认 |
| 空分类（toolIds = []）的视觉 | 显示占位文字"拖拽工具到此处" |

---

## 不涉及的范围

- Dormant 收缩栏的图标排序 — 本期仅做展开态
- 工具搜索结果页 — 上期 `smart_recommend` 为独立功能
- Rust 后端改动 — 全前端实现
- npm 包安装 — 零新依赖

---

## 验证清单

- [ ] `pnpm build` 编译通过
- [ ] 默认看到 `常用` 和 `全部` 两个标签
- [ ] 初始 `常用` 为空（显示占位提示）
- [ ] `全部` 显示所有 11 个工具
- [ ] 点击 [编辑布局] 进入编辑模式，按钮变为 [完成]
- [ ] 编辑模式下可拖拽工具卡片调整顺序
- [ ] 拖拽工具到不同分类标签上可移动
- [ ] 可新增自定义分类
- [ ] 可重命名自定义分类
- [ ] 可删除自定义分类（工具回到 `全部`）
- [ ] `全部` 分类不可删除/重命名
- [ ] 刷新/重启后分类和排序保持
- [ ] 正常模式下工具点击仍然正常工作
