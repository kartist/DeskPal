/// 配置字段类型枚举 — 前端据此渲染对应的设置控件
#[derive(Debug, Clone)]
pub enum ConfigFieldType {
    Slider {
        min: f64,
        max: f64,
        step: f64,
        unit: &'static str,
    },
    Toggle,
    Select {
        options: Vec<(&'static str, &'static str)>,
    },
    Input {
        placeholder: &'static str,
    },
}

/// 单个配置字段的描述 — 前端自动渲染设置面板时使用
#[derive(Debug, Clone)]
pub struct ConfigField {
    /// 对应 DeskPalConfig 中的字段名
    pub key: &'static str,
    /// 中文显示名
    pub label: &'static str,
    /// 字段类型（含参数）
    pub field_type: ConfigFieldType,
    /// 默认值统一用 f64 表达
    ///   - Toggle: 1 表示 true / 0 表示 false
    ///   - Slider: 数值本身
    ///   - Select: options 列表的索引
    ///   - Input: 不用，填 0 即可
    pub default: f64,
}

/// 返回所有可配置字段的描述列表。
/// 前端遍历该列表即可渲染完整的设置面板。
pub fn get_fields() -> Vec<ConfigField> {
    vec![
        ConfigField {
            key: "auto_hide_enabled",
            label: "自动隐藏",
            field_type: ConfigFieldType::Toggle,
            default: 1.0,
        },
        ConfigField {
            key: "auto_hide_delay_ms",
            label: "隐藏延迟",
            field_type: ConfigFieldType::Slider {
                min: 500.0,
                max: 5000.0,
                step: 100.0,
                unit: "ms",
            },
            default: 2000.0,
        },
        ConfigField {
            key: "theme",
            label: "主题",
            field_type: ConfigFieldType::Select {
                options: vec![
                    ("dark", "深色"),
                    ("light", "浅色"),
                    ("system", "跟随系统"),
                ],
            },
            default: 0.0,
        },
        ConfigField {
            key: "dock_position",
            label: "停靠位置",
            field_type: ConfigFieldType::Select {
                options: vec![("right", "右侧"), ("left", "左侧")],
            },
            default: 0.0,
        },
        ConfigField {
            key: "dormant_width",
            label: "收缩条宽度",
            field_type: ConfigFieldType::Slider {
                min: 10.0,
                max: 60.0,
                step: 2.0,
                unit: "px",
            },
            default: 36.0,
        },
        ConfigField {
            key: "panel_width",
            label: "面板宽度",
            field_type: ConfigFieldType::Slider {
                min: 200.0,
                max: 1200.0,
                step: 20.0,
                unit: "px",
            },
            default: 480.0,
        },
        ConfigField {
            key: "smart_recommend",
            label: "智能推荐",
            field_type: ConfigFieldType::Toggle,
            default: 1.0,
        },
        ConfigField {
            key: "live_timestamp",
            label: "实时时间戳",
            field_type: ConfigFieldType::Toggle,
            default: 1.0,
        },
    ]
}
