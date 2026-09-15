const baseUrl = (process.env.PRODUCTION_BASE_URL ?? "https://ttanjitmoa.com").replace(/\/$/, "");
const expectedSource = "github:wandukong960426-stack/webgame-lab";
const expectedCommit = process.env.EXPECTED_GIT_SHA?.trim();

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

const requiredPages = ["/", "/about", "/contact", "/privacy", "/terms", "/robots.txt", "/sitemap.xml"];
for (const path of requiredPages) {
  const response = await get(path);
  assert(response.ok, `${baseUrl}${path} returned HTTP ${response.status}`);
  console.log(`✓ ${path} (${response.status})`);
}

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

if (expectedCommit) {
  assert(
    release.commit === expectedCommit,
    `Production commit mismatch: expected ${expectedCommit}, received ${release.commit ?? "missing"}`,
  );
}

console.log(`✓ source ${release.source}`);
console.log(`✓ commit ${release.commit}`);
console.log("Production is verifiably serving the GitHub release.");
