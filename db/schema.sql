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

INSERT INTO games (
  slug, title, short_description, description, engine_key,
  status, featured, sort_order, seo_title, seo_description
) VALUES
  ('omok', '오목', '컴퓨터 또는 같은 기기의 친구와 두는 빠른 오목 한 판.', '15×15 자유 오목. AI 대전과 같은 기기 2인용을 지원합니다.', 'omok', 'published', TRUE, 10, '오목 무료 게임', '설치 없이 바로 즐기는 무료 오목 게임'),
  ('othello', '오셀로', '모서리를 장악하고 상대 돌을 뒤집는 8×8 보드게임.', '패스와 최종 돌 수 계산을 지원하는 오셀로입니다.', 'othello', 'published', TRUE, 20, '오셀로 무료 게임', '설치 없이 바로 즐기는 무료 오셀로 게임'),
  ('2048', '2048', '스와이프 한 번으로 숫자를 합치고 최고 기록에 도전하세요.', '키보드, WASD, 모바일 스와이프를 지원하는 2048 퍼즐입니다.', '2048', 'published', TRUE, 30, '2048 무료 게임', 'PC와 모바일에서 바로 즐기는 무료 2048'),
  ('tic-tac-toe', '틱택토+', '3×3 클래식과 5×5·4목 확장판을 선택하세요.', 'AI 대전과 같은 기기 2인용을 지원하는 확장형 틱택토입니다.', 'tic-tac-toe', 'published', FALSE, 40, '틱택토 무료 게임', '3×3과 5×5를 지원하는 무료 틱택토'),
  ('chess', '체스', '캐슬링·앙파상·프로모션까지 적용한 체스 대국.', '체크, 체크메이트, 스테일메이트와 특수 규칙을 지원합니다.', 'chess', 'published', TRUE, 50, '체스 무료 게임', '정식 규칙으로 즐기는 무료 웹 체스'),
  ('janggi', '장기', '차·포·마·상·졸의 길을 살린 한국 장기 대국.', '궁성 대각선, 장군, 외통, 한 수 쉼을 지원하는 웹 장기입니다.', 'janggi', 'published', FALSE, 60, '장기 무료 게임', 'PC와 모바일에서 즐기는 무료 한국 장기')
ON CONFLICT (slug) DO NOTHING;
