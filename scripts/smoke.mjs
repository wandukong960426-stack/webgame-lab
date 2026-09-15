const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3010";
const canonicalOrigin = "https://ttanjitmoa.com";

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

async function fetchText(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "user-agent": "ddanjitmoa-ci-smoke/1.0" },
    signal: AbortSignal.timeout(10_000),
  });
  assert(response.ok, `${path} returned HTTP ${response.status}`);
  return response.text();
}

for (const path of pagePaths) {
  const html = await fetchText(path);
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

const releaseResponse = await fetch(`${baseUrl}/api/release`, {
  headers: { "user-agent": "ddanjitmoa-ci-smoke/1.0" },
  signal: AbortSignal.timeout(10_000),
});
assert(releaseResponse.ok, `/api/release returned HTTP ${releaseResponse.status}`);
const release = await releaseResponse.json();
assert(
  release.source === "github:wandukong960426-stack/webgame-lab",
  "release endpoint reported the wrong source",
);
assert(release.canonical === canonicalOrigin, "release endpoint reported the wrong canonical");
console.log("✓ /api/release");
console.log("Local production smoke checks passed.");
