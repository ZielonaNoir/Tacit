# Tacit - 默契与你

一个现代化的社交活动管理平台，灵感来自 Partiful。

## 特性

- 🎉 **无认证参与** - 访客无需注册即可投票和 RSVP
- 📅 **日期投票** - "Find a time" 功能，找到最佳时间
- 🎨 **高度可定制** - 复古/霓虹风格主题
- ⚡ **实时更新** - 实时访客列表和活动流

## 技术栈

- Vue 3 (Composition API)
- TypeScript
- Vite
- Tailwind CSS (Neo-Brutalism 风格)
- Supabase (PostgreSQL + Auth + Realtime)
- Pinia (状态管理)
- Vue Router

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 初始化数据库

在 Supabase SQL Editor 中运行 `database/schema.sql` 文件中的所有 SQL 语句。

### 4. 启动开发服务器

```bash
npm run dev
```

## 项目结构

```
src/
├── assets/              # 静态资源
├── components/          # 共享 UI 组件
├── lib/                 # 工具库 (Supabase 客户端等)
├── composables/         # Vue Composables
│   ├── useAuth.ts       # 认证逻辑
│   └── useGuestIdentity.ts # 访客身份管理
├── modules/             # 功能模块
│   └── events/          # 活动模块
│       ├── components/  # 活动相关组件
│       ├── views/       # 活动页面
│       ├── services.ts  # 数据服务
│       └── types.ts     # 类型定义
├── router/              # 路由配置
├── types/               # 全局类型定义
├── App.vue
└── main.ts
```

## 核心功能

### 混合身份系统

项目支持两种身份类型：
- **注册用户** (`profiles` 表)
- **匿名访客** (`guest_identities` 表，使用本地 UUID)

访客身份通过 `useGuestIdentity` composable 管理，数据存储在 localStorage 中。

### 活动状态流转

```
draft → polling → scheduled → past/cancelled
```

### 日期投票

活动创建者可以添加多个时间选项，参与者可以投票选择：
- ✓ 可以 (yes)
- ? 可能 (if_need_be)
- ✗ 不行 (no)

## 开发

```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# 预览构建结果
pnpm preview
```

## 许可证

MIT

