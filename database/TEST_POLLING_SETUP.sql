-- ============================================
-- 测试日期投票功能数据库结构
-- ============================================

-- 1. 验证 events 表是否有 poll_deadline 字段
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name = 'poll_deadline';

-- 2. 验证新表是否存在
SELECT 
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('invite_cards', 'notifications', 'user_availability')
ORDER BY table_name;

-- 3. 验证 invite_cards 表结构
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'invite_cards'
ORDER BY ordinal_position;

-- 4. 验证 notifications 表结构
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- 5. 验证 user_availability 表结构
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_availability'
ORDER BY ordinal_position;

-- 6. 验证索引
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('invite_cards', 'notifications', 'user_availability')
ORDER BY tablename, indexname;

-- 7. 验证函数
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'generate_invite_code';

-- 预期结果：
-- ✅ events.poll_deadline 字段存在
-- ✅ invite_cards 表存在且有正确的字段
-- ✅ notifications 表存在且有正确的字段
-- ✅ user_availability 表存在且有正确的字段
-- ✅ 索引已创建
-- ✅ generate_invite_code 函数存在

