-- ============================================
-- 修复 RSVPs 表的唯一约束问题
-- ============================================
-- 
-- 问题：unique_user_rsvp 和 unique_guest_rsvp 使用了 "unique nulls not distinct"
-- 这会导致所有 null 值被认为是相等的，可能会产生意外的冲突
--
-- 解决方案：删除旧的约束，创建更精确的约束

-- 1. 查看当前约束
SELECT
  conname as "Constraint Name",
  contype as "Type",
  pg_get_constraintdef(oid) as "Definition"
FROM pg_constraint
WHERE conrelid = 'public.rsvps'::regclass
  AND contype IN ('u', 'p') -- unique or primary key
ORDER BY conname;

-- 2. 删除旧的唯一约束
ALTER TABLE rsvps 
  DROP CONSTRAINT IF EXISTS unique_user_rsvp,
  DROP CONSTRAINT IF EXISTS unique_guest_rsvp;

-- 3. 创建新的唯一约束
-- 这些约束使用部分唯一索引，只有当对应的 id 不为 null 时才应用约束

-- 为 user_id 创建部分唯一索引（只有当 user_id IS NOT NULL 时才应用）
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_rsvp_idx 
ON rsvps (event_id, user_id) 
WHERE user_id IS NOT NULL;

-- 为 guest_id 创建部分唯一索引（只有当 guest_id IS NOT NULL 时才应用）
CREATE UNIQUE INDEX IF NOT EXISTS unique_guest_rsvp_idx 
ON rsvps (event_id, guest_id) 
WHERE guest_id IS NOT NULL;

-- 4. 验证约束
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'rsvps'
  AND indexname LIKE '%unique%'
ORDER BY indexname;

-- 注意：使用部分唯一索引的好处：
-- - 只有当 user_id/guest_id 不为 null 时才检查唯一性
-- - 多个 null 值不会冲突
-- - 更符合我们的业务逻辑

