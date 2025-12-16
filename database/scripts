-- 检查 RLS 策略和数据库结构
-- 在 Supabase SQL Editor 中运行此脚本以诊断问题

-- 1. 检查 RLS 是否启用
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('rsvps', 'guest_identities', 'events', 'activities')
ORDER BY tablename;

-- 2. 查看 rsvps 表的所有 RLS 策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as "Command",
  qual as "Using Expression",
  with_check as "With Check Expression"
FROM pg_policies 
WHERE tablename = 'rsvps'
ORDER BY cmd, policyname;

-- 3. 查看 guest_identities 表的所有 RLS 策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as "Command",
  qual as "Using Expression",
  with_check as "With Check Expression"
FROM pg_policies 
WHERE tablename = 'guest_identities'
ORDER BY cmd, policyname;

-- 4. 检查 rsvps 表的唯一约束
SELECT
  conname as "Constraint Name",
  contype as "Type",
  pg_get_constraintdef(oid) as "Definition"
FROM pg_constraint
WHERE conrelid = 'public.rsvps'::regclass
  AND contype IN ('u', 'p') -- unique or primary key
ORDER BY conname;

-- 5. 检查 rsvps 表结构
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'rsvps'
ORDER BY ordinal_position;

-- 6. 查看实际的 RSVP 记录（匿名用户可以看到的记录）
-- 注意：这个查询会受到 RLS 策略影响
SELECT 
  id,
  event_id,
  user_id,
  guest_id,
  status,
  guests_count,
  created_at
FROM rsvps
WHERE event_id = '78d137b4-eb43-4ce1-bfc3-b590967be34c'
ORDER BY created_at DESC;

-- 7. 测试查询：查找特定 guest_id 的 RSVP（模拟前端查询）
SELECT 
  id,
  event_id,
  guest_id,
  status
FROM rsvps
WHERE event_id = '78d137b4-eb43-4ce1-bfc3-b590967be34c'
  AND guest_id = 'abb27ac9-9d94-49c1-a387-36688cf91ace';

-- 8. 查看所有 guest_identities 记录
SELECT 
  id,
  display_name,
  created_at,
  last_active_at
FROM guest_identities
ORDER BY created_at DESC
LIMIT 10;

