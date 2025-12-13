-- ============================================
-- 验证并清理 RSVPs 表的唯一约束
-- ============================================

-- 1. 查看所有约束（包括旧的唯一约束）
SELECT
  conname as "Constraint Name",
  contype as "Type",
  pg_get_constraintdef(oid) as "Definition"
FROM pg_constraint
WHERE conrelid = 'public.rsvps'::regclass
  AND contype IN ('u', 'p') -- unique or primary key
ORDER BY conname;

-- 2. 查看所有唯一索引（包括部分唯一索引）
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'rsvps'
  AND indexname LIKE '%unique%'
ORDER BY indexname;

-- 3. 如果还有旧的约束，删除它们
-- （注意：如果查询1中没有显示 unique_user_rsvp 或 unique_guest_rsvp 约束，这步可以跳过）

ALTER TABLE rsvps 
  DROP CONSTRAINT IF EXISTS unique_user_rsvp,
  DROP CONSTRAINT IF EXISTS unique_guest_rsvp;

-- 4. 最终验证：确保只有部分唯一索引
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'rsvps'
  AND indexname LIKE '%unique%'
ORDER BY indexname;

-- 预期结果：
-- 应该只看到：
-- - unique_guest_rsvp_idx (部分索引，WHERE guest_id IS NOT NULL)
-- - unique_user_rsvp_idx (部分索引，WHERE user_id IS NOT NULL)
-- 
-- 不应该看到：
-- - unique_user_rsvp (旧的约束)
-- - unique_guest_rsvp (旧的约束)

