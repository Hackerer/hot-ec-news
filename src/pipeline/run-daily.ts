import { readdirSync } from "node:fs";
import path from "node:path";

import { buildValidatedReport, importThirdPartyFile } from "./import-third-party.js";
import { runLiveCollection } from "./run-live-collection.js";
import type { FetchLike } from "../collectors/types.js";
import type { Provider } from "../types/hotword.js";
import { createAppPaths, ensureAppDirectories, resolveRootDir } from "../utils/paths.js";

function inferProviderFromFilename(fileName: string): Provider | null {
  if (fileName.startsWith("chanmama")) return "chanmama";
  if (fileName.startsWith("feigua")) return "feigua";
  if (fileName.startsWith("qiangua")) return "qiangua";
  if (fileName.startsWith("magicmirror")) return "magicmirror";
  return null;
}

export async function runDailyPipeline(
  explicitRoot?: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ reportPath: string; importedFiles: string[] }> {
  const rootDir = resolveRootDir(explicitRoot);
  const paths = createAppPaths(rootDir);
  ensureAppDirectories(paths);

  await runLiveCollection(rootDir, fetchImpl);

  const importedFiles: string[] = [];
  for (const fileName of readdirSync(paths.importsDir)) {
    if (!fileName.endsWith(".csv")) {
      continue;
    }

    const provider = inferProviderFromFilename(fileName);
    if (!provider) {
      continue;
    }

    importThirdPartyFile(provider, path.join(paths.importsDir, fileName), rootDir);
    importedFiles.push(fileName);
  }

  const result = buildValidatedReport(rootDir);
  return {
    reportPath: result.reportPath,
    importedFiles,
  };
}
