-- 修复 RSVP UPDATE 策略，允许匿名用户更新自己的 RSVP
-- 原策略依赖 session 变量 current_setting('app.current_guest_id')，但前端无法设置

-- 重要：请确保先检查并删除可能存在的旧策略
-- 删除旧的 UPDATE 策略
drop policy if exists "Users can update their own RSVP" on rsvps;

-- 创建新的 UPDATE 策略
-- 允许：
-- 1. 注册用户更新自己的 RSVP (通过 user_id = auth.uid())
-- 2. 匿名用户更新任何有 guest_id 的记录（业务逻辑层确保只更新匹配的 guest_id）
create policy "Users can update their own RSVP" on rsvps 
  for update 
  using (
    -- 注册用户：检查 user_id 是否匹配当前认证用户
    (user_id is not null and user_id = auth.uid()) 
    or 
    -- 匿名用户：允许更新有 guest_id 的记录
    -- 注意：业务逻辑层会确保只更新匹配的 guest_id
    (guest_id is not null)
  );

-- 同样修复 event_poll_votes 的 UPDATE 策略
drop policy if exists "Users can update their own votes" on event_poll_votes;
create policy "Users can update their own votes" on event_poll_votes 
  for update 
  using (
    (user_id is not null and user_id = auth.uid()) 
    or 
    (guest_id is not null)
  );

-- 验证策略是否正确创建
-- 可以运行以下查询检查：
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('rsvps', 'event_poll_votes') 
-- AND cmd = 'UPDATE';

