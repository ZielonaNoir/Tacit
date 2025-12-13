-- 添加活动访问控制功能（公开/私有）
-- ============================================

-- 1. 添加 is_public 字段到 events 表
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

-- 添加注释说明
COMMENT ON COLUMN events.is_public IS 'Whether the event is publicly accessible (true) or private (false). Private events require invitation or being the creator.';

-- 2. 更新现有活动为公开（向后兼容）
UPDATE events 
SET is_public = true 
WHERE is_public IS NULL;

-- 3. 确保字段不能为 NULL
ALTER TABLE events 
ALTER COLUMN is_public SET NOT NULL;

-- 4. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS events_is_public_idx ON events(is_public);

-- ============================================
-- 5. 更新 RLS 策略以支持私有活动
-- ============================================

-- 删除旧的策略
DROP POLICY IF EXISTS "Anyone can view events" ON events;

-- 创建新策略：允许查看公开活动，或私有活动的创建者
-- 注意：对于私有活动的被邀请者，通过 RPC 函数访问
CREATE POLICY "Users can view public events or their own private events" 
  ON events FOR SELECT 
  USING (
    -- 公开活动：任何人都可以查看
    is_public = true
    OR
    -- 私有活动：只有创建者可以查看（通过 RLS）
    -- 被邀请者的访问通过 get_event_by_invite_code RPC 函数
    creator_id = auth.uid()
  );

-- ============================================
-- 6. 创建 RPC 函数：通过邀请码获取私有活动
-- ============================================

-- 创建函数：通过邀请码获取活动（允许访问私有活动）
CREATE OR REPLACE FUNCTION get_event_by_invite_code(invite_code_param text)
RETURNS TABLE (
  id uuid,
  creator_id uuid,
  org_id uuid,
  status text,
  title text,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  timezone text,
  poll_deadline timestamptz,
  location_name text,
  location_address text,
  location_url text,
  cover_image_url text,
  theme_config jsonb,
  modules_config jsonb,
  max_capacity integer,
  show_guest_list boolean,
  approval_required boolean,
  is_public boolean,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.creator_id,
    e.org_id,
    e.status,
    e.title,
    e.description,
    e.start_time,
    e.end_time,
    e.timezone,
    e.poll_deadline,
    e.location_name,
    e.location_address,
    e.location_url,
    e.cover_image_url,
    e.theme_config,
    e.modules_config,
    e.max_capacity,
    e.show_guest_list,
    e.approval_required,
    e.is_public,
    e.created_at
  FROM events e
  INNER JOIN invite_cards ic ON ic.event_id = e.id
  WHERE ic.invite_code = invite_code_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授予执行权限给所有用户
GRANT EXECUTE ON FUNCTION get_event_by_invite_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_by_invite_code(text) TO anon;

-- ============================================
-- 验证
-- ============================================

-- 查看策略
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
WHERE tablename = 'events'
ORDER BY policyname;
