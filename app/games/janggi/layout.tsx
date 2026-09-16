import GamePageLayout from "@/components/GamePageLayout";
import { gameMetadata } from "@/lib/game-catalog";

export const metadata = gameMetadata("janggi");

export default function JanggiLayout({ children }: { children: React.ReactNode }) {
  return <GamePageLayout slug="janggi">{children}</GamePageLayout>;
}
