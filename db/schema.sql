CREATE TABLE IF NOT EXISTS games (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(120) NOT NULL,
  short_description VARCHAR(240) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  engine_key VARCHAR(80) NOT NULL DEFAULT 'coming-soon',
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  seo_title VARCHAR(160) NOT NULL DEFAULT '',
  seo_description VARCHAR(300) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS games_status_sort_idx ON games(status, sort_order, id);
