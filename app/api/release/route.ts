import { NextResponse } from "next/server";
import {
  RELEASE_SOURCE,
  SITE_URL,
} from "@/lib/site-config";

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
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Ddanjitmoa-Source": RELEASE_SOURCE,
        "X-Ddanjitmoa-Commit": commit,
      },
    },
  );
}
