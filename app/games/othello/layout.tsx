import GamePageLayout from "@/components/GamePageLayout";
import { gameMetadata } from "@/lib/game-catalog";

export const metadata = gameMetadata("othello");

export default function OthelloLayout({ children }: { children: React.ReactNode }) {
  return <GamePageLayout slug="othello">{children}</GamePageLayout>;
}
