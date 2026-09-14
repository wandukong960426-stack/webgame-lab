import { gameMetadata } from "@/lib/game-catalog";

export const metadata = gameMetadata("chess");

export default function ChessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
