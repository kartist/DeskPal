# 设置系统重构计划

## 目标
统一配置体系，让设置保存即生效。三层分类：窗口 / 外观 / 交互。

## 依赖图

| 任务 | 内容 | 文件 | 依赖 |
|------|------|------|------|
| A | Rust 后端改造 | types.rs, manager.rs, lib.rs, trigger.rs, state.json 逻辑 | 无 |
| B | 前端类型 + Rust schema 更新 | types/index.ts, schema.rs, store/index.ts | 无 |
| C | SettingsPanel UI 重设计 | SettingsPanel.tsx | B |
| D | 前端行为接线 | App.tsx, TitleBar.tsx, global.css | B |

## 任务详情

### Task A: Rust 后端 (Pass 1, 无依赖)

A1. `src-tauri/src/config/types.rs` — 清理死字段
   - 删除 `panel_height_min`, `panel_height_max` 及相关 default 函数
   - 删除 `smart_recommend`, `live_timestamp`, `dock_position`, `hotkey` 及相关 default 函数
   - 保留：auto_hide_enabled, auto_hide_delay_ms, theme, dormant_width, panel_width, dblclick_threshold_ms
   - 新增：dormant_bar_bg(String), dormant_bar_text_color(String), dormant_bar_label(String), double_click_pin_enabled(bool)
   - 更新 Default trait 实现

A2. `src-tauri/src/config/schema.rs` — 同步 schema
   - 删除对应死字段的 ConfigField
   - 新增字段的 ConfigField（颜色用 Input, label 用 Input, double_click 用 Toggle）
   - 更新 default 值

A3. `src-tauri/src/window/manager.rs` — 新增 apply_config + 修复 save_position
   - 新增 `pub fn apply_config(&mut self, config: &DeskPalConfig)` 方法
   - 比较 `self.dormant_width` vs `config.dormant_width`，不同则更新窗口
   - 比较 `self.panel_width` vs `config.panel_width`，不同则更新窗口
   - `save_position` 不再保存 `panel_width` 到 state.json

A4. `src-tauri/src/window/trigger.rs` — 硬编码常数改为变量
   - `SetDormantWidth(36.0)` → 传入 `config.dormant_width`
   - 注意：actions() 签名改为接收 `dormant_width: f64`
   - Init 和 HoverActivate 用 dormant_width 参数代替 36.0

A5. `src-tauri/src/lib.rs` — set_config 增强
   - 保存后调 `WindowManager.apply_config()`
   - 获取 WindowManager 的 mut 锁，传入新 config 调 apply

### Task B: 前端类型 + Schema (Pass 1, 无依赖)

B1. `src/types/index.ts`
   - 同步 Rust 的字段变更：删除 dock_position, smart_recommend, live_timestamp, panel_height_min/max
   - 新增：dormant_bar_bg, dormant_bar_text_color, dormant_bar_label, double_click_pin_enabled
   - 字段名/类型必须与 Rust 完全一致

B2. `src/store/index.ts`
   - 删除重复的 `DeskPalConfig` 接口定义
   - 删除 `DEFAULT_CONFIG` 及其所有值
   - 改用从 `../types` import `DeskPalConfig`
   - store 的 config 字段保持 `config: DeskPalConfig | null`

### Task C: SettingsPanel UI (Pass 2, 依赖 B)

C1. 保留配置文件读取路径（getConfig / setConfig via IPC）
C2. 三组分类卡片：窗口 | 外观 | 交互
C3. 窗口：收缩条宽度(slider)、面板宽度(slider)
C4. 外观：主题(select)、收缩态背景色(color input)、收缩态文字色(color input)、收缩态标签文字(text input)
C5. 交互：双击固定(toggle)、自动隐藏(toggle)、隐藏延迟(slider)、双击判定时间(slider)
C6. 保存按钮：store.setConfig + IPC setConfig 双写
C7. 去掉不再使用的 import（如 ArrowLeft）

### Task D: 前端行为接线 (Pass 2, 依赖 B)

D1. `src/App.tsx`
   - 启动时 (mount useEffect) 调 `getConfig()` → `store.setConfig(config)`
   - autoHideTimer 读 `config.auto_hide_enabled` 和 `config.auto_hide_delay_ms`
   - 自动隐藏禁用时不移除监听，只是不触发

D2. `src/components/TitleBar.tsx`
   - 双击固定读 `config.double_click_pin_enabled`
   - 禁用时双击不做任何事

D3. `src/styles/global.css`
   - `.dormant-bar` 背景色和文字色改为通过 JS 动态设置（或保持 CSS 变量但后续由 store 驱动）
   - 备注：CSS 变量方式更好，但当前简化处理——颜色直接由 Settings 写入 CSS 变量
