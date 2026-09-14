import type { MetadataRoute } from "next";
import { gamesCatalog, SITE_URL } from "@/lib/game-catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/games`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...gamesCatalog.map((game) => ({
      url: `${SITE_URL}/games/${game.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: game.featured ? 0.9 : 0.8,
    })),
  ];
}
