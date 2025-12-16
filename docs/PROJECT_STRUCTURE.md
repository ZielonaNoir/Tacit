# 项目文件结构

## 目录说明

### `/docs` - 文档目录
- `README.md` - 项目主文档
- `Tacit PRD.md` - 产品需求文档
- `Tacit 项目蓝图.md` - 项目蓝图
- `IMPLEMENTATION_STATUS.md` - 实现状态
- `PRD_UNIMPLEMENTED_FEATURES.md` - 未实现功能

#### `/docs/setup` - 设置文档
- `SETUP.md` - 项目设置指南

#### `/docs/features` - 功能文档
- `POLLING_FEATURE_PLAN.md` - 投票功能计划
- `GUEST_IDENTITY_EXPLANATION.md` - 访客身份说明
- `APPROVAL_LOGIC_EXPLANATION.md` - 审批逻辑说明
- `ICONIFY_USAGE.md` - 图标使用说明

#### `/docs/database` - 数据库文档
- `DIAGNOSE_RLS_ISSUE.md` - RLS 问题诊断

### `/database` - 数据库目录
- `.gitignore` - Git 忽略规则

#### `/database/schema` - 数据库结构
- `schema.sql` - 主数据库结构
- `rls-policies.sql` - RLS 策略

#### `/database/migrations` - 数据库迁移
- `add_approval_required.sql` - 添加审批功能
- `add-event-visibility.sql` - 添加活动可见性
- `add-polling-features.sql` - 添加投票功能
- `auto-create-profile-trigger.sql` - 自动创建用户档案触发器

#### `/database/fixes` - 数据库修复脚本
- `fix-*.sql` - 各种修复脚本
- `rls-fix*.sql` - RLS 修复脚本
- `QUICK_*.sql` - 快速修复脚本

#### `/database/scripts` - 数据库工具脚本
- `check-*.sql` - 检查脚本
- `diagnose-*.sql` - 诊断脚本
- `verify-*.sql` - 验证脚本
- `TEST_*.sql` - 测试脚本

#### `/database/backups` - 备份目录（已忽略）
- 数据库备份文件

#### `/database/supabase` - Supabase CLI 配置（已忽略）
- Supabase CLI 本地配置

### `/src` - 源代码目录
- `App.vue` - 主应用组件
- `main.ts` - 应用入口
- `style.css` - 全局样式
- `vite-env.d.ts` - Vite 类型定义

#### `/src/composables` - Vue Composables
- `useAuth.ts` - 认证逻辑
- `useGuestIdentity.ts` - 访客身份管理

#### `/src/lib` - 工具库
- `supabase.ts` - Supabase 客户端
- `colors.ts` - 颜色配置
- `constants.ts` - 常量定义
- `fonts.ts` - 字体配置

#### `/src/modules` - 功能模块
- `/auth` - 认证模块
- `/events` - 活动模块
- `/feed` - 动态流模块
- `/polling` - 投票模块

#### `/src/router` - 路由配置
- `index.ts` - 路由定义

#### `/src/types` - 类型定义
- `database.ts` - 数据库类型

### `/assets` - 静态资源
- 图片文件

### 配置文件
- `package.json` - 项目依赖
- `pnpm-lock.yaml` - 依赖锁定文件
- `tsconfig.json` - TypeScript 配置
- `tsconfig.node.json` - Node TypeScript 配置
- `vite.config.ts` - Vite 配置
- `tailwind.config.js` - Tailwind CSS 配置
- `postcss.config.js` - PostCSS 配置
- `index.html` - HTML 入口
- `.gitignore` - Git 忽略规则
- `pre-commit-check.ps1` - 预提交检查脚本

## 文件命名规范

### SQL 文件
- `schema-*.sql` - 数据库结构
- `migration-*.sql` - 迁移脚本
- `fix-*.sql` - 修复脚本
- `check-*.sql` - 检查脚本
- `verify-*.sql` - 验证脚本

### 文档文件
- 使用描述性名称
- 功能文档放在 `/docs/features`
- 设置文档放在 `/docs/setup`

## 注意事项

- `/database/backups` 和 `/database/supabase` 已被 Git 忽略
- 所有文档已整理到 `/docs` 目录
- SQL 脚本已按功能分类

