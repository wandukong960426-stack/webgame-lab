import { NextResponse } from "next/server";
import {
  RELEASE_SOURCE,
  SITE_URL,
} from "@/lib/site-config";
import {
  ADSENSE_CONSENT_READY,
  ADSENSE_GAME_FOOTER_SLOT,
  ADSENSE_PUBLISHER_ID,
  ADSENSE_SCRIPT_ENABLED,
  ADSENSE_SITE_APPROVED,
} from "@/lib/adsense";

export const dynamic = "force-dynamic";

export function GET() {
  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    "unknown";

  return NextResponse.json(
    {
      service: "딴짓모아",
      source: RELEASE_SOURCE,
      commit,
      canonical: SITE_URL,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      monetization: {
        provider: "Google AdSense",
        publisherId: ADSENSE_PUBLISHER_ID,
        adsTxt: `${SITE_URL}/ads.txt`,
        siteApproved: ADSENSE_SITE_APPROVED,
        consentReady: ADSENSE_CONSENT_READY,
        slotConfigured: Boolean(ADSENSE_GAME_FOOTER_SLOT),
        scriptEnabled: ADSENSE_SCRIPT_ENABLED,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Ddanjitmoa-Source": RELEASE_SOURCE,
        "X-Ddanjitmoa-Commit": commit,
        "X-Ddanjitmoa-Adsense": ADSENSE_SCRIPT_ENABLED ? "enabled" : "disabled",
      },
    },
  );
}
