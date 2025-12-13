-- 修复 invite_cards 表中缺失的 user_id 和 guest_id
-- 通过 RSVPs 表来关联并更新 invite_cards
-- ============================================

-- ============================================
-- 1. 查看需要修复的数据
-- ============================================

-- 查看所有没有 user_id 和 guest_id 的 invite_cards
SELECT 
  ic.id,
  ic.event_id,
  ic.invite_code,
  ic.status,
  ic.opened_at,
  COUNT(r.id) as rsvp_count
FROM invite_cards ic
LEFT JOIN rsvps r ON r.event_id = ic.event_id
WHERE ic.user_id IS NULL AND ic.guest_id IS NULL
GROUP BY ic.id, ic.event_id, ic.invite_code, ic.status, ic.opened_at
ORDER BY ic.opened_at DESC;

-- ============================================
-- 2. 通过 RSVPs 更新 invite_cards 的 user_id
-- ============================================

-- 对于每个 invite_card，查找同一 event 的 RSVP，如果有 user_id，则更新 invite_card
-- 注意：这假设同一个 event 的 invite_card 和 RSVP 属于同一个用户
-- 如果有多个 RSVP，会选择最新的一个

UPDATE invite_cards ic
SET user_id = subq.user_id
FROM (
  SELECT DISTINCT ON (ic2.id)
    ic2.id as invite_card_id,
    r.user_id
  FROM invite_cards ic2
  INNER JOIN rsvps r ON r.event_id = ic2.event_id
  WHERE ic2.user_id IS NULL 
    AND ic2.guest_id IS NULL
    AND r.user_id IS NOT NULL
  ORDER BY ic2.id, r.created_at DESC
) subq
WHERE ic.id = subq.invite_card_id
  AND ic.user_id IS NULL;

-- ============================================
-- 3. 通过 RSVPs 更新 invite_cards 的 guest_id
-- ============================================

-- 对于每个 invite_card，查找同一 event 的 RSVP，如果有 guest_id，则更新 invite_card
UPDATE invite_cards ic
SET guest_id = subq.guest_id
FROM (
  SELECT DISTINCT ON (ic2.id)
    ic2.id as invite_card_id,
    r.guest_id
  FROM invite_cards ic2
  INNER JOIN rsvps r ON r.event_id = ic2.event_id
  WHERE ic2.user_id IS NULL 
    AND ic2.guest_id IS NULL
    AND r.guest_id IS NOT NULL
  ORDER BY ic2.id, r.created_at DESC
) subq
WHERE ic.id = subq.invite_card_id
  AND ic.guest_id IS NULL;

-- ============================================
-- 4. 验证修复结果
-- ============================================

-- 查看修复后的数据
SELECT 
  COUNT(*) as total_cards,
  COUNT(user_id) as cards_with_user_id,
  COUNT(guest_id) as cards_with_guest_id,
  COUNT(CASE WHEN user_id IS NULL AND guest_id IS NULL THEN 1 END) as cards_with_no_identity
FROM invite_cards;

-- 查看修复后的 invite_cards（前 10 条）
SELECT 
  id,
  event_id,
  user_id,
  guest_id,
  invite_code,
  status,
  opened_at
FROM invite_cards
ORDER BY opened_at DESC
LIMIT 10;

-- ============================================
-- 5. 如果还有未修复的记录，可能需要手动处理
-- ============================================

-- 查找仍然没有 user_id 和 guest_id 的 invite_cards
SELECT 
  ic.id,
  ic.event_id,
  ic.invite_code,
  ic.status,
  ic.opened_at,
  e.title as event_title,
  e.creator_id
FROM invite_cards ic
LEFT JOIN events e ON e.id = ic.event_id
WHERE ic.user_id IS NULL AND ic.guest_id IS NULL
ORDER BY ic.opened_at DESC;
