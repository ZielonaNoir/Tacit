-- 修复删除事件时的级联删除权限
-- 确保 Host 可以删除他们活动相关的所有依赖数据

-- ============================================
-- 1. ACTIVITIES 表的 DELETE 策略
-- ============================================

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Hosts can delete activities" ON activities;

-- 创建策略：允许活动创建者删除他们活动的所有 activities
CREATE POLICY "Hosts can delete activities" 
  ON activities FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = activities.event_id 
      AND events.creator_id = auth.uid()
    )
  );

-- ============================================
-- 2. RSVPS 表的 DELETE 策略（已存在，但确保正确）
-- ============================================
-- 策略已通过 fix-host-approve-rls.sql 创建

-- ============================================
-- 3. INVITE_CARDS 表的 DELETE 策略
-- ============================================

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Hosts can delete invite cards" ON invite_cards;

-- 创建策略：允许活动创建者删除他们活动的所有 invite_cards
CREATE POLICY "Hosts can delete invite cards"   
  ON invite_cards FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = invite_cards.event_id 
      AND events.creator_id = auth.uid()
    )
  );

-- ============================================
-- 4. NOTIFICATIONS 表的 DELETE 策略
-- ============================================

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Hosts can delete notifications" ON notifications;

-- 创建策略：允许活动创建者删除他们活动相关的所有 notifications
CREATE POLICY "Hosts can delete notifications" 
  ON notifications FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM invite_cards
      JOIN events ON events.id = invite_cards.event_id
      WHERE invite_cards.id = notifications.invite_card_id
      AND events.creator_id = auth.uid()
    )
  );

-- ============================================
-- 5. USER_AVAILABILITY 表的 DELETE 策略
-- ============================================

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Hosts can delete availability" ON user_availability;

-- 创建策略：允许活动创建者删除他们活动的所有 user_availability
CREATE POLICY "Hosts can delete availability" 
  ON user_availability FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = user_availability.event_id 
      AND events.creator_id = auth.uid()
    )
  );

-- ============================================
-- 6. EVENT_POLL_VOTES 表的 DELETE 策略
-- ============================================
-- （通过删除 polls 时会自动删除，但也可以直接删除）

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Hosts can delete poll votes" ON event_poll_votes;

-- 创建策略：允许活动创建者删除他们活动相关的所有 poll votes
CREATE POLICY "Hosts can delete poll votes" 
  ON event_poll_votes FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM event_time_polls
      JOIN events ON events.id = event_time_polls.event_id
      WHERE event_time_polls.id = event_poll_votes.poll_id
      AND events.creator_id = auth.uid()
    )
  );

-- ============================================
-- 7. EVENT_TIME_POLLS 表的 DELETE 策略（已存在）
-- ============================================
-- 策略已通过 fix-poll-delete-rls.sql 创建

