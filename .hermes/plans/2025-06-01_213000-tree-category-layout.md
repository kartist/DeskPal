# DeskPal 工具网格重构 — 两层树结构 + 折叠/展开 + 跨分类拖拽

## 目标

将当前的「分类标签 + 切换显示」模式重构为「分类树 + 子节点展开」模式：
1. **两层树结构** — 分类为父节点，功能按钮为子节点，同屏显示
2. **折叠/展开** — 点击分类头切换，折叠时隐藏其工具
3. **跨分类拖拽** — 工具可在不同分类之间拖动

---

## 现状与问题

### 当前架构（标签页模式）

```
CategoryTabs [全部] [常用] [API] [+]
────────────────────────────────────
  ⏰  { }  📝  ...                  ← 只显示当前选中分类的工具
  时间戳 JSON  文本
```

**问题：**
- 每次只能看一个分类，看不到全貌
- 切换分类需要点击标签
- 折叠/展开机制不存在
- 用户已明确提出需要树结构

---

## 新交互设计

### 布局（同屏展示所有分类）

```
┌─ 🔒 全部 ▼ ──────────────────────────┐
│  ⏰  { }  📝  Aa  ⇄  🎲  🔀  🔗  .*  │  ← 展开
│  时间戳 JSON 文本 变量 比对 UUID 随机 URL 正则 │
│  🛡  ▶                                 │
│  JWT 终端                               │
├────────────────────────────────────────┤
├── 📁 常用 ▼ ──────────────────────────┤
│  ▶   🛡                               │  ← 展开，有工具
│  终端  JWT                             │
├────────────────────────────────────────┤
├── 📁 API工具 ▶ ───────────────────────┤  ← 折叠
├────────────────────────────────────────┤
├── 📁 自定义工具 ▶ ─────────────────────┤  ← 折叠
└────────────────────────────────────────┘
```

### 交互行为

| 操作 | 效果 |
|------|------|
| 点击分类头 **文字区域** | 切换折叠/展开 |
| 点击分类头 **▼/▶ 箭头** | 切换折叠/展开 |
| 点击分类头的 **锁图标** | 无操作（视觉提示系统分类） |
| 点击工具卡片 | 选中/打开该工具（进入工作面板） |
| 拖拽工具卡片（编辑模式） | 可拖动，drop 到其他分类 |
| **折叠态下拖拽** | 工具卡片隐藏，但分类头仍是 drop zone |

### 折叠/展开状态

- 折叠状态不持久化（local React state，重启/刷新后默认展开）
- 所有分类初始为 **展开** 状态
- 用户可自由折叠/展开任意分类

### `__all__` 分类语义

| 场景 | 行为 |
|------|------|
| 从 `__all__` 拖到其他分类 | 工具 **复制到** 目标分类，`__all__` 不移除 |
| 从其他分类拖到 `__all__` | 工具从源分类 **移除**，`__all__` 不添加（原本就有） |
| 从其他分类拖到另一个分类 | 工具从源分类 **移除**，添加到目标分类 |
| 在 `__all__` 内拖拽排序 | 不持久化（`__all__` 动态生成，下次重置） |

---

## 组件架构

### 新旧对比

| 旧组件 | 新组件 | 说明 |
|--------|--------|------|
| `CategoryTabs.tsx` | ❌ 删除 | 替换为 CategorySection |
| `ToolGrid.tsx` | ❌ 删除 | 工具卡片渲染并入 CategorySection |
| `grid/EditModeBar.tsx` | ✅ 保留 | 编辑模式工具栏（微调） |
| `grid/ToolCard.tsx` | ✅ 保留 | 单卡组件不变 |
| `grid/ToolGridPanel.tsx` | 🔄 重写 | 主容器，管理分类 section 列表 |
| `grid/grid.css` | 🔄 重写 | 树结构新样式 |
| 新建 | `grid/CategorySection.tsx` | 一个分类的完整树节点 |

### 新组件树

```
ToolGridPanel
├── CategorySection (for each category)
│   ├── CategoryHeader
│   │   ├── ►/▼ toggle arrow
│   │   ├── 🔒 lock (for __all__)
│   │   ├── Category name
│   │   ├── ✏️ rename (edit mode)
│   │   └── 🗑️ delete (edit mode)
│   └── (when expanded)
│       ├── .cat-section-tools (CSS grid)
│       │   └── ToolCard × N
│       └── .cat-section-empty (empty placeholder)
├── [+ Add Category] button (edit mode)
└── EditModeBar (edit mode)
```

---

## 数据流

### 状态管理

| 状态 | 位置 | 类型 | 说明 |
|------|------|------|------|
| `categories` | zustand store (persisted) | `ToolCategory[]` | 分类定义 + 工具列表 |
| `editMode` | zustand store | boolean | 编辑模式开关 |
| `activeTool` | zustand store | string\|null | 当前选中的工具 |
| `collapseState` | ToolGridPanel local state | `Record<string, boolean>` | 各分类的折叠状态（{catId: true/false}） |
| `dragSource` | ToolGridPanel useRef | `{toolId, catId}\|null` | 拖拽源信息（不触发重渲染） |

### 工具列表解析

在每个 CategorySection 中：
- 非 `__all__`：直接读 `category.toolIds` 映射到 registry
- `__all__`：动态合并 registry 所有工具（同现有 `mergeAllTools`）

---

## 实现步骤

### Step 1 — 创建 CategorySection 组件

**文件**：`src/components/grid/CategorySection.tsx`

核心逻辑：
- Props: `category: ToolCategory`, `editMode: boolean`, `collapsed: boolean`, `onToggle: () => void`
- 调用 `mergeAllTools` 解析 toolIds
- 渲染 **header**（箭头 + 锁 + 名称 + 编辑按钮）
- 渲染 **工具网格**（折叠时隐藏）
- 渲染 **[+] 新增分类** 按钮（编辑模式下，在最后一个 section 之后）

```tsx
// Header
<div className="cat-header" onClick={onToggle}>
  <span className="cat-arrow">{collapsed ? "▶" : "▼"}</span>
  {category.isSystem && <span className="cat-lock">🔒</span>}
  <span className="cat-name">{category.name}</span>
  {editMode && !category.isSystem && (
    <>
      <button className="cat-edit-btn" title="重命名">✏️</button>
      <button className="cat-edit-btn danger" title="删除">🗑️</button>
    </>
  )}
</div>

// Tools grid (when expanded)
{!collapsed && (
  <div className="cat-section-tools">
    {tools.map(tool => <ToolCard ... />)}
  </div>
)}
```

### Step 2 — 重写 ToolGridPanel

**文件**：`src/components/grid/ToolGridPanel.tsx`

从 store 读取 `categories`、`editMode`，管理折叠状态：
- `collapseState: Record<string, boolean>` — 默认全部展开
- 每个分类渲染一个 CategorySection
- 跨分类拖拽通过 useRef + dataTransfer 实现
- 编辑模式下显示 `EditModeBar` 和 `[+]` 按钮
- 删除 `activeCategory` 引用（不再需要）

```tsx
export default function ToolGridPanel() {
  const { categories, editMode, setCategories } = useStore();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const dragRef = useRef<{ toolId: string; catId: string } | null>(null);

  const handleToggleCollapse = (catId: string) => {
    setCollapsed(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  return (
    <div className="toolgrid-panel">
      <div className="cat-section-list">
        {categories.map(cat => (
          <CategorySection
            key={cat.id}
            category={cat}
            editMode={editMode}
            collapsed={!!collapsed[cat.id]}
            onToggle={() => handleToggleCollapse(cat.id)}
            onToolDragStart={(toolId) => dragRef.current = { toolId, catId: cat.id }}
            onToolDrop={(toolId, fromCatId) => {
              // Cross-category move logic
              if (fromCatId === cat.id) return;
              moveToolAcrossCategories(toolId, fromCatId, cat.id);
            }}
          />
        ))}
      </div>
      {editMode && <EditModeBar />}
    </div>
  );
}
```

### Step 3 — 清理旧的注册点

- 删除 `src/components/grid/CategoryTabs.tsx`
- 删除或废止 `src/components/ToolGrid.tsx`
- 更新 `App.tsx` 导入（已导入 ToolGridPanel，无需改）
- 更新 `store/index.ts`：`activeCategory` 标记为 deprecated，或删除（目前保留以防其他引用）

### Step 4 — 更新样式

**文件**：`src/components/grid/grid.css`

新样式结构：

```css
/* Panel scroll container */
.toolgrid-panel { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }

/* Section list */
.cat-section-list { flex: 1; overflow-y: auto; padding: 8px; }

/* Category section */
.cat-section { margin-bottom: 4px; }

/* Header */
.cat-header {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 10px; border-radius: 6px; cursor: pointer;
  user-select: none; font-size: 13px; font-weight: 500;
  color: var(--text-primary);
}
.cat-header:hover { background: var(--btn-bg-hover); }

/* Arrow */
.cat-arrow { font-size: 10px; width: 14px; text-align: center; color: var(--text-muted); }

/* Lock icon */
.cat-lock { font-size: 11px; opacity: 0.4; }

/* Name */
.cat-name { flex: 1; }

/* Edit buttons */
.cat-edit-btn { ... }

/* Tools grid inside section */
.cat-section-tools {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 6px;
  padding: 4px 10px 8px;
}

/* Empty state */
.cat-section-empty { ... }

/* Drop target highlight on section */
.cat-section.drop-target .cat-header {
  border: 1px dashed var(--accent); background: var(--btn-bg-active);
}
```

### Step 5 — 跨分类拖拽

在 `ToolGridPanel` 中实现跨分类拖拽：

```ts
const moveTool = (toolId: string, fromCatId: string, toCatId: string) => {
  if (fromCatId === toCatId) return;
  const updated = categories.map(cat => {
    // Remove from source (unless __all__)
    if (cat.id === fromCatId && !cat.isSystem) {
      return { ...cat, toolIds: cat.toolIds.filter(id => id !== toolId) };
    }
    // Add to target (unless __all__)
    if (cat.id === toCatId && !cat.isSystem) {
      return { ...cat, toolIds: [...cat.toolIds, toolId] };
    }
    return cat;
  });
  setCategories(updated);
};
```

**拖拽数据流：**
1. 用户拖拽工具卡片 → ToolCard 的 `onDragStart` 写入 `dataTransfer.setData('text/plain', toolId)`
2. CategorySection 的 `onDragStart` 回调设置 dragRef
3. 用户拖到其他分类区域 → CategorySection 的 drop zone 响应
4. 从 `dataTransfer.getData('text/plain')` 读取 toolId
5. 从 `categories` 找源分类（`categories.find(c => c.toolIds.includes(toolId))`）
6. 调用 `moveTool` 执行移动

### Step 6 — 验证 + 提交

1. `pnpm build` 编译通过
2. 所有分类垂直排列，点击折叠/展开
3. 拖拽工具跨分类移动
4. edit mode 下分类增删改正常
5. `__all__` 不可删改，工具不被移除

---

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **新建** | `src/components/grid/CategorySection.tsx` | 核心组件：折叠头 + 工具网格 |
| **重写** | `src/components/grid/ToolGridPanel.tsx` | 管理分类列表 + 折叠状态 + 跨分类拖拽 |
| **重写** | `src/components/grid/grid.css` | 树结构新样式 |
| **保留** | `src/components/grid/ToolCard.tsx` | 不变（已有 dataTransfer setData） |
| **保留** | `src/components/grid/EditModeBar.tsx` | 不变 |
| **删除** | `src/components/grid/CategoryTabs.tsx` | 被 CategorySection 替代 |
| **移除引用** | `src/App.tsx` | 已经是 `ToolGridPanel` 导入，无需改动 |
| **不动** | `src/store/index.ts` | activeCategory 保留（但不使用），其他保持 |
| **不动** | `src/lib/categories.ts` | buildDefaultCategories 逻辑不变 |

---

## UI 交互细节

### 普通模式

```
┌─ ▼ 🔒 全部 ─────────────────────────┐
│  ⏰  { }  📝  Aa  ⇄  🎲  🔀  🔗  .*  │  ← 展开：显示工具
│  时间戳 JSON 文本 变量 比对 UUID 随机 URL 正则 │
├────────────────────────────────────────┤
├── ▼ 📁 常用 ─────────────────────────┤
│  ▶   🛡                               │  ← 展开：显示工具
│  终端  JWT                             │
├────────────────────────────────────────┤
├── ▶ 📁 API工具 ───────────────────────┤  ← 折叠
├────────────────────────────────────────┤
└── 📁 待办工具 ───────────────────────┘  ← 默认展开，但尚无工具
   📦 拖拽工具到此处
```

### 编辑模式

分类头右侧出现 ✏️ 🗑️，工具卡片出现虚线边框 + 可拖拽。

```
┌─ ▼ 🔒 全部 ─────────────────────────┐  ← 无编辑按钮（系统）
│  ⏰  { }  📝  ...                     │  ← 可拖拽
├────────────────────────────────────────┤
├── ▼ 📁 常用 ─── [✏️] [🗑️] ───────────┤
│  ▶   🛡                               │  ← 可拖拽
├────────────────────────────────────────┤
├── ▶ 📁 API工具 ─ [✏️] [🗑️] ─────────┤
├────────────────────────────────────────┤
└── [+] ───────────────────────────────┘
```

---

## 验证清单

- [ ] `pnpm build` 编译通过
- [ ] 所有分类垂直排列，每个分类独占一行
- [ ] 点击分类头可折叠/展开工具区
- [ ] 箭头方向正确（▼ 展开，▶ 折叠）
- [ ] `__all__` 分类显示 `🔒全部`，无编辑按钮
- [ ] 非系统分类在编辑模式下显示 ✏️ 🗑️
- [ ] 拖拽工具卡片可在分类间移动
- [ ] 从 `__all__` 拖到其他分类：复制过去，`__all__` 不移除
- [ ] 从自定义分类拖到另一个自定义分类：迁移
- [ ] 拖到 `__all__` 上：从源移除（不添加，已在）
- [ ] 新增分类（编辑模式 [+]）正常工作
- [ ] 重命名分类（✏️）正常工作
- [ ] 删除分类（🗑️）正常工作
- [ ] 折叠状态在分类之间独立维护
