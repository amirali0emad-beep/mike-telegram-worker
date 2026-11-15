CREATE TABLE IF NOT EXISTS command_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  command TEXT NOT NULL,
  args TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_command_logs_created_at ON command_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_command_logs_user ON command_logs(telegram_user_id);
