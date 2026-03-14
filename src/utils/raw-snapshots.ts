import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export function slugifyFilename(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "snapshot";
}

export function writeRawSnapshot(
  rootDir: string,
  provider: string,
  seed: string,
  capturedAt: string,
  payload: string,
): string {
  const datePart = capturedAt.slice(0, 10);
  const directory = path.join(rootDir, "data", "raw", provider, datePart);
  mkdirSync(directory, { recursive: true });

  const filePath = path.join(directory, `${slugifyFilename(seed)}.json`);
  writeFileSync(filePath, payload, "utf8");
  return filePath;
}
