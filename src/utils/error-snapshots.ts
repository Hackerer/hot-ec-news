import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { slugifyFilename } from "./raw-snapshots.js";

export function writeErrorSnapshot(
  rootDir: string,
  provider: string,
  seed: string,
  capturedAt: string,
  error: unknown,
): string {
  const directory = path.join(rootDir, "data", "raw", "errors", capturedAt.slice(0, 10));
  mkdirSync(directory, { recursive: true });

  const filePath = path.join(directory, `${provider}-${slugifyFilename(seed)}.json`);
  writeFileSync(
    filePath,
    JSON.stringify(
      {
        provider,
        seed,
        capturedAt,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
    "utf8",
  );

  return filePath;
}
