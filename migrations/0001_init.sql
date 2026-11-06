-- Probability is an integer count of thousandths of one percent.
-- 100000 = 100%. 0.3% is stored as 300. 38.2% is stored as 38200.

CREATE TABLE admins (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  totp_secret TEXT,
  totp_enabled INTEGER NOT NULL DEFAULT 0 CHECK (totp_enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_admins_username_lower ON admins (lower(username));

CREATE TABLE wheel_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  wheel_name TEXT NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
  config_version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE wheel_prizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  probability INTEGER NOT NULL CHECK (probability >= 0 AND probability <= 100000),
  color TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  counts_as_win INTEGER NOT NULL DEFAULT 1 CHECK (counts_as_win IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_prizes_order ON wheel_prizes (display_order, id);

CREATE TABLE spin_records (
  id TEXT PRIMARY KEY,
  draw_id TEXT NOT NULL UNIQUE,
  prize_id INTEGER NOT NULL,
  prize_name_snapshot TEXT NOT NULL,
  probability_snapshot INTEGER NOT NULL,
  counts_as_win_snapshot INTEGER NOT NULL CHECK (counts_as_win_snapshot IN (0, 1)),
  config_version INTEGER NOT NULL,
  landing_ratio_bps INTEGER NOT NULL CHECK (landing_ratio_bps >= 0 AND landing_ratio_bps <= 10000),
  wheel_snapshot TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_spin_created ON spin_records (created_at);
CREATE INDEX idx_spin_prize ON spin_records (prize_id);
CREATE INDEX idx_spin_config ON spin_records (config_version);

CREATE TABLE probability_audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  prize_id INTEGER,
  old_probability INTEGER NOT NULL,
  new_probability INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES admins (id)
);

CREATE INDEX idx_audit_created ON probability_audit_logs (created_at);
CREATE INDEX idx_audit_prize ON probability_audit_logs (prize_id);
CREATE INDEX idx_audit_admin ON probability_audit_logs (admin_id);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES admins (id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_admin ON sessions (admin_id);

CREATE TABLE login_challenges (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES admins (id) ON DELETE CASCADE
);

CREATE TABLE rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);

INSERT INTO wheel_settings (id, wheel_name, is_enabled, config_version, updated_at)
VALUES (1, '拼豆幸运转盘', 1, 1, '2026-01-01T00:00:00.000Z');

INSERT INTO wheel_prizes (
  id, name, probability, color, display_order, is_active, counts_as_win, created_at, updated_at
) VALUES
  (1, '折扣 50%', 1000, '#D4A017', 1, 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  (2, '盲盒', 300, '#6D28D9', 2, 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  (3, '现金 RM50', 500, '#047857', 3, 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  (4, '全套拼豆工具', 5000, '#E11D48', 4, 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  (5, '折扣 5%', 38200, '#0369A1', 5, 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  (6, '折扣 10%', 15000, '#C026D3', 6, 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  (7, '谢谢惠顾', 40000, '#334155', 7, 1, 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
