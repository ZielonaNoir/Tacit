# Tacit 项目设置指南

## 快速开始

### 1. 安装依赖（已完成）
```bash
pnpm install
```

### 2. 配置 Supabase

项目已配置好 Supabase 连接：
- URL: `https://fenlowgtcertbpyhletm.supabase.co`
- Anon Key: 已在代码中配置

如需使用环境变量，创建 `.env.local` 文件：
```env
VITE_SUPABASE_URL=https://fenlowgtcertbpyhletm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. 初始化数据库

**重要**：在 Supabase SQL Editor 中执行以下步骤：

1. 打开 Supabase Dashboard
2. 进入 SQL Editor
3. 复制 `database/schema.sql` 文件中的全部内容
4. 在 SQL Editor 中粘贴并执行

这将创建所有必要的表、索引和 RLS 策略。

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:5173` 查看应用。

## 项目功能

### 已实现功能

✅ 项目初始化和配置
✅ Supabase 客户端集成
✅ 混合身份系统（用户 + 匿名访客）
✅ 活动列表页面
✅ 活动详情页面
✅ 创建活动页面
✅ 日期投票功能（UI + 逻辑）
✅ RSVP 系统基础结构
✅ 访客身份管理（LocalStorage）
✅ 主题配置系统（动态样式）

### 待完善功能

- [ ] 完善 RSVP 表单 UI
- [ ] 实时更新（Supabase Realtime 订阅）
- [ ] 活动流（Activity Feed）
- [ ] 主题编辑器
- [ ] 用户认证界面
- [ ] 访客名称设置流程
- [ ] 时间投票添加功能（活动创建者）
- [ ] 图片上传功能

## 数据库 Schema

所有表结构已定义在 `database/schema.sql` 中，包括：

- `profiles` - 注册用户
- `guest_identities` - 匿名访客
- `events` - 活动核心表
- `event_time_polls` - 日期投票选项
- `event_poll_votes` - 投票记录
- `rsvps` - RSVP 记录
- `activities` - 活动流
- `organizations` - 组织
- `org_members` - 组织成员

## 开发提示

### 添加新的时间投票选项

目前需要在 Supabase 数据库中手动添加 `event_time_polls` 记录，后续可以添加 UI 界面。

### 测试匿名访客功能

1. 清除浏览器 LocalStorage
2. 访问活动页面
3. 系统会自动生成访客 UUID
4. 可以进行投票和 RSVP，无需登录

### 主题定制

活动详情页面会根据 `theme_config` JSONB 字段动态应用样式：
- `font` - 字体
- `bg_color` - 背景颜色
- `primary_color` - 主色调

## 故障排除

### 数据库连接错误

检查 Supabase URL 和 Anon Key 是否正确配置。

### RLS 策略错误

确保已执行 `database/schema.sql` 中的所有 RLS 策略。

### 投票功能不工作

1. 检查访客身份是否正确设置
2. 查看浏览器控制台错误
3. 验证数据库中的 `event_poll_votes` 表权限

