# 配置体系规范

## 核心原则：五层同步

加一条新配置项**必须**在以下 5 个位置同步修改，遗漏任意一处视为违反规范：

```
Rust types.rs  ← 定义结构体字段 + serde(default) + Default trait
Rust schema.rs ← 定义 ConfigField + ConfigFieldType + get_fields()
TS interface   ← src/types/index.ts 加接口字段
IPC 通道       ← Rust lib.rs + src/lib/ipc.ts（已有 get_config/set_config 通用通道，通常无需改）
SettingsPanel  ← src/components/SettingsPanel.tsx 加渲染控件
```

## 文件明细

### 1. Rust 配置类型 (`src-tauri/src/config/types.rs`)

```rust
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DeskPalConfig {
    #[serde(default = "default_xxx")]
    pub field_name: FieldType,
}

// serde 要求独立的默认值函数
fn default_field_name() -> FieldType { default_value }

impl Default for DeskPalConfig {
    fn default() -> Self { Self { field_name: default_field_name(), ... } }
}
```

- ✅ 每个字段必须有 `#[serde(default = "...")]`
- ✅ 每个字段必须有对应的 `fn default_xxx()` 函数
- ✅ `Default` trait 必须调用这些函数（而非硬编码值）
- ❌ 不要用 `#[serde(default)]`（不带函数名），JSON 缺少字段时会用 Rust 类型的 Default，对 String/f64 不友好

### 2. Rust Schema 描述 (`src-tauri/src/config/schema.rs`)

```rust
pub enum ConfigFieldType {
    Slider { min: f64, max: f64, step: f64, unit: &'static str },
    Toggle,
    Select { options: Vec<(&'static str, &'static str)> },
    Input { placeholder: &'static str },
}

pub struct ConfigField {
    pub key: &'static str,
    pub label: &'static str,
    pub field_type: ConfigFieldType,
    pub default: f64,   // Toggle: 0/1, Select: options index, Slider: 值
}
```

- ✅ `get_fields()` 返回所有字段的完整描述
- ✅ 每个 `DeskPalConfig` 字段必须在 `get_fields()` 中有对应条目
- ❌ 不要遗漏字段（编译不会报错，但自动渲染会缺失）

### 3. TypeScript 接口 (`src/types/index.ts`)

```typescript
export interface DeskPalConfig {
  field_name: type;
  // boolean | number | string
}
```

- ✅ 字段名、类型必须与 Rust `DeskPalConfig` 完全一致
- ❌ 不允许类型不一致（Rust u64 → TS number，Rust String → TS string）

### 4. IPC 通道

```
Rust: get_config  → 返回 DeskPalConfig (Serialized as JSON)
Rust: set_config  → 接收 DeskPalConfig (Deserialized from JSON)
TS:   getConfig() → invoke<DeskPalConfig>("get_config")
TS:   setConfig(c) → invoke<void>("set_config", { config: c })
```

- ✅ 通用通道已存在，新增配置项通常**不需要**改 IPC
- ❌ 除非要支持局部更新（只改一个字段），否则不要新增 IPC 命令

### 5. 设置面板 (`src/components/SettingsPanel.tsx`)

- ✅ 每个字段对应一个控件行
- ✅ `updateField(key, value)` 更新本地状态
- ✅ 保存按钮统一调用 `setConfig(config)`
- ❌ 不要针对单个字段做保存（减少 IPC 次数）

## 两个配置文件的分工

| 文件 | 路径 | 内容 | 谁改 |
|------|------|------|------|
| `state.json` | `%APPDATA%/com.deskpal.app/state.json` | panel_height, panel_width, vertical_pos, horizontal_pos | 运行时自动写 |
| `config.json` | `%APPDATA%/deskpal/config.json` | 所有 DeskPalConfig 字段 | 用户从设置面板改 |

- ✅ `state.json` 只存运行时几何状态
- ✅ `config.json` 只存用户偏好配置
- ❌ 不要混用，不要互相包含

## 配置结构体只负责序列化格式

`DeskPalConfig` 只定义 "配置文件的格式是什么"，不定义 "配置怎么用"。
消费方（WindowManager、Hotkey、发请求的地方）各自独立读取 config 字段。

- ✅ 消费方只读 `config.field_name`
- ❌ 消费方不要修改 config
- ❌ 消费方不要直接写 config.json

## 增量添加配置项的完整检查清单

添加新配置项时，逐条勾选：

```
[ ] 1. Rust types.rs: 加字段 + default_xxx() + Default
[ ] 2. Rust schema.rs: 加 ConfigField + get_fields() 条目
[ ] 3. TS types/index.ts: 加接口字段
[ ] 4. IPC: 确认通用通道可以传输该字段（Rust 无特殊类型）
[ ] 5. SettingsPanel: 加渲染控件
[ ] 6. 消费方代码：接入新配置值
```

缺少任意一条 = 配置体系不完整。
