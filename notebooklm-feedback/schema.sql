-- NotebookLM Feedback Database Schema
-- Run with: npx wrangler d1 execute notebooklm-feedback-db --file=./schema.sql

-- Main feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,           -- reddit, twitter, producthunt, appstore, forums
  content TEXT NOT NULL,          -- The actual feedback text
  author TEXT,                    -- Username or handle
  url TEXT,                       -- Link to original source
  sentiment TEXT,                 -- positive, negative, neutral (filled by AI)
  themes TEXT,                    -- JSON array of themes (filled by AI)
  urgency TEXT DEFAULT 'medium',  -- low, medium, high (filled by AI)
  created_at TEXT DEFAULT (datetime('now')),
  analyzed_at TEXT                -- When AI analysis was performed
);

-- Themes aggregation table
CREATE TABLE IF NOT EXISTS themes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,      -- Theme name (e.g., "audio-quality", "source-limits")
  count INTEGER DEFAULT 1,        -- How many times this theme appeared
  last_seen TEXT DEFAULT (datetime('now'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_feedback_source ON feedback(source);
CREATE INDEX IF NOT EXISTS idx_feedback_sentiment ON feedback(sentiment);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_themes_count ON themes(count DESC);
