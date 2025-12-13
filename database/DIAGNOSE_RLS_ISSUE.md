# RLS 策略诊断和修复指南

## 问题现象

- RSVP 插入时返回 409 冲突（说明记录已存在）
- 查询特定 guest_id 的 RSVP 时返回空结果
- 但查询所有 RSVPs 可以成功

这说明 RLS SELECT 策略可能有问题。

## 诊断步骤

### 1. 在 Supabase SQL Editor 中运行检查脚本

运行 `database/check-rls-policies.sql` 中的所有查询，重点关注：

**检查 2：查看 rsvps 表的 RLS 策略**
```sql
SELECT 
  policyname,
  cmd as "Command",
  qual as "Using Expression"
FROM pg_policies 
WHERE tablename = 'rsvps'
ORDER BY cmd, policyname;
```

**检查 7：测试查询特定 guest_id 的 RSVP**
```sql
SELECT 
  id,
  event_id,
  guest_id,
  status
FROM rsvps
WHERE event_id = '78d137b4-eb43-4ce1-bfc3-b590967be34c'
  AND guest_id = 'abb27ac9-9d94-49c1-a387-36688cf91ace';
```

### 2. 验证 RLS 策略是否正确

**正确的 SELECT 策略应该是：**
```sql
-- 应该存在一个策略允许所有人查看 RSVPs
-- 策略名称可能是："Anyone can view RSVPs"
-- Using Expression 应该是：true
```

**正确的 UPDATE 策略应该是：**
```sql
-- 应该允许匿名用户更新有 guest_id 的记录
-- Using Expression 应该包含：guest_id is not null
```

### 3. 如果策略不正确，执行修复

**修复 UPDATE 策略（必需）：**
```sql
-- 删除旧的 UPDATE 策略
drop policy if exists "Users can update their own RSVP" on rsvps;

-- 创建新的 UPDATE 策略
create policy "Users can update their own RSVP" on rsvps 
  for update 
  using (
    (user_id is not null and user_id = auth.uid()) 
    or 
    (guest_id is not null)
  );
```

**确保 SELECT 策略存在（应该已存在，但检查一下）：**
```sql
-- 检查是否存在 SELECT 策略
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'rsvps' AND cmd = 'SELECT';

-- 如果不存在，创建它
create policy "Anyone can view RSVPs" on rsvps for select using (true);
```

## 快速修复脚本

如果策略有问题，运行以下完整修复脚本：

```sql
-- ============================================
-- 完整 RLS 策略修复脚本
-- ============================================

-- 1. 确保 RLS 已启用
alter table rsvps enable row level security;

-- 2. 删除所有旧的 RSVP 策略
drop policy if exists "Anyone can view RSVPs" on rsvps;
drop policy if exists "Anyone can create RSVP" on rsvps;
drop policy if exists "Users can update their own RSVP" on rsvps;

-- 3. 重新创建策略

-- SELECT: 允许所有人查看
create policy "Anyone can view RSVPs" on rsvps 
  for select 
  using (true);

-- INSERT: 允许所有人创建
create policy "Anyone can create RSVP" on rsvps 
  for insert 
  with check (true);

-- UPDATE: 允许用户和匿名用户更新
create policy "Users can update their own RSVP" on rsvps 
  for update 
  using (
    (user_id is not null and user_id = auth.uid()) 
    or 
    (guest_id is not null)
  );

-- 4. 验证策略
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'rsvps'
ORDER BY cmd, policyname;
```

## 常见问题

### Q: 查询所有 RSVPs 可以，但查询特定 guest_id 不行？

A: 这可能是查询条件的问题，而不是 RLS 策略问题。RLS 策略会在查询结果上应用过滤，但 `qual` (using expression) 应该对所有记录都是 `true`，所以不应该有这个问题。

### Q: 如何测试匿名用户的权限？

A: 在 Supabase SQL Editor 中，你使用的是 `service_role` 或 `postgres` 角色，这些角色会绕过 RLS。要测试真实的匿名用户权限，需要在应用中测试。

### Q: 为什么插入成功但查询失败？

A: 插入和查询使用不同的 RLS 策略（INSERT vs SELECT）。可能 SELECT 策略有问题，或者查询条件有问题。

