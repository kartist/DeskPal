# Phase 1: 配置管理系统

## 目标
将硬编码配置值抽取到 `config.json`，建立 Rust ↔ TS 统一的配置读写通道，并实现设置面板。

## 架构

```
config.json (用户配置)          state.json (运行时状态)
  ├── auto_hide_enabled           ├── panel_height
  ├── auto_hide_delay_ms          ├── panel_width
  ├── theme                       ├── vertical_pos
  ├── dock_position               └── horizontal_pos
  ├── dormant_width
  ├── panel_width
  ├── smart_recommend
  └── live_timestamp
```

## 任务分解

### Task 1: Rust config/types.rs — 配置结构体 + 默认值
- DeskPalConfig struct (Serialize, Deserialize, Clone)
- Default impl 提供所有默认值
- 字段: auto_hide_enabled, auto_hide_delay_ms(2000), theme("dark"), dock_position("right"), dormant_width(36.0), panel_width(480.0), smart_recommend(true), live_timestamp(true)
- 依赖: 无

### Task 2: Rust config/loader.rs — 读写 config.json
- ConfigLoader::new() → 确定 %APPDATA%/deskpal/config.json 路径
- ConfigLoader::load_or_default() → 读取或返回默认
- ConfigLoader::save(config) → 原子写入
- 依赖: Task 1

### Task 3: Rust IPC — get_config / set_config
- lib.rs: 加 get_config(state: State<Mutex<ConfigLoader>>) -> DeskPalConfig
- lib.rs: 加 set_config(state: State<Mutex<ConfigLoader>>, config: DeskPalConfig) -> Result
- setup() 中初始化 ConfigLoader + app.manage(Mutex::new(loader))
- 注册到 invoke_handler
- 依赖: Task 2

### Task 4: Rust config/schema.rs — 配置字段描述（供前端自动渲染）
- ConfigField struct: key, label, field_type (enum: Slider/Toggle/Select/Input), min, max, step, options, default, unit
- fn get_fields() -> Vec<ConfigField> — 所有配置项的元描述
- 依赖: Task 1

### Task 5: Frontend 配置层
- src/types/index.ts: DeskPalConfig interface (匹配 Rust 结构体)
- src/lib/ipc.ts: 加 getConfig(), setConfig(config) 包装函数
- 依赖: Task 3

### Task 6: Frontend SettingsPanel 组件
- 从 schema (get_fields) 自动渲染表单
- Slider → 带值滑条
- Toggle → 开关
- Select → 下拉菜单
- 保存按钮 → setConfig → 刷新显示
- 依赖: Task 4, Task 5

### Task 7: 将配置接入 WindowManager
- manager.rs: dormant_width 从硬编码改为读 self.config.dormant_width
- manager.rs: panel_width 默认值改为 config.panel_width
- 依赖: Task 1
