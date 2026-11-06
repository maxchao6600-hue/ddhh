-- Set the current prize probabilities without touching spin history.
-- 100000 = 100%.

UPDATE wheel_settings
SET config_version = config_version + 1, updated_at = '2026-11-06T12:40:00.000Z'
WHERE id = 1
  AND EXISTS (
    SELECT 1 FROM wheel_prizes
    WHERE (name = '全套拼豆工具' AND probability != 3000)
       OR (name = '折扣 5%' AND probability != 10000)
       OR (name = '折扣 10%' AND probability != 5000)
       OR (name = '谢谢惠顾' AND probability != 80200)
  );

UPDATE wheel_prizes
SET probability = 3000, updated_at = '2026-11-06T12:40:00.000Z'
WHERE name = '全套拼豆工具' AND probability != 3000;

UPDATE wheel_prizes
SET probability = 10000, updated_at = '2026-11-06T12:40:00.000Z'
WHERE name = '折扣 5%' AND probability != 10000;

UPDATE wheel_prizes
SET probability = 5000, updated_at = '2026-11-06T12:40:00.000Z'
WHERE name = '折扣 10%' AND probability != 5000;

UPDATE wheel_prizes
SET probability = 80200, updated_at = '2026-11-06T12:40:00.000Z'
WHERE name = '谢谢惠顾' AND probability != 80200;
