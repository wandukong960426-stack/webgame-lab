export const OFFICIAL_SITE_URL = "https://ttanjitmoa.com";
export const CONTACT_EMAIL = "wandukong960426@gmail.com";
export const OPERATOR_NAME = "완두콩";
export const RELEASE_SOURCE = "github:wandukong960426-stack/webgame-lab";

function resolveSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return OFFICIAL_SITE_URL;

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must be an absolute URL. Received: ${configured}`,
    );
  }

  const isLocalDevelopment =
    process.env.NODE_ENV !== "production" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");

  if (isLocalDevelopment) return url.origin;

  if (url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS outside local development.");
  }

  if (url.origin !== OFFICIAL_SITE_URL) {
    throw new Error(
      `Production canonical mismatch: expected ${OFFICIAL_SITE_URL}, received ${url.origin}. ` +
        "Refusing to build SEO metadata for a preview or legacy domain.",
    );
  }

  return OFFICIAL_SITE_URL;
}

/**
 * Canonical origin used by metadata, sitemap and robots.
 *
 * Missing configuration is intentionally safe: it resolves to the official domain.
 * A conflicting production value fails the build instead of silently publishing
 * canonical URLs for a Vercel preview or an obsolete host.
 */
export const SITE_URL = resolveSiteUrl();
