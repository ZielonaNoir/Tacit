-- 诊断 HomeView 无法显示 events 的问题
-- 在 Supabase SQL Editor 中运行此脚本

-- ============================================
-- 1. 检查 invite_cards 表中的数据
-- ============================================

-- 查看所有 invite_cards（前 20 条）
SELECT 
  id,
  event_id,
  user_id,
  guest_id,
  invite_code,
  status,
  opened_at,
  responded_at,
  created_at
FROM invite_cards
ORDER BY created_at DESC
LIMIT 20;

-- 统计 invite_cards 中 user_id 和 guest_id 的分布
SELECT 
  COUNT(*) as total_cards,
  COUNT(user_id) as cards_with_user_id,
  COUNT(guest_id) as cards_with_guest_id,
  COUNT(CASE WHEN user_id IS NULL AND guest_id IS NULL THEN 1 END) as cards_with_no_identity,
  COUNT(CASE WHEN status = 'opened' THEN 1 END) as opened_count,
  COUNT(CASE WHEN status = 'responded' THEN 1 END) as responded_count,
  COUNT(CASE WHEN status IN ('opened', 'responded') THEN 1 END) as opened_or_responded_count
FROM invite_cards;

-- ============================================
-- 2. 检查特定用户的 invite_cards
-- ============================================

-- 替换 YOUR_USER_ID 为实际的用户 ID
-- SELECT 
--   id,
--   event_id,
--   user_id,
--   status,
--   opened_at
-- FROM invite_cards
-- WHERE user_id = 'YOUR_USER_ID';

-- ============================================
-- 3. 检查特定 guest 的 invite_cards
-- ============================================

-- 替换 YOUR_GUEST_ID 为实际的 guest ID
-- SELECT 
--   id,
--   event_id,
--   guest_id,
--   status,
--   opened_at
-- FROM invite_cards
-- WHERE guest_id = 'YOUR_GUEST_ID';

-- ============================================
-- 4. 检查 RSVPs 表
-- ============================================

-- 统计 RSVPs 中 user_id 和 guest_id 的分布
SELECT 
  COUNT(*) as total_rsvps,
  COUNT(user_id) as rsvps_with_user_id,
  COUNT(guest_id) as rsvps_with_guest_id,
  COUNT(CASE WHEN user_id IS NULL AND guest_id IS NULL THEN 1 END) as rsvps_with_no_identity
FROM rsvps;

-- ============================================
-- 5. 检查 events 表
-- ============================================

-- 查看最近创建的活动
SELECT 
  id,
  title,
  creator_id,
  status,
  created_at
FROM events
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 6. 检查 RLS 策略
-- ============================================

-- 查看 invite_cards 的 RLS 策略
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
WHERE tablename = 'invite_cards'
ORDER BY policyname;

-- 查看 rsvps 的 RLS 策略
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

-- ============================================
-- 7. 测试查询：模拟 HomeView 的查询逻辑
-- ============================================

-- 测试：查找所有有 user_id 的 invite_cards（登录用户）
SELECT 
  ic.event_id,
  ic.status,
  ic.user_id,
  e.title as event_title,
  e.creator_id
FROM invite_cards ic
LEFT JOIN events e ON e.id = ic.event_id
WHERE ic.user_id IS NOT NULL
ORDER BY ic.created_at DESC
LIMIT 10;

-- 测试：查找所有有 guest_id 的 invite_cards（Guest 用户）
SELECT 
  ic.event_id,
  ic.status,
  ic.guest_id,
  e.title as event_title
FROM invite_cards ic
LEFT JOIN events e ON e.id = ic.event_id
WHERE ic.guest_id IS NOT NULL
ORDER BY ic.created_at DESC
LIMIT 10;

-- ============================================
-- 8. 修复建议：更新没有 user_id/guest_id 的 invite_cards
-- ============================================

-- 注意：这个查询只是显示需要更新的记录，不会实际更新
-- 如果需要更新，需要根据实际情况编写 UPDATE 语句

-- 查找没有 user_id 或 guest_id 但已经 opened 的 invite_cards
SELECT 
  id,
  event_id,
  invite_code,
  status,
  opened_at
FROM invite_cards
WHERE (user_id IS NULL AND guest_id IS NULL)
  AND status IN ('opened', 'responded')
ORDER BY opened_at DESC;
