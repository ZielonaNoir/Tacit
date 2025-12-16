# 项目文件组织说明

## 目录结构

```
Tacit/
├── docs/                    # 文档目录
│   ├── README.md           # 项目主文档
│   ├── Tacit PRD.md        # 产品需求文档
│   ├── Tacit 项目蓝图.md    # 项目蓝图
│   ├── IMPLEMENTATION_STATUS.md
│   ├── PRD_UNIMPLEMENTED_FEATURES.md
│   ├── PROJECT_STRUCTURE.md
│   ├── REORGANIZATION_SUMMARY.md
│   ├── FILE_ORGANIZATION.md (本文件)
│   ├── setup/              # 设置文档
│   │   └── SETUP.md
│   ├── features/           # 功能文档
│   │   ├── POLLING_FEATURE_PLAN.md
│   │   ├── GUEST_IDENTITY_EXPLANATION.md
│   │   ├── APPROVAL_LOGIC_EXPLANATION.md
│   │   └── ICONIFY_USAGE.md
│   └── database/           # 数据库文档
│       └── DIAGNOSE_RLS_ISSUE.md
│
├── database/                # 数据库目录
│   ├── .gitignore
│   ├── schema/             # 数据库结构
│   │   ├── schema.sql
│   │   └── rls-policies.sql
│   ├── migrations/         # 数据库迁移
│   │   ├── add_approval_required.sql
│   │   ├── add-event-visibility.sql
│   │   ├── add-polling-features.sql
│   │   └── auto-create-profile-trigger.sql
│   ├── fixes/              # 数据库修复
│   │   ├── fix-*.sql
│   │   ├── rls-fix*.sql
│   │   ├── QUICK_*.sql
│   │   └── FIX_*.sql
│   ├── scripts/           # 数据库工具脚本
│   │   ├── check-*.sql
│   │   ├── diagnose-*.sql
│   │   ├── verify-*.sql
│   │   ├── TEST_*.sql
│   │   ├── FINAL_*.sql
│   │   └── VERIFY_*.sql
│   ├── backups/           # 备份目录（已忽略）
│   └── supabase/          # Supabase CLI 配置（已忽略）
│
├── src/                    # 源代码
├── assets/                 # 静态资源
└── [配置文件]
```

## 文件分类规则

### 文档文件 (`.md`)

- **项目主文档** → `docs/`
  - README.md
  - PRD 文档
  - 项目蓝图
  - 实现状态

- **设置文档** → `docs/setup/`
  - 安装指南
  - 配置说明

- **功能文档** → `docs/features/`
  - 功能计划
  - 功能说明
  - 使用指南

- **数据库文档** → `docs/database/`
  - 数据库相关文档
  - 问题诊断

### SQL 文件 (`.sql`)

- **数据库结构** → `database/schema/`
  - `schema.sql` - 主数据库结构
  - `rls-policies.sql` - RLS 策略

- **数据库迁移** → `database/migrations/`
  - `add-*.sql` - 添加功能
  - `auto-*.sql` - 自动触发器

- **数据库修复** → `database/fixes/`
  - `fix-*.sql` - 修复脚本
  - `rls-fix*.sql` - RLS 修复
  - `QUICK_*.sql` - 快速修复
  - `FIX_*.sql` - 修复脚本

- **数据库工具** → `database/scripts/`
  - `check-*.sql` - 检查脚本
  - `diagnose-*.sql` - 诊断脚本
  - `verify-*.sql` - 验证脚本
  - `TEST_*.sql` - 测试脚本
  - `FINAL_*.sql` - 最终验证
  - `VERIFY_*.sql` - 验证脚本

## 使用建议

1. **添加新文档**
   - 根据内容类型放入对应的 `docs/` 子目录
   - 使用描述性的文件名

2. **添加新 SQL 脚本**
   - 根据用途放入对应的 `database/` 子目录
   - 使用清晰的命名规范

3. **查找文件**
   - 文档 → `docs/` 目录
   - 数据库结构 → `database/schema/`
   - 数据库迁移 → `database/migrations/`
   - 数据库修复 → `database/fixes/`
   - 数据库工具 → `database/scripts/`

## 注意事项

- `/database/backups` 和 `/database/supabase` 已被 Git 忽略
- 所有文件移动都通过 Git 跟踪，可以使用 `git status` 查看
- 建议定期整理文件，保持项目结构清晰

