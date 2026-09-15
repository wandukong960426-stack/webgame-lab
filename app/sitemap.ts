import type { MetadataRoute } from "next";
import { gamesCatalog } from "@/lib/game-catalog";
import { SITE_URL } from "@/lib/site-config";

const staticPages = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/games", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.4, changeFrequency: "monthly" as const },
  { path: "/terms", priority: 0.4, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    ...staticPages.map((page) => ({
      url: `${SITE_URL}${page.path}`,
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...gamesCatalog.map((game) => ({
      url: `${SITE_URL}/games/${game.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: game.featured ? 0.9 : 0.8,
    })),
  ];
}
