-- 完整的 RLS 策略修复
-- 请在 Supabase SQL Editor 中运行此文件

-- ============================================
-- 1. PROFILES 表策略
-- ============================================

-- 删除旧策略
drop policy if exists "Users can view all profiles" on profiles;
drop policy if exists "Public profiles are viewable by everyone" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;
drop policy if exists "Users can create their own profile on signup" on profiles;
drop policy if exists "Users can update their own profile" on profiles;

-- 允许所有人查看 profiles（用于显示活动创建者信息）
create policy "Anyone can view profiles" 
  on profiles for select 
  using (true);

-- 允许用户创建自己的 profile（注册时）
create policy "Users can insert their own profile" 
  on profiles for insert 
  with check (auth.uid() = id);

-- 允许用户更新自己的 profile
create policy "Users can update their own profile" 
  on profiles for update 
  using (auth.uid() = id);

-- ============================================
-- 2. EVENTS 表策略
-- ============================================

-- 删除旧策略
drop policy if exists "Public events are viewable by everyone" on events;
drop policy if exists "Anyone can view events" on events;
drop policy if exists "Authenticated users can create events" on events;
drop policy if exists "Creators can update their events" on events;

-- 允许所有人查看 events
create policy "Anyone can view events" 
  on events for select 
  using (true);

-- 允许认证用户创建 events（必须是创建者本人）
create policy "Authenticated users can create events" 
  on events for insert 
  with check (auth.uid() = creator_id);

-- 允许创建者更新自己的 events
create policy "Creators can update their events" 
  on events for update 
  using (auth.uid() = creator_id);

-- 允许创建者删除自己的 events
create policy "Creators can delete their events" 
  on events for delete 
  using (auth.uid() = creator_id);

-- ============================================
-- 3. 确保 RLS 已启用
-- ============================================

alter table profiles enable row level security;
alter table events enable row level security;
alter table rsvps enable row level security;
alter table guest_identities enable row level security;
alter table event_poll_votes enable row level security;
alter table activities enable row level security;
alter table event_time_polls enable row level security;
alter table organizations enable row level security;
alter table org_members enable row level security;

-- ============================================
-- 4. 其他表的策略（如果需要）
-- ============================================

-- EVENT_TIME_POLLS
drop policy if exists "Anyone can view polls" on event_time_polls;
drop policy if exists "Anyone can create polls" on event_time_polls;

create policy "Anyone can view polls" 
  on event_time_polls for select 
  using (true);

-- 只有事件创建者可以创建投票选项（通过事件关联检查）
create policy "Event creators can create polls" 
  on event_time_polls for insert 
  with check (
    exists (
      select 1 from events 
      where events.id = event_time_polls.event_id 
      and events.creator_id = auth.uid()
    )
  );

