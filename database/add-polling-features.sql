-- ============================================
-- 扩展日期投票功能
-- ============================================

-- 1. 添加调研截止时间字段
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS poll_deadline timestamptz;

-- 2. 创建 invite_cards 表（存储生成的邀请卡）
CREATE TABLE IF NOT EXISTS invite_cards (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  
  -- 受邀者身份（可选，如果匿名则可能为 null）
  user_id uuid REFERENCES profiles(id),
  guest_id uuid REFERENCES guest_identities(id),
  
  -- 邀请卡信息
  invite_code text UNIQUE NOT NULL, -- 唯一邀请码
  invite_link text NOT NULL, -- 完整邀请链接
  
  -- 状态
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'responded')),
  
  -- 元数据
  generated_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  opened_at timestamptz,
  responded_at timestamptz,
  
  -- 约束：必须有 user_id 或 guest_id（或两者都没有，表示匿名邀请）
  created_at timestamptz DEFAULT now()
);

-- 为 invite_code 创建唯一索引以提高查询性能
CREATE UNIQUE INDEX IF NOT EXISTS invite_cards_invite_code_idx ON invite_cards(invite_code);

-- 为 event_id 创建索引
CREATE INDEX IF NOT EXISTS invite_cards_event_id_idx ON invite_cards(event_id);

-- 3. 创建通知表（用于通知有账户的用户）
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  invite_card_id uuid REFERENCES invite_cards(id) ON DELETE SET NULL,
  
  -- 通知类型
  type text NOT NULL CHECK (type IN ('poll_deadline_reminder', 'invite_card_ready', 'poll_result', 'event_reminder')),
  
  -- 通知内容
  title text NOT NULL,
  message text,
  link text, -- 跳转链接
  
  -- 状态
  read boolean DEFAULT false,
  read_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

-- 为 user_id 和 read 创建索引
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications(user_id, read) WHERE read = false;

-- 4. 创建空闲时间窗口计算辅助表（可选，用于存储参与者提交的可用时间）
CREATE TABLE IF NOT EXISTS user_availability (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  
  -- 身份
  user_id uuid REFERENCES profiles(id),
  guest_id uuid REFERENCES guest_identities(id),
  
  -- 可用时间窗口（JSONB 数组：[{start, end}, ...]）
  -- 示例：[{"start": "2024-01-01T09:00:00Z", "end": "2024-01-01T17:00:00Z"}]
  available_slots jsonb DEFAULT '[]'::jsonb,
  
  -- 约束：必须有 user_id 或 guest_id
  constraint check_availability_identity check (user_id is not null or guest_id is not null),
  
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 为 event_id 创建索引
CREATE INDEX IF NOT EXISTS user_availability_event_id_idx ON user_availability(event_id);

-- 5. 启用 RLS
ALTER TABLE invite_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;

-- 6. 基本 RLS 策略
-- invite_cards: 任何人可以查看，只有系统可以创建/更新
CREATE POLICY "Anyone can view invite cards" ON invite_cards FOR SELECT USING (true);
-- 注意：INSERT/UPDATE 需要特定权限，可能需要 service_role 或通过 Edge Function

-- notifications: 用户只能查看自己的通知
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT 
  USING (user_id = auth.uid());
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE 
  USING (user_id = auth.uid());

-- user_availability: 用户可以管理自己的可用时间
CREATE POLICY "Anyone can view availability" ON user_availability FOR SELECT USING (true);
CREATE POLICY "Users can manage their own availability" ON user_availability 
  FOR ALL USING (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR 
    (guest_id IS NOT NULL)
  );

-- 7. 创建函数：生成唯一邀请码
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 去除易混淆字符
  result text := '';
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建触发器：当 poll_deadline 到达时自动生成 invite cards
-- 注意：这需要使用 pg_cron 或 Supabase Edge Function，这里先创建辅助函数
CREATE OR REPLACE FUNCTION check_poll_deadline()
RETURNS void AS $$
DECLARE
  event_record RECORD;
BEGIN
  -- 查找所有已过截止时间但仍处于 polling 状态的活动
  FOR event_record IN 
    SELECT id, title, creator_id 
    FROM events 
    WHERE status = 'polling' 
      AND poll_deadline IS NOT NULL 
      AND poll_deadline <= now()
      AND id NOT IN (
        -- 排除已经生成过邀请卡的活动
        SELECT DISTINCT event_id FROM invite_cards
      )
  LOOP
    -- 这里应该调用生成邀请卡的逻辑
    -- 实际实现应该在 Supabase Edge Function 中
    RAISE NOTICE 'Poll deadline reached for event: %', event_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

