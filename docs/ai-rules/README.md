# AI 编码约束规则索引

## AI 必须遵守的行为准则
1. **开始任何编码任务前，先读取本 README.md 以及所有相关规则文件**
2. 修改 Rust 端配置相关代码时，必须读取 `01-config-system.md`
3. 修改前端 Store/IPC 相关代码时，必须读取 `01-config-system.md`
4. 新增或修改窗口状态/触发源时，必须读取 `02-architecture.md`
5. 当本目录规则与 AI 默认行为冲突时，以本目录规则为准
6. **每次改动代码后必须 git commit，维护有意义的 commit message**（详见 `03-git.md`）。此规则优先级高于一切。
7. **加一条配置项必须在 5 个地方同步修改**（见 `01-config-system.md`），遗漏任意一处视为违反规范

## 规则文件

| 文件 | 内容 | 适用范围 |
|------|------|----------|
| `01-config-system.md` | 配置体系：Rust struct ↔ Schema ↔ IPC ↔ TS ↔ SettingsPanel 五层同步规范 | 所有配置相关任务 |
| `02-architecture.md` | 架构原则：Rust/TS 边界、Trigger/Action 状态机、窗口生命周期 | 所有窗口/状态相关任务 |
| `03-git.md` | Git 提交规范：提交频率、message 格式、类型前缀 | **所有任务。优先级高于一切规则** |
