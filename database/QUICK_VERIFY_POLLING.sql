-- ============================================
-- 快速验证日期投票功能数据库结构
-- ============================================

-- 一次性检查所有关键项
SELECT 
  'poll_deadline字段' as "检查项",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'events' AND column_name = 'poll_deadline'
    ) THEN '✅ 存在'
    ELSE '❌ 缺失'
  END as "状态"
UNION ALL
SELECT 
  'invite_cards表' as "检查项",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'invite_cards'
    ) THEN '✅ 存在'
    ELSE '❌ 缺失'
  END as "状态"
UNION ALL
SELECT 
  'notifications表' as "检查项",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'notifications'
    ) THEN '✅ 存在'
    ELSE '❌ 缺失'
  END as "状态"
UNION ALL
SELECT 
  'user_availability表' as "检查项",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_availability'
    ) THEN '✅ 存在'
    ELSE '❌ 缺失'
  END as "状态"
UNION ALL
SELECT 
  'generate_invite_code函数' as "检查项",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' AND routine_name = 'generate_invite_code'
    ) THEN '✅ 存在'
    ELSE '❌ 缺失'
  END as "状态"
UNION ALL
SELECT 
  'invite_cards索引' as "检查项",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'invite_cards' AND indexname LIKE '%invite_code%'
    ) THEN '✅ 存在'
    ELSE '❌ 缺失'
  END as "状态"
UNION ALL
SELECT 
  'notifications索引' as "检查项",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'notifications' AND (indexname LIKE '%user_id%' OR indexname LIKE '%unread%')
    ) THEN '✅ 存在'
    ELSE '❌ 缺失'
  END as "状态"
ORDER BY "检查项";

-- 如果所有项都显示 ✅，说明数据库结构已正确创建！
-- 如果有任何 ❌，请运行 database/add-polling-features.sql 来创建缺失的部分

