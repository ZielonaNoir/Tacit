-- 补充和修复 RLS 策略

-- Profiles 策略
drop policy if exists "Users can view all profiles" on profiles;
create policy "Users can view all profiles" on profiles for select using (true);

drop policy if exists "Users can insert their own profile" on profiles;
create policy "Users can insert their own profile" on profiles 
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile" on profiles 
  for update using (auth.uid() = id);

-- Events 策略 - 允许认证用户创建
drop policy if exists "Authenticated users can create events" on events;
create policy "Authenticated users can create events" on events 
  for insert with check (auth.uid() = creator_id);

drop policy if exists "Anyone can view events" on events;
drop policy if exists "Public events are viewable by everyone" on events;
create policy "Anyone can view events" on events for select using (true);

drop policy if exists "Creators can update their events" on events;
create policy "Creators can update their events" on events 
  for update using (auth.uid() = creator_id);

-- Profiles - 允许注册时创建
drop policy if exists "Users can create their own profile on signup" on profiles;
create policy "Users can create their own profile on signup" on profiles 
  for insert with check (auth.uid() = id);

-- 确保 RLS 已启用
alter table profiles enable row level security;
alter table events enable row level security;
alter table rsvps enable row level security;
alter table guest_identities enable row level security;
alter table event_poll_votes enable row level security;
alter table activities enable row level security;

