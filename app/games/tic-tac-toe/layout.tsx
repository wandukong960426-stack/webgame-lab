import GamePageLayout from "@/components/GamePageLayout";
import { gameMetadata } from "@/lib/game-catalog";

export const metadata = gameMetadata("tic-tac-toe");

export default function TicTacToeLayout({ children }: { children: React.ReactNode }) {
  return <GamePageLayout slug="tic-tac-toe">{children}</GamePageLayout>;
}
