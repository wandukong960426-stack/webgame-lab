const baseUrl = (process.env.PRODUCTION_BASE_URL ?? "https://ttanjitmoa.com").replace(/\/$/, "");
const expectedSource = "github:wandukong960426-stack/webgame-lab";
const expectedCommit = process.env.EXPECTED_GIT_SHA?.trim();
const adsensePublisherId = "pub-1704306174088540";
const adsenseClientId = `ca-${adsensePublisherId}`;
const adsTxtLine = `google.com, ${adsensePublisherId}, DIRECT, f08c47fec0942fa0`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function get(path) {
  return fetch(`${baseUrl}${path}`, {
    redirect: "follow",
    headers: { "user-agent": "ddanjitmoa-production-audit/1.0" },
    signal: AbortSignal.timeout(15_000),
  });
}

const requiredPages = ["/", "/about", "/contact", "/privacy", "/terms", "/robots.txt", "/sitemap.xml", "/ads.txt"];
for (const path of requiredPages) {
  const response = await get(path);
  assert(response.ok, `${baseUrl}${path} returned HTTP ${response.status}`);
  console.log(`✓ ${path} (${response.status})`);
}

const homeResponse = await get("/");
const home = await homeResponse.text();
assert(
  home.includes('name="google-adsense-account"') &&
    home.includes(`content="${adsenseClientId}"`),
  "The official home page is missing the AdSense ownership meta tag.",
);
console.log("✓ AdSense ownership meta");

const adsTxtResponse = await get("/ads.txt");
const adsTxt = (await adsTxtResponse.text()).trim();
assert(
  adsTxt === adsTxtLine,
  `Production ads.txt mismatch. Expected '${adsTxtLine}', received '${adsTxt}'.`,
);
assert(
  adsTxtResponse.headers.get("content-type")?.startsWith("text/plain"),
  "Production ads.txt must be served as text/plain.",
);
console.log("✓ AdSense ads.txt declaration");

const releaseResponse = await get("/api/release");
assert(
  releaseResponse.ok,
  [
    `${baseUrl}/api/release returned HTTP ${releaseResponse.status}.`,
    "The official domain is not verifiably serving this GitHub codebase.",
    "Do not report a GitHub change as production-deployed until this endpoint is live.",
  ].join(" "),
);

const release = await releaseResponse.json();
assert(
  release.source === expectedSource,
  `Production source mismatch: expected ${expectedSource}, received ${release.source ?? "missing"}`,
);
assert(
  release.canonical === "https://ttanjitmoa.com",
  `Production canonical mismatch: received ${release.canonical ?? "missing"}`,
);
assert(
  release.monetization?.publisherId === adsensePublisherId,
  `Production AdSense publisher mismatch: received ${release.monetization?.publisherId ?? "missing"}`,
);
assert(
  release.monetization?.adsTxt === "https://ttanjitmoa.com/ads.txt",
  `Production ads.txt URL mismatch: received ${release.monetization?.adsTxt ?? "missing"}`,
);

if (release.monetization?.scriptEnabled) {
  assert(
    release.monetization.siteApproved === true &&
      release.monetization.consentReady === true,
    "AdSense script is enabled without both approval and consent readiness.",
  );
  assert(
    home.includes("pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"),
    "Release reports AdSense enabled but the official home page has no AdSense script.",
  );
} else {
  assert(
    !home.includes("pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"),
    "Release reports AdSense disabled but the official home page loads the AdSense script.",
  );
}

if (expectedCommit) {
  assert(
    release.commit === expectedCommit,
    `Production commit mismatch: expected ${expectedCommit}, received ${release.commit ?? "missing"}`,
  );
}

console.log(`✓ source ${release.source}`);
console.log(`✓ commit ${release.commit}`);
console.log(`✓ AdSense serving ${release.monetization?.scriptEnabled ? "enabled" : "disabled"}`);
console.log("Production is verifiably serving the GitHub release.");
