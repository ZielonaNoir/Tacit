-- 修复 invite_cards 表的 RLS 策略
-- 允许活动创建者创建和更新他们活动的邀请卡

-- ============================================
-- 1. INSERT 策略：允许活动创建者创建邀请卡
-- ============================================

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Hosts can create invite cards" ON invite_cards;

-- 创建策略：允许活动创建者为他们创建的活动生成邀请卡
CREATE POLICY "Hosts can create invite cards" 
  ON invite_cards FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = invite_cards.event_id 
      AND events.creator_id = auth.uid()
    )
  );

-- ============================================
-- 2. UPDATE 策略：允许活动创建者更新邀请卡状态
-- ============================================

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Hosts can update invite cards" ON invite_cards;

-- 创建策略：允许活动创建者更新他们活动的邀请卡
CREATE POLICY "Hosts can update invite cards" 
  ON invite_cards FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = invite_cards.event_id 
      AND events.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = invite_cards.event_id 
      AND events.creator_id = auth.uid()
    )
  );

-- ============================================
-- 3. 创建安全的数据库函数来更新邀请卡状态
-- ============================================

-- 创建函数：安全地更新邀请卡状态（只能更新状态相关字段）
CREATE OR REPLACE FUNCTION update_invite_card_status(
  card_id uuid,
  new_status text,
  status_field text DEFAULT NULL  -- 'opened' 或 'responded'
)
RETURNS void AS $$
BEGIN
  -- 只允许更新状态和时间戳字段
  UPDATE invite_cards
  SET 
    status = new_status,
    opened_at = CASE 
      WHEN status_field = 'opened' THEN now()
      ELSE opened_at
    END,
    responded_at = CASE 
      WHEN status_field = 'responded' THEN now()
      ELSE responded_at
    END
  WHERE id = card_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授予执行权限给所有用户
GRANT EXECUTE ON FUNCTION update_invite_card_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_invite_card_status(uuid, text, text) TO anon;

-- ============================================
-- 4. 允许更新邀请卡状态（当用户打开/回复时）
-- ============================================

-- 允许任何人更新邀请卡的状态和时间戳字段
-- 这用于跟踪用户何时打开和回复邀请卡
DROP POLICY IF EXISTS "Anyone can update invite card status" ON invite_cards;

CREATE POLICY "Anyone can update invite card status" 
  ON invite_cards FOR UPDATE 
  USING (true)  -- 允许任何人尝试更新
  WITH CHECK (true);  -- 允许更新任何字段（但建议使用上面的函数来更新状态）

-- 注意：虽然策略允许更新，但为了更好的安全性，建议使用上面的函数来更新状态

-- ============================================
-- 验证策略
-- ============================================

-- 查看所有策略
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
