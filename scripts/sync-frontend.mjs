import { copyFile, mkdir, readdir, readFile } from "node:fs/promises";
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
    `Expected exactly one frontend build file named ${EXPECTED_BUNDLE_NAME}; found: ${buildEntries
      .map((entry) => entry.name)
      .join(", ")}`,
  );
}

const sourceBytes = await readFile(SOURCE_BUNDLE);
if (sourceBytes.length === 0) {
  throw new Error("Refusing to synchronize an empty frontend bundle.");
}

await mkdir(dirname(TARGET_BUNDLE), { recursive: true });
await copyFile(SOURCE_BUNDLE, TARGET_BUNDLE);

process.stdout.write(`Synchronized ${sourceBytes.length} bytes to ${TARGET_BUNDLE}\n`);
