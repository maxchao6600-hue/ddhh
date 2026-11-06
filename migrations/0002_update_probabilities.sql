-- Move 5 percentage points from 全套拼豆工具 to 谢谢惠顾.
-- Existing spin_records are left unchanged.

UPDATE wheel_prizes
SET probability = 5000, updated_at = '2026-11-06T12:00:00.000Z'
WHERE name = '全套拼豆工具' AND probability = 10000;

UPDATE wheel_prizes
SET probability = 40000, updated_at = '2026-11-06T12:00:00.000Z'
WHERE name = '谢谢惠顾' AND probability = 35000;

UPDATE wheel_settings
SET config_version = config_version + 1, updated_at = '2026-11-06T12:00:00.000Z'
WHERE id = 1
  AND EXISTS (
    SELECT 1 FROM wheel_prizes
    WHERE name = '全套拼豆工具' AND probability = 5000 AND updated_at = '2026-11-06T12:00:00.000Z'
  );
