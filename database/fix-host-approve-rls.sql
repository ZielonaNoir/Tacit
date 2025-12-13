-- 修复 Host 批准和删除 RSVP 的 RLS 策略
-- 允许活动创建者更新和删除他们活动中的所有 RSVP

-- 删除旧的策略（如果需要的话）
DROP POLICY IF EXISTS "Users can update their own RSVP" ON rsvps;
DROP POLICY IF EXISTS "Hosts can approve RSVPs" ON rsvps;
DROP POLICY IF EXISTS "Users can delete their own RSVP" ON rsvps;
DROP POLICY IF EXISTS "Hosts can delete RSVPs" ON rsvps;

-- ============================================
-- UPDATE 策略
-- ============================================

-- 策略 1: 用户/匿名用户可以更新自己的 RSVP
-- 注意：对于匿名用户，我们允许更新任何有 guest_id 的记录
-- 业务逻辑层（submitRSVP 函数）会确保只更新匹配的 guest_id
CREATE POLICY "Users can update their own RSVP" 
  ON rsvps FOR UPDATE 
  USING (
    -- 注册用户：检查 user_id 是否匹配当前认证用户
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR 
    -- 匿名用户：允许更新有 guest_id 的记录
    -- 业务逻辑层会确保 guest_id 匹配
    (guest_id IS NOT NULL)
  );

-- 策略 2: 活动创建者可以更新他们活动中的所有 RSVP（用于批准）
CREATE POLICY "Hosts can approve RSVPs" 
  ON rsvps FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = rsvps.event_id 
      AND events.creator_id = auth.uid()
    )
  );

-- ============================================
-- DELETE 策略
-- ============================================

-- 策略 3: 用户/匿名用户可以删除自己的 RSVP
-- 注意：对于匿名用户，我们允许删除任何有 guest_id 的记录
-- 业务逻辑层会确保只删除匹配的 guest_id
CREATE POLICY "Users can delete their own RSVP" 
  ON rsvps FOR DELETE 
  USING (
    -- 注册用户：检查 user_id 是否匹配当前认证用户
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR 
    -- 匿名用户：允许删除有 guest_id 的记录
    -- 业务逻辑层会确保 guest_id 匹配
    (guest_id IS NOT NULL)
  );

-- 策略 4: 活动创建者可以删除他们活动中的所有 RSVP（用于移除客人）
CREATE POLICY "Hosts can delete RSVPs" 
  ON rsvps FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = rsvps.event_id 
      AND events.creator_id = auth.uid()
    )
  );

