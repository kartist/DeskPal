# 双击判定时间改为可配置设置项

## 目标

将 TitleBar 中硬编码的 `DBLCLICK_THRESHOLD = 300` 改为一个用户可配置的设置项，通过设置面板调整。

## 现状

- `TitleBar.tsx` 第 8 行：`const DBLCLICK_THRESHOLD = 300; // ms`
- Config 体系已完善：Rust `DeskPalConfig` struct → `serde` 序列化 → IPC `get_config`/`set_config` → 前端 `types/index.ts` 定义 → `SettingsPanel.tsx` 渲染 UI
- 前端 `SettingsPanel.tsx` 是**手动渲染**的（不是从 `schema.rs` 自动生成），每个设置项独立写一行

## 改动清单（6 个文件）

### 1. `src-tauri/src/config/types.rs`

新增字段 + 默认值函数：

```rust
#[serde(default = "default_dblclick_threshold_ms")]
pub dblclick_threshold_ms: u64,
```

```rust
#[allow(dead_code)]
fn default_dblclick_threshold_ms() -> u64 {
    300
}
```

`impl Default` 中加上 `dblclick_threshold_ms: default_dblclick_threshold_ms(),`

### 2. `src/types/index.ts`

```typescript
dblclick_threshold: number;
```

### 3. `src-tauri/src/config/schema.rs`

在 `get_fields()` 返回列表末尾添加：

```rust
ConfigField {
    key: "dblclick_threshold_ms",
    label: "双击判定时间",
    field_type: ConfigFieldType::Slider {
        min: 100.0,
        max: 1000.0,
        step: 50.0,
        unit: "ms",
    },
    default: 300.0,
},
```

### 4. `src/components/SettingsPanel.tsx`

在"实时时间戳"下方添加一行：

```tsx
<SettingRow
  label="双击判定时间 (ms)"
  description={`${config.dblclick_threshold}ms`}
>
  <input
    type="range"
    min={100}
    max={1000}
    step={50}
    value={config.dblclick_threshold}
    onChange={(e) =>
      updateField("dblclick_threshold", Number(e.target.value))
    }
    style={styles.slider}
  />
</SettingRow>
```

**注意**：前端类型中字段名是 `dblclick_threshold`，Rust 中是 `dblclick_threshold_ms`。IPC 序列化时 serde 会使用 Rust 字段名，所以前端 `DeskPalConfig.dblclick_threshold` 需要通过 IPC 的映射接收 `dblclick_threshold_ms`。需要确认 IPC 是否做了字段名映射。

> **检查点**：查看 `src/lib/ipc.ts` 中 `getConfig()` 是否做了字段名转换。

### 5. `src/lib/ipc.ts` — 确认字段名映射

如果 IPC 直接透传 JSON（Rust → serde_json → frontend），那么前端接收到的字段名是 `dblclick_threshold_ms`，前端 `DeskPalConfig` 中也要用 `dblclick_threshold_ms`。

如果 IPC 做了转换（`snake_case` → `camelCase`），则需要按转换后的名称。

> 需要查看 `src/lib/ipc.ts` 确认后再决定字段名。

### 6. `src/components/TitleBar.tsx`

删除 `const DBLCLICK_THRESHOLD = 300;`

从 store 中取 config：

```typescript
const dblclickThreshold = useStore((s) => s.config?.dblclick_threshold_ms ?? 300);
```

`handleMouseDown` 中的比较改为：

```typescript
if (now - lastMouseUpRef.current < dblclickThreshold) {
```

## 验证

1. `npx tsc --noEmit` — 前端类型检查
2. `cargo check` — Rust 编译检查
3. 启动 `pnpm tauri dev` — 打开设置面板，确认新设置项出现
4. 调整滑块值 → 点击「保存」
5. 重启应用 → 双击标题栏验证新阈值生效

## 风险和注意事项

- **字段名一致性问题**：Rust 用 `dblclick_threshold_ms`，前端如果用 `dblclick_threshold` 会收不到值。需确认 IPC 层的命名映射后再定。
- **设置保存后即时生效**：当前设计中，`TitleBar` 从 store 的 `config` 读取值，而 `setConfig` 仅在 `SettingsPanel` 保存时调用。这意味着**调整阈值后必须点击「保存」才生效**（与其他设置项行为一致）。
- 设置面板是手动渲染的，不是从 schema.rs 自动生成，所以 schema.rs 的更改只是文档性作用。
