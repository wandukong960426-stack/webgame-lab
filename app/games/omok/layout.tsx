import GamePageLayout from "@/components/GamePageLayout";
import { gameMetadata } from "@/lib/game-catalog";

export const metadata = gameMetadata("omok");

export default function OmokLayout({ children }: { children: React.ReactNode }) {
  return <GamePageLayout slug="omok">{children}</GamePageLayout>;
}
