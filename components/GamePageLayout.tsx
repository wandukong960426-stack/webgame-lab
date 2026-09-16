import type { ReactNode } from "react";
import AdSlot from "@/components/AdSlot";
import { ADSENSE_GAME_FOOTER_SLOT } from "@/lib/adsense";

type GamePageLayoutProps = {
  slug: string;
  children: ReactNode;
};

export default function GamePageLayout({ slug, children }: GamePageLayoutProps) {
  return (
    <>
      {children}
      <div className="game-page-ad-container">
        <AdSlot
          slot={ADSENSE_GAME_FOOTER_SLOT}
          placement={`game-footer:${slug}`}
          className="ad-slot--game-footer"
        />
      </div>
    </>
  );
}
