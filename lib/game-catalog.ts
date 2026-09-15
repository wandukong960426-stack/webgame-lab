import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-config";

export type GameSlug =
  | "omok"
  | "othello"
  | "2048"
  | "tic-tac-toe"
  | "chess"
  | "janggi";

export type GameTheme = "wood" | "forest" | "neon" | "berry" | "royal" | "ink";

export type GameInfo = {
  slug: GameSlug;
  title: string;
  kicker: string;
  description: string;
  longDescription: string;
  symbol: string;
  theme: GameTheme;
  playTime: string;
  players: string;
  featured?: boolean;
  keywords: string[];
};

export const gamesCatalog: GameInfo[] = [
  {
    slug: "omok",
    title: "오목",
    kicker: "15×15 전략 대결",
    description: "컴퓨터 또는 같은 기기의 친구와 두는 빠른 오목 한 판.",
    longDescription:
      "15×15 바둑판에서 흑과 백이 번갈아 돌을 놓고 가로·세로·대각선으로 다섯 개를 먼저 잇는 전략 게임입니다.",
    symbol: "● ○",
    theme: "wood",
    playTime: "5–12분",
    players: "1–2인",
    featured: true,
    keywords: ["무료 오목", "온라인 오목", "컴퓨터 오목", "2인용 오목"],
  },
  {
    slug: "othello",
    title: "오셀로",
    kicker: "뒤집기의 묘미",
    description: "모서리를 장악하고 상대 돌을 뒤집는 8×8 보드게임.",
    longDescription:
      "검은 돌과 흰 돌 사이에 상대 돌을 끼워 뒤집는 고전 전략 게임입니다. 마지막에 더 많은 돌을 차지하면 승리합니다.",
    symbol: "◉ ◌",
    theme: "forest",
    playTime: "8–15분",
    players: "1–2인",
    featured: true,
    keywords: ["무료 오셀로", "리버시 게임", "오셀로 AI", "2인용 오셀로"],
  },
  {
    slug: "2048",
    title: "2048",
    kicker: "숫자 합치기 퍼즐",
    description: "스와이프 한 번으로 숫자를 합치고 최고 기록에 도전하세요.",
    longDescription:
      "같은 숫자 타일을 밀어 합치며 2048 타일을 만드는 퍼즐입니다. 키보드와 모바일 스와이프를 모두 지원합니다.",
    symbol: "2ⁿ",
    theme: "neon",
    playTime: "3–20분",
    players: "1인",
    featured: true,
    keywords: ["무료 2048", "2048 게임", "모바일 2048", "숫자 퍼즐"],
  },
  {
    slug: "tic-tac-toe",
    title: "틱택토+",
    kicker: "5×5 확장판",
    description: "짧게 끝나는 3×3을 넘어, 기본 5×5·4목으로 더 길게 즐기세요.",
    longDescription:
      "3×3 클래식과 5×5 확장 규칙을 선택할 수 있는 틱택토입니다. 컴퓨터 대전과 같은 기기 2인용을 지원합니다.",
    symbol: "✕ ○",
    theme: "berry",
    playTime: "2–8분",
    players: "1–2인",
    keywords: ["무료 틱택토", "5x5 틱택토", "틱택토 AI", "2인용 게임"],
  },
  {
    slug: "chess",
    title: "체스",
    kicker: "정통 8×8 체스",
    description: "캐슬링·앙파상·프로모션까지 적용한 체스 대국.",
    longDescription:
      "기본 기물 이동과 체크·체크메이트, 캐슬링, 앙파상, 폰 프로모션을 지원하는 웹 체스입니다.",
    symbol: "♞ ♛",
    theme: "royal",
    playTime: "10–30분",
    players: "1–2인",
    featured: true,
    keywords: ["무료 체스", "웹 체스", "체스 AI", "2인용 체스"],
  },
  {
    slug: "janggi",
    title: "장기",
    kicker: "궁성 위의 한 수",
    description: "차·포·마·상·졸의 길을 살린 한국 장기 대국.",
    longDescription:
      "한국 전통 장기의 핵심 기물 이동과 궁성 대각선, 장군·멍군 판정을 반영한 웹 장기입니다.",
    symbol: "楚 漢",
    theme: "ink",
    playTime: "12–35분",
    players: "1–2인",
    keywords: ["무료 장기", "온라인 장기", "장기 AI", "한국 장기"],
  },
];

export function getGame(slug: GameSlug): GameInfo {
  const game = gamesCatalog.find((item) => item.slug === slug);
  if (!game) throw new Error(`Unknown game: ${slug}`);
  return game;
}

export function gameMetadata(slug: GameSlug): Metadata {
  const game = getGame(slug);
  const title = `${game.title} 무료 게임`;
  const fullTitle = `${title} | 딴짓모아`;
  const description = `${game.description} 설치와 회원가입 없이 PC·모바일에서 바로 플레이할 수 있습니다.`;
  const url = `${SITE_URL}/games/${game.slug}`;

  return {
    title,
    description,
    keywords: game.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: "딴짓모아",
      title: fullTitle,
      description,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  };
}
