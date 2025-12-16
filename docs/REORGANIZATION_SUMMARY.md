# 项目文件整理总结

## 整理完成时间
2025-12-15

## 整理内容

### 1. 文档目录结构 (`/docs`)

所有文档文件已整理到 `/docs` 目录：

- **根文档** (`/docs`)
  - `README.md` - 项目主文档
  - `Tacit PRD.md` - 产品需求文档
  - `Tacit 项目蓝图.md` - 项目蓝图
  - `IMPLEMENTATION_STATUS.md` - 实现状态
  - `PRD_UNIMPLEMENTED_FEATURES.md` - 未实现功能
  - `PROJECT_STRUCTURE.md` - 项目结构说明（新建）

- **设置文档** (`/docs/setup`)
  - `SETUP.md` - 项目设置指南

- **功能文档** (`/docs/features`)
  - `POLLING_FEATURE_PLAN.md` - 投票功能计划
  - `GUEST_IDENTITY_EXPLANATION.md` - 访客身份说明
  - `APPROVAL_LOGIC_EXPLANATION.md` - 审批逻辑说明
  - `ICONIFY_USAGE.md` - 图标使用说明

- **数据库文档** (`/docs/database`)
  - `DIAGNOSE_RLS_ISSUE.md` - RLS 问题诊断

### 2. 数据库目录结构 (`/database`)

SQL 文件已按功能分类：

- **数据库结构** (`/database/schema`)
  - `schema.sql` - 主数据库结构
  - `rls-policies.sql` - RLS 策略

- **数据库迁移** (`/database/migrations`)
  - `add_approval_required.sql` - 添加审批功能
  - `add-event-visibility.sql` - 添加活动可见性
  - `add-polling-features.sql` - 添加投票功能
  - `auto-create-profile-trigger.sql` - 自动创建用户档案触发器

- **数据库修复** (`/database/fixes`)
  - `fix-*.sql` - 各种修复脚本
  - `rls-fix*.sql` - RLS 修复脚本
  - `QUICK_*.sql` - 快速修复脚本
  - `FIX_*.sql` - 修复脚本

- **数据库工具脚本** (`/database/scripts`)
  - `check-*.sql` - 检查脚本
  - `diagnose-*.sql` - 诊断脚本
  - `verify-*.sql` - 验证脚本
  - `TEST_*.sql` - 测试脚本
  - `FINAL_*.sql` - 最终验证脚本
  - `VERIFY_*.sql` - 验证脚本

- **其他目录**
  - `/database/backups` - 备份目录（已忽略）
  - `/database/supabase` - Supabase CLI 配置（已忽略）
  - `/database/.gitignore` - Git 忽略规则

## 文件分类规则

### SQL 文件命名规范
- `schema-*.sql` 或 `schema.sql` → `/database/schema`
- `add-*.sql`, `auto-*.sql` → `/database/migrations`
- `fix-*.sql`, `rls-fix*.sql`, `QUICK_*.sql`, `FIX_*.sql` → `/database/fixes`
- `check-*.sql`, `diagnose-*.sql`, `verify-*.sql`, `TEST_*.sql`, `FINAL_*.sql`, `VERIFY_*.sql` → `/database/scripts`

### 文档文件分类
- 项目主文档 → `/docs`
- 设置相关 → `/docs/setup`
- 功能说明 → `/docs/features`
- 数据库相关 → `/docs/database`

## 注意事项

1. 所有文件移动都使用 Git 跟踪，可以通过 `git status` 查看
2. 某些文件可能因为已存在而移动失败，需要手动检查
3. 建议提交前检查所有文件路径是否正确

## 下一步

1. 检查 Git 状态：`git status`
2. 查看文件移动情况
3. 如有需要，手动调整文件位置
4. 提交更改：`git add .` 然后 `git commit`

