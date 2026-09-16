import GamePageLayout from "@/components/GamePageLayout";
import { gameMetadata } from "@/lib/game-catalog";

export const metadata = gameMetadata("2048");

export default function Game2048Layout({ children }: { children: React.ReactNode }) {
  return <GamePageLayout slug="2048">{children}</GamePageLayout>;
}
