# Guest Identity 唯一性机制说明

## 概述

Tacit 使用 **Hybrid Identity（混合身份）** 系统，支持：
- **注册用户** (`profiles` 表) - 通过 Supabase Auth 登录
- **匿名访客** (`guest_identities` 表) - 无需注册即可参与活动

## Guest Identity 唯一性机制

### 1. 如何生成 Guest ID

```typescript
// src/composables/useGuestIdentity.ts
const guestStore = useLocalStorage<GuestStore>('tacit-guest-v1', {
  id: uuidv4(), // 使用 UUID v4 生成随机唯一标识符
  display_name: '',
  last_active: new Date().toISOString()
})
```

**关键点：**
- 使用 `uuid` 库的 `v4()` 函数生成 **UUID v4**（随机 UUID）
- UUID v4 理论上保证全球唯一性（碰撞概率极低）
- 每次生成都是全新的随机值

### 2. 存储位置和范围

**localStorage 特性：**
- 每个浏览器实例有独立的 localStorage
- 每个域名/端口组合有独立的 localStorage
- 同一个浏览器的多个标签页**共享**同一个 localStorage

**实际场景：**

| 场景 | Guest ID 是否相同 | 说明 |
|------|------------------|------|
| Chrome 和 Firefox | ❌ 不同 | 不同浏览器有不同的 localStorage |
| localhost:5173 和 production | ❌ 不同 | 不同域名有不同的 localStorage |
| 同一浏览器的标签页 1 和 2 | ✅ 相同 | 共享同一个 localStorage |
| 清空浏览器数据后重新访问 | ❌ 不同 | localStorage 被清除，生成新的 UUID |

### 3. 数据库存储

**`guest_identities` 表结构：**
```sql
create table guest_identities (
  id uuid primary key, -- 主键，确保唯一性
  display_name text not null,
  last_active_at timestamptz default now(),
  created_at timestamptz default now()
);
```

**数据库中的记录：**
- 每个不同的 `guest_id` 在数据库中有**独立的记录**
- `id` 字段是主键，确保每个 guest_id 只能有一条记录
- 不是公用一个 guest，而是**每个浏览器实例对应一条独立的记录**

### 4. 唯一性验证流程

当匿名用户首次执行操作（RSVP、评论等）时：

```
1. 用户访问页面
   ↓
2. useGuestIdentity() 初始化
   ↓
3. 检查 localStorage 中是否有 'tacit-guest-v1'
   ├─ 有 → 使用现有的 guest_id
   └─ 无 → 生成新的 UUID v4 并保存到 localStorage
   ↓
4. 用户点击 RSVP/评论
   ↓
5. getIdentityPayloadSafe() 被调用
   ↓
6. ensureGuestExists() 确保数据库中存在该 guest_id 的记录
   ├─ 使用 UPSERT (ON CONFLICT 'id')
   ├─ 如果 guest_id 不存在 → 创建新记录
   └─ 如果 guest_id 已存在 → 更新 last_active_at
   ↓
7. 使用 guest_id 提交 RSVP/评论
```

### 5. 可能导致的冲突场景

**情况 A：同一浏览器多个标签页**
- 两个标签页共享同一个 `guest_id`
- 两个标签页几乎同时提交 RSVP
- 结果：第一个成功插入，第二个会被 `submitRSVP` 正确更新（已修复）

**情况 B：浏览器数据被清空**
- 用户清空了 localStorage
- 访问页面时生成新的 `guest_id`
- 但数据库中还可能有旧的 RSVP 记录（如果 guest_identities 没有被清理）
- 结果：新的 `guest_id` 不会有冲突，因为它是全新的 UUID

**情况 C：不同浏览器访问同一活动**
- 每个浏览器有独立的 `guest_id`
- 数据库中有多条不同的 `guest_identities` 记录
- 结果：每个浏览器可以独立提交 RSVP，不会有冲突

## 验证方法

在浏览器控制台中运行：

```javascript
// 查看当前浏览器的 guest_id
localStorage.getItem('tacit-guest-v1')

// 或者直接查看：
JSON.parse(localStorage.getItem('tacit-guest-v1'))?.id
```

在 Supabase 数据库中查询：

```sql
-- 查看所有 guest_identities 记录
SELECT id, display_name, created_at, last_active_at 
FROM guest_identities 
ORDER BY created_at DESC;

-- 查看特定活动的 RSVP（包含 guest_id）
SELECT id, event_id, guest_id, status, created_at 
FROM rsvps 
WHERE event_id = 'your-event-id';
```

## 总结

✅ **每个新浏览器是唯一的**
- 每个浏览器实例在首次访问时会生成独立的 UUID v4
- UUID v4 保证全局唯一性

✅ **数据库中存储不同的唯一值**
- 每个 `guest_id` 在 `guest_identities` 表中对应一条独立记录
- 主键约束确保唯一性

❌ **不是公用的 guest**
- 不是所有匿名用户共享一个 guest
- 每个浏览器实例都有自己的 guest 记录

🔍 **如何判断唯一性：**
1. 通过 localStorage 中的 UUID
2. 通过数据库 `guest_identities.id` 主键
3. 通过 `rsvps.guest_id` 外键关联到具体的 guest 记录

