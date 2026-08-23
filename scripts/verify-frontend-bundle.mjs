import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const EXPECTED_BUNDLE_NAME = "ai-orchestrator-panel.js";
const BUILD_DIRECTORY = resolve(REPOSITORY_ROOT, "frontend", "dist");
const SOURCE_BUNDLE = resolve(BUILD_DIRECTORY, EXPECTED_BUNDLE_NAME);
const TARGET_BUNDLE = resolve(
  REPOSITORY_ROOT,
  "custom_components",
  "ai_orchestrator",
  "frontend",
  EXPECTED_BUNDLE_NAME,
);

const buildEntries = await readdir(BUILD_DIRECTORY, { withFileTypes: true });
if (
  buildEntries.length !== 1 ||
  !buildEntries[0]?.isFile() ||
  buildEntries[0].name !== EXPECTED_BUNDLE_NAME
) {
  throw new Error(
    `Frontend build is not self-contained. Expected only ${EXPECTED_BUNDLE_NAME}; found: ${buildEntries
      .map((entry) => entry.name)
      .join(", ")}`,
  );
}

const [sourceBytes, targetBytes] = await Promise.all([
  readFile(SOURCE_BUNDLE),
  readFile(TARGET_BUNDLE),
]);

if (!sourceBytes.equals(targetBytes)) {
  throw new Error("Frontend build and integration bundle are not byte-identical.");
}

const bundleText = sourceBytes.toString("utf8");
if (/\bimport\s*(?:\(|["'{*])/.test(bundleText)) {
  throw new Error("Frontend bundle contains an unresolved static or dynamic import.");
}
if (/sourceMappingURL\s*=/.test(bundleText)) {
  throw new Error("Frontend release bundle contains a source map reference.");
}

const digest = createHash("sha256").update(sourceBytes).digest("hex");
process.stdout.write(
  `Verified one self-contained byte-identical frontend bundle (${sourceBytes.length} bytes, sha256 ${digest}).\n`,
);
