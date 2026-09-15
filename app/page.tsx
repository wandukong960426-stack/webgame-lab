import Link from "next/link";
import ContinuePlaying from "@/components/ContinuePlaying";
import { gamesCatalog } from "@/lib/game-catalog";
import { games as getEditableGames } from "@/lib/db";

export const revalidate = 60;

export default async function Home() {
  const editableGames = await getEditableGames();
  const overrides = new Map(editableGames.map((game) => [game.slug, game]));
  const catalog = gamesCatalog.map((game) => {
    const override = overrides.get(game.slug);
    return override
      ? {
          ...game,
          title: override.title || game.title,
          description: override.short_description || game.description,
          featured: override.featured,
        }
      : game;
  });
  const featured = catalog.filter((game) => game.featured);

  return (
    <>
      <section className="home-hero">
        <div className="home-hero__copy">
          <p className="eyebrow">설치 없이, 바로 한 판</p>
          <h1>
            해야 할 일은 잠깐.
            <br />
            <em>딴짓은 지금.</em>
          </h1>
          <p className="home-hero__lead">
            오목·장기·체스부터 2048까지. 회원가입 없이 PC와 모바일에서 바로
            시작하는 무료 웹게임 모음입니다.
          </p>
          <div className="hero-actions">
            <Link className="button button--primary" href="/games/2048">
              2048 바로 시작
            </Link>
            <Link className="button button--ghost" href="/games">
              모든 게임 보기
            </Link>
          </div>
          <div className="hero-facts" aria-label="서비스 특징">
            <span>로그인 불필요</span>
            <span>모바일 전체화면</span>
            <span>1인·2인 플레이</span>
          </div>
        </div>
        <div className="hero-arcade" aria-hidden="true">
          <div className="hero-arcade__screen">
            <span className="arcade-pill">TODAY&apos;S BREAK</span>
            <strong>딴짓력 충전 중</strong>
            <div className="pixel-grid">
              {Array.from({ length: 16 }, (_, index) => (
                <i key={index} />
              ))}
            </div>
          </div>
          <div className="hero-arcade__controls">
            <span className="joystick" />
            <span className="arcade-button" />
            <span className="arcade-button arcade-button--small" />
          </div>
        </div>
      </section>

      <ContinuePlaying />

      <section className="content-section" aria-labelledby="featured-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">바로 플레이</p>
            <h2 id="featured-title">오늘의 추천 게임</h2>
          </div>
          <Link className="text-link" href="/games">
            전체 {catalog.length}개 보기 →
          </Link>
        </div>
        <div className="game-card-grid">
          {featured.map((game) => (
            <Link
              className={`game-card game-card--${game.theme}`}
              href={`/games/${game.slug}`}
              key={game.slug}
            >
              <div className="game-card__visual">
                <span>{game.symbol}</span>
                <small>{game.playTime}</small>
              </div>
              <div className="game-card__body">
                <div className="game-card__meta">
                  <span>{game.kicker}</span>
                  <span>{game.players}</span>
                </div>
                <h3>{game.title}</h3>
                <p>{game.description}</p>
                <b>지금 플레이 <span aria-hidden="true">→</span></b>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-benefits" aria-labelledby="benefits-title">
        <div>
          <p className="eyebrow">딴짓모아 사용법</p>
          <h2 id="benefits-title">누르고, 크게 보고, 바로 둡니다.</h2>
        </div>
        <ol>
          <li>
            <span>01</span>
            <div>
              <h3>게임 선택</h3>
              <p>설치나 회원가입 과정 없이 카드 한 번으로 게임을 엽니다.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>전체화면 전환</h3>
              <p>작은 모바일 화면에서도 보드와 말이 최대 크기로 표시됩니다.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>기록 갱신</h3>
              <p>AI 대전, 같은 기기 2인용, 최고 점수에 계속 도전합니다.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="seo-copy">
        <h2>쉬는 시간에 바로 즐기는 무료 브라우저 게임</h2>
        <p>
          딴짓모아는 별도 프로그램을 내려받지 않고 웹브라우저에서 바로 실행되는
          보드게임·퍼즐게임 모음입니다. 오목, 오셀로, 체스, 장기처럼 한 수를
          고민하는 게임과 2048, 틱택토처럼 짧게 집중할 수 있는 게임을 PC와
          스마트폰에서 모두 제공합니다.
        </p>
      </section>
    </>
  );
}
