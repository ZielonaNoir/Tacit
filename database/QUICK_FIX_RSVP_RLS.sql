-- ============================================
-- 快速修复 RSVP RLS 策略脚本
-- 在 Supabase SQL Editor 中运行此脚本
-- ============================================

-- 1. 检查当前策略
SELECT 
  policyname,
  cmd as "Command",
  qual as "Using Expression",
  with_check as "With Check Expression"
FROM pg_policies 
WHERE tablename = 'rsvps'
ORDER BY cmd, policyname;

-- 2. 删除所有旧的 RSVP 策略（如果存在）
DROP POLICY IF EXISTS "Anyone can view RSVPs" ON rsvps;
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON rsvps;
DROP POLICY IF EXISTS "Anyone can create RSVP" ON rsvps;
DROP POLICY IF EXISTS "Users can update their own RSVP" ON rsvps;

-- 3. 确保 RLS 已启用
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- 4. 创建新的策略

-- SELECT 策略：允许所有人查看所有 RSVPs
CREATE POLICY "Anyone can view RSVPs" 
ON rsvps 
FOR SELECT 
USING (true);

-- INSERT 策略：允许所有人创建 RSVP
CREATE POLICY "Anyone can create RSVP" 
ON rsvps 
FOR INSERT 
WITH CHECK (true);

-- UPDATE 策略：允许用户和匿名用户更新自己的 RSVP
CREATE POLICY "Users can update their own RSVP" 
ON rsvps 
FOR UPDATE 
USING (
  -- 注册用户：检查 user_id 是否匹配
  (user_id IS NOT NULL AND user_id = auth.uid()) 
  OR 
  -- 匿名用户：允许更新有 guest_id 的记录（业务逻辑层会确保只更新自己的）
  (guest_id IS NOT NULL)
);

-- 5. 验证策略已创建
SELECT 
  policyname,
  cmd as "Command",
  qual as "Using Expression"
FROM pg_policies 
WHERE tablename = 'rsvps'
ORDER BY cmd, policyname;

-- 6. 测试查询（应该能看到所有记录）
SELECT 
  id,
  event_id,
  user_id,
  guest_id,
  status,
  guests_count
FROM rsvps
WHERE event_id = '78d137b4-eb43-4ce1-bfc3-b590967be34c'
ORDER BY created_at DESC;

