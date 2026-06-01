# 收缩态图标整理计划

## 现状

当前 dormant bar 只有 6 个图标，但实际有 10 个工具（不含设置）。缺失：
- UUID（未注册到任何位置）
- 随机字符（图标映射缺失）
- URL 编解码（已注册但无图标）
- 正则测试（图标映射缺失）
- JWT 解析（已注册但无图标）

## 操作清单

### 1. 注册 UUID 到 3 个注册点

| 文件 | 操作 |
|------|------|
| `src/tools/index.ts` | 加 `uuid: lazy(() => import("./uuid"))` |
| `src/lib/registry.ts` | 加 `{ id: "uuid", name: "UUID", icon: "fingerprint", keywords: [...], order: 5 }`，后续工具 order +1 |
| `src/components/ToolGrid.tsx` | 导入 `Fingerprint` 图标 + iconMap 映射 |

### 2. 补全 ToolGrid.tsx 缺失的图标映射

| 图标 key | lucide-react 图标 | 对应工具 |
|----------|------------------|---------|
| `shuffle` | `Shuffle` | 随机字符 |
| `code` | `Code` | 正则测试 |

### 3. 更新 App.tsx dormant 栏

添加全部 10 个工具的图标：

| 图标 | title | 对应工具 |
|------|-------|---------|
| ⏰ | 时间戳 | timestamp |
| {} | JSON | json |
| 📝 | 文本 | text |
| Aa | 变量命名 | naming |
| ⇄ | 文本比对 | diff |
| 🎲 | UUID | uuid |
| 🔀 | 随机字符 | random |
| 🔗 | URL | url |
| .* | 正则 | regex |
| 🛡 | JWT | jwt |
| ⚙️ | 设置 | settings |

### 4. 编译验证

```bash
npx tsc -p tsconfig.json --noEmit
pnpm build
```

### 5. 调试

```bash
pnpm tauri dev
```
