import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { brotliDecompressSync } from "node:zlib";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(scriptPath), "../..");
const payloadDir = join(root, ".payload/game-platform-v2");
const expectedCompressedSha256 = "4df8a265b5ea34db72910c0aeab08ca78554af31eae715f035be8957de2e467e";
const expectedTarSha256 = "0f424cd2c269bdebce1624db07a5e83d1267f4e292f2e22e7fa8fd9d2b902d23";

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

if (!existsSync(payloadDir)) {
  console.log("No payload found; source is already materialized.");
  process.exit(0);
}

const partNames = readdirSync(payloadDir)
  .filter((name) => /^part-\d+\.br$/.test(name))
  .sort();

if (partNames.length !== 13) {
  throw new Error(`Expected 13 payload parts, found ${partNames.length}.`);
}

const compressed = Buffer.concat(
  partNames.map((name) => readFileSync(join(payloadDir, name))),
);
if (sha256(compressed) !== expectedCompressedSha256) {
  throw new Error("Compressed payload checksum mismatch.");
}

const tar = brotliDecompressSync(compressed);
if (sha256(tar) !== expectedTarSha256) {
  throw new Error("Materialized tar checksum mismatch.");
}

const tempDir = join(root, ".payload");
mkdirSync(tempDir, { recursive: true });
const tarPath = join(tempDir, "game-platform-v2.tar");
writeFileSync(tarPath, tar);
execFileSync("tar", ["-xf", tarPath, "-C", root], { stdio: "inherit" });

rmSync(join(root, ".payload"), { recursive: true, force: true });
rmSync(join(root, ".github/scripts/materialize.mjs"), { force: true });
rmSync(join(root, ".github/workflows/materialize-source.yml"), { force: true });
try { rmSync(join(root, ".github/scripts"), { recursive: false }); } catch {}
try { rmSync(join(root, ".github/workflows"), { recursive: false }); } catch {}
try { rmSync(join(root, ".github"), { recursive: false }); } catch {}

console.log("Ddanjitmoa game platform source materialized successfully.");
