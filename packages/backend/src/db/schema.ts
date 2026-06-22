export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS data_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  connection_config TEXT,
  file_path TEXT,
  last_synced_at INTEGER,
  row_count INTEGER DEFAULT 0,
  column_count INTEGER DEFAULT 0,
  sheet_names TEXT DEFAULT '[]',
  active_sheet TEXT,
  status TEXT DEFAULT 'connected',
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS source_columns (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  data_type TEXT NOT NULL,
  stats TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS dashboards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  theme TEXT DEFAULT 'midnight-pro',
  layout TEXT DEFAULT '[]',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS widgets (
  id TEXT PRIMARY KEY,
  dashboard_id TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL,
  source_id TEXT REFERENCES data_sources(id) ON DELETE SET NULL,
  config TEXT NOT NULL DEFAULT '{}',
  position TEXT NOT NULL DEFAULT '{"x":0,"y":0,"w":4,"h":3}',
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS user_preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
