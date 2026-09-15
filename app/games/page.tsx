import type { Metadata } from "next";
import Link from "next/link";
import { gamesCatalog } from "@/lib/game-catalog";
import { SITE_URL } from "@/lib/site-config";
import { games as getEditableGames } from "@/lib/db";

export const metadata: Metadata = {
  title: "무료 웹게임 전체 목록",
  description:
    "오목, 오셀로, 2048, 틱택토, 체스, 장기를 설치와 회원가입 없이 바로 즐기세요.",
  alternates: { canonical: `${SITE_URL}/games` },
};

export const revalidate = 60;

export default async function GamesPage() {
  const editableGames = await getEditableGames();
  const overrides = new Map(editableGames.map((game) => [game.slug, game]));
  const catalog = gamesCatalog.map((game) => {
    const override = overrides.get(game.slug);
    return override ? { ...game, title: override.title || game.title, description: override.short_description || game.description } : game;
  });

  return (
    <section className="catalog-page">
      <div className="catalog-hero">
        <p className="eyebrow">GAME LIBRARY</p>
        <h1>오늘은 어떤 딴짓?</h1>
        <p>짧은 퍼즐부터 긴 전략 대국까지, 원하는 플레이 시간을 골라보세요.</p>
      </div>
      <div className="game-card-grid game-card-grid--catalog">
        {catalog.map((game) => (
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
              <h2>{game.title}</h2>
              <p>{game.description}</p>
              <b>게임 열기 <span aria-hidden="true">→</span></b>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
