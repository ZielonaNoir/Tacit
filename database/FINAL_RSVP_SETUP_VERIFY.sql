-- ============================================
-- 最终验证：RSVP 功能完整配置
-- ============================================

-- 1. 验证唯一索引（应该只有部分唯一索引）
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'rsvps'
  AND indexname LIKE '%unique%'
ORDER BY indexname;

-- 预期结果：
-- - unique_guest_rsvp_idx (部分索引，WHERE guest_id IS NOT NULL)
-- - unique_user_rsvp_idx (部分索引，WHERE user_id IS NOT NULL)

-- 2. 验证唯一约束（应该只有主键）
SELECT
  conname as "Constraint Name",
  contype as "Type",
  pg_get_constraintdef(oid) as "Definition"
FROM pg_constraint
WHERE conrelid = 'public.rsvps'::regclass
  AND contype IN ('u', 'p')
ORDER BY conname;

-- 预期结果：
-- - rsvps_pkey (主键)

-- 3. 验证 RLS 策略
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'rsvps'
ORDER BY policyname;

-- 预期结果：
-- - "Anyone can view RSVPs" (SELECT, using: true)
-- - "Anyone can create RSVP" (INSERT, with_check: true)
-- - "Users can update their own RSVP" (UPDATE, using: user_id = auth.uid() OR guest_id IS NOT NULL)

-- 4. 测试：检查当前数据
SELECT 
  id,
  event_id,
  user_id,
  guest_id,
  status,
  created_at
FROM rsvps
ORDER BY created_at DESC
LIMIT 10;

-- 配置检查清单：
-- ✅ 唯一索引：使用部分索引（只有非 null 值才检查唯一性）
-- ✅ 唯一约束：只有主键，没有旧的唯一约束
-- ✅ RLS 策略：允许匿名用户 INSERT 和 UPDATE
-- ✅ 数据库配置：完成

