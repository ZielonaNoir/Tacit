-- 修复 event_time_polls 和 event_poll_votes 表的 DELETE 权限
-- 允许事件创建者删除自己活动的 polls 和相关的 votes

-- ============================================
-- 1. EVENT_POLL_VOTES 表的 DELETE 策略
-- ============================================

-- 删除旧策略（如果存在）
drop policy if exists "Event creators can delete votes" on event_poll_votes;

-- 创建 DELETE 策略：只有事件创建者可以删除与他们的活动相关的 votes
create policy "Event creators can delete votes" 
  on event_poll_votes for delete 
  using (
    exists (
      select 1 from event_time_polls
      join events on events.id = event_time_polls.event_id
      where event_time_polls.id = event_poll_votes.poll_id
      and events.creator_id = auth.uid()
    )
  );

-- ============================================
-- 2. EVENT_TIME_POLLS 表的 DELETE 策略
-- ============================================

-- 删除旧策略（如果存在）
drop policy if exists "Event creators can delete polls" on event_time_polls;

-- 创建 DELETE 策略：只有事件创建者可以删除 polls
create policy "Event creators can delete polls" 
  on event_time_polls for delete 
  using (
    exists (
      select 1 from events 
      where events.id = event_time_polls.event_id 
      and events.creator_id = auth.uid()
    )
  );

