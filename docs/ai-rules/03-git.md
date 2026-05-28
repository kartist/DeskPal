# Git 提交规范

## 最强制规则（优先级高于其他所有规则）

**每次改动代码后，必须使用 git 提交，并维护有意义的 commit message。**

- ✅ 每完成一个逻辑独立的改动，立即 commit
- ✅ commit message 用中文，简明扼要说明改了什么
- ✅ 格式：`<类型>: <概要>`
- ❌ 禁止一次性提交大量不相关的改动
- ❌ 禁止空的 commit message
- ❌ 禁止 `fix`, `update`, `changes` 等无信息量的 message

## 类型前缀

| 类型 | 适用场景 | 示例 |
|------|----------|------|
| `feat` | 新功能 | `feat: 添加配置管理系统的 Rust 层` |
| `fix` | 修复 bug | `fix: 修复窗口拖拽在透明模式下失效` |
| `refactor` | 重构 | `refactor: 提取统一的状态机入口 on_trigger()` |
| `docs` | 文档 | `docs: 添加配置体系规范文档` |
| `style` | 格式 | `style: 格式化 Rust 代码` |
| `chore` | 杂项 | `chore: 更新依赖版本` |

## 示例

```
feat: 创建 DeskPalConfig 结构体及默认值

feat: 实现 ConfigLoader 读写 config.json

feat: 添加 get_config/set_config IPC 命令

feat: 创建设置面板组件 SettingsPanel

feat: 将配置接入 WindowManager 替换硬编码值

refactor: 提取触发源架构到 trigger.rs

fix: 修复窗口拖拽 - 改用 AppHandle 参数注入

docs: 添加 Git 提交规范和配置体系文档
```

## 提交频率

- 每完成一个文件改动 → commit
- 每完成一个独立功能点 → commit
- 每完成一个 bug 修复 → commit
- 每次会话结束前 → 检查是否有未提交的改动

## 检查方法

```bash
# 查看未提交的改动
git status

# 查看改动的具体内容
git diff

# 提交
git add -A && git commit -m "类型: 描述"

# 确认提交成功
git log --oneline -3
```
