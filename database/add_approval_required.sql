-- 添加 approval_required 字段到 events 表
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS approval_required boolean DEFAULT false;

-- 验证字段是否存在
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'events' AND column_name = 'approval_required';

