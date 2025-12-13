-- 修复 events 表的 RLS 策略，允许有 invite card 的用户查看私有活动
-- ============================================

-- 删除旧的策略
DROP POLICY IF EXISTS "Users can view public events or their own private events" ON events;
DROP POLICY IF EXISTS "Anyone can view events" ON events;
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON events;

-- 创建新策略：允许查看公开活动、自己创建的活动、或有 invite card 的私有活动
CREATE POLICY "Users can view accessible events" ON events FOR SELECT 
USING (
  -- 公开活动
  is_public = true 
  OR 
  -- 自己创建的活动
  creator_id = auth.uid()
  OR
  -- 有 invite card 的私有活动（登录用户）
  (
    is_public = false 
    AND EXISTS (
      SELECT 1 FROM invite_cards ic
      WHERE ic.event_id = events.id
      AND ic.user_id = auth.uid()
    )
  )
  OR
  -- 有 invite card 的私有活动（Guest 用户）
  -- 注意：对于匿名用户，我们需要通过 guest_id 来检查
  -- 但由于 RLS 在数据库层面无法访问 localStorage，这部分需要在应用层处理
  -- 或者我们可以允许所有有 invite card 的用户查看（通过 guest_id 检查需要应用层支持）
  (
    is_public = false 
    AND EXISTS (
      SELECT 1 FROM invite_cards ic
      WHERE ic.event_id = events.id
      AND ic.guest_id IS NOT NULL
      -- 注意：这里无法直接检查当前 guest_id，需要在应用层使用 RPC 函数
    )
  )
);

-- 为了简化，我们可以创建一个更宽松的策略，允许所有有 invite card 的用户查看
-- 但这可能不够安全，所以让我们使用一个 RPC 函数来处理

-- 或者，我们可以允许所有有 invite card 的用户查看（通过检查 invite_cards 表）
-- 但这样可能会有安全问题

-- 更好的方案：创建一个 RPC 函数来获取用户可访问的 events
CREATE OR REPLACE FUNCTION get_accessible_events(
  user_id_param uuid DEFAULT NULL,
  guest_id_param uuid DEFAULT NULL
)
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
  WHERE 
    -- 公开活动
    e.is_public = true
    OR
    -- 自己创建的活动
    (user_id_param IS NOT NULL AND e.creator_id = user_id_param)
    OR
    -- 有 invite card 的私有活动（登录用户）
    (
      user_id_param IS NOT NULL 
      AND e.is_public = false
      AND EXISTS (
        SELECT 1 FROM invite_cards ic
        WHERE ic.event_id = e.id
        AND ic.user_id = user_id_param
      )
    )
    OR
    -- 有 invite card 的私有活动（Guest 用户）
    (
      guest_id_param IS NOT NULL 
      AND e.is_public = false
      AND EXISTS (
        SELECT 1 FROM invite_cards ic
        WHERE ic.event_id = e.id
        AND ic.guest_id = guest_id_param
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION get_accessible_events(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_accessible_events(uuid, uuid) TO anon;

-- 同时，为了兼容性，我们也更新 RLS 策略，允许有 invite card 的用户查看
-- 但这样可能会有性能问题，因为每次查询都要检查 invite_cards 表

-- 更简单的方案：允许所有有 invite card 的用户查看私有活动
DROP POLICY IF EXISTS "Users can view accessible events" ON events;

-- 创建策略：允许查看公开活动、自己创建的活动、或有 invite card 的私有活动
CREATE POLICY "Users can view accessible events" ON events FOR SELECT 
USING (
  -- 公开活动
  is_public = true 
  OR 
  -- 自己创建的活动
  creator_id = auth.uid()
  OR
  -- 有 invite card 的私有活动（通过 user_id）
  (
    is_public = false 
    AND EXISTS (
      SELECT 1 FROM invite_cards ic
      WHERE ic.event_id = events.id
      AND ic.user_id = auth.uid()
    )
  )
);

-- 注意：对于 Guest 用户，由于 RLS 无法访问 localStorage 中的 guest_id，
-- 我们需要在应用层使用 RPC 函数 get_accessible_events 来查询
-- 或者，我们可以允许所有有 invite card 的用户查看（包括 guest_id）
-- 但这样可能会有安全问题，因为任何人都可以查看有 guest_id 的 invite cards 对应的私有活动

-- 为了支持 Guest 用户，我们也可以创建一个更宽松的策略
-- 但更好的方案是在应用层使用 RPC 函数
