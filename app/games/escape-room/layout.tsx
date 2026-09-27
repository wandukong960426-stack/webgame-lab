import GamePageLayout from "@/components/GamePageLayout";
import { gameMetadata } from "@/lib/game-catalog";

export const metadata = gameMetadata("escape-room");

export default function EscapeRoomLayout({ children }: { children: React.ReactNode }) {
  return <GamePageLayout slug="escape-room">{children}</GamePageLayout>;
}
