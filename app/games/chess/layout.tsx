import GamePageLayout from "@/components/GamePageLayout";
import { gameMetadata } from "@/lib/game-catalog";

export const metadata = gameMetadata("chess");

export default function ChessLayout({ children }: { children: React.ReactNode }) {
  return <GamePageLayout slug="chess">{children}</GamePageLayout>;
}
