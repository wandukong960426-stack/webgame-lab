const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3010";
const canonicalOrigin = "https://ttanjitmoa.com";
const adsensePublisherId = "pub-1704306174088540";
const adsenseClientId = `ca-${adsensePublisherId}`;
const adsTxtLine = `google.com, ${adsensePublisherId}, DIRECT, f08c47fec0942fa0`;

const pagePaths = [
  "/",
  "/games",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/games/omok",
  "/games/othello",
  "/games/2048",
  "/games/tic-tac-toe",
  "/games/chess",
  "/games/janggi",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchResponse(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "user-agent": "ddanjitmoa-ci-smoke/1.0" },
    signal: AbortSignal.timeout(10_000),
  });
  assert(response.ok, `${path} returned HTTP ${response.status}`);
  return response;
}

async function fetchText(path) {
  return (await fetchResponse(path)).text();
}

let homeHtml = "";
for (const path of pagePaths) {
  const html = await fetchText(path);
  if (path === "/") homeHtml = html;
  const canonical = path === "/" ? canonicalOrigin : `${canonicalOrigin}${path}`;
  assert(
    html.includes(`href="${canonical}"`),
    `${path} is missing canonical ${canonical}`,
  );
  assert(
    !html.includes("webgame-lab.vercel.app"),
    `${path} leaked the legacy Vercel canonical`,
  );
  console.log(`✓ ${path}`);
}

assert(
  homeHtml.includes('name="google-adsense-account"') &&
    homeHtml.includes(`content="${adsenseClientId}"`),
  "home page is missing the AdSense ownership meta tag",
);
assert(
  !homeHtml.includes("pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"),
  "AdSense ad-serving script loaded before explicit approval and consent flags",
);
console.log("✓ AdSense ownership meta present; ad serving disabled by default");

const adsTxtResponse = await fetchResponse("/ads.txt");
const adsTxt = (await adsTxtResponse.text()).trim();
assert(adsTxt === adsTxtLine, `/ads.txt mismatch: ${adsTxt}`);
assert(
  adsTxtResponse.headers.get("content-type")?.startsWith("text/plain"),
  "/ads.txt must be served as text/plain",
);
console.log("✓ /ads.txt");

const robots = await fetchText("/robots.txt");
assert(robots.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`), "robots.txt sitemap is wrong");
assert(robots.includes("Disallow: /admin"), "robots.txt must block /admin");
assert(robots.includes("Disallow: /api"), "robots.txt must block /api");
assert(!robots.includes("webgame-lab.vercel.app"), "robots.txt leaked the legacy domain");
console.log("✓ /robots.txt");

const sitemap = await fetchText("/sitemap.xml");
for (const path of pagePaths) {
  const url = path === "/" ? canonicalOrigin : `${canonicalOrigin}${path}`;
  assert(sitemap.includes(`<loc>${url}</loc>`), `sitemap.xml is missing ${url}`);
}
assert(!sitemap.includes("webgame-lab.vercel.app"), "sitemap.xml leaked the legacy domain");
console.log("✓ /sitemap.xml");

const releaseResponse = await fetchResponse("/api/release");
const release = await releaseResponse.json();
assert(
  release.source === "github:wandukong960426-stack/webgame-lab",
  "release endpoint reported the wrong source",
);
assert(release.canonical === canonicalOrigin, "release endpoint reported the wrong canonical");
assert(
  release.monetization?.publisherId === adsensePublisherId,
  "release endpoint reported the wrong AdSense publisher ID",
);
assert(
  release.monetization?.adsTxt === `${canonicalOrigin}/ads.txt`,
  "release endpoint reported the wrong ads.txt URL",
);
assert(
  release.monetization?.scriptEnabled === false,
  "default CI build must not send AdSense ad requests",
);
console.log("✓ /api/release");
console.log("Local production smoke checks passed.");
